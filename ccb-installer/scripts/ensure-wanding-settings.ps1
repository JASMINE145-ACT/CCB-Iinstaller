param(
    [string]$InstallDir,
    [string]$ConfigDir,
    [string]$OrgServerUrl
)

$ErrorActionPreference = "Stop"

# Production center org aioncore (seeded into %APPDATA%\AionUi\aionui\org-server.json on first install).
$DefaultOrgServerUrl = "http://67.216.206.3:13401"

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}
if (-not $ConfigDir) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude"
}

$settingsPath = Join-Path $ConfigDir "settings.json"
$statePath = Join-Path $ConfigDir ".claude.json"
$claudePath = Join-Path $ConfigDir "CLAUDE.md"
$mcpConfigPath = Join-Path $InstallDir "ccb-mcp.json"
$excelServer = Join-Path $InstallDir "vendor\mcp-servers\excel-mcp\mcp-excel.exe"
$bunExe = Join-Path $InstallDir "vendor\bun\bun.exe"
$pythonExe = Join-Path $InstallDir "vendor\python-wanding\python.exe"
$quotationServer = Join-Path $InstallDir "vendor\mcp-servers\quotation-server\dist\index.js"
$priceLibraryServer = Join-Path $InstallDir "vendor\mcp-servers\price-library-server\dist\index.js"
$accurateServer = Join-Path $InstallDir "vendor\mcp-servers\accurate-mcp\server.py"
$officeWordServer = Join-Path $InstallDir "vendor\mcp-servers\office-word-mcp\server.py"
$officeWordSitePackages = Join-Path $InstallDir "vendor\mcp-servers\office-word-mcp\site-packages"
$excelFileServer = Join-Path $InstallDir "vendor\mcp-servers\excel-mcp-server\server.py"
$excelFileSitePackages = Join-Path $InstallDir "vendor\mcp-servers\excel-mcp-server\site-packages"
$wandingRoot = Join-Path $InstallDir "vendor\wanding"
$wandingDataDir = Join-Path $wandingRoot "data"
$wandingPythonDir = Join-Path $wandingRoot "python"
$wandingClaudeIndex = Join-Path $wandingDataDir "ccb-wanding-claude-index.md"
$wandingClaudeQuotation = Join-Path $wandingDataDir "ccb-wanding-quotation.md"
$wandingClaudeAccurate = Join-Path $wandingDataDir "ccb-wanding-accurate.md"
$wandingClaudeDraft = Join-Path $wandingDataDir "ccb-wanding-claude-draft.md"
$wandingKnowledge = Join-Path $wandingDataDir "wanding_business_knowledge.md"
$wandingPriceLib = Join-Path $wandingDataDir "price_library_cleaned_2026_05_15.xlsx"
$orgServerTemplate = Join-Path $wandingRoot "config\org-server.json"
$workspacePointer = Join-Path $ConfigDir "runtime\active-workspace.txt"
$null = New-Item -ItemType Directory -Force -Path (Split-Path $workspacePointer -Parent)

function Ensure-OrgServerDesktopConfig {
    param(
        [string]$TemplatePath,
        [string]$OverrideUrl
    )

    $destDir = Join-Path $env:APPDATA "AionUi\aionui"
    $destPath = Join-Path $destDir "org-server.json"
    if (Test-Path -LiteralPath $destPath) {
        return
    }

    $url = ''
    if ($OverrideUrl) {
        $url = $OverrideUrl.Trim().TrimEnd('/')
    }
    if (-not $url -and (Test-Path -LiteralPath $TemplatePath)) {
        try {
            $parsed = Get-Content -Raw -LiteralPath $TemplatePath -Encoding UTF8 | ConvertFrom-Json
            $url = [string]$parsed.url
            if ($url) {
                $url = $url.Trim().TrimEnd('/')
            }
        }
        catch {
            $url = ''
        }
    }
    if (-not $url) {
        $url = $DefaultOrgServerUrl
    }

    $null = New-Item -ItemType Directory -Force -Path $destDir
    $payload = [ordered]@{ url = $url }
    ($payload | ConvertTo-Json -Compress) + "`n" | Set-Content -LiteralPath $destPath -Encoding UTF8 -NoNewline
}

Ensure-OrgServerDesktopConfig -TemplatePath $orgServerTemplate -OverrideUrl $OrgServerUrl

function Read-SsoEnvVars {
    param([string]$Path)
    $vars = @{}
    if (-not (Test-Path -LiteralPath $Path)) { return $vars }
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
            $vars[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
    return $vars
}

function Get-SsoEnvTemplatePath {
    # Prefer template that already has JWT_SECRET (resources\ is injected at pack time).
    $candidates = @(
        (Join-Path $InstallDir "resources\sso.env.example"),
        (Join-Path $InstallDir "vendor\wanding\config\sso.env.example"),
        (Join-Path (Split-Path -Parent $PSScriptRoot) "resources\sso.env.example")
    )
    $best = $null
    $bestSecretLen = 0
    foreach ($path in $candidates) {
        if (-not (Test-Path -LiteralPath $path)) { continue }
        $secret = [string](Read-SsoEnvVars -Path $path)['JWT_SECRET']
        if ($secret.Length -gt $bestSecretLen) {
            $best = $path
            $bestSecretLen = $secret.Length
        }
    }
    return $best
}

function Ensure-SsoEnvFile {
    $configRoot = Join-Path $env:LOCALAPPDATA "CCB-Wanding\config"
    $destPath = Join-Path $configRoot "sso.env"
    $template = Get-SsoEnvTemplatePath
    if (-not $template) {
        Write-Warning "sso.env.example not found — unified SSO env not seeded"
        return
    }
    $null = New-Item -ItemType Directory -Force -Path $configRoot
    if (-not (Test-Path -LiteralPath $destPath)) {
        Copy-Item -LiteralPath $template -Destination $destPath -Force
        $seeded = Read-SsoEnvVars -Path $destPath
        if ($seeded['AIONUI_SSO_MODE'] -eq 'org-idp' -and (-not $seeded['JWT_SECRET'] -or $seeded['JWT_SECRET'].Length -lt 16)) {
            Write-Host "Seeded $destPath but JWT_SECRET is empty — set it to match VPS /etc/aionorg/env" -ForegroundColor Yellow
        } else {
            Write-Host "Seeded $destPath from $template" -ForegroundColor DarkGray
        }
        return
    }
    # Repair broken installs: org-idp enabled but JWT_SECRET never seeded (1.0.6 pack bug).
    $existing = Read-SsoEnvVars -Path $destPath
    $tpl = Read-SsoEnvVars -Path $template
    if ($existing['AIONUI_SSO_MODE'] -eq 'org-idp' -and (-not $existing['JWT_SECRET'] -or $existing['JWT_SECRET'].Length -lt 16)) {
        if ($tpl['JWT_SECRET'] -and $tpl['JWT_SECRET'].Length -ge 16) {
            $raw = Get-Content -LiteralPath $destPath -Raw -Encoding UTF8
            if ($raw -match '(?m)^JWT_SECRET=') {
                $raw = $raw -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$($tpl['JWT_SECRET'])"
            } else {
                $raw = $raw.TrimEnd() + "`nJWT_SECRET=$($tpl['JWT_SECRET'])`n"
            }
            [System.IO.File]::WriteAllText($destPath, $raw, [System.Text.UTF8Encoding]::new($false))
            Write-Host "Repaired $destPath JWT_SECRET from install template" -ForegroundColor Green
        } else {
            Write-Host "sso.env has org-idp but JWT_SECRET empty — ops must set JWT_SECRET manually" -ForegroundColor Yellow
        }
    }
}

Ensure-SsoEnvFile

function Get-OrgServerUrlFromDesktopConfig {
    $candidates = @(
        (Join-Path $env:APPDATA "AionUi\aionui\org-server.json"),
        (Join-Path $env:APPDATA "AionUi-Dev\aionui\org-server.json")
    )
    foreach ($path in $candidates) {
        if (-not (Test-Path -LiteralPath $path)) { continue }
        try {
            $parsed = Get-Content -Raw -LiteralPath $path -Encoding UTF8 | ConvertFrom-Json
            $url = [string]$parsed.url
            if ($url) {
                return $url.Trim().TrimEnd('/')
            }
        }
        catch {
            continue
        }
    }
    if ($env:ORG_SERVER_URL) {
        return $env:ORG_SERVER_URL.Trim().TrimEnd('/')
    }
    return ''
}

function Get-OrgAppDataProfile {
    $raw = $env:AIONUI_APPDATA_PROFILE
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        return $raw.Trim()
    }
    return 'AionUi'
}

function Get-OrgSessionTokenFilePath {
    $profile = Get-OrgAppDataProfile
    return Join-Path $env:APPDATA "$profile\aionui\org-session.token"
}

$orgServerUrl = Get-OrgServerUrlFromDesktopConfig
$orgAppDataProfile = Get-OrgAppDataProfile
$orgSessionTokenFile = Get-OrgSessionTokenFilePath

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

function Set-MarkedSection {
    param(
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $true)] [string] $StartMarker,
        [Parameter(Mandatory = $true)] [string] $EndMarker,
        [Parameter(Mandatory = $true)] [string] $Body
    )

    $section = @"
$StartMarker
$Body
$EndMarker
"@

    if (Test-Path -LiteralPath $Path) {
        $existing = Get-Content -Raw -LiteralPath $Path
        $pattern = [regex]::Escape($StartMarker) + "[\s\S]*?" + [regex]::Escape($EndMarker)
        if ([regex]::IsMatch($existing, $pattern)) {
            $updated = [regex]::Replace($existing, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $section })
        }
        else {
            $updated = $existing.TrimEnd() + "`r`n`r`n" + $section + "`r`n"
        }
    }
    else {
        $updated = $section + "`r`n"
    }
    Set-Content -LiteralPath $Path -Value $updated -Encoding UTF8
}

function Remove-MarkedSection {
    param(
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $true)] [string] $StartMarker,
        [Parameter(Mandatory = $true)] [string] $EndMarker
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }
    $existing = Get-Content -Raw -LiteralPath $Path
    $pattern = "(?s)\r?\n?" + [regex]::Escape($StartMarker) + ".*?" + [regex]::Escape($EndMarker) + "\r?\n?"
    $updated = [regex]::Replace($existing, $pattern, "`r`n")
    if ($updated -ne $existing) {
        Set-Content -LiteralPath $Path -Value $updated.TrimEnd() -Encoding UTF8
    }
}

function ConvertTo-ClaudeProjectKey {
    param([string]$Path)

    if (-not $Path) {
        return ""
    }
    return (($Path -replace '\\', '/') -replace '/$', '')
}

function Ensure-ClaudeState {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$InstallDir
    )

    if (Test-Path -LiteralPath $Path) {
        try {
            $state = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
        }
        catch {
            $backupPath = "$Path.invalid-$(Get-Date -Format yyyyMMddHHmmss).bak"
            Copy-Item -LiteralPath $Path -Destination $backupPath -Force
            $state = [pscustomobject]@{}
        }
    }
    else {
        $state = [pscustomobject]@{}
    }

    Set-JsonProperty -Object $state -Name "hasCompletedOnboarding" -Value $true
    Set-JsonProperty -Object $state -Name "lastOnboardingVersion" -Value "2.6.6"
    Set-JsonProperty -Object $state -Name "lastReleaseNotesSeen" -Value "2.6.6"
    Set-JsonProperty -Object $state -Name "showSpinnerTree" -Value $false
    Set-JsonProperty -Object $state -Name "officialMarketplaceAutoInstallAttempted" -Value $true
    Set-JsonProperty -Object $state -Name "officialMarketplaceAutoInstalled" -Value $true
    if (-not $state.PSObject.Properties["firstStartTime"]) {
        Set-JsonProperty -Object $state -Name "firstStartTime" -Value ([DateTime]::UtcNow.ToString("o"))
    }
    if (-not $state.PSObject.Properties["numStartups"]) {
        Set-JsonProperty -Object $state -Name "numStartups" -Value 0
    }
    if (-not $state.PSObject.Properties["migrationVersion"]) {
        Set-JsonProperty -Object $state -Name "migrationVersion" -Value 11
    }
    if (-not $state.PSObject.Properties["tipsHistory"]) {
        Set-JsonProperty -Object $state -Name "tipsHistory" -Value ([pscustomobject]@{})
    }
    if (-not $state.PSObject.Properties["projects"]) {
        Set-JsonProperty -Object $state -Name "projects" -Value ([pscustomobject]@{})
    }

    $projectKey = ConvertTo-ClaudeProjectKey -Path $InstallDir
    $project = $state.projects.PSObject.Properties[$projectKey]
    if ($project) {
        $projectState = $project.Value
    }
    else {
        $projectState = [pscustomobject]@{}
        Set-JsonProperty -Object $state.projects -Name $projectKey -Value $projectState
    }

    Set-JsonProperty -Object $projectState -Name "allowedTools" -Value @()
    Set-JsonProperty -Object $projectState -Name "mcpContextUris" -Value @()
    Set-JsonProperty -Object $projectState -Name "mcpServers" -Value ([pscustomobject]@{})
    Set-JsonProperty -Object $projectState -Name "enabledMcpjsonServers" -Value @()
    Set-JsonProperty -Object $projectState -Name "disabledMcpjsonServers" -Value @()
    Set-JsonProperty -Object $projectState -Name "hasTrustDialogAccepted" -Value $true
    Set-JsonProperty -Object $projectState -Name "projectOnboardingSeenCount" -Value 1
    Set-JsonProperty -Object $projectState -Name "hasCompletedProjectOnboarding" -Value $true
    Set-JsonProperty -Object $projectState -Name "hasClaudeMdExternalIncludesApproved" -Value $false
    Set-JsonProperty -Object $projectState -Name "hasClaudeMdExternalIncludesWarningShown" -Value $false

    $state | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $Path -Encoding UTF8
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

if (-not $settings.PSObject.Properties["env"]) {
    Set-JsonProperty -Object $settings -Name "env" -Value ([pscustomobject]@{})
}
Set-JsonProperty -Object $settings.env -Name "ANTHROPIC_BASE_URL" -Value "https://api.minimaxi.com/anthropic"
Set-JsonProperty -Object $settings.env -Name "ANTHROPIC_AUTH_TOKEN" -Value "sk-cp-FVpTaa8qfaTOU97mM7m7Svk0NOVNwIIhOq1-aWp4LQubya8kRiTgg3DEGRSgBPImWpJKJwJAFdhR-JlSU4H-Qz-Zq2drSi6KbCscdLnuKsUpXKtXpPraT-I"
Set-JsonProperty -Object $settings.env -Name "ANTHROPIC_DEFAULT_OPUS_MODEL" -Value "minimax-m3"
Set-JsonProperty -Object $settings.env -Name "ANTHROPIC_DEFAULT_SONNET_MODEL" -Value "minimax-m3"
Set-JsonProperty -Object $settings.env -Name "ANTHROPIC_DEFAULT_HAIKU_MODEL" -Value "minimax-m3"
Set-JsonProperty -Object $settings.env -Name "PYTHON_EXECUTABLE" -Value $pythonExe
Set-JsonProperty -Object $settings.env -Name "CCB_INSTALL_DIR" -Value $InstallDir
Set-JsonProperty -Object $settings.env -Name "PYTHONNOUSERSITE" -Value "1"
Set-JsonProperty -Object $settings.env -Name "PYTHONUTF8" -Value "1"
Set-JsonProperty -Object $settings.env -Name "PYTHONIOENCODING" -Value "utf-8"
Set-JsonProperty -Object $settings.env -Name "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS" -Value "1"

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

# Bundled Accurate Online credentials — quotation inventory + accurate MCP.
$aolAccessToken = "aat.NTA.eyJ2IjoxLCJ1Ijo2MDAzNTUsImQiOjMwMDYwMCwiYWkiOjYzMjUyLCJhayI6ImI2Y2JmOTUwLWViNDItNGEyYS1hNjkyLTA2YmY3NDhmZjJmMCIsImFuIjoiRGV2IGZvciBkYXRhIHdlYiIsImFwIjoiYTUxNTJjYzMtM2E4Mi00ODg1LWIxYjgtYjQ3NzViZTNkNmQ1IiwidCI6MTc2ODc3MzQ4ODQwMH0.hm4ysdDzSqDX6umEqbR2okCJQHjuX7Mke1iC8y/0Z/TnbVTdp51WKp1TU0f6AIoXHY1N/hUjYSncweXGpYRpzcZ36JwQuz1yMfl1HPBMwK5AfPoZmxuKUd7gxBAyI3zWFvmFYoF5vLNjXsNLLaWVQfM6LIxwEC7wjIQHVIF1vA9jyRDIJfN1//YHtsDEDIBzsIK1B6dyXuM=.Dpew9QjvKyN531ejkyiaLLDaBxGgKPDw2rMB2mfJGKg"
$aolDatabaseId = "iris"
$aolSignatureSecret = "aru0mBgxVKLzuQydryQ9qUyQTuR4CNVeliCyx7znbxaDDuYVPXAhhSUYyZr7F59I"
$aolApiBaseUrl = "https://account.accurate.id"

$quotation = [pscustomobject]@{
    command     = $bunExe
    args        = @($quotationServer)
    env         = [pscustomobject]@{
        CCB_PROJECT_ROOT = $wandingRoot
        DATA_DIR = $wandingDataDir
        PYTHON_EXECUTABLE = $pythonExe
        PYTHONPATH = $wandingPythonDir
        PYTHONUTF8 = "1"
        PYTHONIOENCODING = "utf-8"
        # Isolate the bundled runtime from any per-user site-packages on the
        # target machine, so quotation/inventory always import the packaged
        # pandas/numpy/openpyxl/requests instead of a stray global install.
        PYTHONNOUSERSITE = "1"
        WANDING_PRICE_LIB_PATH = $wandingPriceLib
        PRICE_LIBRARY_PATH = $wandingPriceLib
        WANDING_BUSINESS_KNOWLEDGE_PATH = $wandingKnowledge
        WANDING_WORKSPACE_POINTER = $workspacePointer
        ORG_SERVER_URL = $orgServerUrl
        AIONUI_APPDATA_PROFILE = $orgAppDataProfile
        ORG_SESSION_TOKEN_FILE = $orgSessionTokenFile
        ENABLE_WANDING_VECTOR = "0"
        INVENTORY_ENABLE_RESOLVER_VECTOR = "0"
        USE_RESOLVER_FALLBACK = "0"
        AOL_ACCESS_TOKEN = $aolAccessToken
        AOL_DATABASE_ID = $aolDatabaseId
        AOL_SIGNATURE_SECRET = $aolSignatureSecret
        AOL_API_BASE_URL = $aolApiBaseUrl
    }
    description = "Wanding quotation + inventory MCP: match quotation items, fill quotation sheets, query live stock by code or description, and use bundled Wanding business knowledge."
}

$priceLibrary = [pscustomobject]@{
    command     = $bunExe
    args        = @($priceLibraryServer)
    env         = [pscustomobject]@{
        CCB_PROJECT_ROOT = $wandingRoot
        DATA_DIR = $wandingDataDir
        PYTHON_EXECUTABLE = $pythonExe
        PYTHONPATH = $wandingPythonDir
        PYTHONUTF8 = "1"
        PYTHONIOENCODING = "utf-8"
        PYTHONNOUSERSITE = "1"
        WANDING_WORKSPACE_POINTER = $workspacePointer
        ORG_SERVER_URL = $orgServerUrl
        AIONUI_APPDATA_PROFILE = $orgAppDataProfile
        ORG_SESSION_TOKEN_FILE = $orgSessionTokenFile
    }
    description = "Organization price library admin MCP: read active/draft, preview and apply draft item changes (price_admin + confirmed writes)."
}

$accurate = [pscustomobject]@{
    command     = $pythonExe
    args        = @($accurateServer)
    env         = [pscustomobject]@{
        PYTHONNOUSERSITE     = "1"
        PYTHONUTF8           = "1"
        PYTHONIOENCODING     = "utf-8"
        AOL_ACCESS_TOKEN     = $aolAccessToken
        AOL_SIGNATURE_SECRET = $aolSignatureSecret
        AOL_DATABASE_ID      = $aolDatabaseId
        AOL_BASE_URL         = $aolApiBaseUrl
    }
    description = "Accurate Online read-only MCP: search records, fetch lists, batch details, and summarize business amounts with verified filters."
}

$officeWord = [pscustomobject]@{
    command     = $pythonExe
    args        = @($officeWordServer)
    env         = [pscustomobject]@{
        PYTHONNOUSERSITE = "1"
        PYTHONUTF8       = "1"
        PYTHONIOENCODING = "utf-8"
        PYTHONPATH       = $officeWordSitePackages
        MCP_TRANSPORT    = "stdio"
        FASTMCP_LOG_LEVEL = "WARNING"
    }
    description = "Office-Word MCP (GongRzhe): create, read, format, and manipulate .docx documents via python-docx."
}

$excelFile = [pscustomobject]@{
    command     = $pythonExe
    args        = @($excelFileServer)
    env         = [pscustomobject]@{
        PYTHONNOUSERSITE = "1"
        PYTHONUTF8       = "1"
        PYTHONIOENCODING = "utf-8"
        PYTHONPATH       = $excelFileSitePackages
        FASTMCP_LOG_LEVEL = "WARNING"
    }
    description = "Excel file MCP (haris-musa/excel-mcp-server): create, edit, chart .xlsx without Microsoft Excel."
}

Set-JsonProperty -Object $settings.mcpServers -Name "exa" -Value $exa
Set-JsonProperty -Object $settings.mcpServers -Name "excel-mcp" -Value $excel
Set-JsonProperty -Object $settings.mcpServers -Name "quotation" -Value $quotation
Set-JsonProperty -Object $settings.mcpServers -Name "price-library" -Value $priceLibrary
Set-JsonProperty -Object $settings.mcpServers -Name "accurate" -Value $accurate
Set-JsonProperty -Object $settings.mcpServers -Name "office-word" -Value $officeWord
Set-JsonProperty -Object $settings.mcpServers -Name "excel" -Value $excelFile

# Python main.py loads vendor/wanding/.env.accurate (override=True) when MCP env omits AOL_*.
$envAccuratePath = Join-Path $wandingRoot ".env.accurate"
$envAccurateBody = @(
    "AOL_ACCESS_TOKEN=$aolAccessToken"
    "AOL_DATABASE_ID=$aolDatabaseId"
    "AOL_SIGNATURE_SECRET=$aolSignatureSecret"
    "AOL_API_BASE_URL=$aolApiBaseUrl"
) -join "`n"
# UTF-8 without BOM — BOM breaks python-dotenv key names (\ufeffAOL_ACCESS_TOKEN).
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($envAccuratePath, $envAccurateBody, $utf8NoBom)

if (-not $settings.PSObject.Properties["theme"] -or $settings.theme -eq "light") {
    Set-JsonProperty -Object $settings -Name "theme" -Value "dark"
}
if (-not $settings.PSObject.Properties["modelType"]) {
    Set-JsonProperty -Object $settings -Name "modelType" -Value "anthropic"
}

$settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $settingsPath -Encoding UTF8

$mcpConfig = [pscustomobject]@{
    mcpServers = [pscustomobject]@{
        exa = $exa
        "excel-mcp" = $excel
        quotation = $quotation
        "price-library" = $priceLibrary
        accurate = $accurate
        "office-word" = $officeWord
        excel = $excelFile
    }
}
$mcpConfig | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $mcpConfigPath -Encoding UTF8
Ensure-ClaudeState -Path $statePath -InstallDir $InstallDir

$toolingStart = "<!-- CCB-WANDING-TOOLING:START -->"
$toolingEnd = "<!-- CCB-WANDING-TOOLING:END -->"
if (
    (Test-Path -LiteralPath $wandingClaudeIndex) -and
    (Test-Path -LiteralPath $wandingClaudeQuotation) -and
    (Test-Path -LiteralPath $wandingClaudeAccurate)
) {
    $indexText = Get-Content -Raw -LiteralPath $wandingClaudeIndex -Encoding UTF8
    $knowledgeLine = ""
    if (Test-Path -LiteralPath $wandingKnowledge) {
        $knowledgeLine = "- Business knowledge (quotation-agent on-demand Read): $InstallDir\vendor\wanding\data\wanding_business_knowledge.md"
    }
    $referenceLines = @(
        $indexText.TrimEnd(),
        "",
        "---",
        "",
        "# CCB-Wanding Reference Files",
        "",
        "Only this index is injected into the default CLAUDE.md context. Quotation/accurate workflow SOP is inlined in specialist agent prompts (`agents/quotation-agent.md`, `agents/accurate-agent.md`); do not per-turn Read the handbook files below. They remain maint sources — sync agent prompts after edits:",
        "",
        "- Quotation, inventory, and Excel quotation sheet rules (maint): $InstallDir\vendor\wanding\data\ccb-wanding-quotation.md",
        "- Accurate business analysis rules (maint): $InstallDir\vendor\wanding\data\ccb-wanding-accurate.md"
    )
    if ($knowledgeLine) {
        $referenceLines += $knowledgeLine
    }
    $referenceLines += "- Data contract and source-field maintenance notes: $InstallDir\vendor\wanding\data\data.Md"
    $toolingBody = ($referenceLines -join "`r`n")
}
elseif (Test-Path -LiteralPath $wandingClaudeDraft) {
    $toolingBody = Get-Content -Raw -LiteralPath $wandingClaudeDraft -Encoding UTF8
}
else {
    $toolingBody = @'
# CCB-Wanding tool calling policy

Default Guid sessions use **wande-orchestrator**: route by intent and **delegate** with the Agent tool (`quotation-agent`, `accurate-agent`, office agents). Do **not** call quotation/accurate MCP or Read business SOP files in the orchestrator session.

Specialist sessions (`quotation-agent`, `accurate-agent`) call their MCP directly after delegation.

Never call any tool with empty params. Default `customer_level` is `B` unless the user specifies another price level.
'@
}
Set-MarkedSection -Path $claudePath -StartMarker $toolingStart -EndMarker $toolingEnd -Body $toolingBody
Remove-MarkedSection -Path $claudePath -StartMarker "<!-- CCB-WANDING-QUOTATION:START -->" -EndMarker "<!-- CCB-WANDING-QUOTATION:END -->"
Remove-MarkedSection -Path $claudePath -StartMarker "<!-- CCB-WANDING-ACCURATE:START -->" -EndMarker "<!-- CCB-WANDING-ACCURATE:END -->"
Remove-MarkedSection -Path $claudePath -StartMarker "<!-- CCB-WANDING-KNOWLEDGE:START -->" -EndMarker "<!-- CCB-WANDING-KNOWLEDGE:END -->"
