# Deploy all CCB-managed skills (subagent-gate + personal-memory + quotation-learn-by-data + price-library-edit + wanding-deep-research + ppt-master).
# Usage:
#   .\ccb-installer\scripts\deploy-ccb-skills.ps1
#   .\ccb-installer\scripts\deploy-ccb-skills.ps1 -VendorPptMaster

param(
    [string]$SkillsDir,
    [string]$InstallDir,
    [switch]$VendorPptMaster,
    [switch]$InstallPipDeps
)

$ErrorActionPreference = "Stop"

$commonArgs = @{}
if ($SkillsDir) { $commonArgs['SkillsDir'] = $SkillsDir }
if ($InstallDir) { $commonArgs['InstallDir'] = $InstallDir }

& (Join-Path $PSScriptRoot "deploy-subagent-gate-skill.ps1") @commonArgs
& (Join-Path $PSScriptRoot "deploy-personal-memory-skill.ps1") @commonArgs
& (Join-Path $PSScriptRoot "deploy-quotation-learn-by-data-skill.ps1") @commonArgs
& (Join-Path $PSScriptRoot "deploy-price-library-edit-skill.ps1") @commonArgs
& (Join-Path $PSScriptRoot "deploy-wanding-deep-research-skill.ps1") @commonArgs

$pptArgs = @{}
if ($SkillsDir) { $pptArgs["SkillsDir"] = $SkillsDir }
if ($InstallDir) { $pptArgs["InstallDir"] = $InstallDir }
if ($VendorPptMaster) { $pptArgs["VendorIfMissing"] = $true }
& (Join-Path $PSScriptRoot "deploy-ppt-master-skill.ps1") @pptArgs

if ($InstallPipDeps) {
    $skillsRoot = if ($SkillsDir) { $SkillsDir } else { Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills" }
    $installDir = Split-Path -Parent $PSScriptRoot
    & (Join-Path $PSScriptRoot "ensure-ppt-master-deps.ps1") `
        -InstallDir $installDir `
        -SkillDir (Join-Path $skillsRoot "ppt-master")
}

Write-Host ""
Write-Host "CCB skills deploy complete."
