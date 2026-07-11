# start-dev-full.ps1 — CANONICAL AionUI dev launcher (sole supported entry)
#
# Rule 0: All dev / smoke / parity testing MUST use this script only.
#         Do NOT use bare `bun run dev`, start-aionui-dev.ps1, work-tasks launcher,
#         or org-phase0 org-test launcher — those redirect here or exit with error.
#
# Purpose : Mixing 1.1.2 parity — org SSO login, self-built aioncore (work-tasks +
#           org-knowledge + price-library routes), route-b sync, CCB bootstrap.
#
# Usage:
#   .\ccb-installer\scripts\start-dev-full.ps1
#   .\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
#   .\ccb-installer\scripts\start-dev-full.ps1 -InstallDir D:\CCB-Wanding -Clean
#   .\ccb-installer\scripts\start-dev-full.ps1 -BuildAioncore:$false   # skip cargo when no Rust changes
#   .\ccb-installer\scripts\start-dev-full.ps1 -SkipVendorSync         # UI-only; skips repo→vendor sync
#   .\ccb-installer\scripts\start-dev-full.ps1 -VendorSmoke            # optional HDPE+supplier smoke after vendor sync
#   .\ccb-installer\scripts\start-dev-full.ps1 -VendorUpdateSettings:$false  # skip ccb-mcp.json refresh
#   .\ccb-installer\scripts\start-dev-full.ps1 -NoExtensions     # opt-out: skip ext-wecom-aibot (examples-wecom-dev)
#
# ─────────────────────────────────────────────────────────────────────────────
# COMPLETENESS CHECKLIST (manual verification after launch)
# ─────────────────────────────────────────────────────────────────────────────
#  □  Org SSO login page appears (http://67.216.206.3:13401)
#  □  Login with yjc + password succeeds
#  □  Window title: Mixing (not AionUI)
#  □  Left sider: 万鼎报价专家 Guid card visible
#  □  Guid assistant picker: 5 preset cards only (no Cowork / word-form-creator)
#  □  Settings → Tools: quotation / accurate / excel MCP entries present
#  □  Settings → Models: model list non-empty (CCB models)
#  □  Chat → 万鼎报价专家: WanD MCP warmup completes within ~15 s
#  □  Settings → Channels: ext-企业微信 AI Bot (长连接) card visible (default; use -NoExtensions to hide)
# ─────────────────────────────────────────────────────────────────────────────

param(
    [string]$InstallDir   = 'D:\CCB-Wanding',
    [string]$AionUiSrc    = 'D:\Projects\aionui-src',
    [switch]$Clean,
    [switch]$SkipBootstrap,
    [switch]$SkipVendorSync,
    [switch]$VendorSmoke,
    [switch]$VendorStrict,
    [bool]$VendorUpdateSettings = $true,
    [bool]$BuildAioncore  = $true,
    [switch]$NoExtensions,
    [switch]$WithExtensions  # deprecated alias; extensions are on by default (2026-07-09)
)

# WeCom ext-wecom-aibot is the default dev path (Settings → Channels → Bot ID + Secret + Agent).
# If both -NoExtensions and -WithExtensions are passed, -WithExtensions wins (backward compat).
$useExtensions = -not $NoExtensions
if ($WithExtensions) { $useExtensions = $true }

if ($SkipVendorSync -and (
        $PSBoundParameters.ContainsKey('VendorSmoke') -or
        $PSBoundParameters.ContainsKey('VendorStrict') -or
        ($PSBoundParameters.ContainsKey('VendorUpdateSettings') -and $VendorUpdateSettings)
    )) {
    Write-Warning 'SkipVendorSync skips vendor sync; -VendorSmoke / -VendorUpdateSettings / -VendorStrict have no effect on this run.'
}

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Import-EnvLine {
    param([string]$Line)
    if ($Line -match '^\s*#' -or $Line -match '^\s*$') { return }
    if ($Line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim()
    }
}

function Import-SsoEnvFile {
    param([string]$Path, [string]$Label)
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    Get-Content -LiteralPath $Path | ForEach-Object { Import-EnvLine $_ }
    Write-Host "[ok] Loaded SSO env from $Label" -ForegroundColor Green
    return $true
}

# ── Pre-flight checks ────────────────────────────────────────────────────────

function Test-DevPreflightPath {
    param([string]$Label, [string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "[PREFLIGHT FAIL] $Label" -ForegroundColor Red
        Write-Host "  Missing: $Path" -ForegroundColor Red
        throw "Pre-flight failed: $Label"
    }
    Write-Host "[ok] $Label" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Pre-flight checks...' -ForegroundColor Cyan

Test-DevPreflightPath 'Org server config (AionUi-Dev)' `
    "$env:APPDATA\AionUi-Dev\aionui\org-server.json"

Test-DevPreflightPath 'Route B patch (AionUi-Dev runtime slot)' `
    "$env:APPDATA\AionUi-Dev\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js"

Test-DevPreflightPath 'Bun runtime' `
    "$InstallDir\vendor\bun\bun.exe"

Test-DevPreflightPath 'Python runtime' `
    "$InstallDir\vendor\python-wanding\python.exe"

Test-DevPreflightPath 'Quotation MCP server' `
    "$InstallDir\vendor\mcp-servers\quotation-server\dist\index.js"

if ($useExtensions) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Host '[PREFLIGHT FAIL] Node.js runtime (required for ext-wecom-aibot default dev path)' -ForegroundColor Red
        Write-Host '  Install Node.js or pass -NoExtensions to use bun run dev only.' -ForegroundColor Red
        throw 'Pre-flight failed: Node.js runtime'
    }
    Write-Host "[ok] Node.js runtime ($($nodeCmd.Source))" -ForegroundColor Green
}

Test-DevPreflightPath 'Seed agent (quotation-agent.md)' `
    "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md"

Test-DevPreflightPath 'Org knowledge (quotation SOP)' `
    "$InstallDir\vendor\wanding\data\ccb-wanding-quotation.md"

Write-Host 'All pre-flight checks passed.' -ForegroundColor Green
Write-Host ''

# ── Bootstrap ────────────────────────────────────────────────────────────────

$configDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
$logDir    = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
$logFile   = Join-Path $logDir 'dev-full-bootstrap.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$env:CCB_INSTALL_DIR           = $InstallDir
$env:CCB_WANDING_HOME          = $InstallDir
$env:CCB_WANDING_CONFIG_DIR    = $configDir
$env:AIONUI_APPDATA_PROFILE   = 'AionUi-Dev'
$env:AIONUI_DISABLE_AUTO_UPDATE = '1'
if (-not $env:CCB_UPDATE_MANIFEST_URL) {
    $env:CCB_UPDATE_MANIFEST_URL = 'http://67.216.206.3/updates/manifest.json'
}
if (-not $env:AIONUI_UPDATE_MANIFEST_URL) {
    $env:AIONUI_UPDATE_MANIFEST_URL = $env:CCB_UPDATE_MANIFEST_URL
}

if (-not $SkipBootstrap) {
    Write-Host 'Bootstrapping CCB-Wanding dev baseline (Quick)...' -ForegroundColor Cyan
    & (Join-Path $InstallDir 'scripts\run-wanding-bootstrap.ps1') `
        -InstallDir $InstallDir -ConfigDir $configDir -Mode Quick -LogFile $logFile
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "run-wanding-bootstrap failed (exit $LASTEXITCODE); see $logFile"
    }
} else {
    Write-Host 'Skipping bootstrap (-SkipBootstrap).' -ForegroundColor Yellow
}

Write-Host 'Syncing Route B patch into dev/runtime slots...' -ForegroundColor Cyan
& (Join-Path $repoRoot 'ccb-installer\scripts\sync-aionui-ccb-route-b.ps1') -InstallDir $InstallDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "sync-aionui-ccb-route-b failed (exit $LASTEXITCODE)"
}

. (Join-Path $repoRoot 'ccb-installer\scripts\build-wanding-lib.ps1')
$distVersion = Ensure-WandingDistVersion -InstallDir $InstallDir
if ($distVersion.created) {
    Write-Host "[ok] Stamped missing dist/VERSION = $($distVersion.version)" -ForegroundColor Green
}

if ($SkipVendorSync) {
    Write-Host '[skip] Vendor sync (-SkipVendorSync) — live vendor python/data may be stale.' -ForegroundColor Yellow
} else {
    Write-Host 'Syncing repo python/data/quotation MCP → vendor (sync-dev-wanding-vendor)...' -ForegroundColor Cyan
    $vendorArgs = @{
        InstallDir = $InstallDir
        RepoRoot   = $repoRoot
    }
    if ($VendorSmoke) { $vendorArgs.Smoke = $true }
    if ($VendorUpdateSettings) { $vendorArgs.UpdateSettings = $true }
    if ($VendorStrict) { $vendorArgs.Strict = $true }
    & (Join-Path $repoRoot 'ccb-installer\scripts\sync-dev-wanding-vendor.ps1') @vendorArgs
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "sync-dev-wanding-vendor failed (exit $LASTEXITCODE)"
    }
    Write-Host '[ok] Vendor sync complete.' -ForegroundColor Green
    Test-DevPreflightPath 'Price tier contract (data.Md)' `
        (Join-Path $InstallDir 'vendor\wanding\data\data.Md')
}

Write-Host 'Deploying agent keep-set (seed + prune retired)...' -ForegroundColor Cyan
$agentsDir = Join-Path $configDir 'agents'
$deployAgentsScript = Join-Path $repoRoot 'ccb-installer\scripts\deploy-seed-agents.ps1'
$deployAgentArgs = @{
    ConfigDir = $agentsDir
    ForceMd   = $true
}
& $deployAgentsScript @deployAgentArgs
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "deploy-seed-agents failed (exit $LASTEXITCODE)"
}
Write-Host '[ok] Agent keep-set deployed, retired agents pruned from live' -ForegroundColor Green

$commandsDir = Join-Path $configDir 'commands'
& (Join-Path $repoRoot 'ccb-installer\scripts\deploy-wanding-commands.ps1') -InstallDir $InstallDir -ConfigDir $configDir -CommandsDir $commandsDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "deploy-wanding-commands failed (exit $LASTEXITCODE)"
}
Write-Host "[ok] Slash command learn-by-data -> $commandsDir" -ForegroundColor Green

$skillsDir = Join-Path $configDir 'skills'
Write-Host 'Deploying CCB skills (subagent-gate + quotation-learn-by-data)...' -ForegroundColor Cyan
& (Join-Path $repoRoot 'ccb-installer\scripts\deploy-ccb-skills.ps1') -SkillsDir $skillsDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "deploy-ccb-skills failed (exit $LASTEXITCODE)"
}
$patchHooks = Join-Path $repoRoot 'ccb-installer\scripts\patch-subagent-gate-hooks.ps1'
& $patchHooks -AgentsDir $agentsDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "patch-subagent-gate-hooks failed (exit $LASTEXITCODE)"
}
$patchMemoryHooks = Join-Path $repoRoot 'ccb-installer\scripts\patch-personal-memory-hooks.ps1'
& $patchMemoryHooks -AgentsDir $agentsDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "patch-personal-memory-hooks failed (exit $LASTEXITCODE)"
}
Write-Host '[ok] CCB skills + Stop hooks patched' -ForegroundColor Green

$warmLibSrc = Join-Path $repoRoot 'ccb-installer\lib\warm-wanding-mcp.mjs'
$warmLibDstDir = Join-Path $InstallDir 'lib'
if (Test-Path -LiteralPath $warmLibSrc) {
    New-Item -ItemType Directory -Force -Path $warmLibDstDir | Out-Null
    Copy-Item -Force $warmLibSrc (Join-Path $warmLibDstDir 'warm-wanding-mcp.mjs')
    Write-Host "[ok] Synced startup MCP warm script -> $warmLibDstDir" -ForegroundColor Green
}

Write-Host 'Injecting self-built aioncore into bundled slot (dev resolver prefers bundled)...' -ForegroundColor Cyan
$syncArgs = @{ InstallDir = $InstallDir; RepoRoot = $repoRoot }
if ($BuildAioncore) { $syncArgs.Build = $true }
& (Join-Path $repoRoot 'ccb-installer\scripts\sync-dev-aioncore.ps1') @syncArgs
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "sync-dev-aioncore failed (exit $LASTEXITCODE)"
}

# ── Unified org SSO (must match packaged ccb-launch-aionui.cmd + VPS JWT) ───

$envLocal = Join-Path $repoRoot 'scripts\org-phase0\env.local'
$ssoEnv   = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\config\sso.env'
$loadedSso = Import-SsoEnvFile $envLocal 'scripts/org-phase0/env.local'
if (-not $loadedSso) {
    $null = Import-SsoEnvFile $ssoEnv 'CCB-Wanding/config/sso.env'
}

if (-not $env:ORG_SERVER_URL) { $env:ORG_SERVER_URL = 'http://67.216.206.3:13401' }
if (-not $env:AIONUI_SSO_MODE) { $env:AIONUI_SSO_MODE = 'org-idp' }
if (-not $env:JWT_SECRET) {
    throw 'JWT_SECRET missing — add scripts/org-phase0/env.local or %LOCALAPPDATA%\CCB-Wanding\config\sso.env'
}
Remove-Item Env:AIONUI_BYPASS_AUTH -ErrorAction SilentlyContinue

# ── Start dev ────────────────────────────────────────────────────────────────

$selfBuiltCore = Join-Path $repoRoot 'AionCore\target\release'
$bundledCore   = Join-Path $InstallDir 'AionUi\resources\bundled-aioncore\win32-x64'
$env:PATH = "$selfBuiltCore;$bundledCore;$env:PATH"

Set-Location $AionUiSrc

Write-Host 'Stopping stale AionUI/Electron processes...' -ForegroundColor Yellow
Get-Process -Name electron, aioncore -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if ($Clean) {
    Write-Host 'Clearing Vite/Electron build cache (-Clean)...' -ForegroundColor Yellow
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
        "$AionUiSrc\packages\desktop\out", `
        "$AionUiSrc\node_modules\.vite", `
        "$AionUiSrc\packages\desktop\node_modules\.vite"
}

$env:ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
if (-not $env:ELECTRON_EXTRA_LAUNCH_ARGS) {
    $env:ELECTRON_EXTRA_LAUNCH_ARGS = '--disable-gpu --disable-gpu-compositing --disable-software-rasterizer'
}

Write-Host ''
Write-Host '  ⚠  DO NOT press Ctrl+R in the Electron window.' -ForegroundColor Yellow
Write-Host '     White screen after Ctrl+R = quit fully and rerun this script.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Starting AionUI dev (full parity — org SSO login)...' -ForegroundColor Cyan
if ($useExtensions) {
    Write-Host '  Extensions   : examples-wecom-dev/ (ext-wecom-aibot — default)' -ForegroundColor DarkGray
} else {
    Write-Host '  Extensions   : off (-NoExtensions)' -ForegroundColor DarkGray
}
Write-Host "  CCB baseline : $InstallDir" -ForegroundColor DarkGray
Write-Host "  CCB config   : $configDir" -ForegroundColor DarkGray
Write-Host "  aioncore     : $(Join-Path $bundledCore 'aioncore.exe') (synced from repo build)" -ForegroundColor DarkGray
Write-Host "  renderer     : http://localhost:5173/" -ForegroundColor DarkGray
Write-Host "  Auth mode    : org SSO ($($env:AIONUI_SSO_MODE))" -ForegroundColor DarkGray
Write-Host "  Org server   : $($env:ORG_SERVER_URL)" -ForegroundColor DarkGray
Write-Host "  JWT_SECRET   : len=$($env:JWT_SECRET.Length)" -ForegroundColor DarkGray
Write-Host ''

# No AIONUI_BYPASS_AUTH — login page is shown, matching 1.1.2 installed behavior.
# Bun/npm write progress to stderr; with $ErrorActionPreference Stop that becomes a terminating error.
$prevEa = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    if ($useExtensions) {
        # WeCom only — avoid e2e-full-extension / hello-world polluting Settings UI.
        $env:AIONUI_EXTENSIONS_PATH = Join-Path $AionUiSrc 'examples-wecom-dev'
        & node (Join-Path $AionUiSrc 'scripts\dev-bootstrap.mjs') launch start --extensions
    } else {
        Remove-Item Env:AIONUI_EXTENSIONS_PATH -ErrorAction SilentlyContinue
        & bun run dev
    }
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "AionUI dev launch failed (exit $LASTEXITCODE)"
    }
} finally {
    $ErrorActionPreference = $prevEa
}
