# Agent eval suite runner — schema or live ACP regression.
# Usage:
#   .\ccb-installer\scripts\run-agent-eval-suite.ps1 -SchemaOnly
#   .\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding
#   .\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite core -Run -Json

param(
    [ValidateSet('smoke', 'core', 'full', 'quotation-smoke', 'learn-by-data-section-d-offline', 'knowledge-effectiveness-offline')]
    [string]$Suite = 'smoke',
    [string]$InstallDir,
    [string]$ConfigDir,
    [switch]$Run,
    [switch]$SchemaOnly,
    [switch]$Json,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$runner = Join-Path $repoRoot 'eval\run-agent-eval.mjs'

function Write-EvalLine {
    param([string]$Message, [string]$Level = 'INFO')
    if ($Quiet -and $Level -eq 'INFO') { return }
    switch ($Level) {
        'PASS' { Write-Host "[PASS] $Message" -ForegroundColor Green }
        'FAIL' { Write-Host "[FAIL] $Message" -ForegroundColor Red }
        default { Write-Host "[INFO] $Message" }
    }
}

function Resolve-CcbInstallDir {
    param([string]$Override)
    if ($Override -and (Test-Path -LiteralPath $Override)) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    foreach ($c in @('D:\CCB-Wanding', (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'))) {
        if (Test-Path -LiteralPath $c) {
            return (Resolve-Path -LiteralPath $c).Path
        }
    }
    return $null
}

if (-not (Test-Path -LiteralPath $runner)) {
    throw "Agent eval runner missing: $runner"
}

if ($Suite -eq 'learn-by-data-section-d-offline') {
    $offlineRunner = Join-Path $repoRoot 'eval\run-section-d-offline-eval.mjs'
    if (-not (Test-Path -LiteralPath $offlineRunner)) {
        throw "Offline Section D runner missing: $offlineRunner"
    }
    Write-EvalLine "suite=$Suite mode=offline (isolated temp dirs)"
    $started = Get-Date
    & node $offlineRunner 2>&1 | ForEach-Object { $_.ToString() }
    $exitCode = $LASTEXITCODE
    $elapsed = ((Get-Date) - $started).TotalSeconds
    if ($exitCode -eq 0) {
        Write-EvalLine "suite learn-by-data-section-d-offline PASS (${elapsed}s)" 'PASS'
    } else {
        Write-EvalLine "suite learn-by-data-section-d-offline FAIL (${elapsed}s)" 'FAIL'
    }
    exit $exitCode
}

if ($Suite -eq 'knowledge-effectiveness-offline') {
    Write-EvalLine "suite=$Suite mode=offline (hook pytest, no ACP)"
    $started = Get-Date
    $nodeArgs = @($runner, '--suite', 'knowledge-effectiveness-offline', '--run')
    & node @nodeArgs 2>&1 | ForEach-Object { $_.ToString() }
    $exitCode = $LASTEXITCODE
    $elapsed = ((Get-Date) - $started).TotalSeconds
    if ($exitCode -eq 0) {
        Write-EvalLine "suite knowledge-effectiveness-offline PASS (${elapsed}s)" 'PASS'
    } else {
        Write-EvalLine "suite knowledge-effectiveness-offline FAIL (${elapsed}s)" 'FAIL'
    }
    exit $exitCode
}

$resolvedInstall = Resolve-CcbInstallDir -Override $InstallDir
$resolvedConfig = $ConfigDir
if (-not $resolvedConfig) {
    $resolvedConfig = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
}

$nodeArgs = @($runner, '--suite', $Suite)
if ($Run -and -not $SchemaOnly) {
    if (-not $resolvedInstall) {
        throw 'Live run requires CCB-Wanding install dir. Pass -InstallDir.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedConfig 'settings.json'))) {
        throw "Live run requires settings.json under $resolvedConfig"
    }
    $nodeArgs += '--run'
}

$env:CCB_TEST_INSTALL_DIR = $resolvedInstall
if ($resolvedConfig) {
    $env:CCB_TEST_CONFIG_DIR = $resolvedConfig
}

Write-EvalLine "suite=$Suite mode=$(if ($Run -and -not $SchemaOnly) { 'live' } else { 'schema' }) install=$resolvedInstall"

$started = Get-Date
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$output = & node @nodeArgs 2>&1 | ForEach-Object { $_.ToString() }
$exitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEap
$elapsedSec = [int]((Get-Date) - $started).TotalSeconds

if (-not $Quiet) {
    $output | ForEach-Object { Write-Host $_ }
}

$passCount = @($output | Where-Object { $_ -match '^\[agent-eval\] PASS ' }).Count
$failCount = @($output | Where-Object { $_ -match '^\[agent-eval\] FAIL ' }).Count
$selectedLine = ($output | Where-Object { $_ -match '^\[agent-eval\] loaded=' } | Select-Object -Last 1)
$selectedCount = 0
if ($selectedLine -and ($selectedLine -match 'selected=(\d+)')) {
    $selectedCount = [int]$Matches[1]
}

$result = [ordered]@{
    suite       = $Suite
    mode        = if ($Run -and -not $SchemaOnly) { 'live' } else { 'schema' }
    install_dir = $resolvedInstall
    config_dir  = $resolvedConfig
    selected    = $selectedCount
    passed      = $passCount
    failed      = $failCount
    exit_code   = $exitCode
    elapsed_sec = $elapsedSec
    timestamp   = (Get-Date).ToString('o')
}

if ($Json) {
    $outDir = Join-Path $repoRoot 'eval\results'
    $null = New-Item -ItemType Directory -Force -Path $outDir
    $outPath = Join-Path $outDir ("agent-eval-{0}-{1}.json" -f $Suite, (Get-Date -Format 'yyyyMMdd-HHmmss'))
    $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $outPath -Encoding UTF8
    Write-EvalLine "wrote $outPath"
}

if ($exitCode -eq 0) {
    Write-EvalLine "agent eval $Suite OK ($selectedCount cases, ${elapsedSec}s)" 'PASS'
} else {
    Write-EvalLine "agent eval $Suite FAILED (passed=$passCount failed=$failCount)" 'FAIL'
    exit $exitCode
}
