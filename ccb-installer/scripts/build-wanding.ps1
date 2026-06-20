# WanD v2 merged installer — stage self-contained tree + optional NSIS.
# Spec: .trellis/spec/integration/wanding-first-ship.md §1.4
#
# Usage:
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipNsis
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipAionUiBuild
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipAionUiBuild -SkipPipMcp -SkipStagingClear
#   Partial hot zip (no full NSIS): .\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -Components dist,python,seed

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [string]$ClaudeCodeBRoot = 'D:\claude-code-B',
    [string]$AionUiSrc = 'D:\Projects\aionui-src',
    [string]$StagingDir = '',
    [switch]$SkipBuild,
    [switch]$SkipAionUiBuild,
    [switch]$SkipNsis,
    [switch]$SkipVite,
    [switch]$SkipPipMcp,
    [switch]$SkipStagingClear,
    [switch]$IncludeWindowsTerminal
)

$ErrorActionPreference = 'Stop'

$installerRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $installerRoot -Parent
if (-not $StagingDir) {
    $StagingDir = Join-Path $installerRoot 'staging'
}

$routeBIndex = Join-Path $installerRoot 'patches\aionui-ccb-route-b\index.js'
$routeBRel = 'managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js'

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-RobocopyMirror {
    param(
        [string]$Source,
        [string]$Dest,
        [string[]]$ExtraArgs = @()
    )
    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Missing source: $Source"
    }
    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    $args = @($Source, $Dest, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS') + $ExtraArgs
    $proc = Start-Process -FilePath 'robocopy.exe' -ArgumentList $args -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -gt 7) {
        throw "robocopy failed ($proc.ExitCode): $Source -> $Dest"
    }
}

function Invoke-RobocopyCopy {
    param(
        [string]$Source,
        [string]$Dest,
        [string[]]$ExtraArgs = @()
    )
    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Missing source: $Source"
    }
    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    $args = @($Source, $Dest, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS') + $ExtraArgs
    $proc = Start-Process -FilePath 'robocopy.exe' -ArgumentList $args -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -gt 7) {
        throw "robocopy failed ($proc.ExitCode): $Source -> $Dest"
    }
}

function Test-RequiredFile([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required $Label not found: $Path"
    }
}

function Test-OptionalFile([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "[warn] Optional $Label missing: $Path" -ForegroundColor Yellow
        return $false
    }
    return $true
}

function Copy-FileIfExists([string]$Source, [string]$Dest) {
    if (Test-Path -LiteralPath $Source) {
        $parent = Split-Path $Dest -Parent
        if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        Copy-Item -LiteralPath $Source -Destination $Dest -Force
    }
}

function Test-StagingWanDInstall {
    param([string]$Root, [string]$Label = 'staging')
    # Single source of truth: validate against the SAME install-health-manifest.json
    # that the field-side test-install-health.ps1 reads, so build-time and install-time
    # checks can never drift. OOTB-critical files (site-packages, ppt/gate closure) live
    # in manifest.required_files; only the staging-checkable subset is asserted here
    # (config_files + route_b.runtime_* are post-install/launch artifacts — skipped).
    $manifestPath = Join-Path $Root 'install-health-manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        $manifestPath = Join-Path $installerRoot 'resources\install-health-manifest.json'
    }
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "$Label validation failed: install-health-manifest.json not found (staging root or resources)"
    }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath -Encoding UTF8 | ConvertFrom-Json

    $failures = @()
    foreach ($rel in @($manifest.required_files)) {
        $p = Join-Path $Root ([string]$rel -replace '/', '\')
        if (-not (Test-Path -LiteralPath $p)) {
            $failures += "missing $rel"
        }
    }

    $rb = $manifest.route_b
    $bundled = Join-Path $Root ([string]$rb.bundled_index -replace '/', '\')
    if (Test-Path -LiteralPath $bundled) {
        if (-not (Select-String -LiteralPath $bundled -Pattern ([string]$rb.marker) -SimpleMatch -Quiet)) {
            $failures += 'bundled index.js is not Route B'
        }
        $acpAgent = Join-Path (Split-Path $bundled -Parent) 'acp-agent.js'
        if (Test-Path -LiteralPath $acpAgent) {
            if ($rb.acp_agent_marker -and
                -not (Select-String -LiteralPath $acpAgent -Pattern ([string]$rb.acp_agent_marker) -SimpleMatch -Quiet)) {
                $failures += 'bundled acp-agent.js missing 120s query.next default'
            }
        }
        else {
            $failures += 'bundled acp-agent.js missing'
        }
    }
    else {
        $failures += 'bundled Route B index.js missing'
    }

    $appAsar = Join-Path $Root 'AionUi\resources\app.asar'
    if (Test-Path -LiteralPath $appAsar) {
        $asarText = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($appAsar))
        if (-not $asarText.Contains('isInternalUpdateEnabled')) {
            $failures += 'AionUi app.asar lacks VPS internal update code — rebuild aionui-src (no -SkipAionUiBuild)'
        }
    }
    else {
        $failures += 'AionUi resources\app.asar missing'
    }
    if ($failures.Count -gt 0) {
        throw "$Label validation failed:`n  - $($failures -join "`n  - ")"
    }
    Write-Host "  $Label validation OK (manifest-driven: $(@($manifest.required_files).Count) files + Route B + app.asar)" -ForegroundColor Green
}

function Get-MakensisPath() {
    $cmd = Get-Command makensis -ErrorAction SilentlyContinue
    $candidates = @(
        if ($cmd) { $cmd.Source },
        'D:\NSIS\makensis.exe',
        "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
        "$env:ProgramFiles\NSIS\makensis.exe",
        "${env:ProgramFiles(x86)}\NSIS\Unicode\makensis.exe"
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path -LiteralPath $c)) { return $c }
    }
    return $null
}

Write-Step "WanD v2 build — version $Version"
Write-Host "  Staging: $StagingDir" -ForegroundColor DarkGray

# --- Validate required inputs (fail-closed) ---
$dataRoot = Join-Path $repoRoot 'data'
Test-RequiredFile (Join-Path $dataRoot 'price_library_cleaned_2026_05_15.xlsx') 'price library xlsx'
Test-RequiredFile (Join-Path $dataRoot 'wanding_price_lib.xlsx') 'wanding_price_lib xlsx'
Test-RequiredFile (Join-Path $dataRoot 'ccb-wanding-claude-index.md') 'claude index md'
Test-RequiredFile (Join-Path $dataRoot 'ccb-wanding-quotation.md') 'quotation md'
Test-RequiredFile (Join-Path $dataRoot 'ccb-wanding-accurate.md') 'accurate md'
Test-RequiredFile (Join-Path $dataRoot 'wanding_business_knowledge.md') 'business knowledge md'
Test-OptionalFile (Join-Path $dataRoot 'mapping_table.xlsx') 'mapping_table xlsx'

$dataXlsx = Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' -ErrorAction SilentlyContinue
$blankTemplate = $dataXlsx | Where-Object {
    $_.Name -notin @('price_library_cleaned_2026_05_15.xlsx', 'wanding_price_lib.xlsx', 'mapping_table.xlsx')
}
if (-not $blankTemplate) {
    throw "Required blank quotation template xlsx not found in $dataRoot (need a third xlsx besides price libs)"
}

Test-RequiredFile (Join-Path $installerRoot 'vendor\bun\bun.exe') 'vendor bun'
Test-RequiredFile (Join-Path $repoRoot 'mcp_servers\quotation-server\dist\index.js') 'quotation-server dist'

if (-not $SkipStagingClear -and $StagingDir -like "$installerRoot\staging*") {
    if (Test-Path -LiteralPath $StagingDir) {
        Write-Host "  Clearing staging..." -ForegroundColor DarkGray
        Remove-Item -LiteralPath $StagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} elseif ($SkipStagingClear) {
    Write-Host "[skip] staging clear (-SkipStagingClear)" -ForegroundColor Yellow
}
New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null

# --- Step 1: CCB dist ---
Write-Step "Step 1/4 — CCB dist (claude-code-B)"
if (-not $SkipBuild) {
    if (-not (Test-Path -LiteralPath $ClaudeCodeBRoot)) {
        throw "claude-code-B not found: $ClaudeCodeBRoot"
    }
    Push-Location $ClaudeCodeBRoot
  try {
        & bun run build
        if ($LASTEXITCODE -ne 0) { throw "bun run build failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}
$ccbDist = Join-Path $ClaudeCodeBRoot 'dist'
Test-RequiredFile (Join-Path $ccbDist 'cli.js') 'claude-code-B dist\cli.js'
Invoke-RobocopyMirror $ccbDist (Join-Path $StagingDir 'dist') @(
    '/XD', 'node_modules',
    '/XF', 'loadAgentsDir-head-test.js', 'loadAgentsDir-test108.js'
)
$versionFile = Join-Path $StagingDir 'dist\VERSION'
[System.IO.File]::WriteAllText($versionFile, $Version.Trim(), [System.Text.UTF8Encoding]::new($false))
Write-Host "  dist/VERSION = $Version" -ForegroundColor DarkGray

# --- Step 2: AionUI win-unpacked + route-b ---
Write-Step "Step 2/4 — AionUI (win-unpacked + route-b)"
if (-not $SkipAionUiBuild) {
    if (-not (Test-Path -LiteralPath $AionUiSrc)) {
        throw "aionui-src not found: $AionUiSrc"
    }
    & (Join-Path $repoRoot 'ccb-installer\scripts\sync-aionui-ccb-route-b.ps1')
    Get-Process -Name AionUi, electron, aioncore -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Push-Location $AionUiSrc
    try {
        $packArgs = @('scripts/build-with-builder.js', 'auto', '--win', '--pack-only')
        if ($SkipVite) { $packArgs += '--skip-vite' }
        & node @packArgs
        if ($LASTEXITCODE -ne 0) { throw "build-with-builder --pack-only failed" }
        & node (Join-Path $AionUiSrc 'scripts\prepareHubResources.js')
        if ($LASTEXITCODE -ne 0) { throw 'prepareHubResources failed' }
    } finally {
        Pop-Location
    }
}
$winUnpacked = Join-Path $AionUiSrc 'out\win-unpacked'
Test-RequiredFile (Join-Path $winUnpacked 'AionUi.exe') 'AionUi.exe in win-unpacked'
Invoke-RobocopyMirror $winUnpacked (Join-Path $StagingDir 'AionUi')
$routeBDest = Join-Path $StagingDir "AionUi\resources\bundled-aioncore\win32-x64\$routeBRel"
if (-not (Test-Path -LiteralPath $routeBDest)) {
    throw "ACP slot missing in staged AionUi: $routeBDest"
}
Copy-Item -LiteralPath $routeBIndex -Destination $routeBDest -Force
Write-Host "  route-b patched: $routeBDest" -ForegroundColor DarkGray
$acpAgentPatch = Join-Path $installerRoot 'patches\aionui-acp\acp-agent.js'
Test-RequiredFile $acpAgentPatch 'aionui-acp acp-agent.js patch'
$acpAgentDest = Join-Path (Split-Path $routeBDest -Parent) 'acp-agent.js'
Copy-Item -LiteralPath $acpAgentPatch -Destination $acpAgentDest -Force
Write-Host "  acp-agent patched: $acpAgentDest" -ForegroundColor DarkGray

function Remove-AionUiNsisCruft([string]$aionUiRoot) {
    Get-ChildItem -LiteralPath $aionUiRoot -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'examples' -and $_.FullName -match 'node_modules' } |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
    Get-ChildItem -LiteralPath $aionUiRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match 'node_modules' -and $_.Extension -in '.map', '.ts' } |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
}
Remove-AionUiNsisCruft (Join-Path $StagingDir 'AionUi')

# --- Step 3: vendor, python, data, seed, scripts, resources ---
Write-Step "Step 3/4 — vendor / wanding / seed / scripts"

$vendorDest = Join-Path $StagingDir 'vendor'
foreach ($sub in @('bun', 'ripgrep', 'git', 'python-wanding', 'ppt-master-skill')) {
    $src = Join-Path $installerRoot "vendor\$sub"
    Test-RequiredFile $src "vendor\$sub"
    Invoke-RobocopyMirror $src (Join-Path $vendorDest $sub)
}

# MCP servers (pre-staged + quotation dist)
$mcpDest = Join-Path $vendorDest 'mcp-servers'
New-Item -ItemType Directory -Force -Path $mcpDest | Out-Null
$preserveMcpPip = $SkipPipMcp -and $SkipStagingClear
$mcpVendorArgs = @('/XF', 'test_fixes.py', '/XD', '__pycache__', 'ccb-deploy-mcp')
if ($preserveMcpPip) {
    Write-Host '[preserve] MCP pip outputs in staging (copy vendor mcp without delete)' -ForegroundColor Yellow
    Invoke-RobocopyCopy (Join-Path $installerRoot 'vendor\mcp-servers') $mcpDest $mcpVendorArgs
}
else {
    Invoke-RobocopyMirror (Join-Path $installerRoot 'vendor\mcp-servers') $mcpDest $mcpVendorArgs
}
$quotDistSrc = Join-Path $repoRoot 'mcp_servers\quotation-server\dist'
$quotDistDest = Join-Path $mcpDest 'quotation-server\dist'
Invoke-RobocopyMirror $quotDistSrc $quotDistDest
$quotNodeModulesSrc = Join-Path $repoRoot 'mcp_servers\quotation-server\node_modules'
if (Test-Path -LiteralPath $quotNodeModulesSrc) {
    Invoke-RobocopyMirror $quotNodeModulesSrc (Join-Path $mcpDest 'quotation-server\node_modules') @(
        '/XD', '.cache'
    )
}
else {
    throw "quotation-server node_modules missing: $quotNodeModulesSrc"
}

# accurate single file (required)
$accurateSrc = Join-Path $installerRoot 'vendor\mcp-servers\accurate-mcp\server.py'
Test-RequiredFile $accurateSrc 'accurate-mcp server.py'
Copy-Item -LiteralPath $accurateSrc -Destination (Join-Path $mcpDest 'accurate-mcp\server.py') -Force

# Wanding python (filtered)
$pyDest = Join-Path $vendorDest 'wanding\python'
$pySrc = Join-Path $repoRoot 'python'
Invoke-RobocopyMirror $pySrc $pyDest @(
    '/XF', 'test_*.py', 'smoke_wanding_e2e.py', '_tmp_*.txt',
    '/XD', 'tests', '.pytest_cache', '__pycache__', 'tools'
)

# Wanding data
$dataDest = Join-Path $vendorDest 'wanding\data'
New-Item -ItemType Directory -Force -Path $dataDest | Out-Null
foreach ($f in @(
    'ccb-wanding-claude-index.md',
    'ccb-wanding-quotation.md',
    'ccb-wanding-accurate.md',
    'wanding_business_knowledge.md',
    'wanding-matching-architecture.md'
)) {
    $srcMd = Join-Path $dataRoot $f
    if (Test-Path -LiteralPath $srcMd) {
        Copy-Item -LiteralPath $srcMd -Destination (Join-Path $dataDest $f) -Force
    }
}
Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dataDest $_.Name) -Force
}

$configDest = Join-Path $vendorDest 'wanding\config'
New-Item -ItemType Directory -Force -Path $configDest | Out-Null
Copy-Item -LiteralPath (Join-Path $installerRoot 'resources\org-server.json') -Destination (Join-Path $configDest 'org-server.json') -Force

# Seed agents (full keep-set)
$seedAgentsDest = Join-Path $StagingDir 'seed\agents'
New-Item -ItemType Directory -Force -Path $seedAgentsDest | Out-Null
Get-ChildItem -LiteralPath (Join-Path $installerRoot 'config\agents') -File |
    Where-Object { $_.Name -ne 'README.md' } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $seedAgentsDest -Force }

$seedSkillSrc = Join-Path $installerRoot 'config\skills\ccb-subagent-gate'
$seedSkillDest = Join-Path $StagingDir 'seed\skills\ccb-subagent-gate'
Invoke-RobocopyMirror $seedSkillSrc $seedSkillDest @('/XD', 'tests', '__pycache__', '/XF', '*.pyc')

# Scripts (shipped set — whitelist §7)
# Clear first so stale build-only helpers from a previous build (or a partial
# -SkipStagingClear run) can never survive into staging and ship via NSIS
# `File /r scripts\*.*`. The manifest-driven gate only catches MISSING files,
# not stale EXTRAS, so the whitelist + this clear are the only defense.
$scriptsDest = Join-Path $StagingDir 'scripts'
if (Test-Path -LiteralPath $scriptsDest) {
    Remove-Item -LiteralPath $scriptsDest -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $scriptsDest | Out-Null
# Shipped scripts: install/repair/bootstrap only — no build-only helpers.
$shipScripts = @(
    'ensure-wanding-settings.ps1',
    'install-office-word-mcp.ps1',
    'install-ppt-master.ps1',
    # install-ppt-master.ps1 calls these four from $PSScriptRoot at install time
    # (run-wanding-bootstrap Full); they are runtime deps now asserted by
    # install-health-manifest.required_files, so the manifest-driven gate fails the
    # build if they are not shipped. (vendor-ppt-master.ps1 stays dev-only.)
    'deploy-ppt-master-skill.ps1',
    'deploy-subagent-gate-skill.ps1',
    'sync-ppt-master-agents.ps1',
    'ensure-ppt-master-deps.ps1',
    'install-excel-mcp-server.ps1',
    'deploy-seed-agents.ps1',
    'deploy-seed-agents.mjs',
    'patch-subagent-gate-hooks.ps1',
    'sync-aionui-ccb-route-b.ps1',
    'test-install-health.ps1',
    'run-wanding-bootstrap.ps1',
    'smoke-wanding-e2e.ps1',
    'ccb-diagnose.ps1',
    'ccb-check-update.ps1',
    'verify-update-server.ps1',
    'internal-upgrade.ps1'
)
foreach ($s in $shipScripts) {
    $src = Join-Path $installerRoot "scripts\$s"
    Test-RequiredFile $src "script $s"
    Copy-Item -LiteralPath $src -Destination (Join-Path $scriptsDest $s) -Force
}

# Resources for installer config section
$resDest = Join-Path $StagingDir 'resources'
Invoke-RobocopyMirror (Join-Path $installerRoot 'resources') $resDest

# Root launchers (v2 IN set)
Copy-Item -LiteralPath (Join-Path $installerRoot 'resources\ccb.ico') -Destination (Join-Path $StagingDir 'ccb.ico') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-wanding.cmd') -Destination (Join-Path $StagingDir 'ccb-wanding.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-diagnose.cmd') -Destination (Join-Path $StagingDir 'ccb-diagnose.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-launch-aionui.cmd') -Destination (Join-Path $StagingDir 'ccb-launch-aionui.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-check-install.cmd') -Destination (Join-Path $StagingDir 'ccb-check-install.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-verify-update.cmd') -Destination (Join-Path $StagingDir 'ccb-verify-update.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'resources\install-health-manifest.json') -Destination (Join-Path $StagingDir 'install-health-manifest.json') -Force

Write-Step 'Pre-install MCP pip deps into staging (OOTB — no system Python on target PC)'
if (-not $SkipPipMcp) {
    & (Join-Path $installerRoot 'scripts\install-office-word-mcp.ps1') -InstallDir $StagingDir
    & (Join-Path $installerRoot 'scripts\install-excel-mcp-server.ps1') -InstallDir $StagingDir
    $pptSkillStaging = Join-Path $env:TEMP "ccb-wanding-ppt-skill-$([Guid]::NewGuid().ToString('N'))"
    try {
        & (Join-Path $installerRoot 'scripts\deploy-ppt-master-skill.ps1') `
            -SkillsDir $pptSkillStaging `
            -SourceDir (Join-Path $StagingDir 'vendor\ppt-master-skill')
        & (Join-Path $installerRoot 'scripts\ensure-ppt-master-deps.ps1') `
            -InstallDir $StagingDir `
            -SkillDir (Join-Path $pptSkillStaging 'ppt-master')
    }
    finally {
        Remove-Item -LiteralPath $pptSkillStaging -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host '[skip] MCP pip pre-install (-SkipPipMcp). Use with -SkipStagingClear if site-packages already in staging.' -ForegroundColor Yellow
}

# Optional windows-terminal (large; not required for AionUI desktop path)
if ($IncludeWindowsTerminal) {
    $wtSrc = Join-Path $installerRoot 'vendor\windows-terminal'
    if (Test-Path -LiteralPath $wtSrc) {
        Invoke-RobocopyMirror $wtSrc (Join-Path $vendorDest 'windows-terminal')
        Copy-Item -LiteralPath (Join-Path $installerRoot 'scripts\install-windows-terminal.ps1') `
            -Destination (Join-Path $scriptsDest 'install-windows-terminal.ps1') -Force
    }
    else {
        Write-Host '[warn] -IncludeWindowsTerminal but vendor\windows-terminal missing' -ForegroundColor Yellow
    }
}
else {
    Write-Host '  skipping windows-terminal vendor (use -IncludeWindowsTerminal to bundle)' -ForegroundColor DarkGray
}

Write-Step 'Staging validation (fail-closed)'
Test-StagingWanDInstall -Root $StagingDir

Write-Step "Step 4/4 — NSIS (optional)"
if ($SkipNsis) {
    Write-Host "[skip] NSIS (-SkipNsis)" -ForegroundColor Yellow
} else {
    $makensis = Get-MakensisPath
    if (-not $makensis) {
        throw 'makensis not found. Install NSIS (winget install NSIS.NSIS) or pass -SkipNsis'
    }
    $nsi = Join-Path $installerRoot 'installer-wanding-v2.nsi'
    if (-not (Test-Path -LiteralPath $nsi)) {
        throw "Missing NSIS script: $nsi"
    }
    Push-Location $installerRoot
    try {
        & $makensis "/DAPP_VERSION=$Version" $nsi
        if ($LASTEXITCODE -ne 0) { throw "makensis failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    $outExe = Join-Path $installerRoot "CCB-Wanding-$Version.exe"
    if (Test-Path -LiteralPath $outExe) {
        Write-Host "[OK] $outExe" -ForegroundColor Green
    } else {
        Write-Host "[warn] Expected output not found: $outExe" -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host '[OK] Staging complete.' -ForegroundColor Green
Write-Host "  $StagingDir" -ForegroundColor DarkGray
Write-Host 'Next: install exe on test machine, then:' -ForegroundColor Cyan
Write-Host '  .\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session' -ForegroundColor DarkGray
Write-Host '  .\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"' -ForegroundColor DarkGray
