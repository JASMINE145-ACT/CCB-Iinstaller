# Build script output handling fix
param(
    [switch]$Lite,
    [switch]$NoPause,
    [switch]$SkipBaseline   # 跳过 baseline，使用 resources\bun\bun.exe（标准版）
)
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================"
Write-Host "  CCB Build Script"
Write-Host "========================================"
Write-Host ""

$ErrorActionPreference = "Continue"
$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $InstallerDir

# 从 installer.nsi / installer-lite.nsi 派生版本号，避免 build.ps1 与 NSIS 脚本中的版本号漂移
$nsiPath = if ($Lite) {
    Join-Path $InstallerDir 'installer-lite.nsi'
} else {
    Join-Path $InstallerDir 'installer.nsi'
}
$verMajor = 1; $verMinor = 0; $verBuild = 0
if (Test-Path -LiteralPath $nsiPath) {
    $nsiText = Get-Content -LiteralPath $nsiPath -Raw
    if ($nsiText -match '!define\s+VERSIONMAJOR\s+(\d+)') { $verMajor = $Matches[1] }
    if ($nsiText -match '!define\s+VERSIONMINOR\s+(\d+)') { $verMinor = $Matches[1] }
    if ($nsiText -match '!define\s+VERSIONBUILD\s+(\d+)') { $verBuild = $Matches[1] }
}
$version = "$verMajor.$verMinor.$verBuild"
Write-Host "    Version (from $(Split-Path -Leaf $nsiPath)): $version"

# 1. Check NSIS
Write-Host "[1/7] Checking NSIS..."
$nsisCandidates = @(
    "$env:ProgramFiles\NSIS\makensis.exe",
    "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
    "D:\NSIS\makensis.exe"
)
$nsisPath = $nsisCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($nsisPath) {
    Write-Host "    [OK] NSIS found"
} else {
    Write-Host "    [ERROR] NSIS not found!"
    Write-Host "    Install from: https://nsis.sourceforge.io/Download"
    if (-not $NoPause) { Read-Host "Press Enter to exit" }
    exit 1
}

# 2. Copy Bun (baseline by default — 最大 CPU 兼容性；-SkipBaseline 使用标准版)
Write-Host ""
Write-Host "[2/7] Copying Bun runtime..."
$BunDest = "$InstallerDir\vendor\bun\bun.exe"
New-Item -ItemType Directory -Force -Path "$InstallerDir\vendor\bun" | Out-Null
$bunCopied = $false

if (-not $SkipBaseline) {
    # 从预置标准版检测 Bun 版本号
    $bunVersion = "1.2.18"
    $BunStdSrc  = "$InstallerDir\resources\bun\bun.exe"
    if (Test-Path $BunStdSrc) {
        try {
            $verOut = & $BunStdSrc --version 2>&1
            if ("$verOut" -match '(\d+\.\d+\.\d+)') { $bunVersion = $Matches[1] }
        } catch {}
    }

    $cacheDir = "$InstallerDir\.cache"
    $cacheExe = "$cacheDir\bun-$bunVersion-baseline.exe"
    New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

    if (Test-Path $cacheExe) {
        Write-Host "    [cache] Bun $bunVersion baseline"
        Copy-Item $cacheExe -Destination $BunDest -Force
        $sizeMB = [math]::Round((Get-Item $cacheExe).Length / 1MB, 1)
        Write-Host "    [OK] Bun $bunVersion baseline ($sizeMB MB)"
        $bunCopied = $true
    } else {
        $url     = "https://github.com/oven-sh/bun/releases/download/bun-v$bunVersion/bun-windows-x64-baseline.zip"
        $cacheZip = "$cacheDir\bun-$bunVersion-baseline.zip"
        Write-Host "    Downloading Bun $bunVersion baseline..."
        try {
            Invoke-WebRequest $url -OutFile $cacheZip -TimeoutSec 120
            $extractDir = "$cacheDir\bun-$bunVersion-baseline-extract"
            Expand-Archive $cacheZip $extractDir -Force
            $exeInZip = Get-ChildItem $extractDir -Recurse -Filter "bun.exe" | Select-Object -First 1
            if ($exeInZip) {
                Copy-Item $exeInZip.FullName -Destination $cacheExe -Force
                Copy-Item $cacheExe -Destination $BunDest -Force
                Remove-Item $extractDir -Recurse -Force
                Remove-Item $cacheZip -Force
                $sizeMB = [math]::Round((Get-Item $BunDest).Length / 1MB, 1)
                Write-Host "    [OK] Bun $bunVersion baseline downloaded ($sizeMB MB)"
                $bunCopied = $true
            }
        } catch {
            Write-Host "    [WARN] baseline 下载失败: $_"
            Write-Host "    回退到标准版 resources\bun\bun.exe"
        }
    }
}

if (-not $bunCopied) {
    $BunSrc = "$InstallerDir\resources\bun\bun.exe"
    if (Test-Path $BunSrc) {
        Copy-Item $BunSrc -Destination $BunDest -Force
        $sizeMB = [math]::Round((Get-Item $BunSrc).Length / 1MB, 1)
        Write-Host "    [OK] Bun (标准版) copied ($sizeMB MB)"
    } else {
        Write-Host "    [ERROR] Bun not found: $BunSrc"
        if (-not $NoPause) { Read-Host "Press Enter to exit" }
        exit 1
    }
}

# 3. Copy ripgrep
Write-Host ""
Write-Host "[3/7] Copying ripgrep..."
$RgSrc = "$InstallerDir\resources\ripgrep\x64-win32\rg.exe"
$RgDir = "$InstallerDir\vendor\ripgrep\x64-win32"
if (Test-Path $RgSrc) {
    New-Item -ItemType Directory -Force -Path $RgDir | Out-Null
    Copy-Item $RgSrc -Destination $RgDir -Force
    $sizeMB = [math]::Round((Get-Item $RgSrc).Length / 1MB, 1)
    Write-Host "    [OK] ripgrep copied ($sizeMB MB)"
} else {
    Write-Host "    [ERROR] ripgrep not found: $RgSrc"
    if (-not $NoPause) { Read-Host "Press Enter to exit" }
    exit 1
}

# 4. Check Git (bundled)
Write-Host ""
Write-Host "[4/7] Checking Git Bash (bundled)..."
$GitSrc = "$InstallerDir\vendor\git\bin\bash.exe"
if (Test-Path $GitSrc) {
    try {
        $output = & $GitSrc --noprofile --norc -c "git --version" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Git Bash verified: $output"
            $totalSize = (Get-ChildItem "$InstallerDir\vendor\git" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Host "    Size: ~$([math]::Round($totalSize, 1)) MB"
        } else {
            Write-Host "    [FAIL] Git Bash exists but cannot run git: $output"
            Write-Host "    Download full MinGit from: https://github.com/git-for-windows/git/releases"
            if (-not $NoPause) { Read-Host "Press Enter to exit" }
            exit 1
        }
    } catch {
        Write-Host "    [FAIL] Git Bash execution failed: $_"
        Write-Host "    Download full MinGit from: https://github.com/git-for-windows/git/releases"
        if (-not $NoPause) { Read-Host "Press Enter to exit" }
        exit 1
    }
} else {
    Write-Host "    [ERROR] Git Bash not found: $GitSrc"
    Write-Host "    Download full MinGit from: https://github.com/git-for-windows/git/releases"
    if (-not $NoPause) { Read-Host "Press Enter to exit" }
    exit 1
}

# 4.5. Normalize i18n literals (UTF-8 CJK → \uXXXX，防止 Bun 在 Windows 上乱码)
Write-Host ""
Write-Host "[4.5/6] Normalizing i18n literals..."
$BunExe = "$InstallerDir\vendor\bun\bun.exe"
$NormalizeScript = "$InstallerDir\scripts\normalize-i18n-literals.mjs"
if (Test-Path $NormalizeScript) {
    & $BunExe $NormalizeScript "$InstallerDir\dist"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [WARN] normalize 返回非零退出码，继续构建..."
    } else {
        Write-Host "    [OK] i18n literals 已转义"
    }
} else {
    Write-Host "    [SKIP] 未找到 $NormalizeScript，跳过 i18n 转义"
}

# 5. Build installer
Write-Host ""
Write-Host "[5/7] Building installer..."

Write-Host "    Target: $(Split-Path -Leaf $nsiPath)"
Write-Host "    Bun: $BunDest"
Write-Host "    ripgrep: $RgDir"
Write-Host "    Git: $InstallerDir\vendor\git\"

& $nsisPath $nsiPath

# 6. Check result
Write-Host ""
$installerName = if ($Lite) { "ccb-lite$version.exe" } else { "CCB-Setup-$version.exe" }
if (Test-Path "$InstallerDir\$installerName") {
    Write-Host "[7/7] Build succeeded!"
    Write-Host ""
    Write-Host "========================================"
    $exe = Get-Item "$InstallerDir\$installerName"
    $sizeMB = [math]::Round($exe.Length / 1MB, 1)
    Write-Host "  Installer: $installerName"
    Write-Host "  Size: $sizeMB MB"
    Write-Host "  Path: $($exe.FullName)"
    Write-Host "========================================"
} else {
    Write-Host "[ERROR] Build failed!"
    Write-Host "Run makensis installer.nsi manually to see errors"
}

if (-not $NoPause) { Read-Host "Press Enter to exit" }
