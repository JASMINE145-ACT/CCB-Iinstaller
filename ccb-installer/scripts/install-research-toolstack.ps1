# Install / configure research toolstack for CCB-Wanding employees.

# Base (default): verify exa MCP only — no browser stack.

# Extended: register Scrapling MCP + patch research-agent frontmatter + sidecar.

#

# Usage:

#   .\ccb-installer\scripts\install-research-toolstack.ps1

#   .\ccb-installer\scripts\install-research-toolstack.ps1 -Profile Extended

#   .\ccb-installer\scripts\install-research-toolstack.ps1 -InstallAgentReach

param(

    [ValidateSet("Base", "Extended", "Experimental")]

    [string]$Profile = "Base",

    [string]$InstallDir,

    [string]$ConfigDir,

    [switch]$InstallAgentReach,

    [switch]$WhatIf

)



$ErrorActionPreference = "Stop"

$OutputEncoding = [System.Text.UTF8Encoding]::new($false)



$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$probeScript = Join-Path $PSScriptRoot "probe-research-capabilities.ps1"



function Resolve-CcbConfigDir {

    param([string]$Override)

    if ($Override -and (Test-Path -LiteralPath $Override)) {

        return (Resolve-Path -LiteralPath $Override).Path

    }

    $live = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude"

    if (Test-Path -LiteralPath $live) { return (Resolve-Path -LiteralPath $live).Path }

    throw "CCB config dir not found. Run CCB-Wanding once or pass -ConfigDir."

}



function Set-JsonProperty {

    param($Object, [string]$Name, $Value)

    if ($Object.PSObject.Properties[$Name]) {

        $Object.PSObject.Properties[$Name].Value = $Value

    }

    else {

        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value

    }

}



function Update-ResearchAgentMcpServers {

    param(

        [string]$AgentMdPath,

        [string[]]$McpServers

    )

    if (-not (Test-Path -LiteralPath $AgentMdPath)) {

        Write-Warning "research-agent.md not found at $AgentMdPath — run deploy-seed-agents.ps1 first"

        return

    }

    $raw = [System.IO.File]::ReadAllText($AgentMdPath, [System.Text.UTF8Encoding]::new($false))

    $lines = $raw -split "`n"

    $out = [System.Collections.Generic.List[string]]::new()

    $inMcp = $false

    $mcpDone = $false

    foreach ($line in $lines) {

        if ($line -match '^mcpServers:\s*$') {

            $inMcp = $true

            $out.Add($line)

            foreach ($srv in $McpServers) {

                $out.Add("  - $srv")

            }

            $mcpDone = $true

            continue

        }

        if ($inMcp -and $line -match '^\s+-\s+') { continue }

        if ($inMcp -and $line -notmatch '^\s') { $inMcp = $false }

        if (-not ($inMcp -and $mcpDone)) { $out.Add($line) }

    }

    $newContent = ($out -join "`n").TrimEnd() + "`n"

    if ($WhatIf) {

        Write-Host "[WhatIf] Would patch mcpServers in $AgentMdPath → [$($McpServers -join ', ')]"

        return

    }

    [System.IO.File]::WriteAllText($AgentMdPath, $newContent, [System.Text.UTF8Encoding]::new($false))

    Write-Host "Patched research-agent mcpServers → [$($McpServers -join ', ')]"

}



function Update-ResearchAgentSidecarAllowlist {

    param(

        [string]$SidecarPath,

        [string[]]$McpServers

    )

    if (-not (Test-Path -LiteralPath $SidecarPath)) {

        Write-Warning "research-agent.aionui.json not found at $SidecarPath"

        return

    }

    $sidecar = Get-Content -Raw -LiteralPath $SidecarPath -Encoding UTF8 | ConvertFrom-Json

    $sidecar.mcp_allowlist = @($McpServers)

    $sidecar.updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

    if ($WhatIf) {

        Write-Host "[WhatIf] Would patch mcp_allowlist in $SidecarPath → [$($McpServers -join ', ')]"

        return

    }

    $sidecar | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $SidecarPath -Encoding UTF8

    Write-Host "Patched research-agent.aionui.json mcp_allowlist → [$($McpServers -join ', ')]"

}



function Set-ResearchAgentProfile {

    param(

        [string]$AgentMdPath,

        [string]$SidecarPath,

        [string[]]$McpServers

    )

    Update-ResearchAgentMcpServers -AgentMdPath $AgentMdPath -McpServers $McpServers

    Update-ResearchAgentSidecarAllowlist -SidecarPath $SidecarPath -McpServers $McpServers

}



function Restore-InstallSnapshot {

    param(

        [hashtable]$Snapshot

    )

    if ($Snapshot.settings_backup -and (Test-Path -LiteralPath $Snapshot.settings_path)) {

        Copy-Item -LiteralPath $Snapshot.settings_backup -Destination $Snapshot.settings_path -Force

        Write-Warning "Rolled back settings.json from snapshot"

    }

    if ($Snapshot.agent_md_backup -and (Test-Path -LiteralPath $Snapshot.agent_md_path)) {

        Copy-Item -LiteralPath $Snapshot.agent_md_backup -Destination $Snapshot.agent_md_path -Force

        Write-Warning "Rolled back research-agent.md from snapshot"

    }

    if ($Snapshot.sidecar_backup -and (Test-Path -LiteralPath $Snapshot.sidecar_path)) {

        Copy-Item -LiteralPath $Snapshot.sidecar_backup -Destination $Snapshot.sidecar_path -Force

        Write-Warning "Rolled back research-agent.aionui.json from snapshot"

    }

}



$config = Resolve-CcbConfigDir -Override $ConfigDir

$settingsPath = Join-Path $config "settings.json"

$liveAgentMd = Join-Path $config "agents\research-agent.md"

$liveSidecar = Join-Path $config "agents\research-agent.aionui.json"

$stagingDir = Join-Path $env:TEMP "ccb-research-install-$(Get-Random)"

New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null



Write-Host "==> Research toolstack install (Profile: $Profile)" -ForegroundColor Cyan



try {

    # 1) Deploy seed agent if missing

    if (-not (Test-Path -LiteralPath $liveAgentMd)) {

        $deploy = Join-Path $PSScriptRoot "deploy-seed-agents.ps1"

        if (Test-Path -LiteralPath $deploy) {

            Write-Host "Deploying seed agents (research-agent missing)..."

            if (-not $WhatIf) {

                & $deploy -ConfigDir $config -ForceMd

                if ($LASTEXITCODE -ne 0) { throw "deploy-seed-agents failed" }

            }

        }

    }



    # 2) Verify Base (exa)

    & $probeScript -ConfigDir $config -InstallDir $InstallDir

    if ($LASTEXITCODE -ne 0) {

        throw "Base probe failed — ensure exa MCP in settings.json (run ensure-wanding-settings or start-dev-full)"

    }



    # 3) Optional Agent-Reach (install/doctor only)

    if ($InstallAgentReach) {

        $pip = Get-Command pip -ErrorAction SilentlyContinue

        if (-not $pip) { $pip = Get-Command pip3 -ErrorAction SilentlyContinue }

        if (-not $pip) { throw "pip not found — install Python first" }

        Write-Host "Installing Agent-Reach (doctor helper)..."

        if (-not $WhatIf) {

            & $pip.Source install "agent-reach" --upgrade

            & agent-reach doctor

        }

    }



    $targetMcp = @("exa", "tavily")



    # 4) Extended: Scrapling MCP (probe before expose; rollback on failure)

    if ($Profile -in @("Extended", "Experimental")) {

        $installRoot = if ($InstallDir) { $InstallDir } else { Split-Path -Parent $config }

        $python = Join-Path $installRoot "vendor\python-wanding\python.exe"

        if (-not (Test-Path -LiteralPath $python)) {

            $pyCmd = Get-Command python -ErrorAction SilentlyContinue

            if ($pyCmd) { $python = $pyCmd.Source }

        }

        if (-not $python) { throw "Python not found for Scrapling install" }



        $snapshot = @{

            settings_path    = $settingsPath

            settings_backup  = (Copy-Item -LiteralPath $settingsPath -Destination (Join-Path $stagingDir "settings.json.bak") -PassThru).FullName

            agent_md_path    = $liveAgentMd

            agent_md_backup  = if (Test-Path -LiteralPath $liveAgentMd) { (Copy-Item -LiteralPath $liveAgentMd -Destination (Join-Path $stagingDir "research-agent.md.bak") -PassThru).FullName } else { $null }

            sidecar_path     = $liveSidecar

            sidecar_backup   = if (Test-Path -LiteralPath $liveSidecar) { (Copy-Item -LiteralPath $liveSidecar -Destination (Join-Path $stagingDir "research-agent.aionui.json.bak") -PassThru).FullName } else { $null }

        }



        try {

            Write-Host "Installing Scrapling (ai extras)..."

            if (-not $WhatIf) {

                & $python -m pip install "scrapling[ai]" --upgrade

                if ($LASTEXITCODE -ne 0) { throw "pip install scrapling failed" }

            }



            $settings = Get-Content -Raw -LiteralPath $settingsPath -Encoding UTF8 | ConvertFrom-Json

            if (-not $settings.mcpServers) {

                Set-JsonProperty -Object $settings -Name "mcpServers" -Value ([pscustomobject]@{})

            }

            $scraplingMcp = [pscustomobject]@{

                command     = $python

                args        = @("-m", "scrapling", "mcp")

                description = "Scrapling MCP — stealth/dynamic fetch for hard pages (Extended profile)"

            }

            Set-JsonProperty -Object $settings.mcpServers -Name "scrapling" -Value $scraplingMcp

            if (-not $WhatIf) {

                $settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $settingsPath -Encoding UTF8

            }



            if (-not $WhatIf) {

                $probeJson = & $probeScript -ConfigDir $config -InstallDir $InstallDir -Json | ConvertFrom-Json

                $scraplingProbe = @($probeJson.probes | Where-Object { $_.probe -eq "scrapling" })[0]

                if (-not $scraplingProbe -or $scraplingProbe.ok -ne $true) {

                    throw "Scrapling probe failed after install — staying on Base profile"

                }

            }



            $targetMcp = @("exa", "tavily", "scrapling")

        }

        catch {

            Restore-InstallSnapshot -Snapshot $snapshot

            throw "Extended install failed (rolled back to Base): $_"

        }

    }



    if ($Profile -eq "Experimental") {

        Write-Warning "Experimental profile requires Lightpanda (WSL/AGPL). Manual: install lightpanda + register MCP; not automated in Base ship."

    }



    Set-ResearchAgentProfile -AgentMdPath $liveAgentMd -SidecarPath $liveSidecar -McpServers $targetMcp



    Write-Host "==> Done. Run probe:" -ForegroundColor Green

    Write-Host "  .\ccb-installer\scripts\probe-research-capabilities.ps1 -ConfigDir `"$config`""

}

finally {

    if (Test-Path -LiteralPath $stagingDir) {

        Remove-Item -LiteralPath $stagingDir -Recurse -Force -ErrorAction SilentlyContinue

    }

}


