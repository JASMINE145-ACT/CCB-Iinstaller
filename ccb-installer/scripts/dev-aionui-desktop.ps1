# Launch AionUI desktop in hot-reload dev mode (electron-vite).
# Use for UI fixes (chatLib, MessageThinking, MessageAcpPermission) without dist:win each time.
#
# Usage:
#   .\ccb-installer\scripts\dev-aionui-desktop.ps1
#   .\ccb-installer\scripts\dev-aionui-desktop.ps1 -SyncRouteB
#   .\ccb-installer\scripts\dev-aionui-desktop.ps1 -InstallOnly

[CmdletBinding()]
param(
    [switch]$SyncRouteB,
    [switch]$InstallOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$aionuiSrc = if ($env:AIONUI_SRC) { $env:AIONUI_SRC } else { "D:\Projects\aionui-src" }

if (-not (Test-Path (Join-Path $aionuiSrc "package.json"))) {
    throw "AionUI source not found: $aionuiSrc (set AIONUI_SRC to override)"
}

Write-Host "[dev-aionui] repo: $repoRoot"
Write-Host "[dev-aionui] source: $aionuiSrc"
Write-Host ""

Push-Location $aionuiSrc
try {
    Write-Host "[1/3] bun install..."
    & bun install
    if ($LASTEXITCODE -ne 0) { throw "bun install failed (exit $LASTEXITCODE)" }
    Write-Host "  OK"
    Write-Host ""

    if ($InstallOnly) {
        Write-Host "[dev-aionui] -InstallOnly: done."
        return
    }

    if ($SyncRouteB) {
        Write-Host "[2/3] sync Route B patch (all slots incl. AionUi-Dev)..."
        Pop-Location
        & (Join-Path $repoRoot "ccb-installer\scripts\sync-aionui-ccb-route-b.ps1")
        if ($LASTEXITCODE -ne 0) { throw "sync-aionui-ccb-route-b.ps1 failed" }
        Push-Location $aionuiSrc
        Write-Host ""
    } else {
        Write-Host "[2/3] skip Route B sync (pass -SyncRouteB to patch ACP slots)"
        Write-Host ""
    }

    Write-Host "[3/3] bun run dev (electron-vite HMR)..."
    Write-Host "  Verify UI: greeting once | thinking stays expanded | AskUserQuestion options"
    Write-Host "  Data dir (dev): $env:APPDATA\AionUi-Dev\"
    Write-Host "  Ctrl+C to stop"
    Write-Host ""
    & bun run dev
    if ($LASTEXITCODE -ne 0) { throw "bun run dev failed (exit $LASTEXITCODE)" }
}
finally {
    Pop-Location
}
