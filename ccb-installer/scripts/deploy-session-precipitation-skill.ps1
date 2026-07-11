# Deploy ccb-session-precipitation skill to CCB-Wanding user skills directory.
# Usage:
#   .\ccb-installer\scripts\deploy-session-precipitation-skill.ps1
#   .\ccb-installer\scripts\deploy-session-precipitation-skill.ps1 -SkillsDir "C:\Users\me\AppData\Local\CCB-Wanding\.claude\skills"

param(
    [string]$SkillsDir,
    [string]$SourceDir,
    [string]$InstallDir
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $SourceDir) {
    if ($InstallDir) {
        $SourceDir = Join-Path $InstallDir "seed\skills\ccb-session-precipitation"
    }
}
if (-not $SourceDir -or -not (Test-Path -LiteralPath $SourceDir)) {
    $SourceDir = Join-Path $repoRoot "ccb-installer\config\skills\ccb-session-precipitation"
}

if (-not $SkillsDir) {
    $SkillsDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills"
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
    throw "Source skill not found: $SourceDir"
}

$destDir = Join-Path $SkillsDir "ccb-session-precipitation"
New-Item -ItemType Directory -Path $destDir -Force | Out-Null

$exclude = @('tests')
Get-ChildItem -LiteralPath $SourceDir -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
    $skip = $false
    foreach ($ex in $exclude) {
        if ($relative -like "$ex*") { $skip = $true; break }
    }
    if ($skip) { return }

    $target = Join-Path $destDir $relative
    $targetParent = Split-Path $target -Parent
    if (-not (Test-Path $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
}

Write-Host ""
Write-Host "Deployed ccb-session-precipitation -> $destDir"
