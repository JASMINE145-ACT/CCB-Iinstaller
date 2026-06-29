# sync-dev-aioncore.ps1 — copy self-built aioncore into dev install bundled slot
#
# Electron resolves aioncore via bundled resources BEFORE PATH (binaryResolver.ts).
# Dev must inject the repo build into InstallDir bundled-aioncore or an old binary wins.
#
# Usage:
#   .\ccb-installer\scripts\sync-dev-aioncore.ps1
#   .\ccb-installer\scripts\sync-dev-aioncore.ps1 -InstallDir D:\CCB-Wanding -Build

param(
    [string]$InstallDir = 'D:\CCB-Wanding',
    [string]$RepoRoot = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent),
    [switch]$Build
)

$ErrorActionPreference = 'Stop'

$srcExe = Join-Path $RepoRoot 'AionCore\target\release\aioncore.exe'
$destDir = Join-Path $InstallDir 'AionUi\resources\bundled-aioncore\win32-x64'
$destExe = Join-Path $destDir 'aioncore.exe'
$manifestPath = Join-Path $destDir 'manifest.json'

if ($Build -or -not (Test-Path -LiteralPath $srcExe)) {
    Write-Host 'Building AionCore (release, aionui-app)...' -ForegroundColor Cyan
    $cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
    if (-not (Test-Path -LiteralPath $cargo)) { throw "cargo not found: $cargo" }
    Push-Location (Join-Path $RepoRoot 'AionCore')
    try {
        & $cargo build --release -p aionui-app
        if ($LASTEXITCODE -ne 0) { throw "cargo build failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath $srcExe)) {
    throw "Self-built aioncore missing: $srcExe (run with -Build)"
}
if (-not (Test-Path -LiteralPath $destDir)) {
    throw "Bundled aioncore dir missing: $destDir (check -InstallDir)"
}

Copy-Item -LiteralPath $srcExe -Destination $destExe -Force
$ver = (& $srcExe --version 2>&1 | Out-String).Trim()
Write-Host "[ok] aioncore -> $destExe ($ver)" -ForegroundColor Green

if (Test-Path -LiteralPath $manifestPath) {
    $mf = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $mf.sourceType = 'embedded'
    if ($ver -match '(\d+\.\d+\.\d+)') { $mf.version = "v$($matches[1])" }
    $mf | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Host "[ok] manifest.json sourceType=embedded version=$($mf.version)" -ForegroundColor Green
}

# Smoke: price-library route must exist (401 unauthenticated, not 404)
$smokeDir = Join-Path $env:TEMP 'aioncore-sync-smoke'
New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null
$proc = Start-Process -FilePath $destExe -ArgumentList @(
    '--host', '127.0.0.1', '--port', '13498', '--data-dir', $smokeDir
) -PassThru -WindowStyle Hidden
try {
    Start-Sleep -Seconds 2
    try {
        Invoke-WebRequest -Uri 'http://127.0.0.1:13498/api/price-library/active' -UseBasicParsing | Out-Null
        $code = 200
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
    }
    if ($code -eq 404) {
        throw 'Injected aioncore still returns 404 on /api/price-library/active — rebuild AionCore with aionui-price-library'
    }
    Write-Host "[ok] price-library route present (HTTP $code)" -ForegroundColor Green

    foreach ($pair in @(
            @{ Path = '/api/work-tasks'; Label = 'work-tasks' },
            @{ Path = '/api/org-knowledge'; Label = 'org-knowledge' }
        )) {
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:13498$($pair.Path)" -UseBasicParsing | Out-Null
            $routeCode = 200
        } catch {
            $routeCode = [int]$_.Exception.Response.StatusCode
        }
        if ($routeCode -eq 404) {
            throw "Injected aioncore returns 404 on $($pair.Path) — rebuild with aionui-$($pair.Label)"
        }
        Write-Host "[ok] $($pair.Label) route present (HTTP $routeCode)" -ForegroundColor Green
    }
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
