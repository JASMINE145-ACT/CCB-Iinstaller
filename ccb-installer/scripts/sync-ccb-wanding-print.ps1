# Sync CCB-Wanding headless print patch (print-yVmZ2ahJ.js) to install dir.
# Usage: .\ccb-installer\scripts\sync-ccb-wanding-print.ps1

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$src = Join-Path $repoRoot "ccb-installer\dist\chunks\print-yVmZ2ahJ.js"
$targets = @(
    "D:\CCB-Wanding\dist\chunks\print-yVmZ2ahJ.js"
)

if (-not (Test-Path $src)) {
    throw "Missing patch source: $src"
}

foreach ($dest in $targets) {
    $dir = Split-Path $dest -Parent
    if (-not (Test-Path $dir)) {
        Write-Host "[skip] $dest (parent dir missing)" -ForegroundColor DarkGray
        continue
    }
    Copy-Item $src $dest -Force
    Write-Host "[ok] $dest"
}

Write-Host "Done."
