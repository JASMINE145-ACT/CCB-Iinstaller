# Detect CCB-Wanding program trees outside the keep (overlay) install, then
# safely remove only known owned footprints. Never deletes user config
# (%LOCALAPPDATA%\CCB-Wanding\.claude).
#
# Spec / task: .trellis/tasks/07-15-install-1-1-9-residue-continuity
#   WANd.INSTALL.STALE_PURGE.001
#
# Usage:
#   .\purge-stale-wanding-installs.ps1                          # dry-run (default)
#   .\purge-stale-wanding-installs.ps1 -Apply                   # delete after confirm
#   .\purge-stale-wanding-installs.ps1 -Apply -Force            # no prompt
#   .\purge-stale-wanding-installs.ps1 -KeepInstallDir "..." -FullScan -Apply
#   .\purge-stale-wanding-installs.ps1 -InvokerInstallDir "..." # tip from cmd wrapper

[CmdletBinding()]
param(
    [string]$KeepInstallDir = '',
    [string]$InvokerInstallDir = '',
    [switch]$Apply,
    [switch]$Force,
    [switch]$FullScan,
    [switch]$SkipShortcuts,
    [switch]$SkipProcessStop,
    [switch]$Quiet,
    [string]$LogFile = '',
    [string]$ReportFile = '',
    [string[]]$ExtraCandidatePaths = @()
)

$ErrorActionPreference = 'Stop'

$MarkerName = '.ccb-wanding-install-root'
$ConfigDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
$DefaultPrograms = Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'

$OrphanFootprints = @(
    'dist\cli.js',
    'dist\VERSION',
    'ccb-launch-aionui.cmd',
    'ccb-wanding.cmd',
    'AionUi\AionUi.exe',
    'vendor\bun\bun.exe',
    'scripts\run-wanding-bootstrap.ps1',
    'uninstall.exe'
)

$OwnedTopFiles = @(
    'ccb.ico',
    'ccb-wanding.cmd',
    'ccb-diagnose.cmd',
    'ccb-launch-aionui.cmd',
    'ccb-wanding-versions.cmd',
    'ccb-check-install.cmd',
    'ccb-list-installs.cmd',
    'ccb-purge-stale-installs.cmd',
    'ccb-verify-update.cmd',
    'install-health-manifest.json',
    'AionUiLauncher.exe',
    'uninstall.exe',
    $MarkerName
)

$OwnedDirs = @(
    'AionUi',
    'dist',
    'vendor',
    'scripts',
    'seed',
    'bin',
    'lib'
)

$LauncherNames = @(
    'ccb-launch-aionui.cmd',
    'ccb-check-install.cmd',
    'ccb-list-installs.cmd',
    'ccb-purge-stale-installs.cmd',
    'AionUiLauncher.exe',
    'ccb-wanding.cmd'
)

function Write-PurgeLine {
    param([string]$Level, [string]$Message)
    $line = if ($Level) { "$Level $Message" } else { $Message }
    if ($LogFile) {
        Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
    }
    if (-not $Quiet) { Write-Host $line }
}

function Normalize-InstallDir {
    param([string]$Path)
    if (-not $Path) { return $null }
    try {
        $p = [System.IO.Path]::GetFullPath($Path.Trim().Trim('"'))
    }
    catch { return $null }
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

# Rel paths that still mean "program install" after purge (must all be gone).
function Get-RemainingProgramFootprints {
    param([string]$Root)
    $left = [System.Collections.Generic.List[string]]::new()
    if (-not $Root) { return @() }
    foreach ($rel in $OrphanFootprints) {
        if (Test-Path -LiteralPath (Join-Path $Root $rel)) {
            $left.Add($rel) | Out-Null
        }
    }
    if (Test-Path -LiteralPath (Join-Path $Root $MarkerName)) {
        $left.Add($MarkerName) | Out-Null
    }
    return @($left)
}

function Test-IsInstallCandidate {
    param([string]$Root)
    if (-not $Root) { return $false }
    $state = Get-InstallDirState -Root $Root
    if ($state -in @('marked', 'orphan')) { return $true }
    if (Test-Path -LiteralPath (Join-Path $Root 'dist\cli.js')) { return $true }
    if (Test-Path -LiteralPath (Join-Path $Root 'dist\VERSION')) { return $true }
    if (Test-Path -LiteralPath (Join-Path $Root 'ccb-launch-aionui.cmd')) { return $true }
    return $false
}

function Get-InstallVersion {
    param([string]$Root)
    $verPath = Join-Path $Root 'dist\VERSION'
    if (Test-Path -LiteralPath $verPath) {
        return (Get-Content -LiteralPath $verPath -Raw -ErrorAction SilentlyContinue).Trim()
    }
    return ''
}

function Get-RegistryInstallDir {
    try {
        $key = Get-ItemProperty -Path 'HKCU:\Software\CCB-Wanding\CCB-Wanding' -ErrorAction Stop
        return (Normalize-InstallDir -Path $key.InstallDir)
    }
    catch { return $null }
}

function Resolve-KeepInstallDir {
    # Explicit -KeepInstallDir always wins (NSIS passes future $INSTDIR before marker exists).
    # Employee .cmd must NOT pass -KeepInstallDir — see ccb-purge-stale-installs.cmd.
    if ($KeepInstallDir) {
        $k = Normalize-InstallDir -Path $KeepInstallDir
        if ($k) { return $k }
    }
    $reg = Get-RegistryInstallDir
    if ($reg -and (Test-IsInstallCandidate -Root $reg)) { return $reg }
    if (Test-IsInstallCandidate -Root $DefaultPrograms) {
        return (Normalize-InstallDir -Path $DefaultPrograms)
    }
    $inv = Normalize-InstallDir -Path $InvokerInstallDir
    if ($inv -and (Test-IsInstallCandidate -Root $inv)) { return $inv }
    return $null
}

function Add-Candidate {
    param([hashtable]$Bag, [string]$Path, [string]$Source)
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

function Get-KnownCandidatePaths {
    $list = @(
        $DefaultPrograms,
        (Join-Path $env:LOCALAPPDATA 'CCB-Wanding'),  # program mistyped next to .claude
        'C:\CCB-Wanding',
        'D:\CCB-Wanding',
        'E:\CCB-Wanding',
        'F:\CCB-Wanding'
    )
    if ($InvokerInstallDir) { $list = @($InvokerInstallDir) + $list }
    if ($KeepInstallDir) { $list = @($KeepInstallDir) + $list }
    return $list | Select-Object -Unique
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
                if ($dir) { $found += (Normalize-InstallDir -Path $dir) }
            }
            catch { }
        }
    }
    return @($found | Where-Object { $_ } | Select-Object -Unique)
}

function Get-DriveScanInstallDirs {
    $dirs = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue |
        Where-Object { $_.Free -ge 0 } |
        ForEach-Object {
            $driveRoot = "$($_.Name):\"
            if (-not (Test-Path -LiteralPath $driveRoot)) { return }
            Write-PurgeLine 'SCAN' $driveRoot
            Get-ChildItem -Path $driveRoot -Filter 'ccb-launch-aionui.cmd' -Recurse -ErrorAction SilentlyContinue |
                ForEach-Object {
                    $null = $dirs.Add((Normalize-InstallDir -Path $_.DirectoryName))
                }
        }
    return @($dirs)
}

function Test-IsProtectedPath {
    param(
        [string]$Root,
        [string]$Keep,
        [string]$RegistryKeep,
        [switch]$ExplicitKeep
    )
    if (-not $Root) { return $true }
    $n = $Root.TrimEnd('\')
    if ($Keep -and ($n -ieq $Keep.TrimEnd('\'))) { return $true }
    # When NSIS/IT passed -KeepInstallDir, that path is the sole keep shield
    # for program trees (registry may still point at a stale D:\ copy).
    if (-not $ExplicitKeep) {
        if ($RegistryKeep -and ($n -ieq $RegistryKeep.TrimEnd('\'))) { return $true }
    }
    if ($n -ieq $ConfigDir.TrimEnd('\')) { return $true }
    # Owned footprints under LOCALAPPDATA\CCB-Wanding (dist/vendor) may purge;
    # .claude is never in owned lists.
    return $false
}

function Remove-OwnedInstallTree {
    param([string]$Root, [switch]$DryRun)
    # Stop AionUI/electron only — avoid global `bun` kill (dev machines).
    if (-not $SkipProcessStop) {
        Get-Process -Name electron, aioncore, AionUi -ErrorAction SilentlyContinue |
            Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    foreach ($name in $OwnedTopFiles) {
        $path = Join-Path $Root $name
        if (Test-Path -LiteralPath $path) {
            if ($DryRun) {
                Write-PurgeLine 'WHATIF' "delete $path"
            }
            else {
                Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                if (Test-Path -LiteralPath $path) {
                    Write-PurgeLine 'WARN' "still present after delete (locked/AV?): $path"
                }
                else {
                    Write-PurgeLine 'DEL' $name
                }
            }
        }
    }
    foreach ($name in $OwnedDirs) {
        $path = Join-Path $Root $name
        if (Test-Path -LiteralPath $path) {
            if ($DryRun) {
                Write-PurgeLine 'WHATIF' "rmdir $name\"
            }
            else {
                Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                if (Test-Path -LiteralPath $path) {
                    Write-PurgeLine 'WARN' "still present after delete (locked/AV?): $path"
                }
                else {
                    Write-PurgeLine 'DEL' "$name\"
                }
            }
        }
    }
}

# --- main ---

if (-not $LogFile) {
    $logDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\logs'
    $null = New-Item -ItemType Directory -Force -Path $logDir -ErrorAction SilentlyContinue
    $LogFile = Join-Path $logDir "purge-stale-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
}

Set-Content -LiteralPath $LogFile -Value "=== CCB-Wanding purge stale $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8

$regKeep = Get-RegistryInstallDir
$keep = Resolve-KeepInstallDir
$bag = @{}

if ($keep) { Add-Candidate -Bag $bag -Path $keep -Source 'Keep (primary)' }
if ($regKeep) { Add-Candidate -Bag $bag -Path $regKeep -Source 'Registry' }
foreach ($p in (Get-KnownCandidatePaths)) {
    if (Test-Path -LiteralPath $p) { Add-Candidate -Bag $bag -Path $p -Source 'Known path' }
}
foreach ($p in $ExtraCandidatePaths) {
    if ($p -and (Test-Path -LiteralPath $p)) {
        Add-Candidate -Bag $bag -Path $p -Source 'Extra candidate'
    }
}
if (-not $SkipShortcuts) {
    foreach ($p in (Get-ShortcutInstallDirs)) {
        Add-Candidate -Bag $bag -Path $p -Source 'Shortcut'
    }
}
if ($FullScan) {
    foreach ($p in (Get-DriveScanInstallDirs)) {
        Add-Candidate -Bag $bag -Path $p -Source 'Drive scan'
    }
}

Write-PurgeLine '' '========================================'
Write-PurgeLine '' ' CCB-Wanding stale install purge'
Write-PurgeLine '' " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-PurgeLine '' '========================================'
Write-PurgeLine '' ''
Write-PurgeLine 'INFO' ("User config NEVER deleted: $ConfigDir")
if ($keep) {
    Write-PurgeLine 'KEEP' $keep
    $keepVer = Get-InstallVersion -Root $keep
    if ($keepVer) { Write-PurgeLine 'KEEP' "dist/VERSION=$keepVer" }
}
else {
    Write-PurgeLine 'WARN' 'No keep install resolved (registry / Programs / invoker). Refusing purge.'
    Write-PurgeLine 'INFO' "Log: $LogFile"
    exit 3
}

$explicitKeep = [bool]$KeepInstallDir
$stale = @()
foreach ($entry in $bag.Values) {
    $path = $entry.Path
    if (Test-IsProtectedPath -Root $path -Keep $keep -RegistryKeep $regKeep -ExplicitKeep:$explicitKeep) {
        continue
    }
    $state = Get-InstallDirState -Root $path
    if ($state -eq 'foreign') { continue }
    $ver = Get-InstallVersion -Root $path
    $stale += [pscustomobject]@{
        Path    = $path
        State   = $state
        Version = if ($ver) { $ver } else { '(no dist/VERSION)' }
        Sources = ($entry.Sources -join '; ')
    }
}

Write-PurgeLine '' ''
if ($stale.Count -eq 0) {
    Write-PurgeLine 'OK' 'No other install trees with VERSION / launcher footprints.'
    Write-PurgeLine 'INFO' "Log: $LogFile"
    exit 0
}

Write-PurgeLine 'WARN' "Found $($stale.Count) non-keep install tree(s):"
$i = 0
$reportLines = New-Object System.Collections.Generic.List[string]
foreach ($s in $stale) {
    $i++
    Write-PurgeLine '' "[$i] $($s.Path)"
    Write-PurgeLine '' "    state=$($s.State)  version=$($s.Version)"
    Write-PurgeLine '' "    via: $($s.Sources)"
    $reportLines.Add("$($s.Path)  [v=$($s.Version)]") | Out-Null
}

if ($ReportFile) {
    $reportDir = Split-Path -Parent $ReportFile
    if ($reportDir) {
        $null = New-Item -ItemType Directory -Force -Path $reportDir -ErrorAction SilentlyContinue
    }
    $header = @(
        "CCB-Wanding stale installs (keep=$keep)",
        "count=$($stale.Count)",
        '---'
    ) + $reportLines
    # UTF-16 LE for NSIS FileRead / MessageBox helpers
    Set-Content -LiteralPath $ReportFile -Value ($header -join "`r`n") -Encoding Unicode
}

$dry = -not $Apply
if ($dry) {
    Write-PurgeLine '' ''
    Write-PurgeLine 'INFO' 'Dry-run only (default). Re-run with -Apply to delete owned footprints.'
    Write-PurgeLine 'INFO' 'Example: .\purge-stale-wanding-installs.ps1 -Apply'
    foreach ($s in $stale) {
        Write-PurgeLine 'PLAN' "would purge owned tree under $($s.Path)"
        Remove-OwnedInstallTree -Root $s.Path -DryRun
    }
    Write-PurgeLine 'INFO' "Log: $LogFile"
    exit 2
}

if (-not $Force) {
    Write-PurgeLine '' ''
    Write-PurgeLine 'ASK' 'Type YES to purge the trees listed above (Keep path untouched):'
    $answer = Read-Host
    if ($answer -ne 'YES') {
        Write-PurgeLine 'OK' 'Aborted — nothing deleted.'
        exit 4
    }
}

$failed = @()
foreach ($s in $stale) {
    Write-PurgeLine 'PURGE' $s.Path
    try {
        Remove-OwnedInstallTree -Root $s.Path
        $after = Get-InstallDirState -Root $s.Path
        # Full OrphanFootprints + marker — not only dist\cli.js (AV may leave AionUi.exe / bun.exe).
        # LOCALAPPDATA\CCB-Wanding may still have .claude → OK when no program footprints remain.
        $remaining = @(Get-RemainingProgramFootprints -Root $s.Path)
        if ($remaining.Count -gt 0) {
            foreach ($rel in $remaining) {
                Write-PurgeLine 'WARN' "residual after purge: $($s.Path)\$rel"
            }
            $failed += "$($s.Path) (state=$after residual=$($remaining -join ','))"
        }
        else {
            Write-PurgeLine 'OK' "cleared program footprints: $($s.Path)"
        }
    }
    catch {
        $failed += "$($s.Path): $($_.Exception.Message)"
    }
}

Write-PurgeLine '' ''
Write-PurgeLine 'INFO' "Keep unchanged: $keep"
Write-PurgeLine 'INFO' "Config unchanged: $ConfigDir"
Write-PurgeLine 'INFO' "Log: $LogFile"

if ($failed.Count -gt 0) {
    Write-PurgeLine 'ERR' 'Some purges incomplete:'
    foreach ($f in $failed) { Write-PurgeLine 'ERR' $f }
    exit 1
}

Write-PurgeLine 'OK' 'Stale install trees purged. Prefer start-menu shortcuts from Keep path.'
exit 0
