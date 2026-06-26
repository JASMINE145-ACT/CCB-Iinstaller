# CCB-Wanding auto-update helper.
# UTF-8 with BOM -- Chinese strings require BOM in PowerShell 5.1.
#
# Modes:
#   -BackgroundCheck  Silent: fetch manifest, write available.json, no output.
#   -Select           Interactive catalog: show versions, user picks one to install.
#   -Update           Legacy foreground prompt (kept for compat, no longer used at launch).
#   -Apply            Legacy pending install (kept for compat).
#
# Environment:
#   CCB_UPDATE_MANIFEST_URL   Override manifest URL (testing / custom server).
#   CCB_NO_UPDATE=1           Disable all update activity.

[CmdletBinding()]
param(
    [switch]$BackgroundCheck,
    [switch]$AutoApplyHot,
    [switch]$Select,
    [switch]$Update,
    [switch]$Apply,
    [string]$ManifestUrl = "",
    [string]$AppName = "CCB-Wanding",
    [int]$TimeoutSec = 30
)

$ErrorActionPreference = "SilentlyContinue"

$UpdateDir     = Join-Path $env:LOCALAPPDATA "$AppName\updates"
$PendingFile   = Join-Path $UpdateDir "pending.json"
$AvailableFile = Join-Path $UpdateDir "available.json"
$RegPath       = "HKCU:\Software\$AppName\$AppName"

$builtInUrls = @{
    "CCB-Wanding" = "http://67.216.206.3/updates/manifest.json"
    "CCB"         = "http://67.216.206.3/updates/manifest.json"
}
$BuiltInUrl = if ($builtInUrls[$AppName]) { $builtInUrls[$AppName] } else { "" }
if (-not $ManifestUrl) {
    $ManifestUrl = if ($env:CCB_UPDATE_MANIFEST_URL) { $env:CCB_UPDATE_MANIFEST_URL } else { $BuiltInUrl }
}

New-Item -ItemType Directory -Force -Path $UpdateDir | Out-Null

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Get-InstalledVersion {
    (Get-ItemProperty -Path $RegPath -Name "Version" -ErrorAction SilentlyContinue).Version
}

function Is-Newer([string]$installed, [string]$candidate) {
    try { return ([System.Version]$candidate) -gt ([System.Version]$installed) }
    catch { return $false }
}

function Get-Manifest {
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Encoding = [System.Text.Encoding]::UTF8
        $json = $wc.DownloadString($ManifestUrl)
        return $json | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Test-IsUnifiedManifest($manifest) {
    return ($null -ne $manifest.schema_version) -and ([int]$manifest.schema_version -eq 1) -and ($null -ne $manifest.ccb)
}

function Convert-UnifiedToLegacyView($manifest) {
    $ccb = $manifest.ccb
    $ver = "$($ccb.version)".Trim()
    $notes = "$($ccb.release_notes)".Trim()
    $fullUrl = "$($ccb.full_installer.url)".Trim()
    $fullSha = "$($ccb.full_installer.sha256)".Trim()
    $hot = $ccb.hot_update
    return [PSCustomObject]@{
        latest          = $ver
        version         = $ver
        notes           = $notes
        url             = $fullUrl
        full_sha256     = $fullSha
        hot_update      = $hot
        unified         = $true
        versions        = @([PSCustomObject]@{
            version   = $ver
            url       = $fullUrl
            notes     = $notes
            full_sha256 = $fullSha
            hot_update  = $hot
        })
    }
}

function Get-CcbInstallDir {
    $registryInstall = ''
    try {
        $key = Get-ItemProperty -Path $RegPath -Name InstallDir -ErrorAction Stop
        $registryInstall = [string]$key.InstallDir
    } catch {
        $registryInstall = ''
    }
    foreach ($c in @(
        $env:CCB_WANDING_HOME,
        $env:CCB_INSTALL_DIR,
        $registryInstall,
        (Join-Path $env:LOCALAPPDATA 'Programs\CCB-Wanding'),
        'D:\CCB-Wanding'
    )) {
        if (-not $c) { continue }
        if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
    }
    return $null
}

function Write-AutoApplyLog([string]$Message) {
    $logDir = Join-Path $env:LOCALAPPDATA "$AppName\logs"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath (Join-Path $logDir 'update-auto.log') -Value $line -Encoding UTF8
}

function Test-ValidSha256Hex([string]$ExpectedHex) {
    $h = "$ExpectedHex".Trim().ToLowerInvariant()
    return ($h -match '^[a-f0-9]{64}$')
}

function Test-FileSha256([string]$Path, [string]$ExpectedHex) {
    if (-not (Test-ValidSha256Hex $ExpectedHex)) { return $false }
    $hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    return ($hash -eq $ExpectedHex.Trim().ToLowerInvariant())
}

$script:SupportedHotLayoutVersion = 1

function Test-HotUpdateEligible($hotUpdate, [string]$installed) {
    if (-not $hotUpdate) { return $false }
    if (-not (Get-CcbInstallDir)) { return $false }

    # requires_full_install flag: ops can force full NSIS for this release
    if ($hotUpdate.requires_full_install -eq $true) { return $false }

    # layout_version: zip structure changed beyond what current client can apply
    $layoutVer = $hotUpdate.layout_version
    if ($null -ne $layoutVer -and [int]$layoutVer -gt $script:SupportedHotLayoutVersion) { return $false }

    $min = "$($hotUpdate.min_from_version)".Trim()
    if (-not $min) { return $false }

    try {
        $v = [System.Version]$installed
        if ($v -lt [System.Version]$min) { return $false }

        # max_from_version: installed version is too new for this hot zip (breaking change ahead)
        $max = "$($hotUpdate.max_from_version)".Trim()
        if ($max -and $v -gt [System.Version]$max) { return $false }

        return $true
    } catch { return $false }
}

function Get-NormalizedManifest($manifest) {
    if (Test-IsUnifiedManifest $manifest) {
        return Convert-UnifiedToLegacyView $manifest
    }
    return $manifest
}

function Get-VersionList($manifest) {
    $view = Get-NormalizedManifest $manifest
    if ($view.versions -and $view.versions.Count -gt 0) {
        return @($view.versions)
    }
    if ($view.version -and $view.url) {
        return @([PSCustomObject]@{
            version = "$($view.version)"
            url     = "$($view.url)"
            notes   = "$($view.notes)"
            date    = ""
            size_mb = $null
            hot_update = $view.hot_update
            full_sha256 = $view.full_sha256
        })
    }
    return @()
}

function Get-LatestUrl($manifest, [string]$latest) {
    $view = Get-NormalizedManifest $manifest
    $url = "$($view.url)".Trim()
    if ($view.versions -and $view.versions.Count -gt 0) {
        $entry = $view.versions | Where-Object { "$($_.version)".Trim() -eq $latest } | Select-Object -First 1
        if ($entry) { $url = "$($entry.url)".Trim() }
    }
    return $url
}

function Download-Version([string]$ver, [string]$url, [string]$ExpectedSha256 = '', [switch]$AsZip) {
    $ext = if ($AsZip) { '.zip' } else { '.exe' }
    $outFile = Join-Path $UpdateDir "CCB-Wanding-$ver$ext"

    # Use pending cache if valid
    if (Test-Path $PendingFile) {
        try {
            $p = Get-Content $PendingFile -Raw | ConvertFrom-Json
            if ("$($p.version)".Trim() -eq $ver -and (Test-Path "$($p.path)") -and (Get-Item "$($p.path)").Length -gt 10MB) {
                Write-Host "[CCB] 使用已下载缓存。" -ForegroundColor DarkGray
                return "$($p.path)"
            }
        } catch {}
    }
    $minSize = if ($AsZip) { 1MB } else { 10MB }
    if ((Test-Path $outFile) -and (Get-Item $outFile).Length -gt $minSize) {
        if (Test-FileSha256 $outFile $ExpectedSha256) {
            Write-Host "[CCB] 使用已下载缓存。" -ForegroundColor DarkGray
            return $outFile
        }
    }

    $tmpFile = "$outFile.tmp"
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    Write-Host "[CCB] 正在下载 $ver ..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $tmpFile -ErrorAction Stop
    if (-not (Test-FileSha256 $tmpFile $ExpectedSha256)) {
        Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
        Write-Host "[CCB] SHA-256 校验失败。" -ForegroundColor Red
        return $null
    }
    if ((Test-Path $tmpFile) -and (Get-Item $tmpFile).Length -gt $minSize) {
        Move-Item $tmpFile $outFile -Force
        $mb = [math]::Round((Get-Item $outFile).Length / 1MB, 1)
        Write-Host "[CCB] 下载完成 ($mb MB)。" -ForegroundColor DarkGray
        return $outFile
    }
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    return $null
}

function Install-Update([string]$ver, $manifest, $selEntry) {
    $view = Get-NormalizedManifest $manifest
    $installed = Get-InstalledVersion
    $hot = $null
    if ($selEntry -and $selEntry.hot_update) { $hot = $selEntry.hot_update }
    elseif ($view.hot_update) { $hot = $view.hot_update }

    if ($hot -and (Test-HotUpdateEligible $hot $installed)) {
        $hotUrl = "$($hot.artifact.url)".Trim()
        $hotSha = "$($hot.artifact.sha256)".Trim()
        $zipPath = Download-Version $ver $hotUrl $hotSha -AsZip
        if ($zipPath) {
            $upgrade = Join-Path $PSScriptRoot 'internal-upgrade.ps1'
            if (Test-Path -LiteralPath $upgrade) {
                Write-Host "[CCB] 热更新 $ver ..." -ForegroundColor Yellow
                $installRoot = Get-CcbInstallDir
                & $upgrade -ZipPath $zipPath -ExpectedVersion $ver -ExpectedSha256 $hotSha -InstallDir $installRoot
                if ($LASTEXITCODE -eq 0) {
                    Set-ItemProperty -Path $RegPath -Name Version -Value $ver -ErrorAction SilentlyContinue
                    Write-Host "[CCB] 热更新完成，请重新启动 CCB-Wanding。" -ForegroundColor Green
                    exit 2
                }
            }
        }
        Write-Host "[CCB] 热更新失败，回退完整安装包。" -ForegroundColor Yellow
    }

    $fullUrl = if ($selEntry) { "$($selEntry.url)".Trim() } else { Get-LatestUrl $manifest $ver }
    $fullSha = if ($selEntry -and $selEntry.full_sha256) { "$($selEntry.full_sha256)".Trim() } else { "$($view.full_sha256)".Trim() }
    $exePath = Download-Version $ver $fullUrl $fullSha
    if (-not $exePath) {
        Write-Host "[CCB] 下载失败。" -ForegroundColor Red
        exit 1
    }
    Install-Now $exePath $ver
}

function Install-Now([string]$exePath, [string]$ver) {
    Write-Host "[CCB] 正在静默安装 $ver ..." -ForegroundColor Yellow
    Start-Process -FilePath $exePath -ArgumentList "/S" -Wait -ErrorAction Stop
    Remove-Item $PendingFile -Force -ErrorAction SilentlyContinue
    Write-Host "[CCB] 安装完成，请重新启动 CCB-Wanding。" -ForegroundColor Green
    exit 2
}

function Show-VersionList($manifest, [string]$latest, [string]$installed) {
    $versions = @(Get-VersionList $manifest)
    if ($versions.Count -eq 0) { return $null }

    # Pre-select latest version
    $selected = 0
    for ($i = 0; $i -lt $versions.Count; $i++) {
        if ("$($versions[$i].version)".Trim() -eq $latest) { $selected = $i; break }
    }

    Write-Host ""
    Write-Host "  [CCB] 版本选择  (↑↓ 移动  Enter 确认  Esc 取消)" -ForegroundColor Cyan
    Write-Host ""

    $listTop = [Console]::CursorTop

    # Reserve lines for the list
    for ($i = 0; $i -lt $versions.Count; $i++) { Write-Host "" }

    while ($true) {
        [Console]::SetCursorPosition(0, $listTop)
        for ($i = 0; $i -lt $versions.Count; $i++) {
            $v   = $versions[$i]
            $ver = "$($v.version)".Trim()
            $tags = @()
            if ($ver -eq $latest)    { $tags += "最新" }
            if ($ver -eq $installed) { $tags += "已安装" }
            $tagStr = if ($tags.Count -gt 0) { "  [" + ($tags -join "/") + "]" } else { "" }
            $info = ""
            if ($v.date)    { $info += "  $($v.date)" }
            if ($v.size_mb) { $info += "  $($v.size_mb) MB" }
            if ($v.notes)   { $info += "  $($v.notes)" }
            $prefix = if ($i -eq $selected) { "  > " } else { "    " }
            $line   = "$prefix{0,-12}{1}{2}" -f $ver, $info, $tagStr
            if ($i -eq $selected) {
                Write-Host $line -ForegroundColor Cyan
            } else {
                $color = if ($ver -eq $installed) { "DarkGray" }
                         elseif ($ver -eq $latest) { "Green" }
                         else { "White" }
                Write-Host $line -ForegroundColor $color
            }
        }

        $key = [Console]::ReadKey($true)
        if     ($key.Key -eq "UpArrow"   -and $selected -gt 0)                        { $selected-- }
        elseif ($key.Key -eq "DownArrow" -and $selected -lt ($versions.Count - 1))    { $selected++ }
        elseif ($key.Key -eq "Enter")  { Write-Host ""; return $versions[$selected] }
        elseif ($key.Key -eq "Escape") { Write-Host ""; return $null }
        elseif ($key.KeyChar -eq 'q' -or $key.KeyChar -eq 'Q') { Write-Host ""; return $null }
    }
}

# ---------------------------------------------------------------------------
# AUTO APPLY HOT (launch-time, fail-open)
# Exit 10 = hot apply succeeded; 0 = no-op or fail-open
# ---------------------------------------------------------------------------
if ($AutoApplyHot) {
    $ErrorActionPreference = 'Stop'
    try {
        if ($env:CCB_NO_UPDATE -eq '1') { exit 0 }

        $installed = Get-InstalledVersion
        if (-not $installed) { exit 0 }

        $manifest = Get-Manifest
        if (-not $manifest) { exit 0 }

        $view = Get-NormalizedManifest $manifest
        $latest = "$($view.latest)".Trim()
        if (-not $latest) { $latest = "$($view.version)".Trim() }
        if (-not $latest) { exit 0 }
        if (-not (Is-Newer $installed $latest)) { exit 0 }

        $hot = $view.hot_update
        if (-not ($hot -and (Test-HotUpdateEligible $hot $installed))) { exit 0 }

        $installRoot = Get-CcbInstallDir
        if (-not $installRoot) { exit 0 }

        $hotUrl = "$($hot.artifact.url)".Trim()
        $hotSha = "$($hot.artifact.sha256)".Trim()
        $zipPath = Download-Version $latest $hotUrl $hotSha -AsZip
        if (-not $zipPath) { exit 0 }

        $upgrade = Join-Path $PSScriptRoot 'internal-upgrade.ps1'
        if (-not (Test-Path -LiteralPath $upgrade)) { exit 0 }

        & $upgrade -ZipPath $zipPath -ExpectedVersion $latest -ExpectedSha256 $hotSha -InstallDir $installRoot
        if ($LASTEXITCODE -eq 0) {
            Set-ItemProperty -Path $RegPath -Name Version -Value $latest -ErrorAction SilentlyContinue
            exit 10
        }
        exit 0
    } catch {
        Write-AutoApplyLog $_.Exception.Message
        exit 0
    }
}

# ---------------------------------------------------------------------------
# BACKGROUND CHECK MODE: silent, no output, writes available.json
# ---------------------------------------------------------------------------
if ($BackgroundCheck) {
    $installed = Get-InstalledVersion
    if (-not $installed) { exit 0 }

    $manifest = Get-Manifest
    if (-not $manifest) { exit 0 }

    $view = Get-NormalizedManifest $manifest
    $latest = "$($view.latest)".Trim()
    if (-not $latest) { $latest = "$($view.version)".Trim() }
    if (-not $latest) { exit 0 }

    $notes = "$($view.notes)".Trim()

    $info = @{
        latest    = $latest
        installed = $installed
        newer     = (Is-Newer $installed $latest)
        notes     = $notes
        checked   = (Get-Date -Format "o")
    }
    $info | ConvertTo-Json | Set-Content $AvailableFile -Encoding UTF8
    exit 0
}

# ---------------------------------------------------------------------------
# UPDATE MODE (legacy foreground prompt, kept for compat)
# ---------------------------------------------------------------------------
if ($Update) {
    $installed = Get-InstalledVersion
    if (-not $installed) { exit 0 }

    $manifest = Get-Manifest
    if (-not $manifest) { exit 0 }   # server unreachable -- silently skip

    $view = Get-NormalizedManifest $manifest
    $latest = "$($view.latest)".Trim()
    if (-not $latest) { $latest = "$($view.version)".Trim() }
    if (-not $latest) { exit 0 }

    if (-not (Is-Newer $installed $latest)) { exit 0 }   # already up to date

    $notes = "$($view.notes)".Trim()

    Write-Host ""
    Write-Host "[CCB] 发现新版本 $latest（当前 $installed）" -ForegroundColor Cyan
    if ($notes) { Write-Host "      $notes" -ForegroundColor DarkGray }
    Write-Host ""
    Write-Host "  [1] 升级到最新 $latest" -ForegroundColor Green
    Write-Host "  [2] 选择指定版本" -ForegroundColor White
    Write-Host "  [3] 跳过，直接启动" -ForegroundColor DarkGray
    Write-Host ""
    $choice = (Read-Host "  请选择").Trim()

    if ($choice -eq "1") {
        Install-Update $latest $manifest $null

    } elseif ($choice -eq "2") {
        $sel = Show-VersionList $manifest $latest $installed
        if ($sel) {
            $ver = "$($sel.version)".Trim()
            Install-Update $ver $manifest $sel
        }
    }
    # choice 3 or anything else: exit 0, ccb-wanding.cmd continues to launch
    exit 0
}

# ---------------------------------------------------------------------------
# SELECT MODE: standalone version catalog (from shortcut)
# ---------------------------------------------------------------------------
if ($Select) {
    # Show badge if background check already found a newer version
    if (Test-Path $AvailableFile) {
        try {
            $avail = Get-Content $AvailableFile -Raw | ConvertFrom-Json
            if ($avail.newer -eq $true) {
                Write-Host ""
                Write-Host "  * 新版本 $($avail.latest) 可用" -ForegroundColor Yellow
                if ($avail.notes) { Write-Host "    $($avail.notes)" -ForegroundColor DarkGray }
            }
        } catch {}
    }

    $manifest = Get-Manifest
    if (-not $manifest) {
        Write-Host "[CCB] 无法连接更新服务器，请检查网络。" -ForegroundColor Red
        exit 1
    }

    $view = Get-NormalizedManifest $manifest
    $versions  = @(Get-VersionList $manifest)
    $installed = Get-InstalledVersion
    $latest    = "$($view.latest)".Trim()
    if (-not $latest -and $versions.Count -gt 0) { $latest = $versions[0].version }

    if ($versions.Count -eq 0) {
        Write-Host "[CCB] 服务器暂无版本信息。" -ForegroundColor Red
        exit 1
    }

    $sel = Show-VersionList $manifest $latest $installed
    if (-not $sel) { exit 0 }

    $ver = "$($sel.version)".Trim()

    if ($ver -eq $installed) {
        $confirm = (Read-Host "[CCB] $ver 已是当前安装版本，仍要重新安装？[y/N]").Trim().ToLower()
        if ($confirm -ne "y") { Write-Host "[CCB] 已取消。" -ForegroundColor DarkGray; exit 0 }
    }

    Install-Update $ver $manifest $sel
    exit 0
}

# ---------------------------------------------------------------------------
# APPLY MODE: legacy -- install a pending.json update from old background download
# ---------------------------------------------------------------------------
if ($Apply) {
    if (-not (Test-Path $PendingFile)) { exit 0 }
    try {
        $p = Get-Content $PendingFile -Raw | ConvertFrom-Json
        if (-not (Test-Path $p.path)) {
            Remove-Item $PendingFile -Force -ErrorAction SilentlyContinue; exit 0
        }
        Write-Host ""
        Write-Host "[CCB] 发现已下载的新版本 $($p.version)。" -ForegroundColor Cyan
        if ($p.notes) { Write-Host "      $($p.notes)" -ForegroundColor DarkGray }
        $ans = (Read-Host "[CCB] 是否静默安装？安装后请重启 CCB-Wanding [Y/n]").Trim().ToLower()
        if ($ans -eq "" -or $ans -eq "y") {
            Install-Now $p.path $p.version
        } else {
            Remove-Item $PendingFile -Force -ErrorAction SilentlyContinue
            Write-Host "[CCB] 已跳过。" -ForegroundColor DarkGray
        }
    } catch {
        Remove-Item $PendingFile -Force -ErrorAction SilentlyContinue
    }
    exit 0
}
