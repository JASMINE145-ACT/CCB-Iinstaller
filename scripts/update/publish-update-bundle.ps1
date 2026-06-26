# DEPRECATED — use ccb-installer/scripts/publish-update-bundle.ps1 (2026-06-23).
# This legacy script includes aionui block + real -Upload scp. WanD 1.0.8+ manifest
# (ccb-only schema + compat gates) lives in the new script. See:
#   ccb-installer/docs/wanding-1.0.8-release-runbook.md §5
#
# Publish WanD unified update manifest + artifacts (local staging or VPS upload).
# Spec: .trellis/spec/integration/internal-update.md
#
# Usage:
#   .\scripts\update\publish-update-bundle.ps1 `
#     -AionUiExe 'D:\out\AionUi-2.1.18-wanding.1-win-x64.exe' `
#     -CcbDistZip 'D:\out\CCB-dist-1.0.4-win-x64.zip' `
#     -CcbNsisExe 'D:\out\CCB-Wanding-1.0.4.exe' `
#     -CcbVersion '1.0.4' `
#     -AionUiVersion '2.1.18-wanding.1' `
#     -StagingDir 'D:\publish\updates'
#
# Optional upload (requires scp/ssh to VPS):
#   -Upload -VpsHost '67.216.206.3' -VpsPath '/var/www/updates' -SshPort 39222

param(
  [Parameter(Mandatory = $true)]
  [string]$AionUiExe,
  [Parameter(Mandatory = $true)]
  [string]$CcbDistZip,
  [Parameter(Mandatory = $true)]
  [string]$CcbNsisExe,
  [Parameter(Mandatory = $true)]
  [string]$CcbVersion,
  [Parameter(Mandatory = $true)]
  [string]$AionUiVersion,
  [string]$StagingDir = '',
  [string]$BaseUrl = 'http://67.216.206.3/updates',
  [ValidateSet('stable', 'dev')]
  [string]$Channel = 'stable',
  [ValidateSet('standalone', 'bundled')]
  [string]$AionUiInstallMode = 'standalone',
  [string]$AionUiReleaseNotes = '',
  [string]$CcbReleaseNotes = '',
  [string]$HotUpdateMinFromVersion = '1.0.0',
  [switch]$Upload,
  [string]$VpsHost = '67.216.206.3',
  [string]$VpsPath = '/var/www/updates',
  [int]$SshPort = 39222
)

$ErrorActionPreference = 'Stop'

function Get-FileSha256Hex([string]$Path) {
  (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-ArtifactBlock([string]$FilePath, [string]$PublicUrl, [string]$ReleaseNotes = '') {
  $item = Get-Item -LiteralPath $FilePath
  $block = @{
    url    = $PublicUrl
    sha256 = (Get-FileSha256Hex $FilePath)
    size   = [int64]$item.Length
  }
  if ($ReleaseNotes) { $block.release_notes = $ReleaseNotes }
  return $block
}

if (-not $StagingDir) {
  $StagingDir = Join-Path $PSScriptRoot '..\..\_publish\updates'
}

$aionUiDir = Join-Path $StagingDir 'aionui'
$ccbDir = Join-Path $StagingDir 'ccb'
New-Item -ItemType Directory -Force -Path $aionUiDir, $ccbDir | Out-Null

$base = $BaseUrl.TrimEnd('/')
$manifestName = if ($Channel -eq 'dev') { 'manifest-dev.json' } else { 'manifest.json' }

foreach ($p in @($AionUiExe, $CcbDistZip, $CcbNsisExe)) {
  if (-not (Test-Path -LiteralPath $p)) { throw "Missing file: $p" }
}

$aionUiName = Split-Path -Leaf $AionUiExe
$distName = Split-Path -Leaf $CcbDistZip
$nsisName = Split-Path -Leaf $CcbNsisExe

Copy-Item -LiteralPath $AionUiExe -Destination (Join-Path $aionUiDir $aionUiName) -Force
Copy-Item -LiteralPath $CcbDistZip -Destination (Join-Path $ccbDir $distName) -Force
Copy-Item -LiteralPath $CcbNsisExe -Destination (Join-Path $ccbDir $nsisName) -Force

$manifest = [ordered]@{
  schema_version = 1
  channel        = $Channel
  published_at   = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')
  aionui         = @{
    version       = $AionUiVersion
    install_mode  = $AionUiInstallMode
    artifact      = (Get-ArtifactBlock (Join-Path $aionUiDir $aionUiName) "$base/aionui/$aionUiName" $AionUiReleaseNotes)
  }
  ccb            = @{
    version         = $CcbVersion
    release_notes   = $CcbReleaseNotes
    hot_update      = @{
      min_from_version = $HotUpdateMinFromVersion
      artifact         = (Get-ArtifactBlock (Join-Path $ccbDir $distName) "$base/ccb/$distName")
    }
    full_installer  = (Get-ArtifactBlock (Join-Path $ccbDir $nsisName) "$base/ccb/$nsisName" $CcbReleaseNotes)
  }
}

$manifestPath = Join-Path $StagingDir $manifestName
$json = $manifest | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($manifestPath, $json, (New-Object System.Text.UTF8Encoding $false))

Write-Host "[OK] Staged under $StagingDir" -ForegroundColor Green
Write-Host "     $manifestPath" -ForegroundColor DarkGray
Write-Host "     aionui sha256=$($manifest.aionui.artifact.sha256.Substring(0,12))..." -ForegroundColor DarkGray
Write-Host "     ccb dist sha256=$($manifest.ccb.hot_update.artifact.sha256.Substring(0,12))..." -ForegroundColor DarkGray

if ($Upload) {
  Write-Host "==> Upload to ${VpsHost}:${VpsPath} (scp -P $SshPort)" -ForegroundColor Cyan
  scp -P $SshPort -r "$StagingDir/*" "root@${VpsHost}:${VpsPath}/"
  Write-Host "[OK] Upload complete" -ForegroundColor Green
}

Write-Host "Employees: set CCB_UPDATE_MANIFEST_URL / AIONUI_UPDATE_MANIFEST_URL to $base/$manifestName" -ForegroundColor Cyan
