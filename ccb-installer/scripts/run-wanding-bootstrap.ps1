# WanD first-run / launch bootstrap — idempotent settings, agents, MCP hooks.
# Usage:
#   .\run-wanding-bootstrap.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding" -Mode Full
#   .\run-wanding-bootstrap.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding" -Mode Quick

param(
    [string]$InstallDir,
    [string]$ConfigDir = '',
    [ValidateSet('Full', 'Quick')]
    [string]$Mode = 'Quick',
    [string]$LogFile = ''
)

$ErrorActionPreference = 'Continue'

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}
if (-not $ConfigDir) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
}

$logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
$null = New-Item -ItemType Directory -Force -Path $logDir
if (-not $LogFile) {
    $LogFile = Join-Path $logDir 'bootstrap-latest.log'
}

function Write-BootstrapLog([string]$Message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Invoke-BootstrapStep {
    param(
        [string]$Name,
        [string]$ScriptRel,
        [hashtable]$BoundArgs = @{}
    )

    $scriptPath = Join-Path $PSScriptRoot $ScriptRel
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        Write-BootstrapLog "FAIL $Name — script missing: $scriptPath"
        return 1
    }

    Write-BootstrapLog "START $Name"
    try {
        & $scriptPath @BoundArgs | Out-Null
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "exit code $LASTEXITCODE"
        }
        Write-BootstrapLog "OK $Name"
        return 0
    }
    catch {
        Write-BootstrapLog "FAIL $Name — $($_.Exception.Message)"
        return 1
    }
}

Write-BootstrapLog "bootstrap Mode=$Mode InstallDir=$InstallDir ConfigDir=$ConfigDir"

$failures = 0
$agentsDir = Join-Path $ConfigDir 'agents'
$pptSkillMarker = Join-Path $ConfigDir 'skills\ppt-master\SKILL.md'
$bootstrapMarker = Join-Path $ConfigDir '.bootstrap-ok'
$firstBootstrap = -not (Test-Path -LiteralPath $bootstrapMarker)

$failures += Invoke-BootstrapStep -Name 'sync-aionui-ccb-route-b' -ScriptRel 'sync-aionui-ccb-route-b.ps1' -BoundArgs @{
    InstallDir = $InstallDir
}

$configResetApplied = $false
$configResetScript = Join-Path $PSScriptRoot 'apply-ship-config-reset.ps1'
if (Test-Path -LiteralPath $configResetScript) {
    Write-BootstrapLog 'START apply-ship-config-reset'
    try {
        $resetResult = & $configResetScript -InstallDir $InstallDir -ConfigDir $ConfigDir -LogFile $LogFile | Select-Object -Last 1
        if ($resetResult -and $resetResult.Applied) {
            $configResetApplied = $true
            Write-BootstrapLog "OK apply-ship-config-reset generation=$($resetResult.ShipGeneration) backup=$($resetResult.BackupDir)"
        }
        else {
            Write-BootstrapLog 'OK apply-ship-config-reset (no change needed)'
        }
    }
    catch {
        Write-BootstrapLog "FAIL apply-ship-config-reset — $($_.Exception.Message)"
        $failures += 1
    }
}
else {
    Write-BootstrapLog 'SKIP apply-ship-config-reset (script missing)'
}

if ($Mode -eq 'Full') {
    $wordSite = Join-Path $InstallDir 'vendor\mcp-servers\office-word-mcp\site-packages\word_document_server\main.py'
    $excelSite = Join-Path $InstallDir 'vendor\mcp-servers\excel-mcp-server\site-packages\excel_mcp\server.py'
    if (-not (Test-Path -LiteralPath $wordSite)) {
        $failures += Invoke-BootstrapStep -Name 'office-word-mcp' -ScriptRel 'install-office-word-mcp.ps1' -BoundArgs @{
            InstallDir = $InstallDir
        }
    }
    else {
        Write-BootstrapLog 'SKIP office-word-mcp (site-packages present)'
    }
    if (-not (Test-Path -LiteralPath $excelSite)) {
        $failures += Invoke-BootstrapStep -Name 'excel-mcp-server' -ScriptRel 'install-excel-mcp-server.ps1' -BoundArgs @{
            InstallDir = $InstallDir
        }
    }
    else {
        Write-BootstrapLog 'SKIP excel-mcp-server (site-packages present)'
    }
}

$pptVendor = Join-Path $InstallDir 'vendor\ppt-master-skill'
if ((Test-Path -LiteralPath $pptVendor) -and ($Mode -eq 'Full' -or -not (Test-Path -LiteralPath $pptSkillMarker))) {
    $failures += Invoke-BootstrapStep -Name 'install-ppt-master' -ScriptRel 'install-ppt-master.ps1' -BoundArgs @{
        InstallDir = $InstallDir
        ConfigDir  = $ConfigDir
    }
}
elseif (Test-Path -LiteralPath $pptSkillMarker) {
    Write-BootstrapLog 'SKIP install-ppt-master (skill already present)'
}
else {
    Write-BootstrapLog 'SKIP install-ppt-master (vendor\ppt-master-skill missing)'
}
$failures += Invoke-BootstrapStep -Name 'ensure-wanding-settings' -ScriptRel 'ensure-wanding-settings.ps1' -BoundArgs @{
    InstallDir = $InstallDir
    ConfigDir  = $ConfigDir
}
$deployAgentArgs = @{ ConfigDir = $agentsDir }
$forceAgentSeed = ($Mode -eq 'Full' -and $firstBootstrap) -or $configResetApplied
if ($forceAgentSeed) {
    if ($configResetApplied) {
        Write-BootstrapLog 'SKIP deploy-seed-agents (already applied by ship config reset)'
    }
    else {
        Write-BootstrapLog 'first bootstrap: deploy-seed-agents with -ForceMd'
        $failures += Invoke-BootstrapStep -Name 'deploy-seed-agents' -ScriptRel 'deploy-seed-agents.ps1' -BoundArgs @{
            ConfigDir = $agentsDir
            ForceMd   = $true
        }
    }
}
else {
    $failures += Invoke-BootstrapStep -Name 'deploy-seed-agents' -ScriptRel 'deploy-seed-agents.ps1' -BoundArgs $deployAgentArgs
}
if (-not $configResetApplied) {
    $failures += Invoke-BootstrapStep -Name 'patch-subagent-gate-hooks' -ScriptRel 'patch-subagent-gate-hooks.ps1' -BoundArgs @{
        AgentsDir = $agentsDir
    }
}
else {
    Write-BootstrapLog 'SKIP patch-subagent-gate-hooks (already applied by ship config reset)'
}

$marker = $bootstrapMarker
if ($failures -eq 0) {
    Set-Content -LiteralPath $marker -Value (Get-Date -Format o) -Encoding UTF8
    Write-BootstrapLog 'bootstrap complete (marker written)'
}
else {
    Write-BootstrapLog "bootstrap finished with $failures failure(s)"
    exit 1
}
exit 0

if ($Mode -eq 'Full') {
    $authResetMarker = Join-Path $ConfigDir '.auth-reset-required'
    $installedVersion = 'unknown'
    $versionFile = Join-Path $InstallDir 'dist\VERSION'
    if (Test-Path -LiteralPath $versionFile) {
        $installedVersion = (Get-Content -LiteralPath $versionFile -Raw).Trim()
    }
    Set-Content -LiteralPath $authResetMarker -Value "version=$installedVersion;at=$(Get-Date -Format o)" -Encoding UTF8
    Write-BootstrapLog "auth-reset marker written for $installedVersion (next launch clears stale JWT)"
}

exit $failures
