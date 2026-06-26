# Vendor hugohe3/ppt-master skill into ccb-installer/vendor/ppt-master-skill (sparse clone).
# Usage:
#   .\ccb-installer\scripts\vendor-ppt-master.ps1
#   .\ccb-installer\scripts\vendor-ppt-master.ps1 -Ref main

param(
    [string]$Ref = "main"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$destDir = Join-Path $repoRoot "ccb-installer\vendor\ppt-master-skill"
$cloneDir = Join-Path $env:TEMP "ccb-ppt-master-vendor-$(Get-Random)"

if (Test-Path -LiteralPath $cloneDir) {
    Remove-Item -LiteralPath $cloneDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[vendor] sparse clone hugohe3/ppt-master @ $Ref ..."
Push-Location (Split-Path $PSScriptRoot -Parent) | Out-Null
try {
    git clone --depth 1 --sparse --branch $Ref `
        https://github.com/hugohe3/ppt-master.git $cloneDir
    Set-Location $cloneDir
    git sparse-checkout init --cone
    git sparse-checkout set skills/ppt-master
    git checkout HEAD -- skills/ppt-master

$skillSrc = Join-Path $cloneDir "skills\ppt-master"
$skillMd = Join-Path $skillSrc "SKILL.md"
if (-not (Test-Path -LiteralPath $skillMd)) {
    throw "SKILL.md missing after sparse checkout: $skillMd"
}

$fileCount = (Get-ChildItem -LiteralPath $skillSrc -Recurse -File | Measure-Object).Count
if ($fileCount -lt 5) {
    throw "skills/ppt-master looks incomplete ($fileCount files)"
}
Write-Host "[vendor] fetched $fileCount files under skills/ppt-master"

New-Item -ItemType Directory -Path $destDir -Force | Out-Null
if (Test-Path -LiteralPath $destDir) {
    Get-ChildItem -LiteralPath $destDir -Force | Remove-Item -Recurse -Force
}
Copy-Item -Path (Join-Path $skillSrc '*') -Destination $destDir -Recurse -Force
if (-not (Test-Path -LiteralPath (Join-Path $destDir "SKILL.md"))) {
    throw "Copy to $destDir failed — SKILL.md missing"
}

$versionFile = Join-Path $destDir "VENDOR.txt"
@"
source: https://github.com/hugohe3/ppt-master
ref: $Ref
path: skills/ppt-master
vendored_at: $(Get-Date -Format o)
"@ | Set-Content -LiteralPath $versionFile -Encoding UTF8

Remove-Item -LiteralPath $cloneDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[ok]   vendored -> $destDir"
} finally {
    Pop-Location
}
