# Restore the most recent hot-update backup to the install directory.
# Usage: .\scripts\rollback-last-update.ps1 [-InstallDir <path>] [-AppName <name>] [-WhatIf]

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$InstallDir = '',
    [string]$AppName = 'CCB-Wanding'
)

$ErrorActionPreference = 'Stop'

function Resolve-CcbInstallDir([string]$Override) {
    if ($Override -and (Test-Path -LiteralPath $Override)) { return (Resolve-Path -LiteralPath $Override).Path }
    $reg = ''
    try { $reg = [string](Get-ItemProperty 'HKCU:\Software\CCB-Wanding\CCB-Wanding' -ErrorAction Stop).InstallDir } catch {}
    foreach ($c in @($reg, (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'), 'D:\CCB-Wanding')) {
        if ($c -and (Test-Path -LiteralPath $c)) { return (Resolve-Path -LiteralPath $c).Path }
    }
    throw 'CCB-Wanding install dir not found. Pass -InstallDir.'
}

$install = Resolve-CcbInstallDir -Override $InstallDir
$backupParent = Join-Path $env:LOCALAPPDATA $AppName
$logFile = Join-Path $env:LOCALAPPDATA "$AppName\logs\rollback.log"
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null

function Write-RollbackLog([string]$Msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg"
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

# Find most recent backup
$backup = Get-ChildItem -LiteralPath $backupParent -Directory -Filter 'backup-before-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    Select-Object -First 1

if (-not $backup) {
    Write-RollbackLog 'No hot-update backup found — nothing to roll back.'
    exit 1
}

Write-RollbackLog "Rollback: $($backup.FullName) -> $install"

$hotPaths = @('dist', 'scripts', 'vendor\wanding\python', 'vendor\wanding\data',
    'vendor\mcp-servers\quotation-server\dist', 'vendor\mcp-servers\quotation-server\node_modules',
    'vendor\mcp-servers\accurate-mcp', 'vendor\mcp-servers\office-word-mcp',
    'vendor\mcp-servers\excel-mcp-server', 'seed\agents', 'seed\skills\ccb-subagent-gate')

foreach ($rel in $hotPaths) {
    $src = Join-Path $backup.FullName $rel
    $dest = Join-Path $install $rel
    if (-not (Test-Path -LiteralPath $src)) { continue }
    if ($PSCmdlet.ShouldProcess($dest, "Restore from $src")) {
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        robocopy $src $dest /MIR /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE) restoring $rel" }
        Write-RollbackLog "  restored $rel"
    }
}

# Update state.json
$stateFile = Join-Path $env:LOCALAPPDATA "$AppName\updates\state.json"
if (Test-Path -LiteralPath $stateFile) {
    try {
        $state = Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable
        $state['last_rollback'] = (Get-Date -Format 'o')
        $state['last_rollback_from'] = $backup.Name
        $state | ConvertTo-Json -Compress | Set-Content -LiteralPath $stateFile -Encoding UTF8
    } catch {}
}

Write-RollbackLog "Rollback complete. Restart WanD to use restored version."
