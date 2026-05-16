#!/usr/bin/env pwsh
# build-resources.ps1 - 下载 CCB 安装包所需资源

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# 获取脚本所在目录的父目录 (ccb-installer)
$ScriptDir = Split-Path -Parent $PSCommandPath
$ResourcesDir = Split-Path -Parent $ScriptDir

function Get-Bun {
    $Version = "1.2.18"
    $Url = "https://github.com/oven-sh/bun/releases/download/bun-v$Version/bun-windows-x64.zip"
    $Output = "$ResourcesDir/bun/bun-windows-x64.zip"
    $ExtractTo = "$ResourcesDir/bun"

    Write-Host "Downloading Bun $Version..."
    Write-Host "URL: $Url"
    Write-Host "Output: $Output"
    Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing
    Expand-Archive -Path $Output -DestinationPath $ExtractTo -Force
    Remove-Item $Output -Force
    Write-Host "Bun downloaded to $ExtractTo"
}

function Get-Ripgrep {
    $Version = "14.1.1"
    $Url = "https://github.com/BurntSushi/ripgrep/releases/download/$Version/ripgrep-$Version-x86_64-pc-windows-msvc.zip"
    $Output = "$ResourcesDir/ripgrep/ripgrep.zip"
    $ExtractTo = "$ResourcesDir/ripgrep"

    Write-Host "Downloading ripgrep $Version..."
    Write-Host "URL: $Url"
    Write-Host "Output: $Output"
    Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing
    Expand-Archive -Path $Output -DestinationPath $ExtractTo -Force
    Remove-Item $Output -Force
    Write-Host "ripgrep downloaded to $ExtractTo"
}

Write-Host "Resources directory: $ResourcesDir"
Get-Bun
Get-Ripgrep
Write-Host "Resources prepared successfully!"