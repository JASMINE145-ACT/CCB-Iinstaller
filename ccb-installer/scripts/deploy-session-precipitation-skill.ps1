# Deploy ccb-session-precipitation skill to CCB-Wanding user skills directory.
# Usage:
#   .\ccb-installer\scripts\deploy-session-precipitation-skill.ps1
#   .\ccb-installer\scripts\deploy-session-precipitation-skill.ps1 -SkillsDir "C:\Users\me\AppData\Local\CCB-Wanding\.claude\skills"
#   .\ccb-installer\scripts\deploy-session-precipitation-skill.ps1 -InstallDir "D:\CCB-Wanding"

param(
    [string]$SkillsDir,
    [string]$SourceDir,
    [string]$InstallDir
)

$ErrorActionPreference = "Stop"

function Resolve-PrecipitationSourceDir {
    param([string]$PreferredInstallDir)

    $candidates = @()
    if ($PreferredInstallDir) {
        $candidates += (Join-Path $PreferredInstallDir "seed\skills\ccb-session-precipitation")
    }
    # Install/scripts layout: <InstallDir>\scripts -> sibling seed already covered;
    # also support ccb-installer\scripts -> config\skills (dev + staging scripts root).
    $installerRoot = Split-Path $PSScriptRoot -Parent
    $candidates += (Join-Path $installerRoot "config\skills\ccb-session-precipitation")
    $candidates += (Join-Path $installerRoot "seed\skills\ccb-session-precipitation")
    # Dev repo: ...\claude-code-best\ccb-installer\scripts
    $repoRoot = Split-Path $installerRoot -Parent
    $candidates += (Join-Path $repoRoot "ccb-installer\config\skills\ccb-session-precipitation")

    foreach ($cand in $candidates) {
        if ($cand -and (Test-Path -LiteralPath $cand)) {
            return $cand
        }
    }
    return $null
}

if (-not $SourceDir -or -not (Test-Path -LiteralPath $SourceDir)) {
    $SourceDir = Resolve-PrecipitationSourceDir -PreferredInstallDir $InstallDir
}

if (-not $SkillsDir) {
    $SkillsDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills"
}

if (-not $SourceDir -or -not (Test-Path -LiteralPath $SourceDir)) {
    throw "Source skill not found for ccb-session-precipitation (pass -InstallDir or -SourceDir)"
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
