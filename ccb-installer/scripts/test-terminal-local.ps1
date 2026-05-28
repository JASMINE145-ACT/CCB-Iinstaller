[CmdletBinding()]
param(
    [ValidateSet("Modern", "Flat", "Diagnostics", "ResizeRepro")]
    [string]$Mode = "Modern",
    [string]$SandboxRoot = "D:\tmp\ccb-terminal-test",
    [switch]$PrepareOnly
)

$ErrorActionPreference = "Stop"
$InstallerDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AllowedRoot = [IO.Path]::GetFullPath("D:\tmp")
$ResolvedRoot = [IO.Path]::GetFullPath($SandboxRoot)

if (-not $ResolvedRoot.StartsWith($AllowedRoot + "\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "SandboxRoot must be under D:\tmp. Received: $ResolvedRoot"
}

$AppDir = Join-Path $ResolvedRoot "app"
$ProfileDir = Join-Path $ResolvedRoot "profile"
$ConfigDir = Join-Path $ProfileDir "CCB\.claude"
$LogDir = Join-Path $ProfileDir "CCB\logs"

$requiredSources = @(
    (Join-Path $InstallerDir "ccb.cmd"),
    (Join-Path $InstallerDir "ccb-diagnose.cmd"),
    (Join-Path $InstallerDir "ccb-fix-terminal.cmd"),
    (Join-Path $InstallerDir "dist\cli.js"),
    (Join-Path $InstallerDir "dist\chunk-z9bw4q7j.js"),
    (Join-Path $InstallerDir "scripts\ensure-mcp-settings.ps1"),
    (Join-Path $InstallerDir "scripts\fix-terminal-launcher.ps1"),
    (Join-Path $InstallerDir "scripts\install-windows-terminal.ps1"),
    (Join-Path $InstallerDir "vendor\bun\bun.exe"),
    (Join-Path $InstallerDir "vendor\git\bin\bash.exe"),
    (Join-Path $InstallerDir "vendor\mcp-servers\excel-mcp\mcp-excel.exe"),
    (Join-Path $InstallerDir "vendor\windows-terminal\Microsoft.WindowsTerminal_1.24.11321.0_8wekyb3d8bbwe.msixbundle"),
    (Join-Path $InstallerDir "resources\settings\settings.json")
)
foreach ($path in $requiredSources) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required test source is missing: $path"
    }
}

New-Item -ItemType Directory -Force -Path $ResolvedRoot, $ProfileDir, $ConfigDir, $LogDir | Out-Null
if (Test-Path -LiteralPath $AppDir) {
    Remove-Item -LiteralPath $AppDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-diagnose.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-fix-terminal.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "dist") -Destination $AppDir -Recurse
Copy-Item -LiteralPath (Join-Path $InstallerDir "scripts") -Destination $AppDir -Recurse
Copy-Item -LiteralPath (Join-Path $InstallerDir "vendor") -Destination $AppDir -Recurse

$testSettings = Join-Path $ConfigDir "settings.json"
if (-not (Test-Path -LiteralPath $testSettings)) {
    Copy-Item -LiteralPath (Join-Path $InstallerDir "resources\settings\settings.json") -Destination $testSettings
}

$entry = Join-Path $AppDir "ccb.cmd"
$renderer = Join-Path $AppDir "dist\chunk-z9bw4q7j.js"
$diagnose = Join-Path $AppDir "ccb-diagnose.cmd"
$mcpSettings = Join-Path $AppDir "scripts\ensure-mcp-settings.ps1"
$mcpConfig = Join-Path $AppDir "ccb-mcp.json"
$excelMcp = Join-Path $AppDir "vendor\mcp-servers\excel-mcp\mcp-excel.exe"

if (-not (Select-String -LiteralPath $entry -SimpleMatch "CCB_DISABLE_FULLSCREEN" -Quiet)) {
    throw "Staged ccb.cmd does not contain the fullscreen compatibility switch."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "CLAUDE_CODE_DISABLE_TUI_RESIZE" -Quiet)) {
    throw "Staged ccb.cmd does not contain the resize protection switch."
}
if (-not (Select-String -LiteralPath $renderer -SimpleMatch "CLAUDE_CODE_DISABLE_TUI_RESIZE" -Quiet)) {
    throw "Staged renderer does not contain the resize protection patch."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "ensure-mcp-settings.ps1" -Quiet)) {
    throw "Staged ccb.cmd does not contain the MCP settings bootstrap."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "--mcp-config" -Quiet)) {
    throw "Staged ccb.cmd does not launch Claude Code with --mcp-config."
}

$previousLocalAppData = $env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA = $ProfileDir
    $version = & $entry --version 2>&1
    if ($LASTEXITCODE -ne 0 -or ($version -join "`n") -notmatch "2\.1\.888 \(Claude Code\)") {
        throw "Staged launcher version check failed: $($version -join ' ')"
    }

    $settings = Get-Content -Raw -LiteralPath $testSettings | ConvertFrom-Json
    if ($settings.mcpServers.exa.url -ne "https://mcp.exa.ai/mcp") {
        throw "Staged settings do not contain the exa MCP server."
    }
    if ($settings.mcpServers.'excel-mcp'.command -ne $excelMcp) {
        throw "Staged settings do not point excel-mcp at the staged executable."
    }
    if (-not (Test-Path -LiteralPath $mcpConfig)) {
        throw "Staged MCP config file was not generated: $mcpConfig"
    }
    $runtimeMcp = Get-Content -Raw -LiteralPath $mcpConfig | ConvertFrom-Json
    if ($runtimeMcp.mcpServers.exa.url -ne "https://mcp.exa.ai/mcp") {
        throw "Runtime MCP config does not contain exa."
    }
    if ($runtimeMcp.mcpServers.'excel-mcp'.command -ne $excelMcp) {
        throw "Runtime MCP config does not point excel-mcp at the staged executable."
    }

    $excelHelp = & $excelMcp --help 2>&1
    if ($LASTEXITCODE -ne 0 -or ($excelHelp -join "`n") -notmatch "Excel MCP Server") {
        throw "Staged excel-mcp executable failed: $($excelHelp -join ' ')"
    }
}
finally {
    $env:LOCALAPPDATA = $previousLocalAppData
}

Write-Host "[PASS] Local CCB terminal sandbox prepared." -ForegroundColor Green
Write-Host "App:      $AppDir"
Write-Host "Profile:  $ProfileDir"
Write-Host "Settings: $testSettings"
Write-Host "Logs:     $LogDir"
Write-Host "Version:  $($version -join ' ')"
Write-Host "MCP:      exa + excel-mcp configured"

if ($PrepareOnly) {
    Write-Host ""
    Write-Host "Preparation only. Re-run without -PrepareOnly from Windows Terminal or Cursor terminal."
    exit 0
}

Write-Host ""
Write-Host "Launching mode: $Mode"
Write-Host "Use the same short Chinese prompts in each mode to compare CJK rendering."

$previous = @{
    LocalAppData = $env:LOCALAPPDATA
    NoFlicker = $env:CLAUDE_CODE_NO_FLICKER
    DisableFullscreen = $env:CCB_DISABLE_FULLSCREEN
    EnableResize = $env:CCB_ENABLE_TUI_RESIZE
}
try {
    $env:LOCALAPPDATA = $ProfileDir
    Remove-Item Env:CLAUDE_CODE_NO_FLICKER -ErrorAction SilentlyContinue
    Remove-Item Env:CCB_DISABLE_FULLSCREEN -ErrorAction SilentlyContinue
    Remove-Item Env:CCB_ENABLE_TUI_RESIZE -ErrorAction SilentlyContinue

    switch ($Mode) {
        "Flat" {
            $env:CCB_DISABLE_FULLSCREEN = "1"
            & $entry
        }
        "Diagnostics" {
            & $diagnose
        }
        "ResizeRepro" {
            & $diagnose --repro-resize
        }
        default {
            & $entry
        }
    }
}
finally {
    $env:LOCALAPPDATA = $previous.LocalAppData
    $env:CLAUDE_CODE_NO_FLICKER = $previous.NoFlicker
    $env:CCB_DISABLE_FULLSCREEN = $previous.DisableFullscreen
    $env:CCB_ENABLE_TUI_RESIZE = $previous.EnableResize
}
