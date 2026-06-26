# Recover the WanD "new UI" (Mixing + 万鼎报价专家 Guid cards).
# Use bundled 1.1.2 from D:\CCB-Wanding — NOT aionui-src dev (shows upstream AionUi cards).
#
# Usage:
#   .\ccb-installer\scripts\recover-aionui-new-ui.ps1
#   .\ccb-installer\scripts\recover-aionui-new-ui.ps1 -InstallDir D:\CCB-Wanding

param(
  [string]$InstallDir = 'D:\CCB-Wanding'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$configDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
$logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
$logFile = Join-Path $logDir 'recover-new-ui.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not (Test-Path (Join-Path $InstallDir 'AionUi\AionUi.exe'))) {
  $staging = Join-Path $repoRoot 'ccb-installer\staging'
  if (Test-Path (Join-Path $staging 'AionUi\AionUi.exe')) {
    Write-Host "InstallDir incomplete; copying staging baseline to $InstallDir" -ForegroundColor Yellow
    & (Join-Path $repoRoot 'ccb-installer\scripts\repair-wanding-install-dir.ps1') -InstallDir $InstallDir -Force
  } else {
    throw "Missing AionUi.exe under $InstallDir and no staging fallback."
  }
}

if (-not (Test-Path (Join-Path $InstallDir 'scripts\run-wanding-bootstrap.ps1'))) {
  throw "Missing run-wanding-bootstrap.ps1 under $InstallDir — repair install from ccb-installer/staging first."
}

Write-Host 'Stopping AionUI processes...' -ForegroundColor Yellow
Get-Process -Name AionUi, AionUiLauncher -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Bootstrapping CCB-Wanding ($InstallDir)..." -ForegroundColor Cyan
& (Join-Path $InstallDir 'scripts\run-wanding-bootstrap.ps1') -InstallDir $InstallDir -ConfigDir $configDir -Mode Quick -LogFile $logFile
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
  throw "Bootstrap failed (exit $LASTEXITCODE). See $logFile"
}

Write-Host 'Syncing Route B into runtime slots...' -ForegroundColor Cyan
& (Join-Path $repoRoot 'ccb-installer\scripts\sync-aionui-ccb-route-b.ps1') -InstallDir $InstallDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
  throw "Route-B sync failed (exit $LASTEXITCODE)."
}

$agentsDir = Join-Path $configDir 'agents'
$quotationSidecar = Join-Path $agentsDir 'quotation-agent.aionui.json'
if (-not (Test-Path $quotationSidecar)) {
  throw "Missing quotation agent sidecar: $quotationSidecar"
}
$q = Get-Content $quotationSidecar -Raw | ConvertFrom-Json
if ($q.display_name -notmatch '报价' -or $q.guid_primary -ne $true) {
  throw "quotation-agent sidecar invalid: display_name=$($q.display_name) guid_primary=$($q.guid_primary)"
}
Write-Host "Agent check: $($q.display_name) guid_primary=$($q.guid_primary) source=$($q.source)" -ForegroundColor Green

$orgJson = Join-Path $env:APPDATA 'AionUi\aionui\org-server.json'
if (-not (Test-Path $orgJson)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $orgJson -Parent) | Out-Null
  @{ url = 'http://67.216.206.3:13401' } | ConvertTo-Json -Compress |
    Set-Content -Path $orgJson -Encoding UTF8
  Write-Host "Created $orgJson" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Launching bundled AionUI (Mixing / 1.1.2)...' -ForegroundColor Cyan
Write-Host '  Window title should be "Mixing", not "AionUi".' -ForegroundColor DarkGray
Write-Host '  Login: org SSO (yjc / employee password from org-phase0 env.local).' -ForegroundColor DarkGray
Write-Host '  Guid cards: 万鼎报价专家, 万鼎账务专家, Cowork, ...' -ForegroundColor DarkGray
Write-Host '  Do NOT use start-aionui-dev.ps1 for this UI — that is upstream dev.' -ForegroundColor Yellow
Write-Host ''

$env:CCB_NO_PAUSE = '1'
& (Join-Path $InstallDir 'ccb-launch-aionui.cmd')
