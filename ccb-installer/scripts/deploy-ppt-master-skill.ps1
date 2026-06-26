# Deploy ppt-master skill to CCB-Wanding user skills directory.
# Run vendor-ppt-master.ps1 first if ccb-installer/vendor/ppt-master-skill is missing.
# Usage:
#   .\ccb-installer\scripts\deploy-ppt-master-skill.ps1
#   .\ccb-installer\scripts\deploy-ppt-master-skill.ps1 -SkillsDir "C:\Users\me\AppData\Local\CCB-Wanding\.claude\skills"

param(
    [string]$SkillsDir,
    [string]$SourceDir,
    [string]$InstallDir,
    [switch]$VendorIfMissing
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$vendorScript = Join-Path $PSScriptRoot "vendor-ppt-master.ps1"

if (-not $SourceDir) {
    if ($InstallDir) {
        $SourceDir = Join-Path $InstallDir "vendor\ppt-master-skill"
    } else {
        $SourceDir = Join-Path $repoRoot "ccb-installer\vendor\ppt-master-skill"
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $SourceDir "SKILL.md"))) {
    if ($VendorIfMissing) {
        & $vendorScript
        $SourceDir = Join-Path $repoRoot "ccb-installer\vendor\ppt-master-skill"
    } else {
        throw "ppt-master skill not found at: $SourceDir (run vendor-ppt-master.ps1 or bundle vendor\ppt-master-skill)"
    }
}

if (-not $SkillsDir) {
    $SkillsDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills"
}

$destDir = Join-Path $SkillsDir "ppt-master"
New-Item -ItemType Directory -Path $destDir -Force | Out-Null

Get-ChildItem -LiteralPath $SourceDir -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
    $target = Join-Path $destDir $relative
    $targetParent = Split-Path $target -Parent
    if (-not (Test-Path $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $target -Force
}

Write-Host "Deployed ppt-master -> $destDir"
