# Build self-compiled aioncore with work-tasks API (Windows)
# Requires Rust + VS 2022 Build Tools (C++). Uses vcvars via .cmd wrapper.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$BuildCmd = Join-Path $PSScriptRoot 'build-aioncore-work-tasks.cmd'
$AionCore = Join-Path $Root 'AionCore'

if (-not (Test-Path $AionCore)) {
  Write-Error "AionCore fork not found at $AionCore. Clone iOfficeAI/AionCore or copy from .tmp-aioncore-probe."
}

& $BuildCmd
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$bin = Join-Path $AionCore 'target\release\aioncore.exe'
Write-Host "Built: $bin"
Write-Host "Dev: .\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap"
