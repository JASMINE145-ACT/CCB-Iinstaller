# Repair orphan / partial CCB-Wanding install trees before full NSIS reinstall.
# Spec: .trellis/spec/integration/wanding-packaging-whitelist.md §17.4
#
# Usage:
#   .\ccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
#   .\ccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir ... -WhatIf
#   .\ccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir ... -Force

param(
    [string]$InstallDir = '',
    [switch]$WhatIf,
    [switch]$Force,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

$MarkerName = '.ccb-wanding-install-root'

$OrphanFootprints = @(
    'dist\cli.js',
    'ccb-launch-aionui.cmd',
    'ccb-wanding.cmd',
    'AionUi\AionUi.exe',
    'vendor\bun\bun.exe',
    'scripts\run-wanding-bootstrap.ps1',
    'uninstall.exe'
)

$OwnedTopFiles = @(
    'ccb.ico',
    'ccb-wanding.cmd',
    'ccb-diagnose.cmd',
    'ccb-launch-aionui.cmd',
    'ccb-wanding-versions.cmd',
    'ccb-check-install.cmd',
    'ccb-verify-update.cmd',
    'install-health-manifest.json',
    'AionUiLauncher.exe',
    'uninstall.exe',
    $MarkerName
)

$OwnedDirs = @(
    'AionUi',
    'dist',
    'vendor',
    'scripts',
    'seed',
    'bin'
)

function Write-RepairLine {
    param([string]$Level, [string]$Message)
    if (-not $Quiet) { Write-Host "$Level $Message" }
}

function Resolve-DefaultInstallDir {
    if ($InstallDir) {
        return (Resolve-Path -LiteralPath $InstallDir).Path
    }
    try {
        $key = Get-ItemProperty -Path 'HKCU:\Software\CCB-Wanding\CCB-Wanding' -ErrorAction Stop
        if ($key.InstallDir) {
            return (Resolve-Path -LiteralPath $key.InstallDir).Path
        }
    } catch { }
    return (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding')
}

function Get-WandingInstallDirState {
    param([string]$Root)
    if (-not (Test-Path -LiteralPath $Root)) {
        return 'missing'
    }
    $hasMarker = Test-Path -LiteralPath (Join-Path $Root $MarkerName)
    $hasAnyFile = @(Get-ChildItem -LiteralPath $Root -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notin '.', '..' }).Count -gt 0
    if (-not $hasAnyFile) { return 'empty' }
    if ($hasMarker) { return 'marked' }
    foreach ($rel in $OrphanFootprints) {
        if (Test-Path -LiteralPath (Join-Path $Root $rel)) {
            return 'orphan'
        }
    }
    return 'foreign'
}

function Remove-OwnedInstallTree {
    param([string]$Root)
    Get-Process -Name electron, aioncore, AionUi -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    foreach ($name in $OwnedTopFiles) {
        $path = Join-Path $Root $name
        if (Test-Path -LiteralPath $path) {
            if ($WhatIf) {
                Write-RepairLine 'WHATIF' "delete $path"
            } else {
                Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-RepairLine 'DEL' $name
            }
        }
    }
    foreach ($name in $OwnedDirs) {
        $path = Join-Path $Root $name
        if (Test-Path -LiteralPath $path) {
            if ($WhatIf) {
                Write-RepairLine 'WHATIF' "rmdir $name\"
            } else {
                Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-RepairLine 'DEL' "$name\"
            }
        }
    }
}

$root = Resolve-DefaultInstallDir
$state = Get-WandingInstallDirState -Root $root

switch ($state) {
    'missing' {
        Write-RepairLine 'OK' "Install dir does not exist: $root (nothing to repair)"
        exit 0
    }
    'empty' {
        Write-RepairLine 'OK' "Install dir is empty: $root"
        exit 0
    }
    'marked' {
        Write-RepairLine 'OK' "Valid marked install: $root (use uninstall.exe or NSIS upgrade, not orphan repair)"
        exit 0
    }
    'foreign' {
        $msg = @"
Install dir exists but is not a CCB-Wanding install or orphan footprint:
  $root
Choose another directory in the NSIS installer, or manually move unrelated files aside.
User config is never deleted: $env:LOCALAPPDATA\CCB-Wanding\.claude
"@
        if (-not $Force) { throw $msg }
        Write-RepairLine 'WARN' 'Foreign directory — -Force not implemented; move files manually.'
        exit 2
    }
    'orphan' {
        Write-RepairLine 'REPAIR' "Orphan/partial install detected (no $MarkerName): $root"
        if (-not $Force -and -not $WhatIf) {
            Write-RepairLine 'INFO' ('User config preserved: ' + (Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'))
        }
        Remove-OwnedInstallTree -Root $root
        if ($WhatIf) {
            Write-RepairLine 'OK' 'WhatIf complete — re-run without -WhatIf to apply.'
            exit 0
        }
        $after = Get-WandingInstallDirState -Root $root
        if ($after -notin @('empty', 'missing')) {
            throw "Repair incomplete: state=$after"
        }
        Write-RepairLine 'OK' 'Orphan install tree cleared — run full NSIS installer next.'
        exit 0
    }
}
