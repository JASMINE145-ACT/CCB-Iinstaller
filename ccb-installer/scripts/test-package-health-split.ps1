$ErrorActionPreference = 'Stop'

$installerRoot = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $installerRoot 'resources\install-health-manifest.json'
$healthScript = Join-Path $PSScriptRoot 'test-install-health.ps1'
$tempBase = Join-Path ([System.IO.Path]::GetPathRoot($installerRoot)) 'tmp'
$fixtureRoot = Join-Path $tempBase "ph-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$installDir = Join-Path $fixtureRoot 'install'
$configDir = Join-Path $fixtureRoot 'local\CCB-Wanding\.claude'
$oldAppData = $env:APPDATA
$oldLocalAppData = $env:LOCALAPPDATA
$powerShellExe = (Get-Process -Id $PID).Path

function New-FixtureFile([string]$Path, [string]$Content = '') {
    New-Item -ItemType Directory -Force -Path (Split-Path $Path -Parent) | Out-Null
    Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

try {
    New-Item -ItemType Directory -Force -Path $installDir, $configDir | Out-Null
    $env:APPDATA = Join-Path $fixtureRoot 'roaming'
    $env:LOCALAPPDATA = Join-Path $fixtureRoot 'local'
    $manifest = Get-Content -Raw -LiteralPath $manifestPath -Encoding UTF8 | ConvertFrom-Json

    foreach ($rel in @($manifest.platform_required_files)) {
        New-FixtureFile (Join-Path $installDir ([string]$rel -replace '/', '\'))
    }
    New-FixtureFile (Join-Path $installDir ([string]$manifest.route_b.bundled_index -replace '/', '\')) ([string]$manifest.route_b.marker)
    $runtimeIndex = ([string]$manifest.route_b.runtime_index).Replace('%APPDATA%', $env:APPDATA).Replace('/', '\')
    New-FixtureFile $runtimeIndex ([string]$manifest.route_b.marker)
    $runtimeAgent = ([string]$manifest.route_b.runtime_acp_agent).Replace('%APPDATA%', $env:APPDATA).Replace('/', '\')
    New-FixtureFile $runtimeAgent ([string]$manifest.route_b.acp_agent_marker)
    New-FixtureFile (Join-Path $configDir 'settings.json') '{}'
    New-FixtureFile (Join-Path $configDir '.bootstrap-ok')
    New-FixtureFile (Join-Path $env:APPDATA 'AionUi\aionui\org-server.json') '{}'

    $platformLog = Join-Path $fixtureRoot 'platform.log'
    $platform = Start-Process -FilePath $powerShellExe -ArgumentList @(
        '-NoProfile', '-File', $healthScript,
        '-InstallDir', $installDir,
        '-ConfigDir', $configDir,
        '-ManifestPath', $manifestPath,
        '-LogFile', $platformLog,
        '-Profile', 'Platform',
        '-SkipBootstrap',
        '-Quiet'
    ) -Wait -PassThru -WindowStyle Hidden
    if ($platform.ExitCode -ne 0) {
        Get-Content -LiteralPath $platformLog
        throw "Platform-only health should pass, exit=$($platform.ExitCode)"
    }

    $fullLog = Join-Path $fixtureRoot 'full.log'
    $full = Start-Process -FilePath $powerShellExe -ArgumentList @(
        '-NoProfile', '-File', $healthScript,
        '-InstallDir', $installDir,
        '-ConfigDir', $configDir,
        '-ManifestPath', $manifestPath,
        '-LogFile', $fullLog,
        '-Profile', 'Full',
        '-SkipBootstrap',
        '-Quiet'
    ) -Wait -PassThru -WindowStyle Hidden
    if ($full.ExitCode -eq 0) {
        throw 'Full health should fail when the WanD package payload is absent'
    }

    Write-Host 'PASS platform-only health without com.wanding.trade'
    Write-Host 'PASS full health rejects missing com.wanding.trade payload'
    Write-Host 'PASS 2/2 package health split tests'
}
finally {
    $env:APPDATA = $oldAppData
    $env:LOCALAPPDATA = $oldLocalAppData
    if (Test-Path -LiteralPath $fixtureRoot) {
        Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
    }
}
