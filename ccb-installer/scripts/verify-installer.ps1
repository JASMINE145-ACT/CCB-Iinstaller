#!/usr/bin/env pwsh
# verify-installer.ps1 - 验证安装包完整性

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\CCB"
)

$ErrorActionPreference = "Stop"
$results = @{}

function Test-File {
    param([string]$Path, [string]$Name)
    $exists = Test-Path $Path
    $results[$Name] = $exists
    if ($exists) {
        Write-Host "[PASS] $Name exists" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $Name missing" -ForegroundColor Red
    }
}

Write-Host "=== CCB Installer Verification ===" -ForegroundColor Cyan
Write-Host "Install Dir: $InstallDir`n"

Test-File "$InstallDir\bun\bun.exe" "Bun Runtime"
Test-File "$InstallDir\dist\cli.js" "CCB Entry (cli.js)"
Test-File "$InstallDir\ccb.cmd" "Entry Script (ccb.cmd)"

$rgPath = Get-ChildItem "$InstallDir\vendor\ripgrep\rg.exe" -ErrorAction SilentlyContinue
if ($rgPath) {
    Write-Host "[PASS] ripgrep found" -ForegroundColor Green
    $results["ripgrep"] = $true
}
else {
    Write-Host "[FAIL] ripgrep missing" -ForegroundColor Red
    $results["ripgrep"] = $false
}

$passed = ($results.Values | Where-Object { $_ -eq $true }).Count
$total = $results.Count
Write-Host "`nPassed: $passed / $total"

if ($passed -eq $total) {
    Write-Host "All checks passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "Some checks failed!" -ForegroundColor Red
    exit 1
}