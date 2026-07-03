# Research toolstack — capability probe and profile doctor
# Usage:
#   .\ccb-installer\scripts\probe-research-capabilities.ps1
#   .\ccb-installer\scripts\probe-research-capabilities.ps1 -Json -InstallDir D:\CCB-Wanding
param(
    [string]$InstallDir,
    [string]$ConfigDir,
    [switch]$Json,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$manifestPath = Join-Path $repoRoot "ccb-installer\config\research-capability-manifest.json"

function Write-ProbeLine {
    param([string]$Message, [string]$Level = "INFO")
    if ($Quiet -and $Level -eq "INFO") { return }
    switch ($Level) {
        "PASS" { Write-Host "[PASS] $Message" -ForegroundColor Green }
        "FAIL" { Write-Host "[FAIL] $Message" -ForegroundColor Red }
        "WARN" { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
        default { Write-Host "[INFO] $Message" }
    }
}

function Resolve-CcbInstallDir {
    param([string]$Override)
    if ($Override -and (Test-Path -LiteralPath $Override)) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    foreach ($c in @("D:\CCB-Wanding", (Join-Path $env:LOCALAPPDATA "Programs\CCB-Wanding"))) {
        if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
    }
    throw "CCB-Wanding install dir not found. Pass -InstallDir."
}

function Resolve-CcbConfigDir {
    param([string]$Override, [string]$Install)
    if ($Override -and (Test-Path -LiteralPath $Override)) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    $live = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude"
    if (Test-Path -LiteralPath $live) { return (Resolve-Path -LiteralPath $live).Path }
    throw "CCB config dir not found. Pass -ConfigDir."
}

function Test-McpHttpReachable {
    param([string]$Url, [int]$TimeoutSec = 15)
    foreach ($method in @('Head', 'Get')) {
        try {
            $iwParams = @{
                Uri             = $Url
                Method          = $method
                TimeoutSec      = $TimeoutSec
                UseBasicParsing = $true
            }
            if ($PSVersionTable.PSVersion.Major -ge 7) {
                $iwParams['SkipHttpErrorCheck'] = $true
            }
            $resp = Invoke-WebRequest @iwParams
            $code = [int]$resp.StatusCode
            if ($code -ge 200 -and $code -lt 400) {
                return $true
            }
            if ($code -ge 400 -and $code -lt 500) {
                return $true
            }
        }
        catch {
            $status = $null
            if ($_.Exception.Response) {
                try { $status = [int]$_.Exception.Response.StatusCode } catch { }
            }
            if ($status -ge 200 -and $status -lt 500) {
                return $true
            }
        }
    }
    return $false
}

function Test-HttpOk {
    param([string]$Url, [int]$TimeoutSec = 15)
    return Test-McpHttpReachable -Url $Url -TimeoutSec $TimeoutSec
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$install = Resolve-CcbInstallDir -Override $InstallDir
$config = Resolve-CcbConfigDir -Override $ConfigDir -Install $install
$settingsPath = Join-Path $config "settings.json"

if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Missing manifest: $manifestPath"
}
$capManifest = Get-Content -Raw -LiteralPath $manifestPath -Encoding UTF8 | ConvertFrom-Json

$results = [System.Collections.Generic.List[object]]::new()
$activeProfile = "base"

# --- exa in settings ---
$exaOk = $false
if (Test-Path -LiteralPath $settingsPath) {
    $settings = Get-Content -Raw -LiteralPath $settingsPath -Encoding UTF8 | ConvertFrom-Json
    $exa = $settings.mcpServers.exa
    if ($exa -and $exa.url -eq "https://mcp.exa.ai/mcp") {
        $exaOk = $true
    }
}
$results.Add([pscustomobject]@{ probe = "exa"; ok = $exaOk; detail = $(if ($exaOk) { "settings.json exa → mcp.exa.ai" } else { "exa MCP missing or wrong URL" }) })

# --- jina reader (optional upstream) ---
$jinaOk = Test-HttpOk -Url "https://r.jina.ai/https://example.com"
$results.Add([pscustomobject]@{ probe = "jina_reader"; ok = $jinaOk; optional = $true; detail = $(if ($jinaOk) { "r.jina.ai reachable" } else { "r.jina.ai unreachable (Exa livecrawl still OK)" }) })

# --- scrapling in settings (optional) ---
$scraplingOk = $false
if (Test-Path -LiteralPath $settingsPath) {
    $scrapling = $settings.mcpServers.scrapling
    if ($scrapling -and $scrapling.command) {
        $scraplingOk = Test-Path -LiteralPath $scrapling.command
        if (-not $scraplingOk -and $scrapling.command -match '^[a-zA-Z]') {
            $scraplingOk = Test-CommandExists -Name ([System.IO.Path]::GetFileNameWithoutExtension($scrapling.command))
        }
    }
}
$results.Add([pscustomobject]@{ probe = "scrapling"; ok = $scraplingOk; optional = $true; detail = $(if ($scraplingOk) { "scrapling MCP registered" } else { "not registered (Base OK)" }) })

# --- lightpanda (optional) ---
$lightpandaOk = Test-CommandExists -Name "lightpanda"
$results.Add([pscustomobject]@{ probe = "lightpanda"; ok = $lightpandaOk; optional = $true; detail = $(if ($lightpandaOk) { "lightpanda in PATH" } else { "not installed" }) })

# --- agent-reach doctor (optional install helper) ---
$agentReachOk = $false
$agentReachDetail = "agent-reach not in PATH"
if (Test-CommandExists -Name "agent-reach") {
    try {
        $doctorOut = & agent-reach doctor 2>&1 | Out-String
        $agentReachOk = $LASTEXITCODE -eq 0
        $agentReachDetail = if ($agentReachOk) { "agent-reach doctor OK" } else { "agent-reach doctor exit $LASTEXITCODE" }
    }
    catch {
        $agentReachDetail = "agent-reach doctor failed: $_"
    }
}
$results.Add([pscustomobject]@{ probe = "agent_reach_doctor"; ok = $agentReachOk; optional = $true; detail = $agentReachDetail })

# --- resolve active profile ---
if (-not $exaOk) {
    $activeProfile = "none"
}
elseif ($scraplingOk -and $lightpandaOk) {
    $activeProfile = "experimental"
}
elseif ($scraplingOk) {
    $activeProfile = "extended"
}
else {
    $activeProfile = "base"
}

$summary = [pscustomobject]@{
    install_dir = $install
    config_dir = $config
    active_profile = $activeProfile
    base_startup_ok = $exaOk
    probes = @($results)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 6
}
else {
    Write-ProbeLine "Install: $install"
    Write-ProbeLine "Config:  $config"
    Write-ProbeLine "Active profile: $activeProfile" $(if ($activeProfile -eq "none") { "FAIL" } else { "PASS" })
    foreach ($r in $results) {
        $level = if ($r.ok) { "PASS" } elseif ($r.optional) { "WARN" } else { "FAIL" }
        Write-ProbeLine "$($r.probe): $($r.detail)" $level
    }
    if (-not $exaOk) {
        Write-ProbeLine "Base profile FAIL — research-agent cannot start with search tools" "FAIL"
        exit 1
    }
    Write-ProbeLine "Base profile OK — research-agent can run with exa MCP" "PASS"
}

if (-not $exaOk) { exit 1 }
exit 0
