# One-shot prep: org admin UI dev against VPS org API.
# Usage:
#   .\scripts\org-phase0\setup-org-admin-dev.ps1
#   .\scripts\org-phase0\setup-org-admin-dev.ps1 -SkipSmoke

param(
  [switch]$SkipSmoke,
  [string]$RepoRoot = 'D:\Projects\claude-code-best',
  [string]$AionUiSrc = 'D:\Projects\aionui-src',
  [string]$OrgUrl = 'http://67.216.206.3:13401'
)

$ErrorActionPreference = 'Stop'
$OrgUrl = $OrgUrl.Trim().TrimEnd('/')

function Read-EnvLocal {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $map[$Matches[1]] = $Matches[2]
    }
  }
  return $map
}

$envLocal = Join-Path $RepoRoot 'scripts\org-phase0\env.local'
if (-not (Test-Path $envLocal)) {
  throw "Missing $envLocal — copy from env.local.example"
}

$envMap = Read-EnvLocal $envLocal
if ($envMap['ORG_CENTER_URL']) { $OrgUrl = $envMap['ORG_CENTER_URL'].Trim().TrimEnd('/') }

Write-Host ''
Write-Host '=== Org admin dev setup ===' -ForegroundColor Cyan
Write-Host ''

# 1) org-server.json for AionUi-Dev profile
$orgJsonPath = Join-Path $env:APPDATA 'AionUi-Dev\aionui\org-server.json'
New-Item -ItemType Directory -Force -Path (Split-Path $orgJsonPath -Parent) | Out-Null
@{ url = $OrgUrl } | ConvertTo-Json -Compress | Set-Content -Path $orgJsonPath -Encoding UTF8
Write-Host "[ok] $orgJsonPath -> $OrgUrl" -ForegroundColor Green

# 2) sso.env mirror for start-dev-full fallback
$ssoDir = Join-Path $env:LOCALAPPDATA 'CCB-Wanding\config'
New-Item -ItemType Directory -Force -Path $ssoDir | Out-Null
$ssoPath = Join-Path $ssoDir 'sso.env'
$jwt = $envMap['JWT_SECRET']
if (-not $jwt) { throw 'JWT_SECRET missing in env.local' }
@(
  "ORG_SERVER_URL=$OrgUrl"
  "AIONUI_SSO_MODE=org-idp"
  "JWT_SECRET=$jwt"
) | Set-Content -Path $ssoPath -Encoding UTF8
Write-Host "[ok] $ssoPath" -ForegroundColor Green

# 3) aionui-src org-users UI present
$orgUsersPage = Join-Path $AionUiSrc 'packages\desktop\src\renderer\pages\orgUsers\OrgUsersPage\index.tsx'
if (-not (Test-Path $orgUsersPage)) {
  throw "Phase 2 UI not found: $orgUsersPage — clone/sync aionui-src first"
}
Write-Host "[ok] org-users UI in aionui-src" -ForegroundColor Green

# 4) optional API smoke
if (-not $SkipSmoke) {
  Write-Host ''
  Write-Host 'Running org-users smoke against VPS...' -ForegroundColor Cyan
  & (Join-Path $RepoRoot 'scripts\org-phase0\vps-org-users-smoke.ps1') -BaseUrl $OrgUrl -EnvLocal $envLocal
}

Write-Host ''
Write-Host '=== Start dev ===' -ForegroundColor Yellow
Write-Host '  cd D:\Projects\claude-code-best'
Write-Host '  .\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -BuildAioncore:$false'
Write-Host ''
Write-Host 'Login: admin + ORG_ADMIN_PASSWORD from env.local' -ForegroundColor DarkGray
Write-Host 'Then: left sider -> org users (#/org-users), visible only when is_admin=true' -ForegroundColor DarkGray
Write-Host ''
