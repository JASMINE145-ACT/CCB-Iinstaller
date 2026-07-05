# Install ppt-master skill, gate skill, agent seeds, and Python deps (CCB-Wanding installer hook).
# Usage:
#   .\ccb-installer\scripts\install-ppt-master.ps1 -InstallDir "D:\CCB-Wanding"

param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot),
    [string]$ConfigDir = (Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude")
)

$ErrorActionPreference = "Stop"

$skillsDir = Join-Path $ConfigDir "skills"
$agentsDir = Join-Path $ConfigDir "agents"
New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null

Write-Host "[ppt-master] Deploy skill from $InstallDir\vendor\ppt-master-skill ..."
& (Join-Path $PSScriptRoot "deploy-ppt-master-skill.ps1") `
    -SkillsDir $skillsDir `
    -SourceDir (Join-Path $InstallDir "vendor\ppt-master-skill")

$gateSource = Join-Path $InstallDir "seed\skills\ccb-subagent-gate"
if (-not (Test-Path -LiteralPath $gateSource)) {
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $gateSource = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate"
}
if (Test-Path -LiteralPath $gateSource) {
    Write-Host "[ppt-master] Deploy ccb-subagent-gate ..."
    & (Join-Path $PSScriptRoot "deploy-subagent-gate-skill.ps1") `
        -SkillsDir $skillsDir `
        -SourceDir $gateSource
} else {
    Write-Warning "[ppt-master] ccb-subagent-gate source not found; skipping gate skill deploy."
}

$learnSource = Join-Path $InstallDir "seed\skills\quotation-learn-by-data"
if (-not (Test-Path -LiteralPath $learnSource)) {
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $learnSource = Join-Path $repoRoot "ccb-installer\packages\vertical\com.wanding.trade\skills\quotation-learn-by-data"
}
if (Test-Path -LiteralPath $learnSource) {
    Write-Host "[ppt-master] Deploy quotation-learn-by-data ..."
    & (Join-Path $PSScriptRoot "deploy-quotation-learn-by-data-skill.ps1") `
        -SkillsDir $skillsDir `
        -SourceDir $learnSource
} else {
    Write-Warning "[ppt-master] quotation-learn-by-data source not found; skipping learn-by-data skill deploy."
}

$priceEditSource = Join-Path $InstallDir "seed\skills\price-library-edit"
if (-not (Test-Path -LiteralPath $priceEditSource)) {
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $priceEditSource = Join-Path $repoRoot "ccb-installer\packages\vertical\com.wanding.trade\skills\price-library-edit"
}
if (Test-Path -LiteralPath $priceEditSource) {
    Write-Host "[ppt-master] Deploy price-library-edit ..."
    & (Join-Path $PSScriptRoot "deploy-price-library-edit-skill.ps1") `
        -SkillsDir $skillsDir `
        -SourceDir $priceEditSource
} else {
    Write-Warning "[ppt-master] price-library-edit source not found; skipping price-library-edit skill deploy."
}

$deepResearchSource = Join-Path $InstallDir "seed\skills\wanding-deep-research"
if (-not (Test-Path -LiteralPath $deepResearchSource)) {
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $deepResearchSource = Join-Path $repoRoot "ccb-installer\packages\vertical\com.wanding.trade\skills\wanding-deep-research"
}
if (Test-Path -LiteralPath $deepResearchSource) {
    Write-Host "[ppt-master] Deploy wanding-deep-research ..."
    & (Join-Path $PSScriptRoot "deploy-wanding-deep-research-skill.ps1") `
        -SkillsDir $skillsDir `
        -SourceDir $deepResearchSource
} else {
    Write-Warning "[ppt-master] wanding-deep-research source not found; skipping wanding-deep-research skill deploy."
}

$seedAgents = Join-Path $InstallDir "seed\agents"
if (-not (Test-Path -LiteralPath $seedAgents)) {
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $seedAgents = Join-Path $repoRoot "ccb-installer\config\agents"
}

Write-Host "[ppt-master] Sync ppt-creator agent seed ..."
& (Join-Path $PSScriptRoot "sync-ppt-master-agents.ps1") `
    -AgentsDir $agentsDir `
    -SeedDir $seedAgents

Write-Host "[ppt-master] Install Python dependencies (python-wanding) ..."
& (Join-Path $PSScriptRoot "ensure-ppt-master-deps.ps1") `
    -InstallDir $InstallDir `
    -SkillDir (Join-Path $skillsDir "ppt-master")

Write-Host "[ok] ppt-master install complete."
