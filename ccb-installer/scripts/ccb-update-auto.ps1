# Launch-time CCB update: auto hot-apply (fail-open) + notify for full installer.
# Spec: .trellis/spec/integration/internal-update.md §6.1
# Task: .trellis/tasks/06-23-one-click-silent-update-hot-auto-apply-full-nsis-s/prd.md P1

[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [string]$AppName = 'CCB-Wanding',
    [int]$TimeoutSec = 30
)

$ErrorActionPreference = 'SilentlyContinue'

if ($env:CCB_NO_UPDATE -eq '1') { exit 0 }

if (-not $InstallDir) {
    $InstallDir = if ($env:CCB_WANDING_HOME) { $env:CCB_WANDING_HOME }
        elseif ($env:CCB_INSTALL_DIR) { $env:CCB_INSTALL_DIR }
        else { Split-Path $PSScriptRoot -Parent }
}

$logDir  = Join-Path $env:LOCALAPPDATA "$AppName\logs"
$logFile = Join-Path $logDir 'update-auto.log'
$stateFile = Join-Path $env:LOCALAPPDATA "$AppName\updates\state.json"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $stateFile) | Out-Null

function Write-UpdateLog([string]$Message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
}

function Write-UpdateState([hashtable]$Fields) {
    $existing = @{}
    if (Test-Path -LiteralPath $stateFile) {
        try { $existing = Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable } catch {}
    }
    foreach ($k in $Fields.Keys) { $existing[$k] = $Fields[$k] }
    $existing | ConvertTo-Json -Compress | Set-Content -LiteralPath $stateFile -Encoding UTF8
}

function Invoke-RetentionCleanup {
    # Keep only last 5 hot-update backups
    $backupParent = Join-Path $env:LOCALAPPDATA $AppName
    $backups = Get-ChildItem -LiteralPath $backupParent -Directory -Filter 'backup-before-*' -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending
    if ($backups.Count -gt 5) {
        $backups | Select-Object -Skip 5 | ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            Write-UpdateLog "retention: removed old backup $($_.Name)"
        }
    }
    # Keep update-auto.log under 500 KB (trim to last 400 KB)
    if ((Test-Path -LiteralPath $logFile) -and (Get-Item -LiteralPath $logFile).Length -gt 512000) {
        $content = Get-Content -LiteralPath $logFile -Encoding UTF8 -Raw
        $trimmed = $content.Substring([Math]::Max(0, $content.Length - 409600))
        Set-Content -LiteralPath $logFile -Value $trimmed -Encoding UTF8
        Write-UpdateLog "retention: log trimmed"
    }
}

$checkScript = Join-Path $InstallDir 'scripts\ccb-check-update.ps1'
if (-not (Test-Path -LiteralPath $checkScript)) { exit 0 }

Write-UpdateState @{ last_check = (Get-Date -Format 'o') }

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

Write-UpdateState @{ available_version = $latest; installed_version = $installed }

$ps = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$argList = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $checkScript,
    '-AutoApplyHot',
    '-AppName', $AppName
)

try {
    $proc = Start-Process -FilePath $ps -ArgumentList $argList -PassThru -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while (-not $proc.HasExited) {
        if ((Get-Date) -gt $deadline) {
            try { $proc.Kill() } catch {}
            Write-UpdateLog "hot-apply timeout after ${TimeoutSec}s (latest=$latest)"
            exit 0
        }
        Start-Sleep -Milliseconds 200
    }

    if ($proc.ExitCode -eq 10) {
        Write-Host "[CCB-Wanding] 已更新至 $latest，正在启动..." -ForegroundColor Green
        Write-UpdateLog "hot-apply success -> $latest"
        Write-UpdateState @{ last_apply = (Get-Date -Format 'o'); last_apply_version = $latest; last_error = $null }
        Invoke-RetentionCleanup
        try {
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
            [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
            $xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
            $xml.LoadXml("<toast><visual><binding template='ToastText02'><text id='1'>WanD 已更新</text><text id='2'>已更新至 $latest，正在启动…</text></binding></visual></toast>")
            $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
            [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('CCB-Wanding').Show($toast)
        } catch {}
        exit 0
    }

    $hotFailed = ($proc.ExitCode -ne 0)
    Write-UpdateLog "hot-apply skipped or failed exit=$($proc.ExitCode) latest=$latest installed=$installed"
    if ($hotFailed) {
        Write-UpdateState @{ last_error = "hot-apply exit=$($proc.ExitCode) at $(Get-Date -Format 'o')" }
    }
} catch {
    Write-UpdateLog $_.Exception.Message
    Write-UpdateState @{ last_error = "$($_.Exception.Message) at $(Get-Date -Format 'o')" }
    exit 0
}

if ($info.newer -eq $true) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Application]::EnableVisualStyles()
    $msg = if ($hotFailed) {
        "WanD 自动热更新失败（$installed → $latest）。`n`n请从开始菜单打开「检查更新」手动升级。"
    } else {
        "发现 WanD 更新 $latest（当前 $installed）。`n`n请从开始菜单打开「检查更新」完成升级。"
    }
    [System.Windows.Forms.MessageBox]::Show(
        $msg,
        'CCB-Wanding 更新提示',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
}

exit 0
