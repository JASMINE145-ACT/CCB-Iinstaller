# Sync WanD acp-agent.js patch into dev AionUI install locations.
# Does NOT copy index.js — Route B index.js must stay on sync-aionui-ccb-route-b.ps1.
# Usage: .\ccb-installer\scripts\sync-aionui-ccb-patch.ps1 [-RestartAionUiWeb]

[CmdletBinding()]
param(
    [switch]$RestartAionUiWeb
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$patchDir = Join-Path $repoRoot 'ccb-installer\patches\aionui-acp'
$relativeDist = 'managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist'
$packageDist = 'runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist'
$acpAgentPatch = Join-Path $patchDir 'acp-agent.js'

if (-not (Test-Path -LiteralPath $acpAgentPatch)) {
    throw "Missing patch file: $acpAgentPatch"
}

function Sync-AcpAgentToTarget([string]$Label, [string]$TargetDistDir) {
    if (-not (Test-Path -LiteralPath $TargetDistDir)) {
        Write-Host "[skip] $Label - not found: $TargetDistDir" -ForegroundColor DarkGray
        return $false
    }
    $dest = Join-Path $TargetDistDir 'acp-agent.js'
    Copy-Item -LiteralPath $acpAgentPatch -Destination $dest -Force
    Write-Host "[ok] $Label -> $dest"
    return $true
}

$targets = @(
    @{
        Label = 'repo AionUi bundle'
        Path  = Join-Path $repoRoot "AionUi\resources\bundled-aioncore\win32-x64\$relativeDist"
    },
    @{
        Label = 'AionUI Web runtime cache'
        Path  = Join-Path $env:USERPROFILE ".aionui-web\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist"
    },
    @{
        Label = 'AionUi exe runtime (AppData\Roaming)'
        Path  = Join-Path $env:APPDATA "AionUi\aionui\$packageDist"
    },
    @{
        Label = 'AionUi-Dev electron dev runtime'
        Path  = Join-Path $env:APPDATA "AionUi-Dev\aionui\$packageDist"
    }
)

$synced = 0
foreach ($t in $targets) {
    if (Sync-AcpAgentToTarget $t.Label $t.Path) { $synced++ }
}

Write-Host ''
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host 'Syntax check...'
    & node --check $acpAgentPatch
    if ($LASTEXITCODE -ne 0) { throw "node --check failed: $acpAgentPatch" }
    Write-Host '  node --check OK: acp-agent.js'
}

if ($synced -eq 0) {
    Write-Warning 'No targets found. Install AionUI or create the runtime cache first.'
}

Write-Host ''
Write-Host "Synced acp-agent.js to $synced target(s). For Route B index.js use sync-aionui-ccb-route-b.ps1."
Write-Host 'Restart AionUI to load patched ACP agent.'

if ($RestartAionUiWeb) {
    Get-Process -Name 'aionui-web', 'aioncore' -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host 'Stopped aionui-web / aioncore.'
}
