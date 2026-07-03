# Deploy price-library-edit skill to CCB-Wanding user skills directory.
# Usage:
#   .\ccb-installer\scripts\deploy-price-library-edit-skill.ps1
#   .\ccb-installer\scripts\deploy-price-library-edit-skill.ps1 -SkillsDir "C:\Users\me\AppData\Local\CCB-Wanding\.claude\skills"

param(
    [string]$SkillsDir,
    [string]$SourceDir,
    [string]$InstallDir
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $SourceDir) {
    if ($InstallDir) {
        $SourceDir = Join-Path $InstallDir "seed\skills\price-library-edit"
    }
}
if (-not $SourceDir -or -not (Test-Path -LiteralPath $SourceDir)) {
    $SourceDir = Join-Path $repoRoot "ccb-installer\packages\vertical\com.wanding.trade\skills\price-library-edit"
}

if (-not $SkillsDir) {
    $SkillsDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills"
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
    throw "Source skill not found: $SourceDir"
}

$destDir = Join-Path $SkillsDir "price-library-edit"
New-Item -ItemType Directory -Path $destDir -Force | Out-Null

Get-ChildItem -LiteralPath $SourceDir -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
    $target = Join-Path $destDir $relative
    $targetParent = Split-Path $target -Parent
    if (-not (Test-Path $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
}

$skillMd = Join-Path $destDir "SKILL.md"
if (-not (Test-Path -LiteralPath $skillMd)) {
    throw "Deploy failed: missing $skillMd"
}

Write-Host ""
Write-Host "Deployed price-library-edit -> $destDir"
