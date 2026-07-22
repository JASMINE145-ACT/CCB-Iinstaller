# List every CCB-Wanding program install directory on this PC.
# Employee-facing: run via ccb-list-installs.cmd (double-click).
#
# Usage:
#   .\scripts\find-wanding-installs.ps1
#   .\scripts\find-wanding-installs.ps1 -InvokerInstallDir "E:\CCB-Wanding"
#   .\scripts\find-wanding-installs.ps1 -FullScan

[CmdletBinding()]
param(
    [string]$InvokerInstallDir = '',
    [switch]$FullScan,
    [string]$LogFile = ''
)

$ErrorActionPreference = 'Continue'

$MarkerName = '.ccb-wanding-install-root'
$ConfigDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'

$OrphanFootprints = @(
    'dist\cli.js',
    'ccb-launch-aionui.cmd',
    'ccb-wanding.cmd',
    'AionUi\AionUi.exe',
    'vendor\bun\bun.exe',
    'scripts\run-wanding-bootstrap.ps1',
    'uninstall.exe'
)

$LauncherNames = @(
    'ccb-launch-aionui.cmd',
    'ccb-check-install.cmd',
    'ccb-list-installs.cmd',
    'AionUiLauncher.exe',
    'ccb-wanding.cmd'
)

function Write-ListLine {
    param([string]$Message)
    if ($LogFile) {
        Add-Content -LiteralPath $LogFile -Value $Message -Encoding UTF8
    }
    Write-Host $Message
}

function Normalize-InstallDir {
    param([string]$Path)
    if (-not $Path) { return $null }
    try {
        $p = [System.IO.Path]::GetFullPath($Path.Trim().Trim('"'))
    }
    catch {
        return $null
    }
    if (-not (Test-Path -LiteralPath $p)) { return $p }
    if ((Split-Path -Leaf $p) -ieq 'AionUi') {
        return (Split-Path -Parent $p)
    }
    return $p
}

function Get-InstallDirState {
    param([string]$Root)
    if (-not $Root) { return 'invalid' }
    if (-not (Test-Path -LiteralPath $Root)) { return 'missing' }
    $hasMarker = Test-Path -LiteralPath (Join-Path $Root $MarkerName)
    $hasAny = @(Get-ChildItem -LiteralPath $Root -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notin '.', '..' }).Count -gt 0
    if (-not $hasAny) { return 'empty' }
    if ($hasMarker) { return 'marked' }
    foreach ($rel in $OrphanFootprints) {
        if (Test-Path -LiteralPath (Join-Path $Root $rel)) { return 'orphan' }
    }
    return 'foreign'
}

function Get-InstallSummary {
    param([string]$Root)
    $state = Get-InstallDirState -Root $Root
    $version = ''
    $verPath = Join-Path $Root 'dist\VERSION'
    if (Test-Path -LiteralPath $verPath) {
        $version = (Get-Content -LiteralPath $verPath -Raw -ErrorAction SilentlyContinue).Trim()
    }
    $markerVersion = ''
    $markerPath = Join-Path $Root $MarkerName
    if (Test-Path -LiteralPath $markerPath) {
        $markerVersion = (Get-Content -LiteralPath $markerPath -Raw -ErrorAction SilentlyContinue).Trim()
    }
    $aioncoreLen = $null
    $acPath = Join-Path $Root 'AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe'
    if (Test-Path -LiteralPath $acPath) {
        $aioncoreLen = (Get-Item -LiteralPath $acPath).Length
    }
    [pscustomobject]@{
        Path          = $Root
        State         = $state
        Version       = $version
        MarkerVersion = $markerVersion
        AioncoreBytes = $aioncoreLen
    }
}

function Test-IsInstallCandidate {
    param([string]$Root)
    if (-not $Root) { return $false }
    $state = Get-InstallDirState -Root $Root
    if ($state -in @('marked', 'orphan')) { return $true }
    if (Test-Path -LiteralPath (Join-Path $Root 'dist\cli.js')) { return $true }
    if (Test-Path -LiteralPath (Join-Path $Root 'ccb-launch-aionui.cmd')) { return $true }
    return $false
}

function Add-Candidate {
    param(
        [hashtable]$Bag,
        [string]$Path,
        [string]$Source
    )
    $norm = Normalize-InstallDir -Path $Path
    if (-not $norm) { return }
    if (-not (Test-IsInstallCandidate -Root $norm)) { return }
    $key = $norm.ToLowerInvariant()
    if (-not $Bag.ContainsKey($key)) {
        $Bag[$key] = [ordered]@{
            Path    = $norm
            Sources = [System.Collections.Generic.List[string]]::new()
        }
    }
    if ($Bag[$key].Sources -notcontains $Source) {
        $Bag[$key].Sources.Add($Source) | Out-Null
    }
}

function Get-RegistryInstallDir {
    try {
        $key = Get-ItemProperty -Path 'HKCU:\Software\CCB-Wanding\CCB-Wanding' -ErrorAction Stop
        return $key.InstallDir
    }
    catch {
        return $null
    }
}

function Get-ShortcutInstallDirs {
    $roots = @(
        [Environment]::GetFolderPath('Desktop'),
        [Environment]::GetFolderPath('CommonDesktopDirectory'),
        (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu'),
        (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu')
    ) | Select-Object -Unique

    $found = @()
    foreach ($root in $roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        Get-ChildItem -LiteralPath $root -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $shell = New-Object -ComObject WScript.Shell
                $link = $shell.CreateShortcut($_.FullName)
                $target = $link.TargetPath
                $work = $link.WorkingDirectory
                $hit = $false
                foreach ($name in $LauncherNames) {
                    if ($target -like "*$name") { $hit = $true; break }
                }
                if (-not $hit) { return }
                $dir = $work
                if (-not $dir) { $dir = Split-Path -Parent $target }
                if ($dir) {
                    $found += [pscustomobject]@{
                        InstallDir = (Normalize-InstallDir -Path $dir)
                        Shortcut   = $_.FullName
                        Target     = $target
                    }
                }
            }
            catch { }
        }
    }
    return $found
}

function Get-KnownCandidatePaths {
    $list = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'),
        'C:\CCB-Wanding',
        'D:\CCB-Wanding',
        'E:\CCB-Wanding',
        'F:\CCB-Wanding'
    )
    if ($InvokerInstallDir) {
        $list = @($InvokerInstallDir) + $list
    }
    return $list | Select-Object -Unique
}

function Get-DriveScanInstallDirs {
    $dirs = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue |
        Where-Object { $_.Free -ge 0 } |
        ForEach-Object {
            $driveRoot = "$($_.Name):\"
            if (-not (Test-Path -LiteralPath $driveRoot)) { return }
            Write-ListLine "Scanning $driveRoot for ccb-launch-aionui.cmd ..."
            Get-ChildItem -Path $driveRoot -Filter 'ccb-launch-aionui.cmd' -Recurse -ErrorAction SilentlyContinue |
                ForEach-Object {
                    $null = $dirs.Add((Normalize-InstallDir -Path $_.DirectoryName))
                }
        }
    return @($dirs)
}

if (-not $LogFile) {
    $logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
    $null = New-Item -ItemType Directory -Force -Path $logDir -ErrorAction SilentlyContinue
    $LogFile = Join-Path $logDir "list-installs-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
}

Set-Content -LiteralPath $LogFile -Value "=== CCB-Wanding list installs $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8

# --- main ---

$bag = @{}
$invoker = Normalize-InstallDir -Path $InvokerInstallDir
if ($invoker) { Add-Candidate -Bag $bag -Path $invoker -Source 'This launcher' }

$reg = Get-RegistryInstallDir
if ($reg) { Add-Candidate -Bag $bag -Path $reg -Source 'Registry (last NSIS install)' }

foreach ($p in (Get-KnownCandidatePaths)) {
    if (Test-Path -LiteralPath $p) {
        Add-Candidate -Bag $bag -Path $p -Source 'Known path'
    }
}

foreach ($sc in (Get-ShortcutInstallDirs)) {
    if ($sc.InstallDir) {
        Add-Candidate -Bag $bag -Path $sc.InstallDir -Source "Shortcut: $($sc.Shortcut)"
    }
}

if ($FullScan) {
    foreach ($p in (Get-DriveScanInstallDirs)) {
        Add-Candidate -Bag $bag -Path $p -Source 'Drive scan'
    }
}

$configGen = ''
$genPath = Join-Path $ConfigDir '.config-generation.json'
if (Test-Path -LiteralPath $genPath) {
    try {
        $genObj = Get-Content -LiteralPath $genPath -Raw | ConvertFrom-Json
        $configGen = if ($genObj.config_generation) { "$($genObj.config_generation)" } else { "$($genObj.generation)" }
    }
    catch { $configGen = '(parse error)' }
}

Write-ListLine ''
Write-ListLine '========================================'
Write-ListLine ' CCB-Wanding install locations on this PC'
Write-ListLine " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-ListLine '========================================'
Write-ListLine ''
Write-ListLine "User config (shared by all copies): $ConfigDir"
if ($configGen) { Write-ListLine "  config_generation: $configGen" }
Write-ListLine ''
Write-ListLine 'Program copies found:'
Write-ListLine ''

$rows = @()
foreach ($entry in $bag.Values) {
    $summary = Get-InstallSummary -Root $entry.Path
    $rows += [pscustomobject]@{
        Path          = $summary.Path
        State         = $summary.State
        Version       = if ($summary.Version) { $summary.Version } else { '-' }
        Marker        = if ($summary.MarkerVersion) { ($summary.MarkerVersion -split "`n")[0] } else { '-' }
        AioncoreBytes = if ($null -ne $summary.AioncoreBytes) { $summary.AioncoreBytes } else { '-' }
        Sources       = ($entry.Sources -join '; ')
        Active        = ($invoker -and ($summary.Path -ieq $invoker))
    }
}

if ($rows.Count -eq 0) {
    Write-ListLine '  (none found — try -FullScan or reinstall)'
    Write-ListLine ''
    Write-ListLine 'Tip: run Full scan from PowerShell:'
    Write-ListLine '  find-wanding-installs.ps1 -FullScan'
}
else {
    $rows = $rows | Sort-Object -Property @{ Expression = { -not $_.Active } }, Path
    $i = 0
    foreach ($r in $rows) {
        $i++
        $tag = if ($r.Active) { ' << YOU OPENED THIS COPY' } else { '' }
        Write-ListLine "[$i] $($r.Path)$tag"
        Write-ListLine "    state: $($r.State)   dist/VERSION: $($r.Version)   marker: $($r.Marker)"
        if ($r.AioncoreBytes -ne '-') {
            Write-ListLine "    aioncore.exe bytes: $($r.AioncoreBytes)"
        }
        Write-ListLine "    found via: $($r.Sources)"
        Write-ListLine ''
    }

    if ($rows.Count -gt 1) {
        Write-ListLine '----------------------------------------'
        Write-ListLine 'Multiple program copies detected.'
        Write-ListLine 'Use ONLY shortcuts from the copy you want (see tag above).'
        Write-ListLine 'Upgrade must reinstall to the SAME folder, not a new drive.'
        Write-ListLine 'To detect + safely delete NON-primary copies (keeps Programs / registry install):'
        Write-ListLine '  double-click ccb-purge-stale-installs.cmd'
        Write-ListLine '  (or: scripts\purge-stale-wanding-installs.ps1 — dry-run; add -Apply to delete)'
        Write-ListLine 'User config is never deleted: %LOCALAPPDATA%\CCB-Wanding\.claude'
        Write-ListLine 'Send this log to IT if unsure which copy to keep.'
        Write-ListLine '----------------------------------------'
    }
    elseif ($reg -and $invoker -and ($reg.ToLowerInvariant() -ne $invoker.ToLowerInvariant())) {
        Write-ListLine '----------------------------------------'
        Write-ListLine "Registry points to: $reg"
        Write-ListLine "This launcher is:   $invoker"
        Write-ListLine 'They differ — you may be using a non-default install path.'
        Write-ListLine '----------------------------------------'
    }
}

Write-ListLine ''
Write-ListLine "Log saved: $LogFile"
Write-ListLine ''

if ($rows.Count -gt 1) { exit 2 }
if ($rows.Count -eq 0) { exit 1 }
exit 0
