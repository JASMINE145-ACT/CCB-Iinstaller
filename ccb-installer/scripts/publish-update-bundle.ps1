<#
.SYNOPSIS
  Generate (and optionally upload) a unified update manifest for the CCB-Wanding update feed.

.DESCRIPTION
  Computes sha256 for the provided hot zip and/or NSIS installer, then writes a
  unified manifest.json matching the schema in spec/integration/internal-update.md §2.1-2.5.

  Upload (-Upload) is a stub — fill in scp / WinSCP / MCP deploy call for your environment.

.PARAMETER Version
  CCB version string to publish (e.g. "1.0.8"). Required.

.PARAMETER HotZipPath
  Path to CCB hot-update zip (CCB-dist-{version}-win-x64.zip). If omitted, hot_update block is null.

.PARAMETER InstallerPath
  Path to full NSIS installer (CCB-Wanding-{version}.exe). Required.

.PARAMETER BaseUrl
  Public base URL of the update feed (no trailing slash).
  Default: http://67.216.206.3/updates

.PARAMETER MinFromVersion
  Minimum installed CCB version eligible for hot update (e.g. "1.0.0"). Required when HotZipPath given.

.PARAMETER MaxFromVersion
  Maximum installed CCB version eligible for hot update. If installed is above this, falls back to full
  NSIS. Omit if no upper bound.

.PARAMETER LayoutVersion
  Hot-zip layout version integer. Clients with SupportedHotLayoutVersion < this will skip hot update.
  Default: 1

.PARAMETER RequiresFullInstall
  If $true, clients will always use the full NSIS installer for this release, ignoring the hot zip.
  Default: $false

.PARAMETER ReleaseNotes
  Freeform release notes string (markdown ok).

.PARAMETER OutFile
  Path to write the manifest JSON. Default: .\staging-manifest.json

.PARAMETER Channel
  "stable" or "dev". Default: stable

.PARAMETER Upload
  Stub: when set, print the scp command that would upload manifest + artifacts to VPS.
  Actual upload not implemented — add your transfer logic here.

.PARAMETER WhatIf
  Print the manifest JSON to stdout without writing to disk.

.EXAMPLE
  .\publish-update-bundle.ps1 -Version 1.0.8 `
      -HotZipPath .\dist\CCB-dist-1.0.8-win-x64.zip `
      -InstallerPath .\CCB-Wanding-1.0.8.exe `
      -MinFromVersion 1.0.0 -MaxFromVersion 1.0.12 `
      -ReleaseNotes "热更支持 scripts/；state.json 追踪" `
      -WhatIf
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Version,
    [string]$HotZipPath,
    [Parameter(Mandatory)][string]$InstallerPath,
    [string]$BaseUrl = 'http://67.216.206.3/updates',
    [string]$MinFromVersion,
    [string]$MaxFromVersion,
    [int]$LayoutVersion = 1,
    [bool]$RequiresFullInstall = $false,
    [string]$ReleaseNotes = '',
    [string]$OutFile = '.\staging-manifest.json',
    [ValidateSet('stable','dev')][string]$Channel = 'stable',
    [switch]$Upload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Sha256([string]$Path) {
    if (-not (Test-Path $Path)) { throw "File not found: $Path" }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-FileBytes([string]$Path) {
    return (Get-Item $Path).Length
}

# --- Full installer block (required) ---
if (-not (Test-Path $InstallerPath)) { throw "InstallerPath not found: $InstallerPath" }
$installerName = "CCB-Wanding-$Version.exe"
$fullBlock = [ordered]@{
    url          = "$BaseUrl/ccb/$installerName"
    sha256       = Get-Sha256 $InstallerPath
    size         = Get-FileBytes $InstallerPath
    release_notes = $ReleaseNotes
}

# --- Hot update block (optional) ---
$hotBlock = $null
if ($HotZipPath) {
    if (-not (Test-Path $HotZipPath)) { throw "HotZipPath not found: $HotZipPath" }
    if (-not $MinFromVersion) { throw "-MinFromVersion is required when -HotZipPath is specified" }
    $hotZipName = "CCB-dist-$Version-win-x64.zip"

    $artifact = [ordered]@{
        url    = "$BaseUrl/ccb/$hotZipName"
        sha256 = Get-Sha256 $HotZipPath
        size   = Get-FileBytes $HotZipPath
    }

    $hotBlock = [ordered]@{
        artifact              = $artifact
        min_from_version      = $MinFromVersion
        layout_version        = $LayoutVersion
        requires_full_install = $RequiresFullInstall
    }
    if ($MaxFromVersion) { $hotBlock['max_from_version'] = $MaxFromVersion }
}

# --- Manifest assembly ---
$manifest = [ordered]@{
    schema_version = 1
    channel        = $Channel
    published_at   = (Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz')
    aionui         = $null
    ccb            = [ordered]@{
        version        = $Version
        release_notes  = $ReleaseNotes
        hot_update     = $hotBlock
        full_installer = $fullBlock
    }
}

$json = $manifest | ConvertTo-Json -Depth 10

if ($WhatIfPreference) {
    Write-Host $json
} else {
    $outResolved = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutFile)
    $outDir = Split-Path -Parent $outResolved
    if ($outDir -and -not (Test-Path -LiteralPath $outDir)) {
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    }
    [System.IO.File]::WriteAllText($outResolved, $json, [System.Text.UTF8Encoding]::new($false))
    Write-Host "[publish-update-bundle] Manifest written to: $outResolved"
}

if ($Upload) {
    # TODO: implement actual upload — example scp commands:
    Write-Host ''
    Write-Host '[publish-update-bundle] Upload stub (not implemented). Run these manually:'
    Write-Host "  scp -P 39222 `"$InstallerPath`" root@67.216.206.3:/var/www/updates/ccb/$installerName"
    if ($HotZipPath) {
        $hotZipName2 = "CCB-dist-$Version-win-x64.zip"
        Write-Host "  scp -P 39222 `"$HotZipPath`" root@67.216.206.3:/var/www/updates/ccb/$hotZipName2"
    }
    Write-Host "  scp -P 39222 `"$OutFile`" root@67.216.206.3:/var/www/updates/manifest.json"
}
