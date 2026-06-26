# CCB-Wanding E2E smoke: Layer 1 (optional) + Layer 2 match->inventory->fill->verify
param(
    [string]$InstallDir,
    [string]$Keywords = "直接50",
    [string]$CustomerLevel = "B",
    [switch]$SkipLayer1
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function Resolve-CcbWandingInstallDir {
    param([string]$Override)
    if ($Override -and (Test-Path -LiteralPath $Override)) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    $regPath = 'HKCU:\Software\CCB-Wanding\CCB-Wanding'
    if (Test-Path -LiteralPath $regPath) {
        $reg = Get-ItemProperty -LiteralPath $regPath -ErrorAction SilentlyContinue
        if ($reg.InstallDir -and (Test-Path -LiteralPath $reg.InstallDir)) {
            return $reg.InstallDir
        }
    }
    $fallback = Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'
    if (Test-Path -LiteralPath $fallback) {
        return $fallback
    }
    throw "CCB-Wanding install dir not found. Pass -InstallDir explicitly."
}

function Resolve-WandingLayoutPaths {
    param([string]$Root)
    $repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    $py = Join-Path $Root 'vendor\python-wanding\python.exe'
    if (-not (Test-Path -LiteralPath $py)) {
        throw "Bundled python not found: $py"
    }

    $dataInstalled = Join-Path $Root 'vendor\wanding\data'
    $pythonInstalled = Join-Path $Root 'vendor\wanding\python'
    if (Test-Path -LiteralPath $dataInstalled) {
        $dataDir = $dataInstalled
    }
    else {
        $dataDir = Join-Path $repoRoot 'data'
        Write-Host "NOTE: using repo data dir (pre-install layout): $dataDir"
    }
    if (Test-Path -LiteralPath $pythonInstalled) {
        $pythonRoot = $pythonInstalled
    }
    else {
        $pythonRoot = Join-Path $repoRoot 'python'
        Write-Host "NOTE: using repo python dir (pre-install layout): $pythonRoot"
    }

    $smokeScript = Join-Path $pythonRoot 'smoke_wanding_e2e.py'
    if (-not (Test-Path -LiteralPath $smokeScript)) {
        $smokeScript = Join-Path $repoRoot 'python\smoke_wanding_e2e.py'
    }
    if (-not (Test-Path -LiteralPath $smokeScript)) {
        throw "smoke_wanding_e2e.py not found under $pythonRoot or repo python/"
    }

    return @{
        PythonExe   = $py
        PythonRoot  = $pythonRoot
        DataDir     = $dataDir
        SmokeScript = $smokeScript
        RepoRoot    = $repoRoot
    }
}

function Import-AolEnvFromMcpConfig {
    param([string]$InstallDir)
    $mcpPath = Join-Path $InstallDir 'ccb-mcp.json'
    if (-not (Test-Path -LiteralPath $mcpPath)) {
        Write-Host "WARN: ccb-mcp.json not found; inventory step may report unavailable"
        return
    }
    try {
        $mcp = Get-Content -Raw -LiteralPath $mcpPath | ConvertFrom-Json
        $quotation = $mcp.mcpServers.quotation
        if (-not $quotation) { return }
        $envBlock = $quotation.env
        if (-not $envBlock) { return }
        foreach ($name in @('AOL_ACCESS_TOKEN', 'AOL_SIGNATURE_SECRET', 'AOL_DATABASE_ID', 'AOL_API_BASE_URL')) {
            $val = $envBlock.$name
            if ($val) { Set-Item -Path "Env:$name" -Value ([string]$val) }
        }
    }
    catch {
        Write-Host "WARN: failed to read AOL env from ccb-mcp.json: $_"
    }
}

try {
    $InstallDir = Resolve-CcbWandingInstallDir -Override $InstallDir
    Write-Host "InstallDir=$InstallDir"

    $paths = Resolve-WandingLayoutPaths -Root $InstallDir
    $env:PYTHONNOUSERSITE = '1'
    $env:PYTHONUTF8 = '1'
    $env:PYTHONIOENCODING = 'utf-8'
    $env:PYTHONPATH = $paths.PythonRoot
    $env:WANDING_PRICE_LIB_PATH = Join-Path $paths.DataDir 'wanding_price_lib.xlsx'
    $env:WANDING_BUSINESS_KNOWLEDGE_PATH = Join-Path $paths.DataDir 'wanding_business_knowledge.md'

    Import-AolEnvFromMcpConfig -InstallDir $InstallDir

    if (-not $SkipLayer1) {
        Write-Host "`n=== Layer 1: test_vantsing_fill.py ==="
        $layer1 = Join-Path $paths.PythonRoot 'test_vantsing_fill.py'
        if (-not (Test-Path -LiteralPath $layer1)) {
            $layer1 = Join-Path $paths.RepoRoot 'python\test_vantsing_fill.py'
        }
        if (Test-Path -LiteralPath $layer1) {
            & $paths.PythonExe $layer1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "FAIL: Layer 1"
                exit 1
            }
            Write-Host "Layer 1 PASS"
        }
        else {
            Write-Host "SKIP: Layer 1 script not found: $layer1"
        }
    }

    Write-Host "`n=== Layer 2: E2E ($Keywords) ==="
    & $paths.PythonExe $paths.SmokeScript `
        --data-dir $paths.DataDir `
        --keywords $Keywords `
        --customer-level $CustomerLevel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: Layer 2"
        exit 1
    }

    Write-Host "`n=== Bundle import check ==="
    & $paths.PythonExe -c @"
import pandas as p, openpyxl, numpy as n
for mod in (p, openpyxl, n):
    path = mod.__file__.replace('\\\\', '/')
    assert 'python-wanding' in path.lower(), f'{mod.__name__} not bundled: {path}'
print('bundle imports OK')
"@
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: bundle import check"
        exit 1
    }

    Write-Host "`nALL PASS (InstallDir=$InstallDir)"
    exit 0
}
catch {
    Write-Host "FAIL: $_"
    exit 1
}
