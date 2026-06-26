param(
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
$workTasksCore = 'D:\Projects\claude-code-best\AionCore\target\release'
$bundledCore = 'D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64'

if (-not (Test-Path (Join-Path $workTasksCore 'aioncore.exe'))) {
  Write-Error "Self-built aioncore missing. Run: scripts\build-aioncore-work-tasks.cmd"
}

# Self-built first (has /api/work-tasks); bundled second (managed-resources paths)
$env:PATH = "$workTasksCore;$bundledCore;$env:PATH"
Set-Location 'D:\Projects\aionui-src'

Write-Host 'Stopping stale AionUI/Electron/aioncore processes...' -ForegroundColor Yellow
Get-Process -Name electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if ($Clean) {
  Write-Host 'Clearing Vite/Electron build cache (-Clean)...' -ForegroundColor Yellow
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
    'D:\Projects\aionui-src\packages\desktop\out', `
    'D:\Projects\aionui-src\node_modules\.vite', `
    'D:\Projects\aionui-src\packages\desktop\node_modules\.vite'
}

Write-Host ''
Write-Host 'Starting AionUI dev (work-tasks aioncore on PATH)...' -ForegroundColor Cyan
Write-Host "  aioncore (work-tasks): $workTasksCore" -ForegroundColor DarkGray
Write-Host "  aioncore (bundled fallback): $bundledCore" -ForegroundColor DarkGray
Write-Host '  Open sidebar 任务 -> /tasks to smoke CRUD' -ForegroundColor DarkGray
Write-Host '  AIONUI_BYPASS_AUTH=1 (no login page in desktop dev)' -ForegroundColor DarkGray
Write-Host ''

# Skip login + local JWT for desktop dev hot-reload. Remove before org-login ship testing.
$env:AIONUI_BYPASS_AUTH = '1'

$env:ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
if (-not $env:ELECTRON_EXTRA_LAUNCH_ARGS) {
  $env:ELECTRON_EXTRA_LAUNCH_ARGS = '--disable-gpu --disable-gpu-compositing --disable-software-rasterizer'
}

bun run dev
