# Shared helpers for build-wanding.ps1 and build-wanding-hot.ps1
# Spec: .trellis/spec/integration/wanding-packaging-whitelist.md §16.1

function Write-WandingBuildStep([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-WandingRobocopyMirror {
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

function Test-WandingRequiredFile([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required $Label not found: $Path"
    }
}

function Get-WandingBuildRoots([string]$ScriptsRoot = '') {
    if (-not $ScriptsRoot) { $ScriptsRoot = $PSScriptRoot }
    $installerRoot = Split-Path $ScriptsRoot -Parent
    $repoRoot = Split-Path $installerRoot -Parent
    return @{
        InstallerRoot = $installerRoot
        RepoRoot      = $repoRoot
        DataRoot      = Join-Path $repoRoot 'data'
    }
}

function Get-WandingHotComponentCatalog() {
    return [ordered]@{
        dist            = 'dist/** (claude-code-B)'
        scripts         = 'scripts/** (shipped update + repair scripts)'
        python          = 'vendor/wanding/python/**'
        data            = 'vendor/wanding/data/**'
        seed            = 'seed/agents + seed/skills/ccb-subagent-gate'
        package         = 'packages/vertical/com.wanding.trade/**'
        'quotation-mcp' = 'vendor/mcp-servers/quotation-server/dist + node_modules'
        'accurate-mcp'  = 'vendor/mcp-servers/accurate-mcp/**'
        'office-word'   = 'vendor/mcp-servers/office-word-mcp/**'
        excel           = 'vendor/mcp-servers/excel-mcp-server/**'
    }
}

function Get-WandingShipScripts {
    return @(
        'ensure-wanding-settings.ps1',
        'apply-compiled-runtime-config.ps1',
        'compile-runtime-config.mjs',
        'package-lifecycle.mjs',
        'install-office-word-mcp.ps1',
        'ensure-python-wanding-pywin32.ps1',
        'install-ppt-master.ps1',
        'deploy-ppt-master-skill.ps1',
        'deploy-subagent-gate-skill.ps1',
        'deploy-personal-memory-skill.ps1',
        'sync-ppt-master-agents.ps1',
        'ensure-ppt-master-deps.ps1',
        'install-excel-mcp-server.ps1',
        'deploy-seed-agents.ps1',
        'deploy-seed-agents.mjs',
        'patch-subagent-gate-hooks.ps1',
        'patch-personal-memory-hooks.ps1',
        'sync-aionui-ccb-route-b.ps1',
        'test-install-health.ps1',
        'run-wanding-bootstrap.ps1',
        'smoke-wanding-e2e.ps1',
        'ccb-diagnose.ps1',
        'ccb-check-update.ps1',
        'ccb-update-notify.ps1',
        'ccb-update-auto.ps1',
        'verify-update-server.ps1',
        'internal-upgrade.ps1',
        'repair-wanding-install-dir.ps1',
        'find-wanding-installs.ps1',
        'purge-stale-wanding-installs.ps1',
        'rollback-last-update.ps1'
    )
}

function Resolve-WandingReferenceInstallDir([string]$Override = '') {
    if ($Override -and (Test-Path -LiteralPath $Override)) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    foreach ($c in @(
        'D:\CCB-Wanding',
        (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'),
        (Join-Path $env:LOCALAPPDATA 'CCB-Wanding')
    )) {
        if (Test-Path -LiteralPath (Join-Path $c 'dist\cli.js')) {
            return (Resolve-Path -LiteralPath $c).Path
        }
    }
    return $null
}

function Resolve-WandingHotComponentsFromGit {
    param(
        [string]$RepoRoot,
        [string]$BaseRef = 'HEAD'
    )
    Push-Location $RepoRoot
    try {
        $changed = @()
        $changed += git diff --name-only $BaseRef 2>$null
        $changed += git diff --name-only --cached $BaseRef 2>$null
        $changed = $changed | Where-Object { $_ } | Select-Object -Unique
        if ($LASTEXITCODE -ne 0 -and $changed.Count -eq 0) {
            $changed = git diff --name-only 2>$null
        }
        if (-not $changed -or $changed.Count -eq 0) {
            Write-Host '[warn] git diff empty — defaulting to dist' -ForegroundColor Yellow
            return @('dist')
        }
    } finally {
        Pop-Location
    }

    $set = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($path in $changed) {
        $p = $path -replace '\\', '/'
        switch -Regex ($p) {
            '^(ccb-installer/)?claude-code-b-src/' { [void]$set.Add('dist') }
            '^D:/claude-code-B/' { [void]$set.Add('dist') }
            '^python/' { [void]$set.Add('python') }
            '^data/' { [void]$set.Add('data') }
            '^ccb-installer/config/agents/' { [void]$set.Add('seed') }
            '^ccb-installer/config/skills/' { [void]$set.Add('seed') }
            '^ccb-installer/packages/vertical/com\.wanding\.trade/agents/' { [void]$set.Add('seed'); [void]$set.Add('package') }
            '^ccb-installer/packages/vertical/com\.wanding\.trade/skills/' { [void]$set.Add('seed'); [void]$set.Add('package') }
            '^ccb-installer/packages/vertical/com\.wanding\.trade/' { [void]$set.Add('package') }
            '^mcp_servers/quotation-server/' { [void]$set.Add('quotation-mcp') }
            '^ccb-installer/vendor/mcp-servers/accurate-mcp/' { [void]$set.Add('accurate-mcp') }
            '^ccb-installer/scripts/install-office-word-mcp\.ps1$' { [void]$set.Add('office-word') }
            '^ccb-installer/scripts/install-excel-mcp-server\.ps1$' { [void]$set.Add('excel') }
            '^ccb-installer/scripts/[^/]+\.(ps1|mjs)$' { [void]$set.Add('scripts') }
        }
    }
    if ($set.Count -eq 0) {
        Write-Host '[warn] No mapped hot components — defaulting to dist' -ForegroundColor Yellow
        return @('dist')
    }
    return @($set)
}

function Normalize-WandingHotComponents {
    param([string[]]$Components)
    $alias = @{
        quotation         = 'quotation-mcp'
        accurate          = 'accurate-mcp'
        'office-word-mcp' = 'office-word'
        'excel-mcp'       = 'excel'
        'excel-mcp-server' = 'excel'
        'mcp-pip'         = @('office-word', 'excel')
        all               = @(
            'dist', 'scripts', 'python', 'data', 'seed', 'quotation-mcp', 'accurate-mcp', 'office-word', 'excel'
        )
    }
    $out = [System.Collections.Generic.List[string]]::new()
    foreach ($raw in $Components) {
        $key = $raw.Trim().ToLowerInvariant()
        if (-not $key) { continue }
        if ($alias.ContainsKey($key)) {
            foreach ($item in @($alias[$key])) { if ($out -notcontains $item) { $out.Add($item) } }
            continue
        }
        if ($out -notcontains $key) { $out.Add($key) }
    }
    return @($out)
}

function Copy-WandingTreeIfExists {
    param([string]$Source, [string]$Dest)
    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Missing source for copy: $Source"
    }
    Invoke-WandingRobocopyMirror $Source $Dest
}

function Stage-WandingHotDist {
    param(
        [string]$HotRoot,
        [string]$Version,
        [string]$ClaudeCodeBRoot,
        [switch]$BuildDist
    )
    if ($BuildDist) {
        if (-not (Test-Path -LiteralPath $ClaudeCodeBRoot)) {
            throw "claude-code-B not found: $ClaudeCodeBRoot"
        }
        Push-Location $ClaudeCodeBRoot
        try {
            & bun run build
            if ($LASTEXITCODE -ne 0) { throw "bun run build failed ($LASTEXITCODE)" }
        } finally {
            Pop-Location
        }
    }
    $ccbDist = Join-Path $ClaudeCodeBRoot 'dist'
    Test-WandingRequiredFile (Join-Path $ccbDist 'cli.js') 'claude-code-B dist\cli.js'
    Invoke-WandingRobocopyMirror $ccbDist (Join-Path $HotRoot 'dist') @(
        '/XD', 'node_modules',
        '/XF', 'loadAgentsDir-head-test.js', 'loadAgentsDir-test108.js'
    )
    $versionFile = Join-Path $HotRoot 'dist\VERSION'
    [System.IO.File]::WriteAllText($versionFile, $Version.Trim(), [System.Text.UTF8Encoding]::new($false))
}

function Stage-WandingHotPython {
    param([string]$HotRoot, [string]$RepoRoot)
    $pySrc = Join-Path $RepoRoot 'python'
    $pyDest = Join-Path $HotRoot 'vendor\wanding\python'
    Invoke-WandingRobocopyMirror $pySrc $pyDest @(
        '/XF', 'test_*.py', 'smoke_wanding_e2e.py', '_tmp_*.txt',
        '/XD', 'tests', '.pytest_cache', '__pycache__', 'tools'
    )
}

function Stage-WandingHotData {
    param([string]$HotRoot, [hashtable]$Roots)
    $dataRoot = $Roots.DataRoot
    $dataDest = Join-Path $HotRoot 'vendor\wanding\data'
    New-Item -ItemType Directory -Force -Path $dataDest | Out-Null
    foreach ($f in @(
        'ccb-wanding-claude-index.md',
        'ccb-wanding-quotation.md',
        'ccb-wanding-accurate.md',
        'wanding_business_knowledge.md',
        'wanding-matching-architecture.md',
        'data.Md'
    )) {
        $srcMd = Join-Path $dataRoot $f
        if (Test-Path -LiteralPath $srcMd) {
            Copy-Item -LiteralPath $srcMd -Destination (Join-Path $dataDest $f) -Force
        }
    }
    Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' -ErrorAction SilentlyContinue |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dataDest $_.Name) -Force }
}

function Stage-WandingHotSeed {
    param([string]$HotRoot, [hashtable]$Roots)
    $installerRoot = $Roots.InstallerRoot
    $seedAgentsDest = Join-Path $HotRoot 'seed\agents'
    New-Item -ItemType Directory -Force -Path $seedAgentsDest | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $installerRoot 'config\agents') -File |
        Where-Object { $_.Name -ne 'README.md' } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $seedAgentsDest -Force }
    Get-ChildItem -LiteralPath (Join-Path $installerRoot 'packages\vertical\com.wanding.trade\agents') -File |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $seedAgentsDest -Force }
    $seedSkillSrc = Join-Path $installerRoot 'config\skills\ccb-subagent-gate'
    $seedSkillDest = Join-Path $HotRoot 'seed\skills\ccb-subagent-gate'
    Invoke-WandingRobocopyMirror $seedSkillSrc $seedSkillDest @('/XD', 'tests')
    $learnSkillSrc = Join-Path $installerRoot 'packages\vertical\com.wanding.trade\skills\quotation-learn-by-data'
    $learnSkillDest = Join-Path $HotRoot 'seed\skills\quotation-learn-by-data'
    Invoke-WandingRobocopyMirror $learnSkillSrc $learnSkillDest
}

function Stage-WandingHotScripts {
    param([string]$HotRoot, [hashtable]$Roots)
    $src = Join-Path $Roots.InstallerRoot 'scripts'
    $dest = Join-Path $HotRoot 'scripts'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    foreach ($name in Get-WandingShipScripts) {
        $file = Join-Path $src $name
        if (Test-Path -LiteralPath $file) {
            Copy-Item -LiteralPath $file -Destination $dest -Force
        }
    }
    $libDest = Join-Path $dest 'lib'
    New-Item -ItemType Directory -Force -Path $libDest | Out-Null
    foreach ($name in @('runtime-config-compiler.mjs', 'package-lifecycle.mjs')) {
        $file = Join-Path $src "lib\$name"
        Test-WandingRequiredFile $file "script library $name"
        Copy-Item -LiteralPath $file -Destination $libDest -Force
    }
}

function Stage-WandingHotPackage {
    param([string]$HotRoot, [hashtable]$Roots)
    $source = Join-Path $Roots.InstallerRoot 'packages\vertical\com.wanding.trade'
    $destination = Join-Path $HotRoot 'packages\vertical\com.wanding.trade'
    Invoke-WandingRobocopyMirror $source $destination
}

function Stage-WandingHotQuotationMcp {
    param([string]$HotRoot, [hashtable]$Roots)
    $repoRoot = $Roots.RepoRoot
    $mcpDest = Join-Path $HotRoot 'vendor\mcp-servers\quotation-server'
    $quotDistSrc = Join-Path $repoRoot 'mcp_servers\quotation-server\dist'
    Test-WandingRequiredFile (Join-Path $quotDistSrc 'index.js') 'quotation-server dist\index.js'
    Invoke-WandingRobocopyMirror $quotDistSrc (Join-Path $mcpDest 'dist')
    $quotNodeModulesSrc = Join-Path $repoRoot 'mcp_servers\quotation-server\node_modules'
    if (Test-Path -LiteralPath $quotNodeModulesSrc) {
        Invoke-WandingRobocopyMirror $quotNodeModulesSrc (Join-Path $mcpDest 'node_modules') @('/XD', '.cache')
    } else {
        throw "quotation-server node_modules missing: $quotNodeModulesSrc"
    }
}

function Stage-WandingHotAccurateMcp {
    param([string]$HotRoot, [hashtable]$Roots)
    $accurateSrc = Join-Path $Roots.InstallerRoot 'vendor\mcp-servers\accurate-mcp\server.py'
    Test-WandingRequiredFile $accurateSrc 'accurate-mcp server.py'
    $destDir = Join-Path $HotRoot 'vendor\mcp-servers\accurate-mcp'
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Copy-Item -LiteralPath $accurateSrc -Destination (Join-Path $destDir 'server.py') -Force
}

function Stage-WandingHotMcpFromReference {
    param(
        [string]$HotRoot,
        [string]$ReferenceInstallDir,
        [string]$RelativePath
    )
    if (-not $ReferenceInstallDir) {
        throw "Component '$RelativePath' requires -ReferenceInstallDir (existing CCB-Wanding install with pip artifacts)"
    }
    $src = Join-Path $ReferenceInstallDir $RelativePath
    $dest = Join-Path $HotRoot $RelativePath
    Copy-WandingTreeIfExists $src $dest
}

function Stage-WandingHotMcpPipRebuild {
    param(
        [string]$HotRoot,
        [string]$ReferenceInstallDir,
        [hashtable]$Roots,
        [ValidateSet('office-word', 'excel', 'both')]
        [string]$Which
    )
    if (-not $ReferenceInstallDir) {
        throw 'MCP pip rebuild requires -ReferenceInstallDir with vendor\python-wanding\python.exe'
    }
    $pythonExe = Join-Path $ReferenceInstallDir 'vendor\python-wanding\python.exe'
    Test-WandingRequiredFile $pythonExe 'reference install python-wanding'
    $vendorDest = Join-Path $HotRoot 'vendor'
    New-Item -ItemType Directory -Force -Path (Join-Path $vendorDest 'python-wanding') | Out-Null
    Invoke-WandingRobocopyMirror (Join-Path $ReferenceInstallDir 'vendor\python-wanding') (Join-Path $vendorDest 'python-wanding')
    $installerRoot = $Roots.InstallerRoot
    if ($Which -in 'office-word', 'both') {
        & (Join-Path $installerRoot 'scripts\install-office-word-mcp.ps1') -InstallDir $HotRoot
    }
    if ($Which -in 'excel', 'both') {
        & (Join-Path $installerRoot 'scripts\install-excel-mcp-server.ps1') -InstallDir $HotRoot
    }
    Remove-Item -LiteralPath (Join-Path $HotRoot 'vendor\python-wanding') -Recurse -Force -ErrorAction SilentlyContinue
}

function Invoke-WandingHotComponentStage {
    param(
        [string]$Component,
        [string]$HotRoot,
        [string]$Version,
        [hashtable]$Roots,
        [string]$ClaudeCodeBRoot,
        [string]$ReferenceInstallDir,
        [switch]$BuildDist,
        [switch]$RebuildMcpPip
    )
    switch ($Component) {
        'dist' {
            Stage-WandingHotDist -HotRoot $HotRoot -Version $Version -ClaudeCodeBRoot $ClaudeCodeBRoot -BuildDist:$BuildDist
        }
        'scripts' { Stage-WandingHotScripts -HotRoot $HotRoot -Roots $Roots }
        'python' { Stage-WandingHotPython -HotRoot $HotRoot -RepoRoot $Roots.RepoRoot }
        'data' { Stage-WandingHotData -HotRoot $HotRoot -Roots $Roots }
        'seed' { Stage-WandingHotSeed -HotRoot $HotRoot -Roots $Roots }
        'package' { Stage-WandingHotPackage -HotRoot $HotRoot -Roots $Roots }
        'quotation-mcp' { Stage-WandingHotQuotationMcp -HotRoot $HotRoot -Roots $Roots }
        'accurate-mcp' { Stage-WandingHotAccurateMcp -HotRoot $HotRoot -Roots $Roots }
        'office-word' {
            if ($RebuildMcpPip) {
                Stage-WandingHotMcpPipRebuild -HotRoot $HotRoot -ReferenceInstallDir $ReferenceInstallDir -Roots $Roots -Which 'office-word'
            } else {
                Stage-WandingHotMcpFromReference -HotRoot $HotRoot -ReferenceInstallDir $ReferenceInstallDir `
                    -RelativePath 'vendor\mcp-servers\office-word-mcp'
            }
        }
        'excel' {
            if ($RebuildMcpPip) {
                Stage-WandingHotMcpPipRebuild -HotRoot $HotRoot -ReferenceInstallDir $ReferenceInstallDir -Roots $Roots -Which 'excel'
            } else {
                Stage-WandingHotMcpFromReference -HotRoot $HotRoot -ReferenceInstallDir $ReferenceInstallDir `
                    -RelativePath 'vendor\mcp-servers\excel-mcp-server'
            }
        }
        default { throw "Unknown hot component: $Component (use: $(Get-WandingHotComponentCatalog).Keys)" }
    }
}

function Ensure-WandingDistVersion {
    param(
        [string]$InstallDir,
        [string]$Version = ''
    )

    $cliJs = Join-Path $InstallDir 'dist\cli.js'
    $versionFile = Join-Path $InstallDir 'dist\VERSION'
    if (-not (Test-Path -LiteralPath $cliJs)) {
        return @{ ok = $false; created = $false; version = $null; reason = 'dist/cli.js missing' }
    }
    if (Test-Path -LiteralPath $versionFile) {
        $existing = (Get-Content -LiteralPath $versionFile -Raw).Trim()
        return @{ ok = $true; created = $false; version = $existing; reason = 'already present' }
    }

    if (-not $Version) {
        $buildInfoPath = Join-Path $InstallDir 'dist\BUILD-INFO.json'
        if (Test-Path -LiteralPath $buildInfoPath) {
            try {
                $buildInfo = Get-Content -Raw -LiteralPath $buildInfoPath -Encoding UTF8 | ConvertFrom-Json
                if ($buildInfo.version) {
                    $Version = [string]$buildInfo.version
                }
            }
            catch {
                # ignore malformed BUILD-INFO
            }
        }
    }
    if (-not $Version) {
        $Version = '1.1.6-dev'
    }

    $null = New-Item -ItemType Directory -Force -Path (Split-Path $versionFile -Parent)
    [System.IO.File]::WriteAllText(
        $versionFile,
        $Version.Trim(),
        [System.Text.UTF8Encoding]::new($false)
    )
    return @{ ok = $true; created = $true; version = $Version.Trim(); reason = 'stamped missing VERSION' }
}

function Get-WandingHotZipRelPaths {
    param([string[]]$Components)
    $map = @{
        dist            = @('dist')
        scripts         = @('scripts')
        python          = @('vendor\wanding\python')
        data            = @('vendor\wanding\data')
        seed            = @('seed\agents', 'seed\skills\ccb-subagent-gate')
        package         = @('packages\vertical\com.wanding.trade\package.json')
        'quotation-mcp' = @('vendor\mcp-servers\quotation-server\dist', 'vendor\mcp-servers\quotation-server\node_modules')
        'accurate-mcp'  = @('vendor\mcp-servers\accurate-mcp')
        'office-word'   = @('vendor\mcp-servers\office-word-mcp')
        excel           = @('vendor\mcp-servers\excel-mcp-server')
    }
    $paths = [System.Collections.Generic.List[string]]::new()
    foreach ($c in $Components) {
        if (-not $map.ContainsKey($c)) { continue }
        foreach ($rel in $map[$c]) {
            if ($paths -notcontains $rel) { $paths.Add($rel) }
        }
    }
    return @($paths)
}
