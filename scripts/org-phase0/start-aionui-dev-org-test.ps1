# RETIRED — use ccb-installer/scripts/start-dev-full.ps1 (canonical sole dev entry).
# Org SSO env (org-idp, JWT_SECRET, no bypass) is loaded by start-dev-full.ps1.

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '[RETIRED] start-aionui-dev-org-test.ps1 — redirecting to canonical start-dev-full.ps1' -ForegroundColor Yellow
Write-Host ''

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
& (Join-Path $repoRoot 'ccb-installer\scripts\start-dev-full.ps1') -SkipBootstrap
exit $LASTEXITCODE
