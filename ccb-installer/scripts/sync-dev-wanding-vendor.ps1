# Sync repo python + business data + quotation MCP dist → D:\CCB-Wanding\vendor (dev runtime).
# Playbook: .trellis/spec/integration/dev-sync-playbook.md §4.3
#
# Usage:
#   .\ccb-installer\scripts\sync-dev-wanding-vendor.ps1
#   .\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -InstallDir D:\CCB-Wanding -Smoke
#   .\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -Strict   # fingerprint mismatch → exit 1

[CmdletBinding()]
param(
    [string]$RepoRoot = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent),
    [string]$InstallDir = "D:\CCB-Wanding",
    [switch]$Smoke,
    [switch]$UpdateSettings,
    [switch]$Strict
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

. (Join-Path $PSScriptRoot 'lib\sync-wanding-data.ps1')

function Test-RobocopyOk([int]$ExitCode) {
    return $ExitCode -lt 8
}

function Invoke-Robocopy {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$ExtraArgs = @()
    )
    if (-not (Test-Path -LiteralPath $Source)) {
        Write-Host "[skip] missing source: $Source" -ForegroundColor Yellow
        return
    }
    $null = New-Item -ItemType Directory -Force -Path $Destination
    $robocopyArgs = @($Source, $Destination) + $ExtraArgs
    Write-Host "[robocopy] $($robocopyArgs -join ' ')"
    $proc = Start-Process -FilePath "robocopy.exe" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
    if (-not (Test-RobocopyOk $proc.ExitCode)) {
        throw "robocopy failed ($($proc.ExitCode)): $Source -> $Destination"
    }
}

function New-SyncFingerprintCheck {
    param(
        [string]$Label,
        [string]$Repo,
        [string]$Live
    )
    [PSCustomObject]@{ Label = $Label; Repo = $Repo; Live = $Live }
}

function Test-SyncFingerprintMatch {
    param(
        [string]$RepoPath,
        [string]$LivePath
    )
    if (-not (Test-Path -LiteralPath $RepoPath)) { return $null }
    if (-not (Test-Path -LiteralPath $LivePath)) { return $false }
    $r = Get-Item -LiteralPath $RepoPath
    $l = Get-Item -LiteralPath $LivePath
    return ($r.Length -eq $l.Length) -and ($r.LastWriteTime -ge $l.LastWriteTime.AddSeconds(-2))
}

if (-not (Test-Path -LiteralPath $InstallDir)) {
    throw "Install dir not found: $InstallDir"
}

$vendor = Join-Path $InstallDir "vendor"
$pyDst = Join-Path $vendor "wanding\python"
$dataDst = Join-Path $vendor "wanding\data"
$mcpDst = Join-Path $vendor "mcp-servers\quotation-server\dist"
$dataMdBasename = "data{0}" -f ".Md"

Write-Host "=== sync-dev-wanding-vendor ===" -ForegroundColor Cyan
Write-Host "repo:    $RepoRoot"
Write-Host "install: $InstallDir"

Invoke-Robocopy `
    -Source (Join-Path $RepoRoot "python") `
    -Destination $pyDst `
    -ExtraArgs @("/E", "/XD", "tests", "__pycache__", ".pytest_cache", "tools", "/XF", "test_*.py", "smoke_*.py", "_tmp_*.txt")

Copy-WandingDataFromRepo -RepoRoot $RepoRoot -DataDest $dataDst

Invoke-Robocopy `
    -Source (Join-Path $RepoRoot "mcp_servers\quotation-server\dist") `
    -Destination $mcpDst `
    -ExtraArgs @("/E")

$priceLibMcpDst = Join-Path $vendor "mcp-servers\price-library-server\dist"
Invoke-Robocopy `
    -Source (Join-Path $RepoRoot "mcp_servers\price-library-server\dist") `
    -Destination $priceLibMcpDst `
    -ExtraArgs @("/E")

$workTasksMcpDst = Join-Path $vendor "mcp-servers\work-tasks-agent"
$null = New-Item -ItemType Directory -Force -Path $workTasksMcpDst
$workTasksSrc = Join-Path $RepoRoot "mcp_servers\work-tasks-query-server\index.mjs"
if (Test-Path -LiteralPath $workTasksSrc) {
    Copy-Item -LiteralPath $workTasksSrc -Destination (Join-Path $workTasksMcpDst "index.mjs") -Force
    Write-Host "[copy] work-tasks-agent MCP -> $workTasksMcpDst"
} else {
    Write-Host "[skip] missing work-tasks MCP source: $workTasksSrc" -ForegroundColor Yellow
}

$supplierDirMcpDst = Join-Path $vendor "mcp-servers\supplier-directory"
$null = New-Item -ItemType Directory -Force -Path $supplierDirMcpDst
$supplierDirSrc = Join-Path $RepoRoot "mcp_servers\supplier-directory-server"
foreach ($name in @('index.mjs', 'preview.mjs')) {
    $src = Join-Path $supplierDirSrc $name
    if (Test-Path -LiteralPath $src) {
        Copy-Item -LiteralPath $src -Destination (Join-Path $supplierDirMcpDst $name) -Force
    } else {
        Write-Host "[skip] missing supplier-directory MCP source: $src" -ForegroundColor Yellow
    }
}
if (Test-Path -LiteralPath (Join-Path $supplierDirMcpDst 'index.mjs')) {
    Write-Host "[copy] supplier-directory MCP -> $supplierDirMcpDst"
}

$priceLibNm = Join-Path $vendor "mcp-servers\price-library-server\node_modules"
$quotNm = Join-Path $vendor "mcp-servers\quotation-server\node_modules"
$workTasksNm = Join-Path $vendor "mcp-servers\work-tasks-agent\node_modules"
$supplierDirNm = Join-Path $vendor "mcp-servers\supplier-directory\node_modules"
if ((Test-Path -LiteralPath $quotNm) -and -not (Test-Path -LiteralPath $workTasksNm)) {
    Write-Host "[junction] work-tasks-agent node_modules -> quotation-server"
    New-Item -ItemType Junction -Path $workTasksNm -Target $quotNm -Force | Out-Null
}
if ((Test-Path -LiteralPath $quotNm) -and -not (Test-Path -LiteralPath $supplierDirNm)) {
    Write-Host "[junction] supplier-directory node_modules -> quotation-server"
    New-Item -ItemType Junction -Path $supplierDirNm -Target $quotNm -Force | Out-Null
}
if ((Test-Path -LiteralPath $quotNm) -and -not (Test-Path -LiteralPath $priceLibNm)) {
    Write-Host "[junction] price-library-server node_modules -> quotation-server"
    New-Item -ItemType Junction -Path $priceLibNm -Target $quotNm -Force | Out-Null
}

if ($UpdateSettings) {
    $ensure = Join-Path $RepoRoot "ccb-installer\scripts\ensure-wanding-settings.ps1"
    if (Test-Path -LiteralPath $ensure) {
        Write-Host "[settings] ensure-wanding-settings.ps1 -InstallDir $InstallDir"
        & $ensure -InstallDir $InstallDir
        if (-not $?) {
            throw 'ensure-wanding-settings failed'
        }
    }
}

Write-Host "`n=== fingerprints ===" -ForegroundColor Cyan
$checks = @(
    (New-SyncFingerprintCheck 'wanding_fuzzy_matcher.py' (Join-Path $RepoRoot 'python\inventory\services\wanding_fuzzy_matcher.py') (Join-Path $pyDst 'inventory\services\wanding_fuzzy_matcher.py')),
    (New-SyncFingerprintCheck 'price_library_cleaned' (Join-Path $RepoRoot 'data\price_library_cleaned_2026_05_15.xlsx') (Join-Path $dataDst 'price_library_cleaned_2026_05_15.xlsx')),
    (New-SyncFingerprintCheck $dataMdBasename (Join-Path (Join-Path $RepoRoot 'data') $dataMdBasename) (Join-Path $dataDst $dataMdBasename)),
    (New-SyncFingerprintCheck 'org_knowledge_client.py' (Join-Path $RepoRoot 'python\admin\org_knowledge_client.py') (Join-Path $pyDst 'admin\org_knowledge_client.py')),
    (New-SyncFingerprintCheck 'org_http_csrf.py' (Join-Path $RepoRoot 'python\admin\org_http_csrf.py') (Join-Path $pyDst 'admin\org_http_csrf.py'))
)
$strictFailures = @()
foreach ($c in $checks) {
    $match = Test-SyncFingerprintMatch -RepoPath $c.Repo -LivePath $c.Live
    if ($null -eq $match) {
        Write-Host ("[{0}] SKIP (not in repo) repo={1} live={2}" -f $c.Label, (Test-Path $c.Repo), (Test-Path $c.Live)) -ForegroundColor DarkYellow
        continue
    }
    if (-not $match) {
        Write-Host ("[{0}] DRIFT repo={1} live={2}" -f $c.Label, (Get-Item $c.Repo).LastWriteTime, (Get-Item $c.Live).LastWriteTime) -ForegroundColor Red
        $strictFailures += $c.Label
        continue
    }
    Write-Host ("[{0}] OK" -f $c.Label) -ForegroundColor Green
}

if ($Strict -and $strictFailures.Count -gt 0) {
    Write-Host ("[strict] fingerprint failures: {0}" -f ($strictFailures -join ', ')) -ForegroundColor Red
    exit 1
}

if ($Smoke) {
    $pythonExe = Join-Path $vendor "python-wanding\python.exe"
    if (-not (Test-Path -LiteralPath $pythonExe)) {
        Write-Host "[smoke] skip: $pythonExe not found" -ForegroundColor Yellow
    }
    else {
        $env:PRICE_LIBRARY_PATH = Join-Path $dataDst "price_library_cleaned_2026_05_15.xlsx"
        $env:PYTHONPATH = $pyDst
        if ($env:PRICE_USE_BUNDLED_FIRST) { Remove-Item Env:PRICE_USE_BUNDLED_FIRST }
        Write-Host "[smoke] org_api price library + supplier via live vendor python..."
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $smokeScript = Join-Path $env:TEMP "ccb-sync-dev-wanding-smoke.py"
            @(
                'import os'
                'import sys'
                "sys.path.insert(0, r'$pyDst')"
                'from admin.org_price_client import get_price_data, invalidate_price_cache'
                'from inventory.services.wanding_fuzzy_matcher import match_fuzzy_candidates, invalidate_wanding_cache, get_wanding_price_by_code'
                'invalidate_price_cache()'
                'invalidate_wanding_cache()'
                'd = get_price_data(force_refresh=True)'
                'print("source=", d.get("source"))'
                'assert d.get("source") == "org_api", "expected org_api, got " + str(d.get("source"))'
                'prods = d.get("products") or []'
                'with_supplier = sum(1 for p in prods if p.get("supplier"))'
                'print("products=", len(prods), "with_supplier=", with_supplier)'
                'assert len(prods) >= 3000, "expected published org library"'
                'assert with_supplier > 0, "expected supplier column from VPS v3+"'
                "c = match_fuzzy_candidates('HDPE 0.6MPa dn125 6M', customer_level='B', max_score_tiers=2)"
                "codes = [x.get('code') for x in c]"
                "print('codes=', codes[:5])"
                "assert '8010036693' in codes, 'expected 8010036693'"
                'pvc = get_wanding_price_by_code("8010012697", customer_level="B")'
                'assert pvc and pvc.get("supplier"), "expected supplier on org_api code lookup"'
                'print("supplier=", pvc.get("supplier"))'
                "print('SMOKE PASS')"
            ) | Set-Content -LiteralPath $smokeScript -Encoding utf8
            $smokeOut = & $pythonExe $smokeScript 2>&1
            $smokeOut | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { Write-Host $_.ToString() } else { $_ } }
            if ($LASTEXITCODE -ne 0) { throw "Smoke test failed (exit $LASTEXITCODE)" }
        }
        finally {
            $ErrorActionPreference = $prevEap
        }
    }
}

Write-Host "`nDone. Restart dev + open a NEW conversation to pick up MCP/python changes." -ForegroundColor Green
