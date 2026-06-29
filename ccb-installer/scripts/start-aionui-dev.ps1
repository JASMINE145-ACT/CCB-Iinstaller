# RETIRED — use start-dev-full.ps1 (canonical sole dev entry).
# See .trellis/spec/integration/dev-sync-playbook.md § Rule 0.

param(
  [switch]$Clean,
  [string]$InstallDir = 'D:\CCB-Wanding',
  [ValidateSet('Full', 'Quick')]
  [string]$BootstrapMode = 'Quick',
  [switch]$SkipBootstrap
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '[RETIRED] start-aionui-dev.ps1 — redirecting to canonical start-dev-full.ps1' -ForegroundColor Yellow
Write-Host '  Rule 0: no bypass-auth dev; no alternate launchers.' -ForegroundColor DarkGray
Write-Host ''

$forward = @{
  InstallDir = $InstallDir
}
if ($Clean) { $forward.Clean = $true }
if ($SkipBootstrap) { $forward.SkipBootstrap = $true }
elseif ($BootstrapMode -eq 'Quick') { $forward.SkipBootstrap = $true }

& (Join-Path $PSScriptRoot 'start-dev-full.ps1') @forward
exit $LASTEXITCODE
