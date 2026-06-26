# Sync Route B ACP entry (index.js) + WanD acp-agent.js patch into AionUI claude-agent-acp dist.
# Never replaces Route B index.js with the stock aionui-acp index.js wrapper.
# Usage: .\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 [-InstallDir path]

[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [switch]$RestartAionUiWeb
)

$ErrorActionPreference = 'Stop'

$relativeDist = 'managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist'
$packageDist = 'runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist'

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}

$installerRoot = Split-Path $PSScriptRoot -Parent
$repoPatchIndex = Join-Path $installerRoot 'patches\aionui-ccb-route-b\index.js'
$repoPatchAcpAgent = Join-Path $installerRoot 'patches\aionui-acp\acp-agent.js'
$bundledDist = Join-Path $InstallDir "AionUi\resources\bundled-aioncore\win32-x64\$relativeDist"
$installedPatchIndex = Join-Path $bundledDist 'index.js'
$installedPatchAcpAgent = Join-Path $bundledDist 'acp-agent.js'
$patchIndex = $null
$acpAgentSource = $null

if ((Test-Path -LiteralPath $installedPatchIndex) -and
    (Select-String -LiteralPath $installedPatchIndex -Pattern 'ccb-native-acp-route' -Quiet)) {
    $patchIndex = $installedPatchIndex
}
elseif (Test-Path -LiteralPath $repoPatchIndex) {
    $patchIndex = $repoPatchIndex
}

if (-not $patchIndex -or -not (Test-Path -LiteralPath $patchIndex)) {
    throw "Missing Route B patch source. Checked: $installedPatchIndex ; $repoPatchIndex"
}

$acpAgentMarker = 'CCB_WANDING_QUERY_NEXT_TIMEOUT_DEFAULT_MS'
if ((Test-Path -LiteralPath $installedPatchAcpAgent) -and
    (Select-String -LiteralPath $installedPatchAcpAgent -Pattern $acpAgentMarker -Quiet)) {
    $acpAgentSource = $installedPatchAcpAgent
}
elseif (Test-Path -LiteralPath $repoPatchAcpAgent) {
    $acpAgentSource = $repoPatchAcpAgent
}

if (-not $acpAgentSource) {
    throw "Missing acp-agent patch. Checked bundled: $installedPatchAcpAgent ; repo: $repoPatchAcpAgent"
}

function Ensure-DistDir([string]$TargetDistDir, [bool]$CreateMissing) {
    if (Test-Path -LiteralPath $TargetDistDir) { return $true }
    if (-not $CreateMissing) { return $false }
    New-Item -ItemType Directory -Force -Path $TargetDistDir | Out-Null
    return $true
}

function Sync-RouteB([string]$Label, [string]$TargetDistDir, [bool]$CreateMissing = $false) {
    if (-not (Ensure-DistDir $TargetDistDir $CreateMissing)) {
        Write-Host "[skip] $Label - not found: $TargetDistDir" -ForegroundColor DarkGray
        return $false
    }
    $dest = Join-Path $TargetDistDir 'index.js'
    if ([System.IO.Path]::GetFullPath($patchIndex) -ieq [System.IO.Path]::GetFullPath($dest)) {
        Write-Host "[ok] $Label already Route B: $dest"
    }
    else {
        Copy-Item -LiteralPath $patchIndex -Destination $dest -Force
        Write-Host "[ok] $Label -> $dest (Route B index.js)"
    }
    return $true
}

function Sync-AcpAgentPatch([string]$Label, [string]$TargetDistDir, [bool]$CreateMissing = $false) {
    if (-not (Ensure-DistDir $TargetDistDir $CreateMissing)) {
        Write-Host "[skip] $Label acp-agent - not found: $TargetDistDir" -ForegroundColor DarkGray
        return $false
    }
    $dest = Join-Path $TargetDistDir 'acp-agent.js'
    if ([System.IO.Path]::GetFullPath($acpAgentSource) -ieq [System.IO.Path]::GetFullPath($dest)) {
        Write-Host "[ok] $Label acp-agent already patched: $dest"
    }
    else {
        Copy-Item -LiteralPath $acpAgentSource -Destination $dest -Force
        Write-Host "[ok] $Label -> $dest (WanD acp-agent.js)"
    }
    return $true
}

$targets = @(
    @{
        Label = 'installed AionUi bundle'
        Path  = Join-Path $InstallDir "AionUi\resources\bundled-aioncore\win32-x64\$relativeDist"
        CreateMissing = $false
    },
    @{
        Label = 'AionUi exe runtime (AppData\Roaming)'
        Path  = Join-Path $env:APPDATA "AionUi\aionui\$packageDist"
        CreateMissing = $true
    },
    @{
        Label = 'AionUi-Dev electron dev runtime'
        Path  = Join-Path $env:APPDATA "AionUi-Dev\aionui\$packageDist"
        CreateMissing = $false
    }
)

$synced = 0
foreach ($t in $targets) {
    $routeOk = Sync-RouteB $t.Label $t.Path ([bool]$t.CreateMissing)
    $agentOk = Sync-AcpAgentPatch $t.Label $t.Path ([bool]$t.CreateMissing)
    if ($routeOk -or $agentOk) { $synced++ }
}

Write-Host ''
Write-Host 'Syntax check skipped on target PC (Node may not be installed).'
Write-Host ''
Write-Host 'Registry fixture: ccb-installer\fixtures\aionui-agent-registry-ccb-wanding.json'
Write-Host 'Direct spawn (no patch): bun dist/cli.js --ccb-acp'
Write-Host "Synced $synced target(s). Restart AionUI after sync."

if ($RestartAionUiWeb) {
    Get-Process -Name 'aionui-web', 'aioncore' -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host 'Stopped aionui-web / aioncore.'
}
