[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$CompiledSettingsPath,
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,
    [Parameter(Mandatory = $true)]
    [string]$ConfigDir,
    [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'

function Write-Utf8JsonAtomic {
    param(
        [Parameter(Mandatory = $true)] [string]$Path,
        [Parameter(Mandatory = $true)] $Value
    )
    $directory = Split-Path -Parent $Path
    $null = New-Item -ItemType Directory -Force -Path $directory
    $temp = Join-Path $directory ('.' + [IO.Path]::GetFileName($Path) + '.tmp-' + [guid]::NewGuid().ToString('N'))
    try {
        $json = $Value | ConvertTo-Json -Depth 30
        [IO.File]::WriteAllText($temp, $json + "`n", [Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temp -Destination $Path -Force
    }
    finally {
        if (Test-Path -LiteralPath $temp) {
            Remove-Item -LiteralPath $temp -Force
        }
    }
}

$resolvedSource = [IO.Path]::GetFullPath($CompiledSettingsPath)
if (-not (Test-Path -LiteralPath $resolvedSource -PathType Leaf)) {
    throw "Compiled settings not found: $resolvedSource"
}

$raw = Get-Content -Raw -Encoding UTF8 -LiteralPath $resolvedSource
if ($raw -match 'secret://') {
    throw 'Compiled settings contain unresolved secret:// references'
}

try {
    $compiled = $raw | ConvertFrom-Json
}
catch {
    throw "Compiled settings are not valid JSON: $($_.Exception.Message)"
}
if (-not $compiled.PSObject.Properties['env']) {
    throw 'Compiled settings must contain env'
}
if (-not $compiled.PSObject.Properties['mcpServers']) {
    throw 'Compiled settings must contain mcpServers'
}

$settingsPath = Join-Path $ConfigDir 'settings.json'
if (
    -not $NoBackup -and
    (Test-Path -LiteralPath $settingsPath) -and
    ((Get-Content -Raw -LiteralPath $settingsPath) -ne $raw)
) {
    $backup = "$settingsPath.pre-compiled-$(Get-Date -Format yyyyMMddHHmmss).bak"
    Copy-Item -LiteralPath $settingsPath -Destination $backup -Force
    Write-Host "Backed up existing settings: $backup" -ForegroundColor DarkGray
}

Write-Utf8JsonAtomic -Path $settingsPath -Value $compiled
Write-Utf8JsonAtomic -Path (Join-Path $InstallDir 'ccb-mcp.json') -Value ([ordered]@{
    mcpServers = $compiled.mcpServers
})

Write-Host "Applied compiled runtime settings: $settingsPath" -ForegroundColor Green
