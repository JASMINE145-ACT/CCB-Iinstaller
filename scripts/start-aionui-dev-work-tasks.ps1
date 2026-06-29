# RETIRED — use ccb-installer/scripts/start-dev-full.ps1 (canonical sole dev entry).
# Work-tasks routes are wired into the self-built aioncore synced by start-dev-full.ps1.

param(
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '[RETIRED] start-aionui-dev-work-tasks.ps1 — redirecting to canonical start-dev-full.ps1' -ForegroundColor Yellow
Write-Host ''

$repoRoot = Split-Path $PSScriptRoot -Parent
$forward = @{ SkipBootstrap = $true; BuildAioncore = $true }
if ($Clean) { $forward.Clean = $true }

& (Join-Path $repoRoot 'ccb-installer\scripts\start-dev-full.ps1') @forward
exit $LASTEXITCODE
