param(
  [switch]$Clean,
  [string]$InstallDir = 'D:\CCB-Wanding',
  [ValidateSet('Full', 'Quick')]
  [string]$BootstrapMode = 'Quick',
  [switch]$SkipBootstrap
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

if (-not (Test-Path -LiteralPath (Join-Path $InstallDir 'scripts\run-wanding-bootstrap.ps1'))) {
  $stagingInstall = Join-Path $repoRoot 'ccb-installer\staging'
  if (Test-Path -LiteralPath (Join-Path $stagingInstall 'scripts\run-wanding-bootstrap.ps1')) {
    Write-Host "InstallDir not found or incomplete: $InstallDir" -ForegroundColor Yellow
    Write-Host "Falling back to staging baseline: $stagingInstall" -ForegroundColor Yellow
    $InstallDir = $stagingInstall
  } else {
    throw "CCB-Wanding 1.1.2 install baseline missing: $InstallDir"
  }
}

$configDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
$logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
$logFile = Join-Path $logDir 'dev-aionui-bootstrap.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$env:CCB_INSTALL_DIR = $InstallDir
$env:CCB_WANDING_HOME = $InstallDir
$env:CCB_WANDING_CONFIG_DIR = $configDir
$env:AIONUI_DISABLE_AUTO_UPDATE = '1'
if (-not $env:CCB_UPDATE_MANIFEST_URL) {
  $env:CCB_UPDATE_MANIFEST_URL = 'http://67.216.206.3/updates/manifest.json'
}
if (-not $env:AIONUI_UPDATE_MANIFEST_URL) {
  $env:AIONUI_UPDATE_MANIFEST_URL = $env:CCB_UPDATE_MANIFEST_URL
}

if (-not $SkipBootstrap) {
  Write-Host "Bootstrapping CCB-Wanding dev baseline ($BootstrapMode): $InstallDir" -ForegroundColor Cyan
  & (Join-Path $InstallDir 'scripts\run-wanding-bootstrap.ps1') -InstallDir $InstallDir -ConfigDir $configDir -Mode $BootstrapMode -LogFile $logFile
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "run-wanding-bootstrap failed with exit code $LASTEXITCODE; see $logFile"
  }
} else {
  Write-Host 'Skipping CCB-Wanding bootstrap (-SkipBootstrap).' -ForegroundColor Yellow
}

Write-Host 'Syncing Route B patch into dev/runtime slots...' -ForegroundColor Cyan
& (Join-Path $repoRoot 'ccb-installer\scripts\sync-aionui-ccb-route-b.ps1') -InstallDir $InstallDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
  throw "sync-aionui-ccb-route-b failed with exit code $LASTEXITCODE"
}

# Prefer self-built aioncore (has work-tasks API) over bundled v0.1.27 (no work-tasks).
# To fall back to bundled, comment out the first line.
$selfBuiltCore = 'D:\Projects\claude-code-best\AionCore\target\release'
$bundledCore   = Join-Path $InstallDir 'AionUi\resources\bundled-aioncore\win32-x64'
$env:PATH = "$selfBuiltCore;$bundledCore;$env:PATH"
Set-Location 'D:\Projects\aionui-src'

Write-Host 'Stopping stale AionUI/Electron processes...' -ForegroundColor Yellow
Get-Process -Name electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if ($Clean) {
  Write-Host 'Clearing Vite/Electron build cache (-Clean)...' -ForegroundColor Yellow
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
    'D:\Projects\aionui-src\packages\desktop\out', `
    'D:\Projects\aionui-src\node_modules\.vite', `
    'D:\Projects\aionui-src\packages\desktop\node_modules\.vite'
} else {
  Write-Host 'Keeping Vite cache (pass -Clean to wipe; first start after wipe can white-screen ~1-2 min).' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '  ⚠  DO NOT press Ctrl+R in the Electron window.' -ForegroundColor Yellow
Write-Host '     White screen after Ctrl+R = quit app fully and rerun this script.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Starting AionUI dev (bundled aioncore on PATH)...' -ForegroundColor Cyan
Write-Host "  aioncore: $bundledCore" -ForegroundColor DarkGray
Write-Host "  CCB baseline: $InstallDir" -ForegroundColor DarkGray
Write-Host "  CCB config: $configDir" -ForegroundColor DarkGray
Write-Host '  renderer: http://localhost:5173/' -ForegroundColor DarkGray
Write-Host '  AIONUI_BYPASS_AUTH=1 (desktop dev: skip login page)' -ForegroundColor DarkGray
Write-Host '  For unified org SSO (no bypass): scripts\org-phase0\start-aionui-dev-org-test.ps1' -ForegroundColor DarkGray

# Desktop dev: skip login UI + local JWT bypass (see AuthContext + aionui-auth middleware).
$env:AIONUI_BYPASS_AUTH = '1'

# Windows dev: GPU already auto-disabled after repeated crashes (gpu.config.json).
# --disable-gpu completely disables the GPU process; --disable-gpu-compositing alone is
# insufficient when the renderer process has crashed 8+ times.
$env:ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
if (-not $env:ELECTRON_EXTRA_LAUNCH_ARGS) {
  $env:ELECTRON_EXTRA_LAUNCH_ARGS = '--disable-gpu --disable-gpu-compositing --disable-software-rasterizer'
}

bun run dev
