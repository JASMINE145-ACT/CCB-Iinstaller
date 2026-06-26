# Repair %LOCALAPPDATA%\CCB-Wanding\config\sso.env when JWT_SECRET was seeded empty (1.0.6 pack bug).
# Usage (on employee PC — secret from ops env.local, never commit):
#   .\scripts\org-phase0\repair-employee-sso-env.ps1 -EnvLocalPath D:\path\to\env.local
#   .\scripts\org-phase0\repair-employee-sso-env.ps1 -JwtSecret 'same-as-vps-64-chars'
#
# After repair: restart via ccb-launch-aionui.cmd (not raw AionUi.exe).

[CmdletBinding()]
param(
    [string]$ConfigPath = '',
    [string]$JwtSecret = '',
    [string]$EnvLocalPath = ''
)

$ErrorActionPreference = 'Stop'

if (-not $ConfigPath) {
    $ConfigPath = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\config\sso.env'
}

if (-not $JwtSecret -and $EnvLocalPath) {
    if (-not (Test-Path -LiteralPath $EnvLocalPath)) {
        throw "EnvLocalPath not found: $EnvLocalPath"
    }
    $line = Get-Content -LiteralPath $EnvLocalPath | Where-Object { $_ -match '^JWT_SECRET=' } | Select-Object -First 1
    if ($line -match '^JWT_SECRET=(.+)$') {
        $JwtSecret = $matches[1].Trim()
    }
}

if (-not $JwtSecret -or $JwtSecret.Length -lt 16) {
    throw 'JWT_SECRET missing or too short. Pass -JwtSecret or -EnvLocalPath with scripts/org-phase0/env.local'
}

$dir = Split-Path -Parent $ConfigPath
$null = New-Item -ItemType Directory -Force -Path $dir

if (Test-Path -LiteralPath $ConfigPath) {
    $raw = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8
} else {
    $raw = @"
# Unified org SSO — repaired by repair-employee-sso-env.ps1
AIONUI_SSO_MODE=org-idp
JWT_SECRET=

"@
}

if ($raw -notmatch '(?m)^AIONUI_SSO_MODE=') {
    $raw = "AIONUI_SSO_MODE=org-idp`n" + $raw
} else {
    $raw = $raw -replace '(?m)^AIONUI_SSO_MODE=.*$', 'AIONUI_SSO_MODE=org-idp'
}

if ($raw -match '(?m)^JWT_SECRET=') {
    $raw = $raw -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$JwtSecret"
} else {
    $raw = $raw.TrimEnd() + "`nJWT_SECRET=$JwtSecret`n"
}

[System.IO.File]::WriteAllText($ConfigPath, $raw, [System.Text.UTF8Encoding]::new($false))
Write-Host "[OK] Repaired $ConfigPath (JWT_SECRET length=$($JwtSecret.Length))" -ForegroundColor Green
Write-Host "Next: close AionUI, start via ccb-launch-aionui.cmd, login with org credentials." -ForegroundColor Cyan
