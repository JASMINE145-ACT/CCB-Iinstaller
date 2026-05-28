[CmdletBinding()]
param(
    [string]$PackageDir,
    [switch]$AllowWinget
)

$ErrorActionPreference = "Continue"

function Write-Step {
    param([string]$Message)
    Write-Host "[CCB] $Message"
}

function Test-WindowsTerminal {
    $null -ne (Get-Command wt.exe -ErrorAction SilentlyContinue)
}

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
} catch {
}

if (Test-WindowsTerminal) {
    Write-Step "Windows Terminal already exists."
    exit 0
}

if (-not $PackageDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $installDir = Split-Path -Parent $scriptDir
    $PackageDir = Join-Path $installDir "vendor\windows-terminal"
}

Write-Step "Windows Terminal was not found."
Write-Step "Offline package dir: $PackageDir"

$bundle = $null
if (Test-Path -LiteralPath $PackageDir) {
    $bundle = Get-ChildItem -LiteralPath $PackageDir -Filter "*.msixbundle" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if ($bundle) {
    Write-Step "Installing Windows Terminal from offline package: $($bundle.FullName)"
    try {
        Add-AppxPackage -Path $bundle.FullName -ErrorAction Stop
    } catch {
        Write-Step "Offline Windows Terminal install failed: $($_.Exception.Message)"
    }

    if (Test-WindowsTerminal) {
        Write-Step "Windows Terminal installed from offline package."
        exit 0
    }
}
else {
    Write-Step "No offline Windows Terminal .msixbundle was bundled."
}

if ($AllowWinget -and (Test-Command "winget.exe")) {
    Write-Step "Trying winget fallback..."
    try {
        winget.exe install Microsoft.WindowsTerminal --accept-package-agreements --accept-source-agreements --disable-interactivity
    } catch {
        Write-Step "winget Windows Terminal install failed: $($_.Exception.Message)"
    }

    if (Test-WindowsTerminal) {
        Write-Step "Windows Terminal installed with winget."
        exit 0
    }
}

Write-Step "Windows Terminal is still unavailable. CCB installation can continue."
exit 0
