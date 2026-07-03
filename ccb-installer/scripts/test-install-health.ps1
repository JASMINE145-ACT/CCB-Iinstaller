# CCB-Wanding install health check.
# Manifest-driven checks for install layout, bootstrap, Route-B, and user config.
param(
    [string]$InstallDir = '',
    [string]$ConfigDir = '',
    [string]$ManifestPath = '',
    [string]$LogFile = '',
    [ValidateSet('Platform', 'Full')]
    [string]$Profile = 'Full',
    [switch]$SkipBootstrap,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}
$InstallDir = (Resolve-Path -LiteralPath $InstallDir).Path

if (-not $ConfigDir) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
}
if (-not $ManifestPath) {
    $ManifestPath = Join-Path $InstallDir 'install-health-manifest.json'
}
if (-not (Test-Path -LiteralPath $ManifestPath)) {
    $ManifestPath = Join-Path $PSScriptRoot '..\resources\install-health-manifest.json'
}
if (-not $LogFile) {
    $logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $LogFile = Join-Path $logDir 'check-install.log'
}

function Expand-HealthPath {
    param([string]$Path)
    $p = $Path.Replace('/', '\')
    $p = $p.Replace('%LOCALAPPDATA%', $env:LOCALAPPDATA)
    $p = $p.Replace('%APPDATA%', $env:APPDATA)
    if ([System.IO.Path]::IsPathRooted($p)) { return $p }
    return Join-Path $InstallDir $p
}

function Write-CheckLine {
    param([string]$Level, [string]$Message)
    $line = "$Level $Message"
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
    if (-not $Quiet) { Write-Host $line }
}

New-Item -ItemType Directory -Force -Path (Split-Path $LogFile -Parent) | Out-Null
Set-Content -LiteralPath $LogFile -Value "=== CCB-Wanding install health $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8
Add-Content -LiteralPath $LogFile -Value "INSTALL=$InstallDir" -Encoding UTF8
Add-Content -LiteralPath $LogFile -Value "CONFIG=$ConfigDir" -Encoding UTF8

$failures = 0

if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-CheckLine 'FAIL' "install-health-manifest missing: $ManifestPath"
    exit 1
}

$manifest = Get-Content -Raw -LiteralPath $ManifestPath -Encoding UTF8 | ConvertFrom-Json
$requiredFiles = if ($manifest.PSObject.Properties['platform_required_files']) {
    @($manifest.platform_required_files)
}
else {
    @($manifest.required_files)
}
$configFiles = @($manifest.config_files)

if ($Profile -eq 'Full') {
    foreach ($packageManifestRel in @($manifest.package_health_manifests)) {
        $packageManifestPath = Expand-HealthPath ([string]$packageManifestRel)
        if (-not (Test-Path -LiteralPath $packageManifestPath)) {
            $packageManifestPath = Join-Path (Split-Path $PSScriptRoot -Parent) ([string]$packageManifestRel)
        }
        if (-not (Test-Path -LiteralPath $packageManifestPath)) {
            Write-CheckLine 'FAIL' "package health manifest missing: $packageManifestRel"
            $failures++
            continue
        }
        $packageHealth = Get-Content -Raw -LiteralPath $packageManifestPath -Encoding UTF8 | ConvertFrom-Json
        $requiredFiles += @($packageHealth.requiredFiles)
        $configFiles += @($packageHealth.configFiles)
    }
}

if ($manifest.install_root) {
    $markerRel = [string]$manifest.install_root.marker
    if ($markerRel) {
        $markerPath = Expand-HealthPath $markerRel
        if (Test-Path -LiteralPath $markerPath) {
            Write-CheckLine 'OK' $markerRel
        }
        else {
            $footprints = @($manifest.install_root.orphan_footprints)
            $hasOrphan = $false
            foreach ($fp in $footprints) {
                if (Test-Path -LiteralPath (Expand-HealthPath $fp)) { $hasOrphan = $true; break }
            }
            if ($hasOrphan) {
                Write-CheckLine 'FAIL' "orphan install: missing $markerRel but CCB-Wanding footprints present — run repair-wanding-install-dir.ps1 then full NSIS"
            }
            else {
                Write-CheckLine 'FAIL' "missing $markerRel ($markerPath)"
            }
            $failures++
        }
    }
}

if (-not $SkipBootstrap -and $Profile -eq 'Full') {
    $bootstrap = Join-Path $InstallDir 'scripts\run-wanding-bootstrap.ps1'
    if (Test-Path -LiteralPath $bootstrap) {
        Write-CheckLine 'START' 'bootstrap quick check'
        & $bootstrap -InstallDir $InstallDir -ConfigDir $ConfigDir -Mode Quick -LogFile $LogFile | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-CheckLine 'OK' 'bootstrap quick check'
        }
        else {
            Write-CheckLine 'FAIL' "bootstrap quick check exit=$LASTEXITCODE"
            $failures++
        }
    }
    else {
        Write-CheckLine 'FAIL' "missing scripts\run-wanding-bootstrap.ps1"
        $failures++
    }
}

foreach ($rel in $requiredFiles) {
    $path = Expand-HealthPath $rel
    if (Test-Path -LiteralPath $path) {
        Write-CheckLine 'OK' $rel
    }
    else {
        Write-CheckLine 'FAIL' "missing $rel ($path)"
        $failures++
    }
}

$routeMarker = [string]$manifest.route_b.marker
foreach ($item in @(
    @{ name = 'bundled route-b'; path = [string]$manifest.route_b.bundled_index },
    @{ name = 'runtime route-b'; path = [string]$manifest.route_b.runtime_index }
)) {
    $path = Expand-HealthPath $item.path
    if ((Test-Path -LiteralPath $path) -and (Select-String -LiteralPath $path -Pattern $routeMarker -Quiet)) {
        Write-CheckLine 'OK' $item.name
    }
    else {
        Write-CheckLine 'FAIL' "$($item.name) missing marker at $path"
        $failures++
    }
}

$acpAgentMarker = [string]$manifest.route_b.acp_agent_marker
if ($acpAgentMarker) {
    $runtimeAcpAgent = Expand-HealthPath ([string]$manifest.route_b.runtime_acp_agent)
    if ((Test-Path -LiteralPath $runtimeAcpAgent) -and
        (Select-String -LiteralPath $runtimeAcpAgent -Pattern $acpAgentMarker -Quiet)) {
        Write-CheckLine 'OK' 'runtime acp-agent patch'
    }
    else {
        Write-CheckLine 'FAIL' "runtime acp-agent patch missing at $runtimeAcpAgent"
        $failures++
    }
}

foreach ($entry in $configFiles) {
    $path = Expand-HealthPath $entry
    if (Test-Path -LiteralPath $path) {
        Write-CheckLine 'OK' $entry
    }
    else {
        Write-CheckLine 'FAIL' "missing $entry ($path)"
        $failures++
    }
}

$settings = Join-Path $ConfigDir 'settings.json'
if (Test-Path -LiteralPath $settings) {
    try {
        $null = Get-Content -Raw -LiteralPath $settings -Encoding UTF8 | ConvertFrom-Json
        Write-CheckLine 'OK' 'settings.json valid JSON'
    }
    catch {
        Write-CheckLine 'FAIL' "settings.json invalid JSON: $($_.Exception.Message)"
        $failures++
    }
}

if ($manifest.sso) {
    $ssoPath = Expand-HealthPath ([string]$manifest.sso.config_file)
    $modeKey = [string]$manifest.sso.mode_key
    $modeValue = [string]$manifest.sso.mode_value
    $secretKey = [string]$manifest.sso.secret_key
    if (Test-Path -LiteralPath $ssoPath) {
        $ssoVars = @{}
        Get-Content -LiteralPath $ssoPath -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
                $ssoVars[$matches[1].Trim()] = $matches[2].Trim()
            }
        }
        if ($ssoVars[$modeKey] -eq $modeValue) {
            if ($ssoVars[$secretKey] -and $ssoVars[$secretKey].Length -ge 16) {
                Write-CheckLine 'OK' "sso.env $modeKey=$modeValue JWT_SECRET set"
            }
            else {
                Write-CheckLine 'FAIL' "sso.env $modeKey=$modeValue but $secretKey missing or too short"
                $failures++
            }
        }
        else {
            Write-CheckLine 'OK' "sso.env present (SSO mode off or not configured)"
        }
    }
    else {
        Write-CheckLine 'OK' 'sso.env not present (Phase 0 / dev bypass OK)'
    }
}

if ($failures -eq 0) {
    Write-CheckLine 'PASS' 'install health complete'
    exit 0
}

Write-CheckLine 'FAIL' "install health failed: $failures issue(s)"
exit 1
