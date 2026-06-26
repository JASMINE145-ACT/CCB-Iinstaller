# Phase 0 — verify employee desktop prerequisites (run on Windows after login).
# Usage:
#   .\scripts\org-phase0\verify-desktop.ps1
#   .\scripts\org-phase0\verify-desktop.ps1 -OrgUrl 'http://67.216.206.3:13401'

param(
  [string]$OrgUrl = 'http://67.216.206.3:13401',
  [switch]$Dev
)

$ErrorActionPreference = 'Continue'
$root = if ($Dev) { Join-Path $env:APPDATA 'AionUi-Dev\aionui' } else { Join-Path $env:APPDATA 'AionUi\aionui' }
$orgJson = Join-Path $root 'org-server.json'
$tokenFile = Join-Path $root 'org-session.token'

$ssoMode = $env:AIONUI_SSO_MODE
if (-not $ssoMode) {
  $ssoEnv = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\config\sso.env'
  if (Test-Path $ssoEnv) {
    Get-Content $ssoEnv | ForEach-Object {
      if ($_ -match '^\s*AIONUI_SSO_MODE\s*=\s*(.+)\s*$') { $ssoMode = $matches[1].Trim() }
    }
  }
}
$phaseLabel = if ($ssoMode -eq 'org-idp') { 'Unified SSO' } else { 'Phase 0' }
Write-Host "`n==> $phaseLabel desktop verify ($root)" -ForegroundColor Cyan

# 1. org-server.json
if (Test-Path $orgJson) {
  $cfg = Get-Content $orgJson -Raw | ConvertFrom-Json
  Write-Host "[OK] org-server.json -> $($cfg.url)" -ForegroundColor Green
  if ($cfg.url -ne $OrgUrl.TrimEnd('/')) {
    Write-Host "[WARN] URL differs from -OrgUrl $OrgUrl" -ForegroundColor Yellow
  }
} else {
  Write-Host "[FAIL] missing $orgJson" -ForegroundColor Red
  Write-Host "       Create: { `"url`": `"$OrgUrl`" } then restart AionUI" -ForegroundColor DarkGray
}

# 2. org-session.token (after real login with linkage)
if (Test-Path $tokenFile) {
  $tok = (Get-Content $tokenFile -Raw).Trim()
  if ($tok.Length -gt 50) {
    Write-Host "[OK] org-session.token len=$($tok.Length)" -ForegroundColor Green
  } else {
    Write-Host "[WARN] org-session.token too short — login linkage may have failed" -ForegroundColor Yellow
  }
} else {
  Write-Host "[WARN] no org-session.token — login with org-server configured and WITHOUT bypass" -ForegroundColor Yellow
}

# 3. Bypass env in current shell
if ($env:AIONUI_BYPASS_AUTH -eq '1') {
  Write-Host "[WARN] AIONUI_BYPASS_AUTH=1 in this shell — linkage test needs real login" -ForegroundColor Yellow
}

# 4. External reachability
try {
  $status = Invoke-RestMethod -Uri "$($OrgUrl.TrimEnd('/'))/api/auth/status" -TimeoutSec 10
  Write-Host "[OK] center reachable needs_setup=$($status.data.needs_setup)" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] cannot reach $OrgUrl — firewall or service down" -ForegroundColor Red
  Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkGray
}

if ($ssoMode -eq 'org-idp') {
  Write-Host "`nSSO mode: login once via org IdP only (no local /login)." -ForegroundColor Cyan
  Write-Host "  .\scripts\org-phase0\start-aionui-dev-org-test.ps1" -ForegroundColor DarkGray
} else {
  Write-Host "`nNext: start dev WITHOUT bypass for linkage test:" -ForegroundColor Cyan
  Write-Host "  .\scripts\org-phase0\start-aionui-dev-org-test.ps1" -ForegroundColor DarkGray
}
Write-Host "Then quote session -> Agent Read should log [KNOWLEDGE_SOURCE] Org API`n"
