#!/usr/bin/env pwsh
# launch-ccb.ps1 - UTF-8 PowerShell launcher for the main CCB Windows Terminal path.
# Keep this file ASCII-only. User-facing Chinese text belongs in dist/settings,
# not in this launcher.

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PassThruArgs
)

$ErrorActionPreference = "Stop"

try {
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
} catch {
}

# Ink TUI reads console code page; PowerShell OutputEncoding alone is not enough on zh-CN Windows.
cmd /c "chcp 65001 >nul"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Split-Path -Parent $scriptDir
$configDir = Join-Path $env:LOCALAPPDATA "CCB\.claude"
$logDir = Join-Path $env:LOCALAPPDATA "CCB\logs"
$bun = Join-Path $installDir "vendor\bun\bun.exe"
$cli = Join-Path $installDir "dist\cli.js"
$bundledBash = Join-Path $installDir "vendor\git\bin\bash.exe"
$ensureMcp = Join-Path $installDir "scripts\ensure-mcp-settings.ps1"
$runtimeMcp = Join-Path $installDir "ccb-mcp.json"

New-Item -ItemType Directory -Force -Path $configDir, $logDir | Out-Null
$launchLog = Join-Path $logDir ("launcher-ps-{0}-{1}.log" -f (Get-Random), (Get-Random))
$debugLog = Join-Path $logDir ("debug-ps-{0}-{1}.log" -f (Get-Random), (Get-Random))

function Write-LaunchLog {
    param([string]$Message)
    try {
        Add-Content -LiteralPath $launchLog -Encoding utf8 -Value $Message
    } catch {
    }
}

$env:LANG = "zh_CN.UTF-8"
$env:LC_ALL = "zh_CN.UTF-8"
$env:LC_CTYPE = "zh_CN.UTF-8"
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$env:CLAUDE_CONFIG_DIR = $configDir
$env:PATH = "$installDir\vendor\bun;$installDir\vendor\ripgrep;$installDir\vendor\git\bin;$installDir\vendor\git\mingw64\bin;$installDir\vendor\git\usr\bin;$env:PATH"

function Test-GitBash {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    & $Path --noprofile --norc -c "git --version" *> $null
    return $LASTEXITCODE -eq 0
}

if (Test-GitBash $bundledBash) {
    $env:CLAUDE_CODE_GIT_BASH_PATH = $bundledBash
} elseif (Test-GitBash (Join-Path $env:ProgramFiles "Git\bin\bash.exe")) {
    $env:CLAUDE_CODE_GIT_BASH_PATH = Join-Path $env:ProgramFiles "Git\bin\bash.exe"
} elseif (Test-GitBash (Join-Path $env:LOCALAPPDATA "Programs\Git\bin\bash.exe")) {
    $env:CLAUDE_CODE_GIT_BASH_PATH = Join-Path $env:LOCALAPPDATA "Programs\Git\bin\bash.exe"
} else {
    throw "Git Bash was not found or could not run. Reinstall CCB or restore vendor\git."
}

if ($env:WT_SESSION -and $env:TERM_PROGRAM -eq "vscode") {
    $env:TERM_PROGRAM = "WindowsTerminal"
}

Write-LaunchLog "[CCB] PowerShell launcher started."
Write-LaunchLog "[CCB] InstallDir=$installDir"
Write-LaunchLog "[CCB] ConfigDir=$configDir"
Write-LaunchLog "[CCB] WT_SESSION=$env:WT_SESSION"
Write-LaunchLog "[CCB] TERM_PROGRAM=$env:TERM_PROGRAM"
Write-LaunchLog "[CCB] DebugLog=$debugLog"
try {
    $codePage = (cmd /c chcp) -replace '\D', ''
    Write-LaunchLog "[CCB] ConsoleCodePage=$codePage"
} catch {
}

if (-not (Test-Path -LiteralPath $bun)) {
    throw "Missing Bun runtime: $bun"
}
if (-not (Test-Path -LiteralPath $cli)) {
    throw "Missing CCB entry: $cli"
}

if (Test-Path -LiteralPath $ensureMcp) {
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ensureMcp -InstallDir $installDir -ConfigDir $configDir | Out-Null
    } catch {
        Write-LaunchLog "[CCB] Warning: MCP defaults could not be updated. $($_.Exception.Message)"
    }
}

$settingsPath = Join-Path $configDir "settings.json"
if (Test-Path -LiteralPath $settingsPath) {
    try {
        $settings = Get-Content -Raw -LiteralPath $settingsPath | ConvertFrom-Json
        if ($settings.env) {
            foreach ($prop in $settings.env.PSObject.Properties) {
                [Environment]::SetEnvironmentVariable($prop.Name, [string]$prop.Value, "Process")
            }
        }
    } catch {
        Write-LaunchLog "[CCB] Warning: settings env could not be loaded. $($_.Exception.Message)"
    }
}

$env:CLAUDE_CODE_NO_FLICKER = "0"
if ($env:WT_SESSION) {
    $env:FORCE_CODE_TERMINAL = "1"
}
if ($env:TERM_PROGRAM -eq "vscode") {
    $env:FORCE_CODE_TERMINAL = "1"
}
if (-not $env:CCB_SAFE_MODE -and -not $env:CCB_FLAT_MODE) {
    $env:CLAUDE_CODE_DISABLE_MOUSE = "1"
    $env:CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = "1"
    $env:CLAUDE_CODE_DISABLE_TUI_RESIZE = "1"
}

& $bun --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Bun exists but cannot run."
}
& $bun $cli --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "CCB application files failed the startup check."
}

$argsList = @()
if (Test-Path -LiteralPath $runtimeMcp) {
    $argsList += @("--mcp-config", $runtimeMcp)
}
if ($env:CCB_DISABLE_DEBUG_LOG -ne "1") {
    $argsList += @("--debug-file", $debugLog)
}
if ($PassThruArgs) {
    $argsList += $PassThruArgs
}

Push-Location $installDir
try {
    & $bun $cli @argsList
    $exitCode = $LASTEXITCODE
    Write-LaunchLog "[CCB] ExitCode=$exitCode"
    exit $exitCode
} finally {
    Pop-Location
}
