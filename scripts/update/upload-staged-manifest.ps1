# Upload staged WanD update bundle to VPS (requires SSH key to root@67.216.206.3:39222).
# Run publish-update-bundle.ps1 first (without -Upload) to populate _publish/updates.
#
# Usage:
#   .\scripts\update\upload-staged-manifest.ps1
#   .\scripts\update\upload-staged-manifest.ps1 -StagingDir D:\Projects\claude-code-best\_publish\updates

[CmdletBinding()]
param(
    [string]$StagingDir = '',
    [string]$VpsHost = '67.216.206.3',
    [string]$VpsPath = '/var/www/updates',
    [int]$SshPort = 39222
)

$ErrorActionPreference = 'Stop'

if (-not $StagingDir) {
    $StagingDir = Join-Path $PSScriptRoot '..\..\_publish\updates'
}
$StagingDir = (Resolve-Path -LiteralPath $StagingDir).Path

$manifest = Join-Path $StagingDir 'manifest.json'
if (-not (Test-Path -LiteralPath $manifest)) {
    throw "Missing staged manifest: $manifest. Run publish-update-bundle.ps1 first."
}

Write-Host "==> Upload $StagingDir -> ${VpsHost}:${VpsPath} (scp -P $SshPort)" -ForegroundColor Cyan
scp -P $SshPort -r "$StagingDir/*" "root@${VpsHost}:${VpsPath}/"
Write-Host '[OK] Upload complete. Verify with:' -ForegroundColor Green
Write-Host "     .\ccb-installer\scripts\verify-update-server.ps1" -ForegroundColor DarkGray
