# Force-sync ppt-master agent seeds (overwrites live .md — use after ppt-master migration).
# Usage:
#   .\ccb-installer\scripts\sync-ppt-master-agents.ps1

param(
    [string]$AgentsDir,
    [string]$SeedDir
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $SeedDir) {
    $SeedDir = Join-Path $repoRoot "ccb-installer\config\agents"
}

if (-not $AgentsDir) {
    $AgentsDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents"
}

$ids = @("ppt-creator", "cowork")
foreach ($id in $ids) {
    foreach ($ext in @(".md", ".aionui.json")) {
        $src = Join-Path $SeedDir "$id$ext"
        $dest = Join-Path $AgentsDir "$id$ext"
        if (-not (Test-Path -LiteralPath $src)) {
            throw "Missing seed: $src"
        }
        Copy-Item -Path $src -Destination $dest -Force
        Write-Host "[ok]   $id$ext"
    }
}

Write-Host "ppt-master agent sync complete."
