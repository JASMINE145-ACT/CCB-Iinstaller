#!/usr/bin/env pwsh
# verify-installer.ps1 - Verify the local CCB installation/package directory.

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\CCB"
)

$ErrorActionPreference = "Stop"
$results = @{}

function Test-File {
    param([string]$Path, [string]$Name)

    $exists = Test-Path -LiteralPath $Path
    $results[$Name] = $exists
    if ($exists) {
        Write-Host "[PASS] $Name exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name missing" -ForegroundColor Red
    }
}

function Test-Command {
    param([string]$Name, [scriptblock]$Action, [string]$ExpectedPattern)

    try {
        $output = & $Action 2>&1
        $passed = ($LASTEXITCODE -eq 0) -and (($output -join "`n") -match $ExpectedPattern)
    } catch {
        $output = $_.Exception.Message
        $passed = $false
    }

    $results[$Name] = $passed
    if ($passed) {
        Write-Host "[PASS] $Name runs" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name cannot run: $($output -join ' ')" -ForegroundColor Red
    }
}

Write-Host "=== CCB Installer Verification ===" -ForegroundColor Cyan
Write-Host "Install Dir: $InstallDir`n"

Test-File "$InstallDir\vendor\bun\bun.exe" "Bun Runtime"
Test-File "$InstallDir\dist\cli.js" "CCB Entry (cli.js)"
Test-File "$InstallDir\ccb.cmd" "Entry Script (ccb.cmd)"
Test-File "$InstallDir\ccb-diagnose.cmd" "Diagnostics Script (ccb-diagnose.cmd)"
Test-File "$InstallDir\ccb-fix-terminal.cmd" "Terminal Fix Script (ccb-fix-terminal.cmd)"
Test-File "$InstallDir\ccb-safe.cmd" "Safe Mode Script (ccb-safe.cmd)"
Test-File "$InstallDir\ccb-text.cmd" "Text Mode Script (ccb-text.cmd)"
Test-File "$InstallDir\scripts\ensure-mcp-settings.ps1" "MCP Settings Script"
Test-File "$InstallDir\scripts\fix-terminal-launcher.ps1" "Terminal Fix PowerShell Script"
Test-File "$InstallDir\scripts\install-windows-terminal.ps1" "Windows Terminal Install Script"
Test-File "$InstallDir\scripts\launch-ccb.ps1" "PowerShell UTF-8 Launcher"
Test-File "$InstallDir\scripts\patch-i18n.ps1" "I18N Patch Script"
Test-File "$InstallDir\scripts\normalize-i18n-literals.mjs" "I18N Literal Normalizer"
Test-File "$InstallDir\vendor\git\bin\bash.exe" "Git Bash"
Test-File "$InstallDir\vendor\mcp-servers\excel-mcp\mcp-excel.exe" "Excel MCP Server"
Test-File "$InstallDir\vendor\windows-terminal\Microsoft.WindowsTerminal_1.24.11321.0_8wekyb3d8bbwe.msixbundle" "Windows Terminal Offline Package"

$rgPath = Get-ChildItem "$InstallDir\vendor\ripgrep\x64-win32\rg.exe" -ErrorAction SilentlyContinue
$results["ripgrep"] = [bool]$rgPath
if ($rgPath) {
    Write-Host "[PASS] ripgrep found" -ForegroundColor Green
} else {
    Write-Host "[FAIL] ripgrep missing" -ForegroundColor Red
}

if ($results["Bun Runtime"]) {
    Test-Command "Bun executable" { & "$InstallDir\vendor\bun\bun.exe" --version } "\d+\.\d+"
}
if ($results["Git Bash"]) {
    Test-Command "Git Bash executable" { & "$InstallDir\vendor\git\bin\bash.exe" --noprofile --norc -c "git --version" } "git version"
}
if ($results["Bun Runtime"] -and $results["CCB Entry (cli.js)"]) {
    Test-Command "CCB startup probe" { & "$InstallDir\vendor\bun\bun.exe" "$InstallDir\dist\cli.js" --version } "Claude Code"
}
if ($results["Excel MCP Server"]) {
    Test-Command "Excel MCP executable" { & "$InstallDir\vendor\mcp-servers\excel-mcp\mcp-excel.exe" --help } "Excel MCP Server"
}
if ($results["PowerShell UTF-8 Launcher"]) {
    Test-Command "PowerShell UTF-8 launcher" {
        $previousLocalAppData = $env:LOCALAPPDATA
        $previousDisableDebugLog = $env:CCB_DISABLE_DEBUG_LOG
        try {
            $env:LOCALAPPDATA = Join-Path $env:TEMP ("ccb-ps-launcher-verify-" + [guid]::NewGuid().ToString("N"))
            $env:CCB_DISABLE_DEBUG_LOG = "1"
            & "$InstallDir\scripts\launch-ccb.ps1" --version
        } finally {
            $env:LOCALAPPDATA = $previousLocalAppData
            $env:CCB_DISABLE_DEBUG_LOG = $previousDisableDebugLog
        }
    } "Claude Code"
}

if ($results["I18N Patch Script"]) {
    try {
        & "$InstallDir\scripts\patch-i18n.ps1" -DistDir "$InstallDir\dist" 2>&1
        $i18nOutput = ""
        $i18nOk = $true
    } catch {
        $i18nOutput = $_.Exception.Message
        $i18nOk = $false
    }
    $results["I18N patch script"] = $i18nOk
    if ($i18nOk) {
        Write-Host "[PASS] I18N patch script runs" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] I18N patch script cannot run: $($i18nOutput -join ' ')" -ForegroundColor Red
    }
}

if ($results["MCP Settings Script"]) {
    $testConfig = Join-Path $env:TEMP ("ccb-mcp-verify-" + [guid]::NewGuid().ToString("N"))
    try {
        New-Item -ItemType Directory -Force -Path $testConfig | Out-Null
        Set-Content -LiteralPath (Join-Path $testConfig "settings.json") -Encoding ascii -Value '{"mcpServers":{"custom":{"command":"custom.exe"}}}'
        & "$InstallDir\scripts\ensure-mcp-settings.ps1" -InstallDir $InstallDir -ConfigDir $testConfig
        $merged = Get-Content -Raw -LiteralPath (Join-Path $testConfig "settings.json") | ConvertFrom-Json
        $runtimeMcpPath = Join-Path $InstallDir "ccb-mcp.json"
        $runtimeMcp = Get-Content -Raw -LiteralPath $runtimeMcpPath | ConvertFrom-Json
        $mcpOk = $merged.mcpServers.exa.url -eq "https://mcp.exa.ai/mcp" -and
            ($merged.mcpServers.'excel-mcp'.command -like "*vendor*mcp-servers*excel-mcp*mcp-excel.exe") -and
            $null -ne $merged.mcpServers.custom -and
            -not [string]::IsNullOrWhiteSpace($merged.env.ANTHROPIC_AUTH_TOKEN) -and
            $merged.env.'ANTHROPIC_DEFAULT_SONNET_MODEL' -eq "minimax-m2.7" -and
            $runtimeMcp.mcpServers.exa.url -eq "https://mcp.exa.ai/mcp" -and
            ($runtimeMcp.mcpServers.'excel-mcp'.command -like "*vendor*mcp-servers*excel-mcp*mcp-excel.exe")
        $results["MCP config merge"] = $mcpOk
        if ($mcpOk) {
            Write-Host "[PASS] MCP config merge preserves existing servers and writes runtime ccb-mcp.json" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] MCP config merge did not produce expected servers" -ForegroundColor Red
        }
    } finally {
        Remove-Item -LiteralPath $testConfig -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$passed = ($results.Values | Where-Object { $_ -eq $true }).Count
$total = $results.Count
Write-Host "`nPassed: $passed / $total"

if ($passed -eq $total) {
    Write-Host "All checks passed!" -ForegroundColor Green
    exit 0
}

Write-Host "Some checks failed!" -ForegroundColor Red
exit 1
