# Work tasks P5 deploy verification (local preflight + optional org VPS smoke).
#
# Usage:
#   .\scripts\org-phase0\verify-work-tasks-p5.ps1              # local only
#   .\scripts\org-phase0\verify-work-tasks-p5.ps1 -OrgSmoke    # also hit VPS /api/work-tasks
#
# Prereq: scripts/org-phase0/env.local with ORG_SERVER_URL, JWT_SECRET (for -OrgSmoke)

param(
  [switch]$OrgSmoke,
  [string]$OrgUrl = '',
  [string]$AdminUser = 'admin',
  [string]$AdminPassword = ''
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$AionCore = Join-Path $RepoRoot 'AionCore'
$Bin = Join-Path $AionCore 'target\release\aioncore.exe'
$Migration020 = Join-Path $AionCore 'crates\aionui-db\migrations\020_work_task_attachment_storage.sql'
$EnvLocal = Join-Path $PSScriptRoot 'env.local'
$AionUiSrc = Join-Path (Split-Path $RepoRoot -Parent) 'aionui-src'

function Write-Step($msg) { Write-Host "`n== $msg ==" -ForegroundColor Cyan }
function Pass($msg) { Write-Host "  PASS  $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  FAIL  $msg" -ForegroundColor Red; $script:Failed = $true }
function Warn($msg) { Write-Host "  WARN  $msg" -ForegroundColor Yellow }

$Failed = $false

Write-Step 'Local preflight'

if (Test-Path $Bin) {
  $mtime = (Get-Item $Bin).LastWriteTime
  Pass "aioncore.exe exists ($mtime)"
} else {
  Fail "Missing $Bin — run scripts\build-aioncore-work-tasks.cmd"
}

if (Test-Path $Migration020) {
  Pass 'migration 020_work_task_attachment_storage.sql present'
} else {
  Fail "Missing $Migration020"
}

$routes = Join-Path $AionCore 'crates\aionui-app\src\router\routes.rs'
if (Test-Path $routes) {
  $hit = Select-String -Path $routes -Pattern 'work.tasks|work_tasks' -Quiet
  if ($hit) { Pass 'aionui-app routes include work-tasks' } else { Fail 'work-tasks routes not found in routes.rs' }
}

$bridge = Join-Path $AionUiSrc 'packages\desktop\src\process\bridge\workTaskAttachmentBridge.ts'
if (Test-Path $bridge) {
  Pass 'P5 workTaskAttachmentBridge.ts present (aionui-src)'
} else {
  Warn "P5 frontend bridge not found at $bridge — deploy AionUI from updated aionui-src"
}

Write-Step 'Rust tests (aionui-work-tasks)'
Push-Location $AionCore
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  & cargo test -p aionui-work-tasks --lib --test service_integration 2>&1 | Out-Host
  if ($LASTEXITCODE -eq 0) { Pass 'cargo test aionui-work-tasks' } else { Fail "cargo test exit $LASTEXITCODE" }
} finally {
  $ErrorActionPreference = $prevEap
  Pop-Location
}

Write-Step 'Vitest workTaskTypes'
if (Test-Path $AionUiSrc) {
  Push-Location $AionUiSrc
  try {
    $vitestOut = & bun vitest run tests/unit/common-utils/workTaskTypes.test.ts 2>&1
    $vitestOut | Out-Host
    if ($LASTEXITCODE -eq 0) { Pass 'vitest workTaskTypes' } else { Fail "vitest exit $LASTEXITCODE" }
  } catch {
    if ($LASTEXITCODE -eq 0) { Pass 'vitest workTaskTypes' } else { Fail "vitest: $_" }
  } finally {
    Pop-Location
  }
} else {
  Warn "aionui-src not at $AionUiSrc — skip vitest"
}

if ($OrgSmoke) {
  Write-Step 'Org VPS smoke'

  if (-not $OrgUrl -and (Test-Path $EnvLocal)) {
    Get-Content $EnvLocal | ForEach-Object {
      if ($_ -match '^\s*ORG_SERVER_URL\s*=\s*(.+)\s*$') { $OrgUrl = $matches[1].Trim() }
      if ($_ -match '^\s*ORG_ADMIN_PASSWORD\s*=\s*(.+)\s*$' -and -not $AdminPassword) {
        $AdminPassword = $matches[1].Trim()
      }
    }
  }

  if (-not $OrgUrl) { $OrgUrl = 'http://67.216.206.3:13401' }
    $base = $OrgUrl.TrimEnd('/')
    try {
      $curl = & curl.exe -s -o NUL -w '%{http_code}' "$base/api/work-tasks" 2>&1
      $code = [int]$curl
      if ($code -eq 401) { Pass "GET /api/work-tasks -> 401 (route alive)" }
      elseif ($code -eq 404) { Fail 'GET /api/work-tasks -> 404 (binary not deployed?)' }
      else { Warn "GET /api/work-tasks -> $code" }
    } catch {
      Fail "Org unreachable: $_"
    }

    if ($AdminPassword) {
      try {
        $body = @{ username = $AdminUser; password = $AdminPassword } | ConvertTo-Json
        $login = Invoke-RestMethod -Uri "$base/login" -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 15
        $token = $login.token
        if (-not $token) { Fail 'login returned no token' }
        else {
          Pass 'admin login OK'
          $role = $login.user.work_task_role
          if ($role -eq 'manager') { Pass "admin work_task_role=manager" } else { Warn "admin work_task_role=$role" }
          $headers = @{ Authorization = "Bearer $token" }
          $list = Invoke-RestMethod -Uri "$base/api/work-tasks" -Headers $headers -TimeoutSec 15
          Pass 'GET /api/work-tasks with JWT OK'
        }
      } catch {
        Fail "admin login/CRUD smoke: $_"
      }
    } else {
      Warn 'ORG_ADMIN_PASSWORD not set — skip authenticated CRUD smoke'
    }
}

Write-Step 'Next steps (manual)'
Write-Host @"

  VPS deploy (requires SSH password):
    cd D:\Projects\claude-code-best
    .\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote

  On VPS:
    cd /opt/aionorg/AionCore && cargo build --release -p aionui-app
    systemctl restart aionorg

  Desktop:
    .\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
    # or ship new WanD exe with P5 aionui-src changes

"@ -ForegroundColor DarkGray

if ($Failed) {
  Write-Host "`nVerification FAILED" -ForegroundColor Red
  exit 1
}
Write-Host "`nVerification PASSED" -ForegroundColor Green
exit 0
