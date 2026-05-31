# install-wt-fragment.ps1
# Writes a Windows Terminal Fragment profile ("CCB") with CCB-optimized rendering.
# Safe when WT is not installed — exits 0 without error.

[CmdletBinding()]
param(
    [string]$InstallDir,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"
function Write-Step { param([string]$Message) Write-Host "[CCB] $Message" }

$fragmentDir  = Join-Path $env:LOCALAPPDATA "Microsoft\Windows Terminal\Fragments\CCB"
$fragmentFile = Join-Path $fragmentDir "ccb.json"

if ($Remove) {
    if (Test-Path -LiteralPath $fragmentFile) {
        Remove-Item -LiteralPath $fragmentFile -Force
        Write-Step "Removed WT Fragment: $fragmentFile"
    }
    if (Test-Path -LiteralPath $fragmentDir) {
        $remaining = Get-ChildItem -LiteralPath $fragmentDir -ErrorAction SilentlyContinue
        if (-not $remaining) { Remove-Item -LiteralPath $fragmentDir -Force }
    }
    exit 0
}

# Skip silently if WT is not present
if (-not (Get-Command wt.exe -ErrorAction SilentlyContinue)) {
    Write-Step "Windows Terminal not found; skipping Fragment profile."
    exit 0
}

$json = @'
{
    "$schema": "https://aka.ms/terminal-profiles-schema",
    "profiles": [
        {
            "guid": "{2EB5B8E6-B2A3-4C9F-9B7A-CCB000000001}",
            "name": "CCB",
            "hidden": false,
            "colorScheme": "CCB Dark",
            "font": {
                "face": "Cascadia Code",
                "size": 14,
                "weight": "normal"
            },
            "antialiasingMode": "cleartype",
            "padding": "4",
            "useAcrylic": false,
            "opacity": 100,
            "scrollbarState": "visible"
        }
    ],
    "schemes": [
        {
            "name": "CCB Dark",
            "background": "#000000",
            "foreground": "#FFFFFF",
            "selectionBackground": "#4ADE80",
            "cursorColor": "#4ADE80",
            "black":        "#000000",
            "blue":         "#569CD6",
            "brightBlack":  "#505050",
            "brightBlue":   "#79B8FF",
            "brightCyan":   "#56D4DD",
            "brightGreen":  "#4ADE80",
            "brightPurple": "#D77757",
            "brightRed":    "#FF6B80",
            "brightWhite":  "#FFFFFF",
            "brightYellow": "#FFDA7C",
            "cyan":         "#4EC9B0",
            "green":        "#4ADE80",
            "purple":       "#C586C0",
            "red":          "#FF6B80",
            "white":        "#999999",
            "yellow":       "#CE9178"
        }
    ]
}
'@

try {
    New-Item -ItemType Directory -Force -Path $fragmentDir | Out-Null
    [System.IO.File]::WriteAllText($fragmentFile, $json, [System.Text.UTF8Encoding]::new($false))
    Write-Step "Installed WT Fragment profile: $fragmentFile"
} catch {
    Write-Step "Warning: Could not write WT Fragment profile: $($_.Exception.Message)"
    exit 0
}
exit 0
