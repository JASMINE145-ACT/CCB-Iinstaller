param(
  [int]$Port = 13401,
  [string]$DataDir = 'D:\Projects\claude-code-best\AionCore\data-org',
  [string]$SeedDir = 'D:\Projects\claude-code-best\data'
)

$ErrorActionPreference = 'Stop'
$AionCoreRoot = 'D:\Projects\claude-code-best\AionCore'
$ReleaseBin = Join-Path $AionCoreRoot 'target\release\aioncore.exe'

if (-not (Test-Path $ReleaseBin)) {
  Write-Error "Self-built aioncore missing. Run: scripts\build-aioncore-work-tasks.cmd"
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

$env:AIONUI_ORG_KNOWLEDGE_SEED_DIR = $SeedDir

Write-Host ''
Write-Host 'Starting organization aioncore (org-knowledge API)...' -ForegroundColor Cyan
Write-Host "  binary: $ReleaseBin" -ForegroundColor DarkGray
Write-Host "  data:   $DataDir" -ForegroundColor DarkGray
Write-Host "  seed:   $SeedDir" -ForegroundColor DarkGray
Write-Host "  listen: 0.0.0.0:$Port (--cors-any, JWT required)" -ForegroundColor DarkGray
Write-Host ''

& $ReleaseBin `
  --host 0.0.0.0 `
  --port $Port `
  --data-dir $DataDir `
  --cors-any
