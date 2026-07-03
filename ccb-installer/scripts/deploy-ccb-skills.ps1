# Deploy all CCB-managed skills (subagent-gate + quotation-learn-by-data + ppt-master).
# Usage:
#   .\ccb-installer\scripts\deploy-ccb-skills.ps1
#   .\ccb-installer\scripts\deploy-ccb-skills.ps1 -VendorPptMaster

param(
    [string]$SkillsDir,
    [switch]$VendorPptMaster,
    [switch]$InstallPipDeps
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "deploy-subagent-gate-skill.ps1") -SkillsDir $SkillsDir
& (Join-Path $PSScriptRoot "deploy-quotation-learn-by-data-skill.ps1") -SkillsDir $SkillsDir

$pptArgs = @{}
if ($SkillsDir) { $pptArgs["SkillsDir"] = $SkillsDir }
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
