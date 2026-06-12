# Sync Route B ACP entry into AionUI claude-agent-acp dist (replaces index.js).
# Usage: .\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1

[CmdletBinding()]
param(
    [switch]$RestartAionUiWeb
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$patchIndex = Join-Path $repoRoot "ccb-installer\patches\aionui-ccb-route-b\index.js"
$relativeDist = "managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist"

if (-not (Test-Path $patchIndex)) {
    throw "Missing patch: $patchIndex"
}

function Sync-RouteB([string]$Label, [string]$TargetDistDir) {
    if (-not (Test-Path $TargetDistDir)) {
        Write-Host "[skip] $Label - not found: $TargetDistDir" -ForegroundColor DarkGray
        return $false
    }
    $dest = Join-Path $TargetDistDir "index.js"
    Copy-Item $patchIndex $dest -Force
    Write-Host "[ok] $Label -> $dest (Route B index.js)"
    return $true
}

$targets = @(
    @{
        Label = "repo AionUi bundle"
        Path  = Join-Path $repoRoot "AionUi\resources\bundled-aioncore\win32-x64\$relativeDist"
    },
    @{
        Label = "AionUI Web runtime cache"
        Path  = Join-Path $env:USERPROFILE ".aionui-web\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist"
    },
    @{
        Label = "AionUI Web install (D:)"
        Path  = "D:\aionui-web\aionui-web\bundled-aioncore\win32-x64\$relativeDist"
    },
    @{
        Label = "AionUi exe runtime (AppData\Roaming)"
        Path  = Join-Path $env:APPDATA "AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist"
    }
)

$synced = 0
foreach ($t in $targets) {
    if (Sync-RouteB $t.Label $t.Path) { $synced++ }
}

Write-Host ""
Write-Host "Syntax check..."
& node --check $patchIndex
if ($LASTEXITCODE -ne 0) { throw "node --check failed: $patchIndex" }
Write-Host "  node --check OK: index.js (Route B)"

Write-Host ""
Write-Host "Registry fixture: ccb-installer\fixtures\aionui-agent-registry-ccb-wanding.json"
Write-Host "Direct spawn (no patch): bun dist/cli.js --ccb-acp"
Write-Host "Synced to $synced target(s). Restart AionUI after sync."

if ($RestartAionUiWeb) {
    Get-Process -Name "aionui-web", "aioncore" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Stopped aionui-web / aioncore."
}
