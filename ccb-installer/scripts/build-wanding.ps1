# WanD v2 merged installer — stage self-contained tree + optional NSIS.
# Spec: .trellis/spec/integration/wanding-first-ship.md §1.4
#
# Usage:
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipNsis
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipAionUiBuild
#   .\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipAionUiBuild -SkipPipMcp -SkipStagingClear
#   Inject self-compiled aioncore: .\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.2 -SkipAionUiBuild -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe
#   Partial hot zip (no full NSIS): .\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -Components dist,python,seed

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [string]$ClaudeCodeBRoot = 'D:\claude-code-B',
    [string]$AionUiSrc = 'D:\Projects\aionui-src',
    [string]$StagingDir = '',
    [string]$IconSource = '',
    [switch]$SkipBuild,
    [switch]$SkipAionUiBuild,
    [switch]$SkipNsis,
    [switch]$SkipVite,
    [switch]$SkipPipMcp,
    [switch]$SkipStagingClear,
    [switch]$IncludeWindowsTerminal,
    [string]$AioncorePath = ''   # Optional: override bundled aioncore.exe in staging (e.g. AionCore\target\release\aioncore.exe)
)

function Invoke-NativeBuildCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )
    # Bun/node often print progress to stderr; do not treat that as a terminating error.
    $prevEa = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Command
        if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
    } finally {
        $ErrorActionPreference = $prevEa
    }
}

$ErrorActionPreference = 'Stop'

$installerRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $installerRoot -Parent
if (-not $StagingDir) {
    $StagingDir = Join-Path $installerRoot 'staging'
}
if (-not $IconSource) {
    $defaultIcon = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'data') -Filter 'ChatGPT Image*.png' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($defaultIcon) {
        $IconSource = $defaultIcon.FullName
    }
}

$routeBIndex = Join-Path $installerRoot 'patches\aionui-ccb-route-b\index.js'
$routeBRel = 'managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js'

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Sync-AionUiBrandAssets {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePng,
        [Parameter(Mandatory = $true)]
        [string]$AionUiRoot
    )

    if (-not (Test-Path -LiteralPath $SourcePng)) {
        Write-Host "[WARN] Brand icon source not found: $SourcePng; skipping AionUI asset sync" -ForegroundColor Yellow
        return
    }

    $brandPng = Join-Path $AionUiRoot 'packages\desktop\src\renderer\assets\logos\brand\app.png'
    $resourcesDir = Join-Path $AionUiRoot 'packages\desktop\resources'
    $resourcePng = Join-Path $resourcesDir 'app.png'
    $resourceIco = Join-Path $resourcesDir 'app.ico'

    New-Item -ItemType Directory -Force -Path (Split-Path $brandPng -Parent) | Out-Null
    New-Item -ItemType Directory -Force -Path $resourcesDir | Out-Null
    Copy-Item -LiteralPath $SourcePng -Destination $brandPng -Force
    Copy-Item -LiteralPath $SourcePng -Destination $resourcePng -Force
    Update-WanDIcon -SourcePng $SourcePng -IconPath $resourceIco
    Write-Host "  AionUI brand assets synced (renderer + resources/app.ico)" -ForegroundColor DarkGray
}

function Update-WanDIcon {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePng,
        [Parameter(Mandatory = $true)]
        [string]$IconPath
    )

    if (-not (Test-Path -LiteralPath $SourcePng)) {
        Write-Host "[WARN] Icon source not found: $SourcePng; keeping existing $IconPath" -ForegroundColor Yellow
        return
    }

    $pythonCode = @'
from PIL import Image
import sys

src, dst = sys.argv[1], sys.argv[2]
sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
img = Image.open(src).convert("RGBA")
img.thumbnail((256, 256), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
canvas.paste(img, ((256 - img.width) // 2, (256 - img.height) // 2), img if img.mode == "RGBA" else None)
canvas.save(dst, format="ICO", sizes=sizes)
'@

    New-Item -ItemType Directory -Force -Path (Split-Path $IconPath -Parent) | Out-Null
    $tempPy = Join-Path $env:TEMP "wanding-icon-gen-$([Guid]::NewGuid().ToString('n')).py"
    try {
        Set-Content -LiteralPath $tempPy -Value $pythonCode -Encoding UTF8
        & python $tempPy $SourcePng $IconPath
        if ($LASTEXITCODE -ne 0) {
            throw "Icon generation failed: $SourcePng -> $IconPath"
        }
    } finally {
        Remove-Item -LiteralPath $tempPy -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Icon refreshed: $IconPath" -ForegroundColor DarkGray
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

function Get-RepoProvenance([string]$RepoPath) {
    # Best-effort git provenance for a source tree. Never throws — returns nulls
    # if the path is missing, git is unavailable, or the dir is not a git repo.
    # Used only for staging\dist\BUILD-INFO.json (audit/freshness), never VERSION.
    $result = [PSCustomObject]@{
        root   = $RepoPath
        commit = $null
        branch = $null
        dirty  = $null
    }
    try {
        if (-not $RepoPath -or -not (Test-Path -LiteralPath $RepoPath)) {
            return $result
        }
        $commit = (& git -C $RepoPath rev-parse --short HEAD 2>$null)
        if ($LASTEXITCODE -eq 0 -and $commit) {
            $result.commit = ([string]$commit).Trim()
        }
        $branch = (& git -C $RepoPath rev-parse --abbrev-ref HEAD 2>$null)
        if ($LASTEXITCODE -eq 0 -and $branch) {
            $result.branch = ([string]$branch).Trim()
        }
        $status = (& git -C $RepoPath status --porcelain 2>$null)
        if ($LASTEXITCODE -eq 0) {
            $result.dirty = [bool]($status | Where-Object { $_ -and $_.Trim() })
        }
    }
    catch {
        # Swallow — provenance is advisory only.
    }
    return $result
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
        if (-not $asarText.Contains('parseInternalManifest')) {
            $failures += 'AionUi app.asar lacks VPS internal update code — rebuild aionui-src (no -SkipAionUiBuild)'
        }
    }
    else {
        $failures += 'AionUi resources\app.asar missing'
    }

  # 1.1.3.1 fill_quotation_sheet supplements — repo python/ is pack source; gate wiring not just file presence.
    $quoteTools = Join-Path $Root 'vendor\wanding\python\quotation\quote_tools.py'
    if (Test-Path -LiteralPath $quoteTools) {
        $qt = Get-Content -Raw -LiteralPath $quoteTools -Encoding UTF8
        if ($qt -notmatch 'validate_and_fix_fill_rows') {
            $failures += 'quote_tools.py missing validate_and_fix_fill_rows (1.1.3.1 row guard)'
        }
        if ($qt -notmatch 'backfill_inquiry_columns_if_empty') {
            $failures += 'quote_tools.py missing backfill_inquiry_columns_if_empty (1.1.3.1 inquiry backfill)'
        }
    }
    $mainPy = Join-Path $Root 'vendor\wanding\python\main.py'
    if (Test-Path -LiteralPath $mainPy) {
        if (-not (Select-String -LiteralPath $mainPy -Pattern 'system\.tool_dispatch' -Quiet)) {
            $failures += 'vendor/wanding/python/main.py not using system.tool_dispatch'
        }
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
        Invoke-NativeBuildCommand -Label 'bun run build' -Command { bun run build }
    } finally {
        Pop-Location
    }
}
else {
    Write-Host "[WARN] -SkipBuild: shipping dist\ from PRE-EXISTING artifacts in $ClaudeCodeBRoot\dist (NOT rebuilt)." -ForegroundColor Yellow
    Write-Host "       Confirm those artifacts match your latest source before releasing." -ForegroundColor Yellow
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
if ($IconSource) {
    Sync-AionUiBrandAssets -SourcePng $IconSource -AionUiRoot $AionUiSrc
}
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
        # --pack-only only runs Vite; separately run electron-builder --dir to create win-unpacked
        $ebConfig = Join-Path $AionUiSrc 'packages\desktop\electron-builder.yml'
        $env:ELECTRON_CACHE = "$env:LOCALAPPDATA\electron\Cache"
        & bunx electron-builder --config $ebConfig --win --x64 --dir --publish=never
        if ($LASTEXITCODE -ne 0) { throw "electron-builder --dir failed" }
        & node (Join-Path $AionUiSrc 'scripts\prepareHubResources.js')
        if ($LASTEXITCODE -ne 0) { throw 'prepareHubResources failed' }
    } finally {
        Pop-Location
    }
}
else {
    Write-Host "[WARN] -SkipAionUiBuild: shipping AionUi\ from PRE-EXISTING win-unpacked in $AionUiSrc\out (NOT rebuilt)." -ForegroundColor Yellow
    Write-Host "       Confirm that build matches your latest aionui-src source before releasing." -ForegroundColor Yellow
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

# Inject custom aioncore binary if requested
if ($AioncorePath) {
    if (-not (Test-Path -LiteralPath $AioncorePath)) {
        throw "AioncorePath not found: $AioncorePath"
    }
    $aioncoreDestDir = Join-Path $StagingDir 'AionUi\resources\bundled-aioncore\win32-x64'
    $aioncoreDestExe = Join-Path $aioncoreDestDir 'aioncore.exe'
    $aioncoreManifest = Join-Path $aioncoreDestDir 'manifest.json'
    Copy-Item -LiteralPath $AioncorePath -Destination $aioncoreDestExe -Force
    Write-Host "  aioncore injected: $AioncorePath -> $aioncoreDestExe" -ForegroundColor DarkGray
    # Patch manifest.json: set sourceType=embedded so runtime does not download+overwrite
    if (Test-Path -LiteralPath $aioncoreManifest) {
        $mf = Get-Content -LiteralPath $aioncoreManifest -Raw -Encoding UTF8 | ConvertFrom-Json
        $mf.sourceType = 'embedded'
        # Try to read version from binary; fall back to leaving it as-is
        $verOut = & $AioncorePath --version 2>&1
        if ($LASTEXITCODE -eq 0 -and $verOut -match '(\d+\.\d+\.\d+)') {
            $mf.version = "v$($Matches[1])"
        }
        $mf | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $aioncoreManifest -Encoding UTF8
        Write-Host "  aioncore manifest patched: sourceType=embedded version=$($mf.version)" -ForegroundColor DarkGray
    }
}

function Remove-AionUiNsisCruft([string]$aionUiRoot) {
    Get-ChildItem -LiteralPath $aionUiRoot -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'examples' -and $_.FullName -match 'node_modules' } |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
    Get-ChildItem -LiteralPath $aionUiRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match 'node_modules' -and $_.Extension -in '.map', '.ts' } |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
}
Remove-AionUiNsisCruft (Join-Path $StagingDir 'AionUi')

# Build provenance sidecar (audit/freshness — NOT VERSION). dist/VERSION stays a
# single-line bundle id (spec §16, read by internal-upgrade.ps1); provenance lives
# only here so an operator can confirm which source commit the package was built from.
$buildInfo = [PSCustomObject]@{
    version           = $Version
    built_utc         = (Get-Date).ToUniversalTime().ToString('o')
    skip_build        = [bool]$SkipBuild
    skip_aionui_build = [bool]$SkipAionUiBuild
    claude_code_b     = Get-RepoProvenance $ClaudeCodeBRoot
    aionui_src        = Get-RepoProvenance $AionUiSrc
}
$buildInfoFile = Join-Path $StagingDir 'dist\BUILD-INFO.json'
[System.IO.File]::WriteAllText($buildInfoFile, ($buildInfo | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
Write-Host "  dist/BUILD-INFO.json written (ccb=$($buildInfo.claude_code_b.commit) aionui=$($buildInfo.aionui_src.commit))" -ForegroundColor DarkGray

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
# Ship ALL data\*.md except the spec §5.4 "Exclude data" denylist, so a newly added
# SOP / knowledge md auto-ships instead of being silently dropped by a stale hardcoded list.
$dataMdDenylist = @(
    'ccb-wanding-update-server.md',
    'ccb-wanding-pricing-system.md',
    'data.Md'
)
Get-ChildItem -LiteralPath $dataRoot -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($dataMdDenylist -notcontains $_.Name) {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dataDest $_.Name) -Force
    }
}
Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dataDest $_.Name) -Force
}

$configDest = Join-Path $vendorDest 'wanding\config'
New-Item -ItemType Directory -Force -Path $configDest | Out-Null
Copy-Item -LiteralPath (Join-Path $installerRoot 'resources\org-server.json') -Destination (Join-Path $configDest 'org-server.json') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'resources\sso.env.example') -Destination (Join-Path $configDest 'sso.env.example') -Force

# Seed agents (full keep-set)
$seedAgentsDest = Join-Path $StagingDir 'seed\agents'
New-Item -ItemType Directory -Force -Path $seedAgentsDest | Out-Null
Get-ChildItem -LiteralPath (Join-Path $installerRoot 'config\agents') -File |
    Where-Object { $_.Name -ne 'README.md' } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $seedAgentsDest -Force }

$shipManifestSrc = Join-Path $installerRoot 'seed\config-ship-manifest.json'
Test-RequiredFile $shipManifestSrc 'seed config-ship-manifest.json'
Copy-Item -LiteralPath $shipManifestSrc -Destination (Join-Path $StagingDir 'seed\config-ship-manifest.json') -Force

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
    'apply-ship-config-reset.ps1',
    'smoke-wanding-e2e.ps1',
    'ccb-diagnose.ps1',
    'ccb-check-update.ps1',
    'ccb-update-notify.ps1',
    'ccb-update-auto.ps1',
    'verify-update-server.ps1',
    'internal-upgrade.ps1',
    'repair-wanding-install-dir.ps1',
    'rollback-last-update.ps1'
)
foreach ($s in $shipScripts) {
    $src = Join-Path $installerRoot "scripts\$s"
    Test-RequiredFile $src "script $s"
    Copy-Item -LiteralPath $src -Destination (Join-Path $scriptsDest $s) -Force
}

# Drift guard: $shipScripts is the authoritative SHIP whitelist (spec §7 — most scripts
# are dev/CI-only and must NOT ship). $devOnlyScripts knowingly classifies the §7
# "Never ship (dev/CI only)" + "Optional / not in main WanD package" + WT-gated entries.
# Any .ps1/.mjs in scripts\ that is in NEITHER list is "unclassified" — warn (non-fatal)
# so a newly added script can't be silently dropped or silently shipped unreviewed.
$devOnlyScripts = @(
    'build-wanding.ps1',
    'build-wanding-hot.ps1',
    'deploy-claude-code-b-to-wanding.ps1',
    'package-aionui-exe.ps1',
    'sync-aionui-ccb-patch.ps1',
    'test-mcp-health.ps1',
    'test-native-acp-agent.mjs',
    'install-windows-terminal.ps1',
    'launch-ccb-wanding.ps1',
    'fix-terminal-launcher.ps1',
    'install-wt-fragment.ps1',
    'patch-i18n.ps1',
    'normalize-i18n-literals.mjs',
    'launch-ccb.ps1',
    'ccb-recent.ps1',
    'ccb-update-info.ps1',
    'smoke-hot-update-trial.ps1',
    'publish-update-bundle.ps1',
    'build-wanding-lib.ps1',
    'deploy-ccb-skills.ps1',
    'ensure-mcp-settings.ps1',
    'scan-i18n-gaps.ps1',
    'vendor-ppt-master.ps1',
    'verify-installer.ps1',
    'dev-aionui-desktop.ps1',
    'start-aionui-dev.ps1',
    'test-terminal-local.ps1',
    'build-resources.ps1',
    'sync-ccb-wanding-bootstrap.ps1',
    'sync-ccb-wanding-print.ps1',
    'sync-claude-code-b-mcp-prefetch.ps1',
    'sync-dev-wanding-vendor.ps1',
    'deploy-claude-code-b-to-wanding.ps1',
    'launch-ccb-wt.ps1',
    'apply-safe-ui-i18n.mjs',
    'apply-slash-command-i18n.mjs',
    'build-ccb-acp-agent.mjs',
    'build-ccb-api-server.mjs',
    'build-serve-wanding.mjs',
    'extract-slash-commands-registry.mjs',
    'extract-slash-description-literals.mjs',
    'extract-slash-descriptions.mjs',
    'fix-dist-cjk-literals.mjs',
    'merge-keep-set-l1-sidecar.mjs',
    'patch-lite-command-filter.mjs',
    'test-mcp-probe-layer.mjs',
    'test-quotation-mcp-double.mjs',
    'test-quotation-mcp-timing.mjs',
    '_apply-spec.ps1',
    '_build-excel-mcp-desc.mjs',
    '_build-spinner-tips-patch.mjs',
    '_find-merged-lines.ps1',
    '_fix-query-params.mjs',
    '_gen-search-hints-patch.mjs',
    '_gen-spinner-tips-patch.mjs',
    '_gen-tool-long-patch.mjs',
    '_hex-line.ps1',
    '_list-excel-mcp-prompts.mjs',
    '_list-excel-mcp-prompts.mjs',
    '_mega1-run.ps1',
    '_mega2-run.ps1',
    '_p1-test.ps1',
    '_p2b-run.ps1',
    '_p6a-run.ps1',
    '_parse-check.ps1',
    '_scan-search-hints.mjs',
    '_scan-spinner-tips.mjs',
    '_scan-tool-descriptions.mjs',
    '_scan-ui-gaps.mjs',
    '_test-diff2.ps1',
    '_test-partial.ps1',
    '_tool-long-patch.ps1',
    '_tool-search-hints-patch.ps1'
)
$unclassifiedScripts = Get-ChildItem -LiteralPath (Join-Path $installerRoot 'scripts') -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in '.ps1', '.mjs' } |
    Where-Object { ($shipScripts -notcontains $_.Name) -and ($devOnlyScripts -notcontains $_.Name) }
if ($unclassifiedScripts) {
    Write-Host "[WARN] Unclassified scripts in scripts\ (neither shipped nor dev-only):" -ForegroundColor Yellow
    foreach ($u in $unclassifiedScripts) {
        Write-Host "         $($u.Name)" -ForegroundColor Yellow
    }
    Write-Host "       Add each to `$shipScripts (to ship) or `$devOnlyScripts (dev/CI-only) in build-wanding.ps1." -ForegroundColor Yellow
}

# Resources for installer config section
$resDest = Join-Path $StagingDir 'resources'
Invoke-RobocopyMirror (Join-Path $installerRoot 'resources') $resDest

# Inject JWT_SECRET from gitignored env.local into ALL staged sso.env.example copies.
# ensure-wanding-settings.ps1 seeds from vendor\wanding\config\sso.env.example (not resources\).
$envLocalPath = Join-Path $repoRoot 'scripts\org-phase0\env.local'
function Set-StagedSsoJwtSecret {
    param(
        [string]$SsoExamplePath,
        [string]$JwtLine
    )
    if (-not (Test-Path -LiteralPath $SsoExamplePath)) {
        Write-Host "[WARN] staged sso.env.example not found: $SsoExamplePath" -ForegroundColor Yellow
        return
    }
    $ssoContent = (Get-Content -LiteralPath $SsoExamplePath -Raw) -replace '(?m)^JWT_SECRET=.*$', $JwtLine
    [System.IO.File]::WriteAllText($SsoExamplePath, $ssoContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  sso.env.example JWT injected: $SsoExamplePath" -ForegroundColor DarkGray
}
if (Test-Path -LiteralPath $envLocalPath) {
    $jwtLine = Get-Content -LiteralPath $envLocalPath | Where-Object { $_ -match '^JWT_SECRET=' } | Select-Object -First 1
    if ($jwtLine) {
        Set-StagedSsoJwtSecret -SsoExamplePath (Join-Path $resDest 'sso.env.example') -JwtLine $jwtLine
        Set-StagedSsoJwtSecret -SsoExamplePath (Join-Path $StagingDir 'vendor\wanding\config\sso.env.example') -JwtLine $jwtLine
    } else {
        Write-Host "[WARN] JWT_SECRET not found in env.local — sso.env.example left with empty secret" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] env.local not found ($envLocalPath) — JWT_SECRET not injected into sso.env.example" -ForegroundColor Yellow
}

# Root launchers (v2 IN set)
Update-WanDIcon -SourcePng $IconSource -IconPath (Join-Path $installerRoot 'resources\ccb.ico')
Copy-Item -LiteralPath (Join-Path $installerRoot 'resources\ccb.ico') -Destination (Join-Path $StagingDir 'ccb.ico') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-wanding.cmd') -Destination (Join-Path $StagingDir 'ccb-wanding.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-diagnose.cmd') -Destination (Join-Path $StagingDir 'ccb-diagnose.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-launch-aionui.cmd') -Destination (Join-Path $StagingDir 'ccb-launch-aionui.cmd') -Force
# Build AionUiLauncher.exe (no-window Rust wrapper for ccb-launch-aionui.cmd)
$launcherSrc = Join-Path $installerRoot 'launcher-src'
if (Test-Path -LiteralPath $launcherSrc) {
    Push-Location $launcherSrc
    cargo build --release --quiet
    Pop-Location
    Copy-Item -LiteralPath (Join-Path $launcherSrc 'target\release\AionUiLauncher.exe') -Destination (Join-Path $StagingDir 'AionUiLauncher.exe') -Force
} elseif (Test-Path -LiteralPath (Join-Path $installerRoot 'AionUiLauncher.exe')) {
    Copy-Item -LiteralPath (Join-Path $installerRoot 'AionUiLauncher.exe') -Destination (Join-Path $StagingDir 'AionUiLauncher.exe') -Force
}
$binSrc = Join-Path $installerRoot 'bin'
if (Test-Path -LiteralPath $binSrc) {
    $binDest = Join-Path $StagingDir 'bin'
    New-Item -ItemType Directory -Force -Path $binDest | Out-Null
    Copy-Item -Path (Join-Path $binSrc '*') -Destination $binDest -Force
}
Copy-Item -LiteralPath (Join-Path $installerRoot 'ccb-wanding-versions.cmd') -Destination (Join-Path $StagingDir 'ccb-wanding-versions.cmd') -Force
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
