# Apply shipped config generation — replaces CLI-era user config with current install seeds.
# Called from run-wanding-bootstrap.ps1 (NSIS Full install + every launch when generation lags).
#
# Usage:
#   .\apply-ship-config-reset.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"

param(
    [string]$InstallDir,
    [string]$ConfigDir = '',
    [string]$LogFile = ''
)

$ErrorActionPreference = 'Stop'

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}
if (-not $ConfigDir) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
}

$logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
if (-not $LogFile) {
    $LogFile = Join-Path $logDir 'config-ship-reset-latest.log'
}
$null = New-Item -ItemType Directory -Force -Path $logDir

function Write-ResetLog([string]$Message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
}

function Read-ConfigGeneration([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    try {
        $raw = Get-Content -Raw -LiteralPath $Path -Encoding UTF8
        $parsed = $raw | ConvertFrom-Json
        $gen = [int]$parsed.config_generation
        if ($gen -lt 0) { return 0 }
        return $gen
    }
    catch {
        return 0
    }
}

function Read-ShipManifest([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{ config_generation = 1; description = 'default' }
    }
    $raw = Get-Content -Raw -LiteralPath $Path -Encoding UTF8
    return ($raw | ConvertFrom-Json)
}

$manifestPath = Join-Path $InstallDir 'seed\config-ship-manifest.json'
$userGenPath = Join-Path $ConfigDir '.config-generation.json'
$ship = Read-ShipManifest -Path $manifestPath
$shipGen = [int]$ship.config_generation
$userGen = Read-ConfigGeneration -Path $userGenPath

$installedVersion = 'unknown'
$versionFile = Join-Path $InstallDir 'dist\VERSION'
if (Test-Path -LiteralPath $versionFile) {
    $installedVersion = (Get-Content -LiteralPath $versionFile -Raw).Trim()
}

Write-ResetLog "check ship_generation=$shipGen user_generation=$userGen version=$installedVersion"

if ($shipGen -le $userGen) {
    Write-ResetLog 'SKIP — user config generation is current'
    Write-Output ([pscustomobject]@{
            Applied         = $false
            ShipGeneration  = $shipGen
            UserGeneration  = $userGen
            InstalledVersion = $installedVersion
        })
    exit 0
}

Write-ResetLog "APPLY — upgrading user config generation $userGen -> $shipGen"

$backupRoot = Join-Path $ConfigDir ("backup-pre-ship-gen{0}-{1}" -f $shipGen, (Get-Date -Format 'yyyyMMdd-HHmmss'))
$agentsDir = Join-Path $ConfigDir 'agents'
if (Test-Path -LiteralPath $agentsDir) {
    $backupAgents = Join-Path $backupRoot 'agents'
    $null = New-Item -ItemType Directory -Force -Path (Split-Path $backupAgents -Parent)
    Copy-Item -LiteralPath $agentsDir -Destination $backupAgents -Recurse -Force
    Write-ResetLog "backup agents -> $backupAgents"
}

$aionUiRuntime = Join-Path $env:APPDATA 'AionUi\aionui\runtime'
if (Test-Path -LiteralPath $aionUiRuntime) {
    try {
        Remove-Item -LiteralPath $aionUiRuntime -Recurse -Force -ErrorAction Stop
        Write-ResetLog "removed AionUI runtime cache: $aionUiRuntime"
    }
    catch {
        Write-ResetLog "WARNING: could not remove AionUI cache (permission): $($_.Exception.Message)"
    }
}

$null = New-Item -ItemType Directory -Force -Path $agentsDir

$deployScript = Join-Path $PSScriptRoot 'deploy-seed-agents.ps1'
if (-not (Test-Path -LiteralPath $deployScript)) {
    throw "deploy-seed-agents.ps1 not found: $deployScript"
}
& $deployScript -ConfigDir $agentsDir -ForceMd
if ($LASTEXITCODE -ne 0) {
    throw "deploy-seed-agents.ps1 failed with exit code $LASTEXITCODE"
}
Write-ResetLog 'deploy-seed-agents -ForceMd OK'

$patchScript = Join-Path $PSScriptRoot 'patch-subagent-gate-hooks.ps1'
if (Test-Path -LiteralPath $patchScript) {
    & $patchScript -AgentsDir $agentsDir
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "patch-subagent-gate-hooks.ps1 failed with exit code $LASTEXITCODE"
    }
    Write-ResetLog 'patch-subagent-gate-hooks OK'
}

$patchMemoryScript = Join-Path $PSScriptRoot 'patch-personal-memory-hooks.ps1'
if (Test-Path -LiteralPath $patchMemoryScript) {
    & $patchMemoryScript -AgentsDir $agentsDir
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "patch-personal-memory-hooks.ps1 failed with exit code $LASTEXITCODE"
    }
    Write-ResetLog 'patch-personal-memory-hooks OK'
}

$skillsDir = Join-Path $ConfigDir 'skills'
$deploySkillsScript = Join-Path $PSScriptRoot 'deploy-ccb-skills.ps1'
if (Test-Path -LiteralPath $deploySkillsScript) {
    & $deploySkillsScript -SkillsDir $skillsDir -InstallDir $InstallDir
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "deploy-ccb-skills.ps1 failed with exit code $LASTEXITCODE"
    }
    Write-ResetLog "deploy-ccb-skills OK -> $skillsDir"
}
else {
    Write-ResetLog 'WARNING: deploy-ccb-skills.ps1 missing — seed skills not deployed on config reset'
}

$deployCommandsScript = Join-Path $PSScriptRoot 'deploy-wanding-commands.ps1'
if (Test-Path -LiteralPath $deployCommandsScript) {
    & $deployCommandsScript -InstallDir $InstallDir -ConfigDir $ConfigDir
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "deploy-wanding-commands.ps1 failed with exit code $LASTEXITCODE"
    }
    Write-ResetLog "deploy-wanding-commands OK -> $(Join-Path $ConfigDir 'commands')"
}
else {
    Write-ResetLog 'WARNING: deploy-wanding-commands.ps1 missing — slash commands not deployed on config reset'
}

$null = New-Item -ItemType Directory -Force -Path $ConfigDir
$marker = [ordered]@{
    config_generation = $shipGen
    applied_at        = (Get-Date -Format o)
    install_version   = $installedVersion
    backup_dir        = $backupRoot
    reason            = 'ship_config_reset'
}
($marker | ConvertTo-Json -Depth 4) + "`n" | Set-Content -LiteralPath $userGenPath -Encoding UTF8 -NoNewline
Write-ResetLog "wrote $userGenPath"

Write-Output ([pscustomobject]@{
        Applied          = $true
        ShipGeneration   = $shipGen
        UserGeneration   = $shipGen
        InstalledVersion = $installedVersion
        BackupDir        = $backupRoot
    })
exit 0
