# Build a CCB-Wanding production AionUi installer (NSIS + zip).
# Uses the route-b-patched bundled-aioncore from this repo instead of downloading vanilla aioncore.
#
# Usage:
#   cd D:\Projects\claude-code-best
#   .\ccb-installer\scripts\package-aionui-exe.ps1
#   .\ccb-installer\scripts\package-aionui-exe.ps1 -SkipVite   # reuse existing out/

[CmdletBinding()]
param(
    [switch]$SkipVite
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$aionuiSrc = 'D:\Projects\aionui-src'
$ccbBundle = Join-Path $repoRoot 'AionUi\resources\bundled-aioncore\win32-x64'
$destRoot = Join-Path $aionuiSrc 'resources\bundled-aioncore'
$destBundle = Join-Path $destRoot 'win32-x64'
$routeBIndex = Join-Path $repoRoot 'ccb-installer\patches\aionui-ccb-route-b\index.js'
$routeBRel = 'managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js'

if (-not (Test-Path $aionuiSrc)) {
    throw "AionUI source not found: $aionuiSrc"
}
if (-not (Test-Path $ccbBundle)) {
    throw "CCB bundled-aioncore missing: $ccbBundle"
}

Write-Host '[1/6] Sync route-b into repo AionUi bundle...' -ForegroundColor Cyan
& (Join-Path $repoRoot 'ccb-installer\scripts\sync-aionui-ccb-route-b.ps1')

Write-Host '[2/6] Stop running AionUi / Electron / aioncore...' -ForegroundColor Cyan
Get-Process -Name AionUi, electron, aioncore -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host '[3/6] Vite + MCP bundle (pack-only, no vanilla aioncore download)...' -ForegroundColor Cyan
Set-Location $aionuiSrc
$packArgs = @('scripts/build-with-builder.js', 'auto', '--win', '--pack-only')
if ($SkipVite) { $packArgs += '--skip-vite' }
& node @packArgs
if ($LASTEXITCODE -ne 0) { throw "build-with-builder --pack-only failed with exit code $LASTEXITCODE" }

Write-Host '[4/6] Copy CCB-Wanding bundled-aioncore (route-b patched)...' -ForegroundColor Cyan
if (Test-Path $destBundle) {
    Remove-Item $destBundle -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
$robocopyArgs = @($ccbBundle, $destBundle, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS')
$proc = Start-Process -FilePath 'robocopy.exe' -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
if ($proc.ExitCode -gt 7) {
    throw "robocopy bundled-aioncore failed with exit code $($proc.ExitCode)"
}

$routeBDest = Join-Path $destBundle $routeBRel
if (-not (Test-Path $routeBDest)) {
    throw "Route B slot missing after copy: $routeBDest"
}
Copy-Item $routeBIndex $routeBDest -Force
Write-Host "  route-b verified: $routeBDest" -ForegroundColor DarkGray

Write-Host '[5/6] Prepare hub offline resources...' -ForegroundColor Cyan
& node (Join-Path $aionuiSrc 'scripts\prepareHubResources.js')
if ($LASTEXITCODE -ne 0) { throw "prepareHubResources failed" }

Write-Host '[6/6] electron-builder (NSIS installer + zip)...' -ForegroundColor Cyan
$winUnpacked = Join-Path $aionuiSrc 'out\win-unpacked'
if (Test-Path $winUnpacked) {
    Remove-Item $winUnpacked -Recurse -Force -ErrorAction SilentlyContinue
}
& bunx electron-builder --config packages/desktop/electron-builder.yml --win --x64 --publish=never
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed with exit code $LASTEXITCODE" }

$artifacts = Get-ChildItem (Join-Path $aionuiSrc 'out') -File |
    Where-Object { $_.Extension -in '.exe', '.zip' -and $_.Name -like 'AionUi-*' } |
    Sort-Object LastWriteTime -Descending

Write-Host ''
Write-Host 'Build complete.' -ForegroundColor Green
foreach ($a in $artifacts) {
    Write-Host "  $($a.FullName)" -ForegroundColor Green
}
Write-Host ''
Write-Host 'Install: run the NSIS .exe, or unzip the .zip and launch AionUi.exe.' -ForegroundColor Cyan
Write-Host 'Prod data dir: %APPDATA%\AionUi\' -ForegroundColor DarkGray
