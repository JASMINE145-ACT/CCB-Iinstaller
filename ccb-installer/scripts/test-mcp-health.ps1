# CCB-Wanding MCP health check — config, binaries, stdio probe, optional ACP session verify.
param(
    [string]$InstallDir,
    [string]$ConfigDir,
    [switch]$Probe,
    [switch]$Session,
    [switch]$Repair,
    [switch]$Json,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$manifestPath = Join-Path $repoRoot "ccb-installer\config\mcp-health-manifest.json"
$installerRoot = Join-Path $repoRoot "ccb-installer"

function Write-HealthLine {
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
    $candidates = @(
        "D:\CCB-Wanding",
        (Join-Path $env:LOCALAPPDATA "Programs\CCB-Wanding")
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) {
            return (Resolve-Path -LiteralPath $c).Path
        }
    }
    throw "CCB-Wanding install dir not found. Pass -InstallDir."
}

function Get-Manifest {
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "Manifest missing: $manifestPath"
    }
    return Get-Content -Raw -LiteralPath $manifestPath -Encoding UTF8 | ConvertFrom-Json
}

function Test-McpHttpReachable {
    param([string]$Url, [int]$TimeoutSec = 8)
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
                return @{ ok = $true; detail = "mcp.exa.ai reachable (HTTP $code)" }
            }
            if ($code -ge 400 -and $code -lt 500) {
                return @{ ok = $true; detail = "mcp.exa.ai reachable (HTTP $code — MCP rejects $method; connectivity OK)" }
            }
            if ($code -ge 500) {
                return @{ ok = $false; detail = "upstream error HTTP $code (research-agent may fail)" }
            }
        }
        catch {
            $status = $null
            if ($_.Exception.Response) {
                try { $status = [int]$_.Exception.Response.StatusCode } catch { }
            }
            if ($status -ge 200 -and $status -lt 500) {
                if ($status -ge 400) {
                    return @{ ok = $true; detail = "mcp.exa.ai reachable (HTTP $status — MCP rejects $method; connectivity OK)" }
                }
                return @{ ok = $true; detail = "mcp.exa.ai reachable (HTTP $status)" }
            }
        }
    }
    return @{
        ok     = $false
        detail = 'connection failed: timeout, DNS, or refused (research-agent may fail; core MCP unaffected)'
    }
}

function Test-OptionalLayer {
    param(
        [string]$Install,
        [string]$Config,
        $Manifest
    )

    $checks = [System.Collections.Generic.List[object]]::new()
    $settingsPath = Join-Path $Config "settings.json"
    $expectedExaUrl = "https://mcp.exa.ai/mcp"
    if ($Manifest.optional_checks -and $Manifest.optional_checks.exa -and $Manifest.optional_checks.exa.expected_url) {
        $expectedExaUrl = [string]$Manifest.optional_checks.exa.expected_url
    }

    $exaEntry = $null
    if (Test-Path -LiteralPath $settingsPath) {
        try {
            $settings = Get-Content -Raw -LiteralPath $settingsPath -Encoding UTF8 | ConvertFrom-Json
            $exaEntry = $settings.mcpServers.exa
        }
        catch { }
    }

    if ($exaEntry -and $exaEntry.url) {
        $exaUrl = [string]$exaEntry.url
        if ($exaUrl -ne $expectedExaUrl) {
            $checks.Add([pscustomobject]@{
                layer  = "optional"
                id     = "exa:config"
                ok     = $false
                warn   = $true
                detail = "unexpected URL: $exaUrl (expected $expectedExaUrl)"
            })
        }
        else {
            $probe = Test-McpHttpReachable -Url $exaUrl
            $checks.Add([pscustomobject]@{
                layer  = "optional"
                id     = "exa:http"
                ok     = $probe.ok
                warn   = (-not $probe.ok)
                detail = $probe.detail
            })
        }
    }
    else {
        $checks.Add([pscustomobject]@{
            layer  = "optional"
            id     = "exa:http"
            ok     = $true
            warn   = $false
            detail = "not registered (optional)"
        })
    }

    $configSkill = Join-Path $Config "skills\ppt-master\SKILL.md"
    $configSkillOk = Test-Path -LiteralPath $configSkill
    $checks.Add([pscustomobject]@{
        layer  = "optional"
        id     = "ppt-master:config-skill"
        ok     = $configSkillOk
        warn   = (-not $configSkillOk)
        detail = $(if ($configSkillOk) { "skills/ppt-master/SKILL.md exists" } else { "missing: $configSkill — run install-ppt-master.ps1" })
    })

    $vendorSkill = Join-Path $Install "vendor\ppt-master-skill\SKILL.md"
    $vendorSkillOk = Test-Path -LiteralPath $vendorSkill
    $checks.Add([pscustomobject]@{
        layer  = "optional"
        id     = "ppt-master:vendor-skill"
        ok     = $vendorSkillOk
        warn   = (-not $vendorSkillOk)
        detail = $(if ($vendorSkillOk) { "vendor/ppt-master-skill/SKILL.md exists" } else { "missing: $vendorSkill" })
    })

    return ,$checks
}

function Test-ConfigLayer {
    param(
        [string]$Install,
        [string]$Config,
        $Manifest
    )

    $checks = [System.Collections.Generic.List[object]]::new()
    $settingsPath = Join-Path $Config "settings.json"
    $agentsDir = Join-Path $Config "agents"

    if (-not (Test-Path -LiteralPath $settingsPath)) {
        $checks.Add([pscustomobject]@{ layer = "config"; id = "settings.json"; ok = $false; detail = "missing: $settingsPath" })
        return ,$checks
    }

    try {
        $settings = Get-Content -Raw -LiteralPath $settingsPath -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        $checks.Add([pscustomobject]@{ layer = "config"; id = "settings.json"; ok = $false; detail = "invalid JSON: $_" })
        return ,$checks
    }

    $mcpServers = $settings.mcpServers
    if (-not $mcpServers) {
        $checks.Add([pscustomobject]@{ layer = "config"; id = "mcpServers"; ok = $false; detail = "settings.json has no mcpServers" })
        return ,$checks
    }

    foreach ($name in $Manifest.mcp_servers.PSObject.Properties.Name) {
        $spec = $Manifest.mcp_servers.$name
        if ($spec.optional -eq $true) { continue }
        $registered = $mcpServers.PSObject.Properties[$name]
        if (-not $registered) {
            $checks.Add([pscustomobject]@{ layer = "config"; id = "mcp:$name"; ok = $false; detail = "not in settings.json mcpServers" })
            continue
        }
        $checks.Add([pscustomobject]@{ layer = "config"; id = "mcp:$name"; ok = $true; detail = "registered" })

        if ($spec.kind -eq "stdio") {
            $server = $registered.Value
            $command = ""
            if ($null -ne $server.command) {
                $command = [string]$server.command
            }
            if (-not $command) {
                $checks.Add([pscustomobject]@{ layer = "config"; id = "mcp:$name.command"; ok = $false; detail = "missing command" })
            }
            else {
                $commandOk = Test-Path -LiteralPath $command
                $checks.Add([pscustomobject]@{
                    layer  = "config"
                    id     = "mcp:$name.command"
                    ok     = $commandOk
                    detail = $(if ($commandOk) { "exists: $command" } else { "missing: $command" })
                })
            }

            $args = @($server.args)
            for ($idx = 0; $idx -lt $args.Count; $idx++) {
                $arg = [string]$args[$idx]
                $looksLikePath = [System.IO.Path]::IsPathRooted($arg) -or $arg.Contains("\") -or $arg.Contains("/")
                if (-not $looksLikePath) { continue }
                $argOk = Test-Path -LiteralPath $arg
                $checks.Add([pscustomobject]@{
                    layer  = "config"
                    id     = "mcp:$name.args[$idx]"
                    ok     = $argOk
                    detail = $(if ($argOk) { "exists: $arg" } else { "missing: $arg" })
                })
            }
        }
    }

    $expectedWandingRoot = Join-Path $Install "vendor\wanding"
    $expectedMainPy = Join-Path $expectedWandingRoot "python\main.py"
    $quotationEntry = $mcpServers.PSObject.Properties["quotation"]
    if ($quotationEntry) {
        $qEnv = $quotationEntry.Value.env
        $ccbRoot = if ($qEnv -and $qEnv.CCB_PROJECT_ROOT) { [string]$qEnv.CCB_PROJECT_ROOT } else { "" }
        if (-not $ccbRoot) {
            $checks.Add([pscustomobject]@{
                layer  = "config"
                id     = "quotation.env.CCB_PROJECT_ROOT"
                ok     = $false
                detail = "missing in settings.json mcpServers.quotation.env"
            })
        }
        else {
            $mainPy = Join-Path $ccbRoot "python\main.py"
            $mainOk = Test-Path -LiteralPath $mainPy
            $checks.Add([pscustomobject]@{
                layer  = "config"
                id     = "quotation.env.CCB_PROJECT_ROOT"
                ok     = $mainOk
                detail = $(if ($mainOk) { "python/main.py exists under $ccbRoot" } else { "python/main.py missing under $ccbRoot (expected $expectedMainPy)" })
            })
            foreach ($aolKey in @("AOL_ACCESS_TOKEN", "AOL_SIGNATURE_SECRET", "AOL_DATABASE_ID")) {
                $aolVal = if ($qEnv -and $qEnv.$aolKey) { [string]$qEnv.$aolKey } else { "" }
                $checks.Add([pscustomobject]@{
                    layer  = "config"
                    id     = "quotation.env.$aolKey"
                    ok     = [bool]$aolVal
                    detail = $(if ($aolVal) { "set" } else { "missing in settings.json mcpServers.quotation.env" })
                })
            }
        }
    }

    $envAccuratePath = Join-Path $Install "vendor\wanding\.env.accurate"
    $envAccurateOk = Test-Path -LiteralPath $envAccuratePath
    $envAccurateDetail = if (-not $envAccurateOk) {
        "missing: $envAccuratePath — run ensure-wanding-settings.ps1"
    } else {
        "exists (AOL fallback for python/main.py)"
    }
    $envAccurateParseOk = $false
    if ($envAccurateOk) {
        $bytes = [System.IO.File]::ReadAllBytes($envAccuratePath)
        $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
        if ($hasBom) {
            $envAccurateDetail = "UTF-8 BOM present — python-dotenv reads key as \ufeffAOL_ACCESS_TOKEN; re-run ensure-wanding-settings.ps1"
        }
        else {
            $pythonExe = Join-Path $Install "vendor\python-wanding\python.exe"
            if (Test-Path -LiteralPath $pythonExe) {
                $pyOut = & $pythonExe -c "from dotenv import dotenv_values; v=dotenv_values(r'$envAccuratePath'); print(len(v.get('AOL_ACCESS_TOKEN') or ''))" 2>&1
                $tokenLen = 0
                if ($pyOut -match '^\d+$') { $tokenLen = [int]$pyOut }
                $envAccurateParseOk = ($tokenLen -gt 100)
                if (-not $envAccurateParseOk) {
                    $envAccurateDetail = "exists but AOL_ACCESS_TOKEN not parsed (len=$tokenLen)"
                }
                else {
                    $envAccurateDetail = "exists; AOL_ACCESS_TOKEN parsed (len=$tokenLen)"
                }
            }
            else {
                $envAccurateParseOk = -not $hasBom
            }
        }
    }
    $checks.Add([pscustomobject]@{
        layer  = "files"
        id     = "quotation/vendor/wanding/.env.accurate"
        ok     = ($envAccurateOk -and $envAccurateParseOk)
        detail = $envAccurateDetail
    })

    foreach ($name in $Manifest.mcp_servers.PSObject.Properties.Name) {
        $spec = $Manifest.mcp_servers.$name
        if (-not $spec.required_paths) { continue }
        foreach ($rel in $spec.required_paths) {
            $full = Join-Path $Install $rel
            $ok = Test-Path -LiteralPath $full
            $checks.Add([pscustomobject]@{
                layer  = "files"
                id     = "$name/$rel"
                ok     = $ok
                detail = $(if ($ok) { "exists" } else { "missing: $full" })
            })
        }
    }

    foreach ($agentId in $Manifest.agent_profiles.PSObject.Properties.Name) {
        $spec = $Manifest.agent_profiles.$agentId
        if ($spec.optional -eq $true) { continue }
        $mdPath = Join-Path $agentsDir "$agentId.md"
        $sidecarPath = Join-Path $agentsDir "$agentId.aionui.json"
        if (-not (Test-Path -LiteralPath $mdPath)) {
            $checks.Add([pscustomobject]@{ layer = "agents"; id = $agentId; ok = $false; detail = "missing $mdPath" })
            continue
        }
        if (-not (Test-Path -LiteralPath $sidecarPath)) {
            $checks.Add([pscustomobject]@{ layer = "agents"; id = $agentId; ok = $false; detail = "missing sidecar $sidecarPath" })
            continue
        }
        $sidecar = Get-Content -Raw -LiteralPath $sidecarPath -Encoding UTF8 | ConvertFrom-Json
        $allow = @($sidecar.mcp_allowlist)
        $required = @($spec.required_mcp)
        $missingAllow = $required | Where-Object { $_ -notin $allow }
        if ($missingAllow.Count -gt 0) {
            $checks.Add([pscustomobject]@{
                layer  = "agents"
                id     = $agentId
                ok     = $false
                detail = "sidecar mcp_allowlist missing: $($missingAllow -join ', ')"
            })
        }
        else {
            $checks.Add([pscustomobject]@{ layer = "agents"; id = $agentId; ok = $true; detail = "deployed; allowlist ok" })
        }
    }

    $routeMarker = "ccb-native-acp-route"
    $routeFiles = @(
        @{
            id = "route-b:bundled"
            path = Join-Path $Install "AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js"
        },
        @{
            id = "route-b:runtime"
            path = Join-Path $env:APPDATA "AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js"
        }
    )
    foreach ($route in $routeFiles) {
        $ok = (Test-Path -LiteralPath $route.path) -and (Select-String -LiteralPath $route.path -Pattern $routeMarker -Quiet)
        $checks.Add([pscustomobject]@{
            layer = "aionui"
            id = $route.id
            ok = $ok
            detail = $(if ($ok) { "Route-B marker present" } else { "Route-B marker missing: $($route.path)" })
        })
    }

    return ,$checks
}

function Invoke-Repair {
    param([string]$Install, [string]$Config)
    Write-HealthLine "Running ensure-wanding-settings.ps1"
    & (Join-Path $installerRoot "scripts\ensure-wanding-settings.ps1") -InstallDir $Install -ConfigDir $Config
    Write-HealthLine "Running deploy-seed-agents.ps1"
    $agentsDir = Join-Path $Config "agents"
    & (Join-Path $installerRoot "scripts\deploy-seed-agents.ps1") -ConfigDir $agentsDir -ForceMd
    $routeSync = Join-Path $Install "scripts\sync-aionui-ccb-route-b.ps1"
    if (-not (Test-Path -LiteralPath $routeSync)) {
        $routeSync = Join-Path $installerRoot "scripts\sync-aionui-ccb-route-b.ps1"
    }
    if (Test-Path -LiteralPath $routeSync) {
        Write-HealthLine "Running sync-aionui-ccb-route-b.ps1"
        & $routeSync -InstallDir $Install
    }
    Write-HealthLine "Repair complete — re-run health check" "PASS"
}

function Invoke-ProbeLayer {
    param([string]$Install, [string]$Config, $Manifest)
    $probeScript = Join-Path $installerRoot "scripts\test-mcp-probe-layer.mjs"
    $env:CCB_INSTALL_DIR = $Install
    $env:CLAUDE_CONFIG_DIR = $Config

    $exit = 1
    $out = @()
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $out = & node $probeScript 2>&1
        $exit = $LASTEXITCODE
        $text = ($out | Out-String)
        if ($exit -eq 0) { break }
        if ($text -notmatch "spawn EPERM") { break }
        if ($attempt -lt 3) {
            Write-HealthLine "MCP probe hit transient spawn EPERM; retrying attempt $($attempt + 1)/3" "WARN"
            Start-Sleep -Seconds $attempt
        }
    }

    foreach ($line in $out) { Write-Host $line }
    return [pscustomobject]@{ layer = "probe"; ok = ($exit -eq 0); detail = "exit=$exit" }
}

function Invoke-SessionLayer {
    param([string]$Install, [string]$Config)
    $sessionScript = Join-Path $installerRoot "test-mcp-session-health.mjs"
    $env:CCB_INSTALL_DIR = $Install
    $env:CLAUDE_CONFIG_DIR = $Config
    $out = & node $sessionScript 2>&1
    $exit = $LASTEXITCODE
    foreach ($line in $out) { Write-Host $line }
    return [pscustomobject]@{ layer = "session"; ok = ($exit -eq 0); detail = "exit=$exit" }
}

try {
    $InstallDir = Resolve-CcbInstallDir -Override $InstallDir
    if (-not $ConfigDir) {
        $ConfigDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude"
    }

    Write-HealthLine "InstallDir=$InstallDir"
    Write-HealthLine "ConfigDir=$ConfigDir"

    if ($Repair) {
        Invoke-Repair -Install $InstallDir -Config $ConfigDir
        if (-not $Probe -and -not $Session) { exit 0 }
    }

    $manifest = Get-Manifest
    $allChecks = [System.Collections.Generic.List[object]]::new()
    $allChecks.AddRange((Test-ConfigLayer -Install $InstallDir -Config $ConfigDir -Manifest $manifest))
    $allChecks.AddRange((Test-OptionalLayer -Install $InstallDir -Config $ConfigDir -Manifest $manifest))

    foreach ($c in $allChecks) {
        $level = if ($c.ok) { "PASS" } elseif ($c.warn) { "WARN" } else { "FAIL" }
        Write-HealthLine "$($c.layer)/$($c.id): $($c.detail)" $level
    }

    $configFailed = @($allChecks | Where-Object { -not $_.ok -and -not $_.warn })
    if ($configFailed.Count -gt 0) {
        Write-HealthLine "$($configFailed.Count) config/file/agent check(s) failed. Try: .\ccb-installer\scripts\test-mcp-health.ps1 -Repair" "FAIL"
        if (-not $Probe -and -not $Session) {
            if ($Json) {
                $configFailed | ConvertTo-Json -Depth 4
            }
            exit 1
        }
    }

    if ($Probe) {
        $probeResult = Invoke-ProbeLayer -Install $InstallDir -Config $ConfigDir -Manifest $manifest
        $level = if ($probeResult.ok) { "PASS" } else { "FAIL" }
        Write-HealthLine "stdio probe: $($probeResult.detail)" $level
        if (-not $probeResult.ok) { exit 1 }
    }

    if ($Session) {
        $sessionResult = Invoke-SessionLayer -Install $InstallDir -Config $ConfigDir
        $level = if ($sessionResult.ok) { "PASS" } else { "FAIL" }
        Write-HealthLine "ACP session: $($sessionResult.detail)" $level
        if (-not $sessionResult.ok) { exit 1 }
    }

  if ($configFailed.Count -eq 0) {
        Write-HealthLine "MCP health check complete" "PASS"
        exit 0
    }
    exit 1
}
catch {
    Write-HealthLine $_ "FAIL"
    exit 1
}
