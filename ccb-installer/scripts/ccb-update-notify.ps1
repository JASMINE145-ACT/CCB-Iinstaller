# Launch-time CCB update notifier (Phase 1 — notify only, no auto-install).
# Spec: .trellis/spec/integration/internal-update.md §6.1
#
# Writes available.json via ccb-check-update.ps1 -BackgroundCheck, then MessageBox if newer.

[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [string]$AppName = 'CCB-Wanding'
)

$ErrorActionPreference = 'SilentlyContinue'

if ($env:CCB_NO_UPDATE -eq '1') { exit 0 }

if (-not $InstallDir) {
    $InstallDir = if ($env:CCB_WANDING_HOME) { $env:CCB_WANDING_HOME }
        elseif ($env:CCB_INSTALL_DIR) { $env:CCB_INSTALL_DIR }
        else { Split-Path $PSScriptRoot -Parent }
}

$checkScript = Join-Path $InstallDir 'scripts\ccb-check-update.ps1'
if (-not (Test-Path -LiteralPath $checkScript)) { exit 0 }

& $checkScript -BackgroundCheck -AppName $AppName
if ($LASTEXITCODE -ne 0) { exit 0 }

$availableFile = Join-Path $env:LOCALAPPDATA "$AppName\updates\available.json"
if (-not (Test-Path -LiteralPath $availableFile)) { exit 0 }

try {
    $info = Get-Content -LiteralPath $availableFile -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    exit 0
}

if (-not $info.newer) { exit 0 }

$latest = "$($info.latest)".Trim()
$installed = "$($info.installed)".Trim()
if (-not $latest) { exit 0 }

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$msg = "发现 WanD 后端更新 $latest（当前 $installed）。`n`n请从开始菜单打开「检查更新 / 版本选择」完成升级。"
[System.Windows.Forms.MessageBox]::Show(
    $msg,
    'CCB-Wanding 更新提示',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null

exit 0
