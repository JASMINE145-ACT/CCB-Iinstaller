# Apply CCB-Wanding hot-update zip (dist + vendor subset per whitelist §16.1).
# Spec: .trellis/spec/integration/internal-update.md §3.4
#
# Usage:
#   .\ccb-installer\scripts\internal-upgrade.ps1 `
#     -ZipPath 'D:\Downloads\CCB-dist-1.0.4-win-x64.zip' `
#     -ExpectedVersion '1.0.4'

param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath,
  [Parameter(Mandatory = $true)]
  [string]$ExpectedVersion,
  [string]$InstallDir = '',
  [string]$ExpectedSha256 = '',
  [switch]$SkipHealthProbe
)

$ErrorActionPreference = 'Stop'

function Resolve-CcbInstallDir {
  param([string]$Override)
  if ($Override -and (Test-Path -LiteralPath $Override)) {
    return (Resolve-Path -LiteralPath $Override).Path
  }
  $registryInstall = ''
  try {
    $key = Get-ItemProperty -Path 'HKCU:\Software\CCB-Wanding\CCB-Wanding' -ErrorAction Stop
    $registryInstall = [string]$key.InstallDir
  } catch {
    $registryInstall = ''
  }
  foreach ($c in @(
    $registryInstall,
    (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'),
    'D:\CCB-Wanding'
  )) {
    if (-not $c) { continue }
    if (Test-Path -LiteralPath $c) {
      return (Resolve-Path -LiteralPath $c).Path
    }
  }
  throw 'CCB-Wanding install dir not found. Pass -InstallDir.'
}

function Test-ValidSha256Hex([string]$ExpectedHex) {
  $h = "$ExpectedHex".Trim().ToLowerInvariant()
  return ($h -match '^[a-f0-9]{64}$')
}

function Test-FileSha256([string]$Path, [string]$ExpectedHex) {
  if (-not (Test-ValidSha256Hex $ExpectedHex)) { return $false }
  $hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
  return ($hash -eq $ExpectedHex.Trim().ToLowerInvariant())
}

function Copy-Tree([string]$Source, [string]$Dest) {
  if (-not (Test-Path -LiteralPath $Source)) { return }
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  robocopy $Source $Dest /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $Source -> $Dest" }
}

function Mirror-Tree([string]$Source, [string]$Dest) {
  if (-not (Test-Path -LiteralPath $Source)) { return }
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  robocopy $Source $Dest /MIR /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy mirror failed ($LASTEXITCODE): $Source -> $Dest" }
}

$HotPaths = @(
  'dist',
  'scripts',
  'vendor\wanding\python',
  'vendor\wanding\data',
  'vendor\mcp-servers\quotation-server\dist',
  'vendor\mcp-servers\quotation-server\node_modules',
  'vendor\mcp-servers\accurate-mcp',
  'vendor\mcp-servers\office-word-mcp',
  'vendor\mcp-servers\excel-mcp-server',
  'seed\agents',
  'seed\skills\ccb-subagent-gate'
)

if (-not (Test-Path -LiteralPath $ZipPath)) { throw "Zip not found: $ZipPath" }
if (-not (Test-ValidSha256Hex $ExpectedSha256)) { throw 'ExpectedSha256 must be 64-char hex' }
if (-not (Test-FileSha256 $ZipPath $ExpectedSha256)) { throw 'Zip SHA-256 mismatch' }

$install = Resolve-CcbInstallDir -Override $InstallDir

$markerPath = Join-Path $install '.ccb-wanding-install-root'
$aionUiExe = Join-Path $install 'AionUi\AionUi.exe'
$bootstrapPs1 = Join-Path $install 'scripts\run-wanding-bootstrap.ps1'
if (-not (Test-Path -LiteralPath $markerPath)) {
  throw @"
Hot update refused: install marker missing at $markerPath.
This usually means a half-install (e.g. hot zip without full NSIS).
Run full CCB-Wanding NSIS installer first, or repair:
  .\ccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir '$install'
"@
}
if (-not (Test-Path -LiteralPath $aionUiExe)) {
  throw "Hot update refused: missing $aionUiExe — use full NSIS installer, not hot zip alone."
}
if (-not (Test-Path -LiteralPath $bootstrapPs1)) {
  throw "Hot update refused: missing $bootstrapPs1 — use full NSIS installer."
}

$config = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $env:LOCALAPPDATA "CCB-Wanding\backup-before-$ExpectedVersion-$ts"
$extractRoot = Join-Path $env:TEMP "ccb-hot-update-$ts"

Write-Host "==> Install: $install" -ForegroundColor Cyan
Write-Host "==> Backup:  $backupRoot" -ForegroundColor DarkGray

New-Item -ItemType Directory -Force -Path $backupRoot, $extractRoot | Out-Null

foreach ($rel in $HotPaths) {
  $src = Join-Path $install $rel
  $bak = Join-Path $backupRoot $rel
  if (Test-Path -LiteralPath $src) {
    Copy-Tree $src $bak
  }
}

Write-Host "==> Extract zip" -ForegroundColor Cyan
Expand-Archive -LiteralPath $ZipPath -DestinationPath $extractRoot -Force

$extractInstall = $extractRoot
if (Test-Path -LiteralPath (Join-Path $extractRoot 'dist')) {
  $extractInstall = $extractRoot
} elseif (Test-Path -LiteralPath (Join-Path $extractRoot 'CCB-Wanding\dist')) {
  $extractInstall = Join-Path $extractRoot 'CCB-Wanding'
}

try {
  foreach ($rel in $HotPaths) {
    $from = Join-Path $extractInstall $rel
    $to = Join-Path $install $rel
    if (Test-Path -LiteralPath $from) {
      Write-Host "    apply $rel" -ForegroundColor DarkGray
      if ($rel -eq 'dist') {
        Mirror-Tree $from $to
      } else {
        Copy-Tree $from $to
      }
    }
  }

  $versionFile = Join-Path $install 'dist\VERSION'
  if (Test-Path -LiteralPath $versionFile) {
    $actual = (Get-Content -LiteralPath $versionFile -Raw).Trim()
    if ($actual -ne $ExpectedVersion) {
      Write-Warning "dist/VERSION is '$actual' (expected '$ExpectedVersion')"
    }
  }

  $ensure = Join-Path $install 'scripts\ensure-wanding-settings.ps1'
  if (-not (Test-Path -LiteralPath $ensure)) {
    $ensure = Join-Path $repoRoot 'ccb-installer\scripts\ensure-wanding-settings.ps1'
  }
  if (Test-Path -LiteralPath $ensure) {
    Write-Host "==> ensure-wanding-settings" -ForegroundColor Cyan
    & $ensure -InstallDir $install -ConfigDir $config
  }

  $seed = Join-Path $install 'scripts\deploy-seed-agents.ps1'
  if (-not (Test-Path -LiteralPath $seed)) {
    $seed = Join-Path $repoRoot 'ccb-installer\scripts\deploy-seed-agents.ps1'
  }
  if (Test-Path -LiteralPath $seed) {
    Write-Host "==> deploy-seed-agents (-ForceMd: hot update overwrites agent rules)" -ForegroundColor Cyan
    & $seed -ConfigDir (Join-Path $config 'agents') -ForceMd
    $gate = Join-Path $install 'scripts\patch-subagent-gate-hooks.ps1'
    if (-not (Test-Path -LiteralPath $gate)) {
      $gate = Join-Path $repoRoot 'ccb-installer\scripts\patch-subagent-gate-hooks.ps1'
    }
    if ((Test-Path -LiteralPath $gate) -and (Test-Path -LiteralPath (Join-Path $install 'seed\skills\ccb-subagent-gate'))) {
      Write-Host "==> patch-subagent-gate-hooks" -ForegroundColor Cyan
      & $gate -AgentsDir (Join-Path $config 'agents')
    }
  }

  $sync = Join-Path $install 'scripts\sync-aionui-ccb-route-b.ps1'
  if (-not (Test-Path -LiteralPath $sync)) {
    $sync = Join-Path $repoRoot 'ccb-installer\scripts\sync-aionui-ccb-route-b.ps1'
  }
  if ((Test-Path -LiteralPath $sync) -and (Test-Path -LiteralPath (Join-Path $install 'AionUi\AionUi.exe'))) {
    Write-Host "==> sync-aionui-ccb-route-b" -ForegroundColor Cyan
    & $sync -InstallDir $install
  }

  if (-not $SkipHealthProbe) {
    $health = Join-Path $repoRoot 'ccb-installer\scripts\test-mcp-health.ps1'
    if (Test-Path -LiteralPath $health) {
      Write-Host "==> test-mcp-health -Probe" -ForegroundColor Cyan
      & $health -InstallDir $install -ConfigDir $config -Probe
      if ($LASTEXITCODE -ne 0) { throw 'MCP health probe failed after hot update' }
    }
  }

  Write-Host "[OK] Hot update $ExpectedVersion applied. Backup: $backupRoot" -ForegroundColor Green
}
catch {
  Write-Host "[ROLLBACK] $_" -ForegroundColor Red
  foreach ($rel in $HotPaths) {
    $bak = Join-Path $backupRoot $rel
    $to = Join-Path $install $rel
    if (Test-Path -LiteralPath $bak) {
      if (Test-Path -LiteralPath $to) { Remove-Item -LiteralPath $to -Recurse -Force -ErrorAction SilentlyContinue }
      Copy-Tree $bak $to
    }
  }
  throw
}
finally {
  Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
}
