# Trial smoke: CCB hot-update apply + rollback path (Phase 1 acceptance helper).
# Spec: .trellis/spec/integration/internal-update.md §6.1
#
# Usage:
#   .\ccb-installer\scripts\smoke-hot-update-trial.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
#   .\ccb-installer\scripts\smoke-hot-update-trial.ps1 -ZipPath '...\CCB-dist-1.0.2-win-x64.zip' -ExpectedVersion 1.0.2

[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [string]$ZipPath = '',
    [string]$ExpectedVersion = '',
    [switch]$SkipHealthProbe
)

$ErrorActionPreference = 'Stop'

if (-not $InstallDir) {
    $InstallDir = if ($env:CCB_WANDING_HOME) { $env:CCB_WANDING_HOME }
        else { Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding' }
}

$upgradeScript = Join-Path $PSScriptRoot 'internal-upgrade.ps1'
$healthScript = Join-Path $PSScriptRoot 'test-mcp-health.ps1'

if (-not (Test-Path -LiteralPath $upgradeScript)) {
    throw "Missing $upgradeScript"
}

Write-Host "==> Trial smoke on $InstallDir" -ForegroundColor Cyan

if (-not $ZipPath) {
    $hotDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'out\hot'
    $zip = Get-ChildItem -LiteralPath $hotDir -Filter 'CCB-dist-*-win-x64.zip' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $zip) {
        throw "No hot zip found under $hotDir. Run build-wanding-hot.ps1 first."
    }
    $ZipPath = $zip.FullName
    if (-not $ExpectedVersion) {
        if ($ZipPath -match 'CCB-dist-([\d.]+)-win-x64\.zip$') {
            $ExpectedVersion = $Matches[1]
        }
    }
}

if (-not $ExpectedVersion) {
    throw 'ExpectedVersion required (or use a standard CCB-dist-x.y.z-win-x64.zip name).'
}

$shaPath = "$ZipPath.sha256"
$ExpectedSha256 = ''
if (Test-Path -LiteralPath $shaPath) {
    $ExpectedSha256 = (Get-Content -LiteralPath $shaPath -Raw).Trim()
}

Write-Host "Zip: $ZipPath" -ForegroundColor DarkGray
Write-Host "ExpectedVersion: $ExpectedVersion" -ForegroundColor DarkGray

$upgradeParams = @{
    ZipPath          = $ZipPath
    ExpectedVersion  = $ExpectedVersion
    InstallDir       = $InstallDir
}
if ($ExpectedSha256) { $upgradeParams.ExpectedSha256 = $ExpectedSha256 }
if ($SkipHealthProbe) { $upgradeParams.SkipHealthProbe = $true }

& $upgradeScript @upgradeParams
if ($LASTEXITCODE -ne 0) {
    throw "internal-upgrade failed with exit $LASTEXITCODE"
}

if (-not $SkipHealthProbe -and (Test-Path -LiteralPath $healthScript)) {
    & $healthScript -InstallDir $InstallDir -Probe
    if ($LASTEXITCODE -ne 0) {
        throw "test-mcp-health -Probe failed with exit $LASTEXITCODE"
    }
}

$versionFile = Join-Path $InstallDir 'dist\VERSION'
if (Test-Path -LiteralPath $versionFile) {
    Write-Host "[OK] dist/VERSION = $(Get-Content -LiteralPath $versionFile -Raw)" -ForegroundColor Green
} else {
    Write-Host '[WARN] dist/VERSION not written (registry-only install?)' -ForegroundColor Yellow
}

Write-Host '[OK] Trial hot-update smoke passed' -ForegroundColor Green
