param(
    [string]$InstallDir,
    [string]$ConfigDir
)

$ErrorActionPreference = "Stop"

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}
if (-not $ConfigDir) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA "CCB\.claude"
}

$settingsPath = Join-Path $ConfigDir "settings.json"
$mcpConfigPath = Join-Path $InstallDir "ccb-mcp.json"
$excelServer = Join-Path $InstallDir "vendor\mcp-servers\excel-mcp\mcp-excel.exe"

function Set-JsonProperty {
    param(
        [Parameter(Mandatory = $true)] $Object,
        [Parameter(Mandatory = $true)] [string] $Name,
        [Parameter(Mandatory = $true)] $Value
    )

    $property = $Object.PSObject.Properties[$Name]
    if ($property) {
        $property.Value = $Value
    }
    else {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
    }
}

New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

if (Test-Path -LiteralPath $settingsPath) {
    try {
        $settings = Get-Content -Raw -LiteralPath $settingsPath | ConvertFrom-Json
    }
    catch {
        $backupPath = "$settingsPath.invalid-$(Get-Date -Format yyyyMMddHHmmss).bak"
        Copy-Item -LiteralPath $settingsPath -Destination $backupPath -Force
        $settings = [pscustomobject]@{}
    }
}
else {
    $settings = [pscustomobject]@{}
}

if (-not $settings.PSObject.Properties["mcpServers"]) {
    Set-JsonProperty -Object $settings -Name "mcpServers" -Value ([pscustomobject]@{})
}

$exa = [pscustomobject]@{
    type        = "http"
    url         = "https://mcp.exa.ai/mcp"
    description = "Exa neural web search and page fetch MCP"
}

$excel = [pscustomobject]@{
    command     = $excelServer
    description = "ExcelMcp Server v1.8.67 for Microsoft Excel automation. Requires Windows and Microsoft Excel 2016+."
}

Set-JsonProperty -Object $settings.mcpServers -Name "exa" -Value $exa
Set-JsonProperty -Object $settings.mcpServers -Name "excel-mcp" -Value $excel

$settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $settingsPath -Encoding UTF8

$mcpConfig = [pscustomobject]@{
    mcpServers = [pscustomobject]@{
        exa = $exa
        "excel-mcp" = $excel
    }
}
$mcpConfig | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $mcpConfigPath -Encoding UTF8
