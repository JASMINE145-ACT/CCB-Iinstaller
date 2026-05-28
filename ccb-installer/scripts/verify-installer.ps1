#!/usr/bin/env pwsh
# verify-installer.ps1 - 验证安装包完整性

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\CCB"
)

$ErrorActionPreference = "Stop"
$results = @{}

function Test-File {
    param([string]$Path, [string]$Name)
    $exists = Test-Path $Path
    $results[$Name] = $exists
    if ($exists) {
        Write-Host "[PASS] $Name exists" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $Name missing" -ForegroundColor Red
    }
}

function Test-Command {
    param([string]$Name, [scriptblock]$Action, [string]$ExpectedPattern)
    try {
        $output = & $Action 2>&1
        $passed = ($LASTEXITCODE -eq 0) -and (($output -join "`n") -match $ExpectedPattern)
    }
    catch {
        $output = $_.Exception.Message
        $passed = $false
    }
    $results[$Name] = $passed
    if ($passed) {
        Write-Host "[PASS] $Name runs: $($output -join ' ')" -ForegroundColor Green
    }
    else {
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
Test-File "$InstallDir\scripts\ensure-mcp-settings.ps1" "MCP Settings Script"
Test-File "$InstallDir\scripts\fix-terminal-launcher.ps1" "Terminal Fix PowerShell Script"
Test-File "$InstallDir\scripts\install-windows-terminal.ps1" "Windows Terminal Install Script"
Test-File "$InstallDir\vendor\git\bin\bash.exe" "Git Bash"
Test-File "$InstallDir\vendor\mcp-servers\excel-mcp\mcp-excel.exe" "Excel MCP Server"
Test-File "$InstallDir\vendor\windows-terminal\Microsoft.WindowsTerminal_1.24.11321.0_8wekyb3d8bbwe.msixbundle" "Windows Terminal Offline Package"

$rgPath = Get-ChildItem "$InstallDir\vendor\ripgrep\x64-win32\rg.exe" -ErrorAction SilentlyContinue
if ($rgPath) {
    Write-Host "[PASS] ripgrep found" -ForegroundColor Green
    $results["ripgrep"] = $true
}
else {
    Write-Host "[FAIL] ripgrep missing" -ForegroundColor Red
    $results["ripgrep"] = $false
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
            $runtimeMcp.mcpServers.exa.url -eq "https://mcp.exa.ai/mcp" -and
            ($runtimeMcp.mcpServers.'excel-mcp'.command -like "*vendor*mcp-servers*excel-mcp*mcp-excel.exe")
        $results["MCP config merge"] = $mcpOk
        if ($mcpOk) {
            Write-Host "[PASS] MCP config merge preserves existing servers and writes runtime ccb-mcp.json" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] MCP config merge did not produce expected servers" -ForegroundColor Red
        }
    }
    finally {
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
else {
    Write-Host "Some checks failed!" -ForegroundColor Red
    exit 1
}
