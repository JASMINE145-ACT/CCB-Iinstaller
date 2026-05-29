[CmdletBinding()]
param(
    [switch]$InstallWindowsTerminal,
    [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[CCB] $Message"
}

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function New-Shortcut {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$TargetPath,
        [string]$Arguments = "",
        [string]$WorkingDirectory = "",
        [string]$IconLocation = ""
    )

    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $TargetPath
    $shortcut.Arguments = $Arguments
    if ($WorkingDirectory) {
        $shortcut.WorkingDirectory = $WorkingDirectory
    }
    if ($IconLocation -and (Test-Path -LiteralPath $IconLocation)) {
        $shortcut.IconLocation = $IconLocation
    }
    $shortcut.Save()
}

function Get-WtArgs {
    param(
        [Parameter(Mandatory = $true)][string]$InstallDir,
        [Parameter(Mandatory = $true)][string]$Launcher,
        [switch]$PowerShell
    )

    if ($PowerShell) {
        return ('-d "{0}" powershell.exe -NoLogo -NoExit -ExecutionPolicy Bypass -File "{1}"' -f $InstallDir, $Launcher)
    }

    return ('-d "{0}" cmd /k "chcp 65001 > nul && call ""{1}"""' -f $InstallDir, $Launcher)
}

try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
} catch {
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Split-Path -Parent $scriptDir
$launcher = Join-Path $installDir "ccb.cmd"
$psLauncher = Join-Path $installDir "scripts\launch-ccb.ps1"
$safeLauncher = Join-Path $installDir "ccb-safe.cmd"
$textLauncher = Join-Path $installDir "ccb-text.cmd"
$flatLauncher = Join-Path $installDir "ccb-flat.cmd"
$icon = Join-Path $installDir "ccb.ico"

if (-not (Test-Path -LiteralPath $launcher)) {
    throw "CCB launcher was not found: $launcher"
}
if (-not (Test-Path -LiteralPath $psLauncher)) {
    throw "CCB PowerShell launcher was not found: $psLauncher"
}

Write-Step "Install dir: $installDir"

$wt = Get-Command wt.exe -ErrorAction SilentlyContinue
if (-not $wt) {
    Write-Step "Windows Terminal was not found."

    $shouldInstall = $InstallWindowsTerminal
    if (-not $NoPrompt -and -not $shouldInstall -and (Test-Command "winget.exe")) {
        $answer = Read-Host "Install Windows Terminal with winget now? Type Y to install"
        $shouldInstall = $answer -match '^(y|yes)$'
    }

    if ($shouldInstall) {
        if (-not (Test-Command "winget.exe")) {
            throw "winget.exe was not found. Install Windows Terminal from Microsoft Store, then run this repair again."
        }

        Write-Step "Installing Windows Terminal with winget..."
        winget.exe install Microsoft.WindowsTerminal --accept-package-agreements --accept-source-agreements
        $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
    }
}

if (-not $wt) {
    Write-Host ""
    Write-Host "Windows Terminal is still not available."
    Write-Host "Shortcuts were left using the standard CCB launcher."
    Write-Host "Install Windows Terminal, then run CCB Terminal Fix again."
    Write-Host ""
    Write-Host "Temporary fallback:"
    Write-Host ('  & "{0}" -p' -f $launcher)
    exit 2
}

$wtPath = $wt.Source
Write-Step "Windows Terminal: $wtPath"

$desktop = [Environment]::GetFolderPath("Desktop")
$programs = [Environment]::GetFolderPath("Programs")
$startMenuDir = Join-Path $programs "CCB (Claude Code Best)"

$desktopModern = Join-Path $desktop "CCB.lnk"
$desktopFlat = Join-Path $desktop "CCB Flat Mode.lnk"
$desktopSafe = Join-Path $desktop "CCB Safe Mode.lnk"
$desktopText = Join-Path $desktop "CCB Text Mode.lnk"
$startModern = Join-Path $startMenuDir "CCB.lnk"
$startFlat = Join-Path $startMenuDir "CCB Flat Mode.lnk"
$startSafe = Join-Path $startMenuDir "CCB Safe Mode.lnk"
$startText = Join-Path $startMenuDir "CCB Text Mode.lnk"

$modernArgs = Get-WtArgs -InstallDir $installDir -Launcher $psLauncher -PowerShell
$flatArgs = Get-WtArgs -InstallDir $installDir -Launcher $flatLauncher
$safeArgs = Get-WtArgs -InstallDir $installDir -Launcher $safeLauncher
$textArgs = Get-WtArgs -InstallDir $installDir -Launcher $textLauncher

New-Shortcut -Path $desktopModern -TargetPath $wtPath -Arguments $modernArgs -WorkingDirectory $installDir -IconLocation $icon
if (Test-Path -LiteralPath $flatLauncher) {
    New-Shortcut -Path $desktopFlat -TargetPath $wtPath -Arguments $flatArgs -WorkingDirectory $installDir -IconLocation $icon
}
if (Test-Path -LiteralPath $safeLauncher) {
    New-Shortcut -Path $desktopSafe -TargetPath $wtPath -Arguments $safeArgs -WorkingDirectory $installDir -IconLocation $icon
}
if (Test-Path -LiteralPath $textLauncher) {
    New-Shortcut -Path $desktopText -TargetPath $wtPath -Arguments $textArgs -WorkingDirectory $installDir -IconLocation $icon
}

New-Shortcut -Path $startModern -TargetPath $wtPath -Arguments $modernArgs -WorkingDirectory $installDir -IconLocation $icon
if (Test-Path -LiteralPath $flatLauncher) {
    New-Shortcut -Path $startFlat -TargetPath $wtPath -Arguments $flatArgs -WorkingDirectory $installDir -IconLocation $icon
}
if (Test-Path -LiteralPath $safeLauncher) {
    New-Shortcut -Path $startSafe -TargetPath $wtPath -Arguments $safeArgs -WorkingDirectory $installDir -IconLocation $icon
}
if (Test-Path -LiteralPath $textLauncher) {
    New-Shortcut -Path $startText -TargetPath $wtPath -Arguments $textArgs -WorkingDirectory $installDir -IconLocation $icon
}

Write-Step "Created Windows Terminal shortcuts:"
Write-Host "  $desktopModern"
if (Test-Path -LiteralPath $flatLauncher) { Write-Host "  $desktopFlat" }
if (Test-Path -LiteralPath $safeLauncher) { Write-Host "  $desktopSafe" }
if (Test-Path -LiteralPath $textLauncher) { Write-Host "  $desktopText" }
Write-Host "  $startModern"
if (Test-Path -LiteralPath $flatLauncher) { Write-Host "  $startFlat" }
if (Test-Path -LiteralPath $safeLauncher) { Write-Host "  $startSafe" }
if (Test-Path -LiteralPath $textLauncher) { Write-Host "  $startText" }
Write-Host ""
Write-Step "Main CCB shortcut now uses PowerShell UTF-8 launcher directly, without cmd /k."
