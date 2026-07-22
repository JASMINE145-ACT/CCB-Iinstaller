# WANd.ORG.USER_ADMIN.001 - smoke from Windows against org VPS (after Phase 3 deploy).
# Usage:
#   cd D:\Projects\claude-code-best
#   .\scripts\org-phase0\vps-org-users-smoke.ps1

param(
  [string]$BaseUrl = 'http://67.216.206.3:13401',
  [string]$EnvLocal = 'D:\Projects\claude-code-best\scripts\org-phase0\env.local'
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$BaseUri = [Uri]$BaseUrl

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

function New-OrgSession {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-WebRequest -Uri "$BaseUrl/api/auth/status" -WebSession $session -UseBasicParsing | Out-Null
  return $session
}

function Get-CsrfFromSession {
  param([Microsoft.PowerShell.Commands.WebRequestSession]$Session)
  $cookie = $Session.Cookies.GetCookies($BaseUri) | Where-Object { $_.Name -eq 'aionui-csrf-token' } | Select-Object -First 1
  if (-not $cookie) { throw 'missing aionui-csrf-token cookie' }
  return $cookie.Value
}

function Invoke-OrgLogin {
  param(
    [string]$User,
    [string]$Pass,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )
  $body = @{ username = $User; password = $Pass } | ConvertTo-Json -Compress
  $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/login" -ContentType 'application/json' -Body $body -WebSession $Session
  if (-not $resp.token) { throw "login failed for $User" }
  return $resp
}

function Invoke-OrgRaw {
  param(
    [string]$Method,
    [string]$Path,
    [string]$Token,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [object]$Body = $null
  )
  $headers = @{ Authorization = "Bearer $Token" }
  if ($Method -ne 'GET') {
    $headers['x-csrf-token'] = Get-CsrfFromSession $Session
  }
  $uri = "$BaseUrl$Path"
  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Compress -Depth 5
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
      $resp = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $bytes -WebSession $Session -UseBasicParsing
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -WebSession $Session -UseBasicParsing
    }
    return [PSCustomObject]@{ StatusCode = [int]$resp.StatusCode; Content = $resp.Content }
  } catch {
    $webResp = $_.Exception.Response
    if ($webResp) {
      $stream = $webResp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $content = $reader.ReadToEnd()
      $reader.Close()
      $stream.Close()
      return [PSCustomObject]@{ StatusCode = [int]$webResp.StatusCode; Content = $content }
    }
    throw
  }
}
function ConvertFrom-Utf8Json {
  param([string]$Text)
  $bytes = [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetBytes($Text)
  $utf8Text = [System.Text.Encoding]::UTF8.GetString($bytes)
  return $utf8Text | ConvertFrom-Json
}

$envMap = Read-EnvLocal $EnvLocal
$adminUser = if ($envMap['ORG_ADMIN_USER']) { $envMap['ORG_ADMIN_USER'] } else { 'admin' }
$adminPass = $envMap['ORG_ADMIN_PASSWORD']
$empUser = $envMap['EMPLOYEE_USERNAME']
$empPass = $envMap['EMPLOYEE_PASSWORD']

if (-not $adminPass) { throw "ORG_ADMIN_PASSWORD missing in $EnvLocal" }

$stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
Write-Host "==> org-users smoke @ $BaseUrl ($stamp)" -ForegroundColor Cyan

$adminSession = New-OrgSession

Write-Host "[1] admin login + is_admin"
$admin = Invoke-OrgLogin $adminUser $adminPass $adminSession
if (-not $admin.user.is_admin) {
  throw 'admin is_admin is not true - run migration 025 + ensure_system_user on VPS'
}
Write-Host 'PASS admin is_admin=1' -ForegroundColor Green

Write-Host "[2] admin GET /api/org-users -> 200"
$r = Invoke-OrgRaw GET '/api/org-users' $admin.token $adminSession
if ($r.StatusCode -ne 200) { throw "admin list failed HTTP $($r.StatusCode): $($r.Content)" }
Write-Host 'PASS admin list org-users' -ForegroundColor Green

$smokeUser = "smoke_org_$([int][double]::Parse((Get-Date -UFormat %s)))"
$smokePass = 'SmokeP@ss123456'
# UTF-8 bytes for department name (avoid PS5 script encoding issues)
$dept = [System.Text.Encoding]::UTF8.GetString([byte[]](0xE9, 0x87, 0x87, 0xE8, 0xB4, 0xAD, 0xE9, 0x83, 0xA8))
$jobTitle = [System.Text.Encoding]::UTF8.GetString([byte[]](0xE9, 0x87, 0x87, 0xE8, 0xB4, 0xAD, 0xE4, 0xB8, 0x93, 0xE5, 0x91, 0x98))

Write-Host "[3] admin POST /api/org-users -> 201"
$createBody = @{
  username       = $smokeUser
  password       = $smokePass
  department     = $dept
  job_title      = $jobTitle
  work_task_role = 'employee'
}
$r = Invoke-OrgRaw POST '/api/org-users' $admin.token $adminSession $createBody
if ($r.StatusCode -notin 200, 201) { throw "admin create failed HTTP $($r.StatusCode): $($r.Content)" }
$created = ConvertFrom-Utf8Json $r.Content
$createdDept = if ($created.data.department) { [string]$created.data.department } else { [string]$created.department }
if ($createdDept -ne $dept) { throw "create response department mismatch" }
Write-Host "PASS created $smokeUser" -ForegroundColor Green

Write-Host "[4] new user me/context department"
$userSession = New-OrgSession
$userLogin = Invoke-OrgLogin $smokeUser $smokePass $userSession
$ctxResp = Invoke-WebRequest -Method Get -Uri "$BaseUrl/api/users/me/context" -Headers @{ Authorization = "Bearer $($userLogin.token)" } -WebSession $userSession -UseBasicParsing
$ctx = ConvertFrom-Utf8Json $ctxResp.Content
$ctxDept = if ($ctx.data.department) { [string]$ctx.data.department } else { [string]$ctx.department }
if ($ctxDept -ne $dept) { throw "context department mismatch" }
Write-Host "PASS me/context department=$dept" -ForegroundColor Green

if ($empUser -and $empPass) {
  Write-Host "[5] employee GET /api/org-users -> 403"
  $empSession = New-OrgSession
  $emp = Invoke-OrgLogin $empUser $empPass $empSession
  $r = Invoke-OrgRaw GET '/api/org-users' $emp.token $empSession
  if ($r.StatusCode -ne 403) { throw "employee should get 403, got $($r.StatusCode)" }
  Write-Host "PASS employee $empUser forbidden" -ForegroundColor Green
} else {
  Write-Host 'SKIP [5] employee - set EMPLOYEE_USERNAME/PASSWORD in env.local' -ForegroundColor Yellow
}

Write-Host "[6] manager (non-admin) POST /api/org-users -> 403"
$smokeMgr = "smoke_mgr_$([int][double]::Parse((Get-Date -UFormat %s)))"
$mgrPass = 'SmokeM@gr123456'
$r = Invoke-OrgRaw POST '/api/org-users' $admin.token $adminSession @{
  username = $smokeMgr; password = $mgrPass; work_task_role = 'manager'
}
if ($r.StatusCode -notin 200, 201) { throw "create mgr failed $($r.StatusCode): $($r.Content)" }
$mgrSession = New-OrgSession
$mgrLogin = Invoke-OrgLogin $smokeMgr $mgrPass $mgrSession
$r = Invoke-OrgRaw POST '/api/org-users' $mgrLogin.token $mgrSession @{
  username = 'should_fail'; password = 'SmokeP@ss123456'
}
if ($r.StatusCode -ne 403) { throw "manager should get 403, got $($r.StatusCode)" }
Write-Host 'PASS manager forbidden on POST org-users' -ForegroundColor Green

Write-Host ''
Write-Host "ALL PASS org-users smoke ($BaseUrl)" -ForegroundColor Green
Write-Host "Test users: $smokeUser , $smokeMgr (optional DB cleanup on VPS)" -ForegroundColor DarkGray
