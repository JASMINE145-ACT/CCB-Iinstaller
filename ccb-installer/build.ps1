# Build script output handling fix
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================"
Write-Host "  CCB Build Script"
Write-Host "========================================"
Write-Host ""

$ErrorActionPreference = "Continue"
$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $InstallerDir

# 1. Check NSIS
Write-Host "[1/6] Checking NSIS..."
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
    Read-Host "Press Enter to exit"
    exit 1
}

# 2. Copy Bun
Write-Host ""
Write-Host "[2/6] Copying Bun runtime..."
$BunSrc = "$InstallerDir\resources\bun\bun.exe"
$BunDest = "$InstallerDir\vendor\bun\bun.exe"
if (Test-Path $BunSrc) {
    New-Item -ItemType Directory -Force -Path "$InstallerDir\vendor\bun" | Out-Null
    Copy-Item $BunSrc -Destination $BunDest -Force
    $sizeMB = [math]::Round((Get-Item $BunSrc).Length / 1MB, 1)
    Write-Host "    [OK] Bun copied ($sizeMB MB)"
} else {
    Write-Host "    [ERROR] Bun not found: $BunSrc"
    Read-Host "Press Enter to exit"
    exit 1
}

# 3. Copy ripgrep
Write-Host ""
Write-Host "[3/6] Copying ripgrep..."
$RgSrc = "$InstallerDir\resources\ripgrep\x64-win32\rg.exe"
$RgDir = "$InstallerDir\vendor\ripgrep\x64-win32"
if (Test-Path $RgSrc) {
    New-Item -ItemType Directory -Force -Path $RgDir | Out-Null
    Copy-Item $RgSrc -Destination $RgDir -Force
    $sizeMB = [math]::Round((Get-Item $RgSrc).Length / 1MB, 1)
    Write-Host "    [OK] ripgrep copied ($sizeMB MB)"
} else {
    Write-Host "    [ERROR] ripgrep not found: $RgSrc"
    Read-Host "Press Enter to exit"
    exit 1
}

# 4. Check Git (bundled)
Write-Host ""
Write-Host "[4/6] Checking Git Bash (bundled)..."
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
            Read-Host "Press Enter to exit"
            exit 1
        }
    } catch {
        Write-Host "    [FAIL] Git Bash execution failed: $_"
        Write-Host "    Download full MinGit from: https://github.com/git-for-windows/git/releases"
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "    [ERROR] Git Bash not found: $GitSrc"
    Write-Host "    Download full MinGit from: https://github.com/git-for-windows/git/releases"
    Read-Host "Press Enter to exit"
    exit 1
}

# 5. Build installer
Write-Host ""
Write-Host "[5/6] Building installer..."

Write-Host "    Bun: $BunDest"
Write-Host "    ripgrep: $RgDir"
Write-Host "    Git: $InstallerDir\vendor\git\"

& $nsisPath "$InstallerDir\installer.nsi"

# 6. Check result
Write-Host ""
$installerName = "CCB-Setup-1.0.7.exe"
if (Test-Path "$InstallerDir\$installerName") {
    Write-Host "[6/6] Build succeeded!"
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

Read-Host "Press Enter to exit"
