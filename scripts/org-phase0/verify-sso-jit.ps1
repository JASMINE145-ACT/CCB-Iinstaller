# Unified org SSO — org JWT → local aioncore JIT smoke test.
# Usage:
#   .\scripts\org-phase0\verify-sso-jit.ps1
#   .\scripts\org-phase0\verify-sso-jit.ps1 -LocalPort 13400
#   .\scripts\org-phase0\verify-sso-jit.ps1 -StartDev   # launch SSO dev, wait for aioncore, then test
#
# Prereq: local aioncore running with same JWT_SECRET as org VPS (via start-aionui-dev-org-test.ps1 or ccb-launch-aionui.cmd).

param(
  [string]$OrgUrl = '',
  [string]$Username = '',
  [string]$Password = '',
  [int]$LocalPort = 0,
  [switch]$StartDev,
  [int]$WaitSeconds = 90
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$envLocal = Join-Path $scriptDir 'env.local'

function Import-EnvLocal {
  if (-not (Test-Path $envLocal)) {
    throw "Missing $envLocal — copy env.example and fill JWT_SECRET + employee credentials"
  }
  Get-Content $envLocal | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
      Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
    }
  }
}

function Test-AioncorePort {
  param([int]$Port)
  try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/auth/status" -TimeoutSec 3
    return $true
  } catch {
    return $false
  }
}

function Find-LocalAioncorePort {
  $procs = Get-Process -Name aioncore -ErrorAction SilentlyContinue
  if (-not $procs) { return $null }

  $candidates = @()
  foreach ($proc in $procs) {
    try {
      $conns = Get-NetTCPConnection -OwningProcess $proc.Id -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -in @('127.0.0.1', '0.0.0.0', '::1') }
      foreach ($c in $conns) {
        if ($c.LocalPort -ge 1024 -and $c.LocalPort -ne 13401) {
          $candidates += [int]$c.LocalPort
        }
      }
    } catch {
      # fall through to netstat
    }
  }

  if ($candidates.Count -eq 0) {
    $netstat = netstat -ano | Select-String 'LISTENING'
    foreach ($proc in $procs) {
      $pid = $proc.Id
      foreach ($line in $netstat) {
        if ($line -match "127\.0\.0\.1:(\d+)\s+.*\s+$pid\s*$") {
          $port = [int]$matches[1]
          if ($port -ne 13401) { $candidates += $port }
        }
      }
    }
  }

  foreach ($port in ($candidates | Sort-Object -Unique)) {
    if (Test-AioncorePort -Port $port) { return $port }
  }
  return $null
}

function Wait-ForLocalAioncore {
  param([int]$TimeoutSec)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $port = Find-LocalAioncorePort
    if ($port) { return $port }
    Start-Sleep -Seconds 2
  }
  return $null
}

function Get-OrgJwt {
  param([string]$BaseUrl, [string]$User, [string]$Pass)
  $body = @{ username = $User; password = $Pass } | ConvertTo-Json -Compress
  $resp = Invoke-RestMethod -Method POST -Uri "$($BaseUrl.TrimEnd('/'))/login" `
    -ContentType 'application/json' -Body $body -TimeoutSec 20
  if ($resp.token) { return [string]$resp.token }
  if ($resp.data.token) { return [string]$resp.data.token }
  throw 'Org login response missing token field'
}

Import-EnvLocal

if (-not $OrgUrl) { $OrgUrl = $env:ORG_CENTER_URL }
if (-not $Username) { $Username = $env:EMPLOYEE_USERNAME }
if (-not $Password) { $Password = $env:EMPLOYEE_PASSWORD }
if (-not $env:AIONUI_SSO_MODE) { $env:AIONUI_SSO_MODE = 'org-idp' }

Write-Host "`n==> Unified SSO JIT verify" -ForegroundColor Cyan
Write-Host "    org=$OrgUrl user=$Username SSO=$($env:AIONUI_SSO_MODE) JWT_SECRET len=$($env:JWT_SECRET.Length)" -ForegroundColor DarkGray

if ($StartDev) {
  Write-Host "`n[1/4] Starting SSO dev (background)..." -ForegroundColor Yellow
  $devScript = Join-Path $scriptDir 'start-aionui-dev-org-test.ps1'
  Start-Process powershell -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $devScript) -WindowStyle Normal
  Write-Host "    Waiting up to ${WaitSeconds}s for local aioncore..." -ForegroundColor DarkGray
  if (-not $LocalPort) {
    $LocalPort = Wait-ForLocalAioncore -TimeoutSec $WaitSeconds
  }
} elseif (-not $LocalPort) {
  $LocalPort = Find-LocalAioncorePort
}

if (-not $LocalPort) {
  Write-Host "[FAIL] local aioncore not listening — start dev first:" -ForegroundColor Red
  Write-Host "  .\scripts\org-phase0\start-aionui-dev-org-test.ps1" -ForegroundColor DarkGray
  Write-Host "  or re-run with -StartDev" -ForegroundColor DarkGray
  exit 1
}

Write-Host "[OK] local aioncore port=$LocalPort" -ForegroundColor Green
$localBase = "http://127.0.0.1:$LocalPort"

Write-Host "`n[2/4] Org login..." -ForegroundColor Yellow
try {
  $token = Get-OrgJwt -BaseUrl $OrgUrl -User $Username -Pass $Password
  Write-Host "[OK] org JWT len=$($token.Length)" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] org login: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host "`n[2b] Org /api/auth/user (same token)..." -ForegroundColor Yellow
try {
  $headers = @{ Authorization = "Bearer $token" }
  $orgUser = Invoke-RestMethod -Uri "$($OrgUrl.TrimEnd('/'))/api/auth/user" -Headers $headers -TimeoutSec 15
  $orgUname = if ($orgUser.user.username) { $orgUser.user.username } elseif ($orgUser.data.user.username) { $orgUser.data.user.username } else { '?' }
  Write-Host "[OK] org accepts token user=$orgUname" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] org rejected its own token: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host "`n[3/4] Local /api/auth/user with org JWT (JIT)..." -ForegroundColor Yellow
try {
  $headers = @{ Authorization = "Bearer $token" }
  $user = Invoke-RestMethod -Uri "$localBase/api/auth/user" -Headers $headers -TimeoutSec 15
  $uname = if ($user.data.username) { $user.data.username } elseif ($user.username) { $user.username } else { '?' }
  Write-Host "[OK] local API 200 user=$uname" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] local JWT verify/JIT: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "       Org accepts this token but local aioncore returns 401." -ForegroundColor DarkGray
  Write-Host "       => VPS JWT_SECRET and local JWT_SECRET (env.local / sso.env) are NOT the same." -ForegroundColor Yellow
  Write-Host "       On VPS: grep JWT_SECRET /etc/aionorg/env && systemctl restart aionorg" -ForegroundColor DarkGray
  Write-Host "       Restart dev via: .\scripts\org-phase0\start-aionui-dev-org-test.ps1" -ForegroundColor DarkGray
  exit 1
}

Write-Host "`n[4/4] Local POST /login should 403 in SSO mode..." -ForegroundColor Yellow
try {
  $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress
  Invoke-WebRequest -Method POST -Uri "$localBase/login" -ContentType 'application/json' `
    -Body $loginBody -TimeoutSec 10 -ErrorAction Stop | Out-Null
  Write-Host "[FAIL] local /login returned 2xx — SSO gate missing?" -ForegroundColor Red
  exit 1
} catch {
  $status = $null
  if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
  if ($status -eq 403) {
    Write-Host "[OK] local /login -> 403 Forbidden" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] expected 403, got status=$status — $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

Write-Host "`n==> PASS: org JWT works on local aioncore (SSO JIT)`n" -ForegroundColor Green
