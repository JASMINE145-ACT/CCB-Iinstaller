# Sync repo python + business data + quotation MCP dist → D:\CCB-Wanding\vendor (dev runtime).
# Playbook: .trellis/spec/integration/dev-sync-playbook.md §4.3
#
# Usage:
#   .\ccb-installer\scripts\sync-dev-wanding-vendor.ps1
#   .\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -InstallDir D:\CCB-Wanding -Smoke

[CmdletBinding()]
param(
    [string]$RepoRoot = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent),
    [string]$InstallDir = "D:\CCB-Wanding",
    [switch]$Smoke,
    [switch]$UpdateSettings
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

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
    $args = @($Source, $Destination) + $ExtraArgs
    Write-Host "[robocopy] $($args -join ' ')"
    $proc = Start-Process -FilePath "robocopy.exe" -ArgumentList $args -Wait -PassThru -NoNewWindow
    if (-not (Test-RobocopyOk $proc.ExitCode)) {
        throw "robocopy failed ($($proc.ExitCode)): $Source -> $Destination"
    }
}

if (-not (Test-Path -LiteralPath $InstallDir)) {
    throw "Install dir not found: $InstallDir"
}

$vendor = Join-Path $InstallDir "vendor"
$pyDst = Join-Path $vendor "wanding\python"
$dataDst = Join-Path $vendor "wanding\data"
$mcpDst = Join-Path $vendor "mcp-servers\quotation-server\dist"

Write-Host "=== sync-dev-wanding-vendor ===" -ForegroundColor Cyan
Write-Host "repo:    $RepoRoot"
Write-Host "install: $InstallDir"

Invoke-Robocopy `
    -Source (Join-Path $RepoRoot "python") `
    -Destination $pyDst `
    -ExtraArgs @("/E", "/XD", "tests", "__pycache__", ".pytest_cache", "/XF", "test_*.py", "smoke_*.py", "_tmp_*.txt")

$dataFiles = @(
    "price_library_cleaned_2026_05_15.xlsx",
    "mapping_table.xlsx",
    "wanding_business_knowledge.md",
    "ccb-wanding-quotation.md",
    "ccb-wanding-claude-index.md"
)
foreach ($name in $dataFiles) {
    $srcFile = Join-Path $RepoRoot "data\$name"
    if (Test-Path -LiteralPath $srcFile) {
        $null = New-Item -ItemType Directory -Force -Path $dataDst
        Copy-Item -LiteralPath $srcFile -Destination (Join-Path $dataDst $name) -Force
        Write-Host "[copy] data\$name"
    }
    else {
        Write-Host "[skip] data\$name (not in repo)" -ForegroundColor DarkYellow
    }
}

Invoke-Robocopy `
    -Source (Join-Path $RepoRoot "mcp_servers\quotation-server\dist") `
    -Destination $mcpDst `
    -ExtraArgs @("/E")

if ($UpdateSettings) {
    $ensure = Join-Path $RepoRoot "ccb-installer\scripts\ensure-wanding-settings.ps1"
    if (Test-Path -LiteralPath $ensure) {
        Write-Host "[settings] ensure-wanding-settings.ps1 -InstallDir $InstallDir"
        & $ensure -InstallDir $InstallDir
    }
}

Write-Host "`n=== fingerprints ===" -ForegroundColor Cyan
$checks = @(
    @{
        Label = "wanding_fuzzy_matcher.py"
        Repo  = Join-Path $RepoRoot "python\inventory\services\wanding_fuzzy_matcher.py"
        Live  = Join-Path $pyDst "inventory\services\wanding_fuzzy_matcher.py"
    },
    @{
        Label = "price_library_cleaned"
        Repo  = Join-Path $RepoRoot "data\price_library_cleaned_2026_05_15.xlsx"
        Live  = Join-Path $dataDst "price_library_cleaned_2026_05_15.xlsx"
    }
)
foreach ($c in $checks) {
    if ((Test-Path $c.Repo) -and (Test-Path $c.Live)) {
        $r = Get-Item $c.Repo
        $l = Get-Item $c.Live
        $match = ($r.Length -eq $l.Length) -and ($r.LastWriteTime -ge $l.LastWriteTime.AddSeconds(-2))
        $color = if ($match) { "Green" } else { "Red" }
        Write-Host ("[{0}] repo={1} live={2} size_ok={3}" -f $c.Label, $r.LastWriteTime, $l.LastWriteTime, ($r.Length -eq $l.Length)) -ForegroundColor $color
    }
    else {
        Write-Host ("[{0}] MISSING repo={1} live={2}" -f $c.Label, (Test-Path $c.Repo), (Test-Path $c.Live)) -ForegroundColor Red
    }
}

if ($Smoke) {
    $pythonExe = Join-Path $vendor "python-wanding\python.exe"
    if (-not (Test-Path -LiteralPath $pythonExe)) {
        Write-Host "[smoke] skip: $pythonExe not found" -ForegroundColor Yellow
    }
    else {
        $env:PRICE_LIBRARY_PATH = Join-Path $dataDst "price_library_cleaned_2026_05_15.xlsx"
        $env:PYTHONPATH = $pyDst
        Write-Host "[smoke] HDPE 0.6MPa dn125 6M via live vendor python..."
        & $pythonExe -c @"
import sys
sys.path.insert(0, r'$pyDst')
from inventory.services.wanding_fuzzy_matcher import match_fuzzy_candidates
c = match_fuzzy_candidates('HDPE 0.6MPa dn125 6M', customer_level='B', max_score_tiers=2)
codes = [x.get('code') for x in c]
print('codes=', codes[:5])
assert '8010036693' in codes, 'expected 8010036693'
print('SMOKE PASS')
"@
        if ($LASTEXITCODE -ne 0) { throw "Smoke test failed" }
    }
}

Write-Host "`nDone. Restart dev + open a NEW conversation to pick up MCP/python changes." -ForegroundColor Green
