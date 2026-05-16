#!/usr/bin/env pwsh
# build-resources.ps1 - 下载 CCB 安装包所需资源

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ResourcesDir = Split-Path -Parent $PSCommandPath

function Get-Bun {
    $Version = "1.2.18"
    $Url = "https://github.com/oven-sh/bun/releases/download/bun-v$Version/bun-windows-x64.zip"
    $Output = "$ResourcesDir/bun/bun-windows-x64.zip"

    Write-Host "Downloading Bun $Version..."
    Invoke-WebRequest -Uri $Url -OutFile $Output
    Expand-Archive -Path $Output -DestinationPath "$ResourcesDir/bun" -Force
    Remove-Item $Output -Force
    Write-Host "Bun downloaded to $ResourcesDir/bun"
}

function Get-Ripgrep {
    $Version = "14.1.1"
    $Url = "https://github.com/BurntSushi/ripgrep/releases/download/$Version/ripgrep-$Version-x86_64-pc-windows-msvc.zip"
    $Output = "$ResourcesDir/ripgrep/ripgrep.zip"

    Write-Host "Downloading ripgrep $Version..."
    Invoke-WebRequest -Uri $Url -OutFile $Output
    Expand-Archive -Path $Output -DestinationPath "$ResourcesDir/ripgrep" -Force
    Remove-Item $Output -Force
    Write-Host "ripgrep downloaded to $ResourcesDir/ripgrep"
}

Get-Bun
Get-Ripgrep
Write-Host "Resources prepared successfully!"