# Verify WanD VPS update feed and local AionUI bundle capability.
# Spec: .trellis/spec/integration/internal-update.md
#
# Usage:
#   .\ccb-installer\scripts\verify-update-server.ps1
#   .\ccb-installer\scripts\verify-update-server.ps1 -InstallDir 'C:\Program Files\CCB-Wanding'

[CmdletBinding()]
param(
    [string]$ManifestUrl = '',
    [string]$InstallDir = ''
)

$ErrorActionPreference = 'Stop'

$defaultUrl = 'http://67.216.206.3/updates/manifest.json'
if (-not $ManifestUrl) {
    $ManifestUrl = if ($env:CCB_UPDATE_MANIFEST_URL) { $env:CCB_UPDATE_MANIFEST_URL }
        elseif ($env:AIONUI_UPDATE_MANIFEST_URL) { $env:AIONUI_UPDATE_MANIFEST_URL }
        else { $defaultUrl }
}

function Write-Section([string]$Title) {
    Write-Host ''
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-AionUiInternalUpdateBundle([string]$AionUiRoot) {
    $asar = Join-Path $AionUiRoot 'resources\app.asar'
    if (-not (Test-Path -LiteralPath $asar)) {
        return [PSCustomObject]@{
            Path = $AionUiRoot
            HasInternalUpdate = $false
            HasGitHubFetch = $false
            Detail = 'app.asar missing'
        }
    }
    $bytes = [System.IO.File]::ReadAllBytes($asar)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    return [PSCustomObject]@{
        Path = $AionUiRoot
        HasInternalUpdate = $text.Contains('isInternalUpdateEnabled')
        HasGitHubFetch = $text.Contains('fetchGitHubReleases')
        Detail = 'app.asar'
    }
}

function Test-AionUiSourceMain([string]$AionUiSrcRoot) {
    $mainJs = Join-Path $AionUiSrcRoot 'out\main\index.js'
    if (-not (Test-Path -LiteralPath $mainJs)) {
        return $null
    }
    $text = Get-Content -LiteralPath $mainJs -Raw
    return [PSCustomObject]@{
        Path = $mainJs
        HasInternalUpdate = $text.Contains('isInternalUpdateEnabled')
        HasGitHubFetch = $text.Contains('fetchGitHubReleases')
    }
}

Write-Section 'Manifest URL'
Write-Host $ManifestUrl

Write-Section 'VPS manifest'
$manifestOk = $false
$manifest = $null
try {
    $resp = Invoke-WebRequest -Uri $ManifestUrl -UseBasicParsing -TimeoutSec 15
    Write-Host "HTTP $($resp.StatusCode)"
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        $manifest = $resp.Content | ConvertFrom-Json
        $manifestOk = $true
        Write-Host "schema_version=$($manifest.schema_version) channel=$($manifest.channel) published_at=$($manifest.published_at)"
        if ($manifest.aionui) {
            Write-Host "aionui.version=$($manifest.aionui.version)"
            Write-Host "aionui.artifact.url=$($manifest.aionui.artifact.url)"
        } else {
            Write-Host 'aionui block: (null)' -ForegroundColor Yellow
        }
        if ($manifest.ccb) {
            Write-Host "ccb.version=$($manifest.ccb.version)"
            if ($manifest.ccb.full_installer) {
                Write-Host "ccb.full_installer.url=$($manifest.ccb.full_installer.url)"
            }
            if ($manifest.ccb.hot_update) {
                Write-Host "ccb.hot_update.url=$($manifest.ccb.hot_update.url)"
            }
        } else {
            Write-Host 'ccb block: (null)' -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Section 'CCB background check'
$ccbScript = Join-Path $PSScriptRoot 'ccb-check-update.ps1'
if (Test-Path -LiteralPath $ccbScript) {
    $env:CCB_UPDATE_MANIFEST_URL = $ManifestUrl
    & $ccbScript -BackgroundCheck
    $available = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\updates\available.json'
    if (Test-Path -LiteralPath $available) {
        Write-Host "available.json:"
        Get-Content -LiteralPath $available -Raw
    } else {
        Write-Host 'available.json not written (manifest unreachable or no newer version)' -ForegroundColor Yellow
    }
} else {
    Write-Host "Skip: $ccbScript not found" -ForegroundColor Yellow
}

Write-Section 'Bundled AionUI (internal update code)'
$candidates = @()
if ($InstallDir) { $candidates += Join-Path $InstallDir 'AionUi' }
$candidates += @(
    (Join-Path $PSScriptRoot '..\AionUi'),
    (Join-Path $PSScriptRoot '..\staging\AionUi'),
    'D:\Projects\aionui-src\out\win-unpacked'
)
$seen = @{}
foreach ($root in $candidates) {
    $full = [System.IO.Path]::GetFullPath($root)
    if ($seen[$full]) { continue }
    $seen[$full] = $true
    if (-not (Test-Path -LiteralPath (Join-Path $full 'AionUi.exe'))) { continue }
    $probe = Test-AionUiInternalUpdateBundle $full
    $color = if ($probe.HasInternalUpdate) { 'Green' } else { 'Red' }
    Write-Host "$($probe.Path)" -ForegroundColor $color
    Write-Host "  internal manifest code: $($probe.HasInternalUpdate)"
    Write-Host "  github release fetch:   $($probe.HasGitHubFetch)"
    if (-not $probe.HasInternalUpdate) {
        Write-Host '  -> Rebuild AionUI from aionui-src and repack CCB-Wanding (build-wanding.ps1 without -SkipAionUiBuild)' -ForegroundColor Yellow
    }
}

$srcMain = Test-AionUiSourceMain 'D:\Projects\aionui-src'
if ($srcMain) {
    Write-Host ''
    Write-Host 'aionui-src compile output (out/main/index.js):' -ForegroundColor Cyan
    Write-Host "  internal manifest code: $($srcMain.HasInternalUpdate)"
    if ($srcMain.HasInternalUpdate) {
        $anyPacked = $false
        foreach ($root in $candidates) {
            $full = [System.IO.Path]::GetFullPath($root)
            if (-not (Test-Path -LiteralPath (Join-Path $full 'AionUi.exe'))) { continue }
            $p = Test-AionUiInternalUpdateBundle $full
            if ($p.HasInternalUpdate) { $anyPacked = $true }
        }
        if (-not $anyPacked) {
            Write-Host '  Source has VPS update code but win-unpacked/app.asar is stale — run build-wanding WITHOUT -SkipAionUiBuild' -ForegroundColor Yellow
        }
    }
}

Write-Section 'Launcher env (ccb-launch-aionui.cmd)'
$launcherCandidates = @(
    (Join-Path $PSScriptRoot '..\ccb-launch-aionui.cmd'),
    (Join-Path $PSScriptRoot '..\staging\ccb-launch-aionui.cmd')
)
if ($InstallDir) { $launcherCandidates = @(Join-Path $InstallDir 'ccb-launch-aionui.cmd') + $launcherCandidates }
foreach ($lf in $launcherCandidates) {
    if (-not (Test-Path -LiteralPath $lf)) { continue }
    $hasDisable = Select-String -LiteralPath $lf -Pattern 'AIONUI_DISABLE_AUTO_UPDATE=1' -Quiet
    $hasManifest = Select-String -LiteralPath $lf -Pattern '67\.216\.206\.3/updates/manifest\.json' -Quiet
    Write-Host "$lf"
    Write-Host "  disable_github=$hasDisable manifest_url=$hasManifest"
    break
}

Write-Section 'Summary'
if (-not $manifestOk) {
    Write-Host 'VPS manifest NOT available — publish with scripts/update/publish-update-bundle.ps1 -Upload' -ForegroundColor Red
    exit 2
}
Write-Host 'VPS manifest reachable.' -ForegroundColor Green
exit 0
