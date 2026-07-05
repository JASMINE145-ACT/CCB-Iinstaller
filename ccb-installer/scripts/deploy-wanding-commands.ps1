# Deploy WanD slash commands to CCB-Wanding user commands directory.
# Usage:
#   .\ccb-installer\scripts\deploy-wanding-commands.ps1
#   .\ccb-installer\scripts\deploy-wanding-commands.ps1 -InstallDir D:\CCB-Wanding -ConfigDir C:\Users\me\AppData\Local\CCB-Wanding\.claude

param(
    [string]$CommandsDir,
    [string]$InstallDir,
    [string]$ConfigDir
)

$ErrorActionPreference = 'Stop'

if (-not $ConfigDir) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\.claude'
}
if (-not $CommandsDir) {
    $CommandsDir = Join-Path $ConfigDir 'commands'
}

$commandSources = @(
    @{
        Name = 'learn-by-data'
        Rel  = 'resources\commands\learn-by-data.md'
    },
    @{
        Name = '记住'
        Rel  = 'resources\commands\记住.md'
    }
)

function Resolve-CommandSource {
    param(
        [string]$RelativePath
    )
    if ($InstallDir) {
        $fromInstall = Join-Path $InstallDir $RelativePath
        if (Test-Path -LiteralPath $fromInstall) {
            return $fromInstall
        }
    }
    $fromRepo = Join-Path (Split-Path $PSScriptRoot -Parent) $RelativePath
    if (Test-Path -LiteralPath $fromRepo) {
        return $fromRepo
    }
    return $null
}

$null = New-Item -ItemType Directory -Force -Path $CommandsDir
$deployed = 0
foreach ($cmd in $commandSources) {
    $src = Resolve-CommandSource -RelativePath $cmd.Rel
    if (-not $src) {
        Write-Warning "Source not found for $($cmd.Name): $($cmd.Rel)"
        continue
    }
    $dest = Join-Path $CommandsDir "$($cmd.Name).md"
    Copy-Item -LiteralPath $src -Destination $dest -Force
    Write-Host "Deployed $($cmd.Name) -> $dest"
    $deployed++
}

if ($deployed -eq 0) {
    throw 'No WanD slash commands deployed — check InstallDir resources/commands or repo sources'
}

Write-Host ''
Write-Host "WanD commands deploy complete ($deployed file(s))."
