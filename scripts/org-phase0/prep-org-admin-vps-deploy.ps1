# Local prep for Phase 3 — org admin /api/org-users (no SSH upload).
# Run from repo root: .\scripts\org-phase0\prep-org-admin-vps-deploy.ps1

param(
  [string]$RepoRoot = 'D:\Projects\claude-code-best'
)

$ErrorActionPreference = 'Stop'

$AionCore = Join-Path $RepoRoot 'AionCore'
$TmpDir = Join-Path $RepoRoot '_tmp'
$Tarball = Join-Path $TmpDir 'aioncore-upload.tgz'
$Migration = Join-Path $AionCore 'crates\aionui-db\migrations\025_is_admin.sql'
$Routes = Join-Path $AionCore 'crates\aionui-work-tasks\src\routes.rs'
$Handoff = Join-Path $RepoRoot '.trellis\tasks\07-13-07-13-org-admin-user-management\vps-deploy-handoff.md'

Write-Host ''
Write-Host '=== Org admin VPS deploy — local prep (no upload) ===' -ForegroundColor Cyan
Write-Host ''

# 1. Source gates
foreach ($path in @($Migration, $Routes)) {
  if (-not (Test-Path $path)) { throw "Missing: $path" }
}
$routesText = Get-Content $Routes -Raw
if ($routesText -notmatch '/api/org-users') {
  throw 'routes.rs missing /api/org-users — deploy wrong tree'
}
Write-Host '[OK] 025_is_admin.sql + /api/org-users routes present' -ForegroundColor Green

# 2. Unit/integration tests (AionCore only)
Write-Host ''
Write-Host 'Running cargo tests (admin org-users)...' -ForegroundColor Cyan
function Invoke-CargoTest {
  param([string[]]$CargoArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & cargo @CargoArgs
    if ($LASTEXITCODE -ne 0) { throw "cargo failed ($LASTEXITCODE): cargo $($CargoArgs -join ' ')" }
  } finally {
    $ErrorActionPreference = $prev
  }
}

Push-Location $AionCore
try {
  Invoke-CargoTest @('test', '-p', 'aionui-work-tasks', '--test', 'service_integration', 'admin_')
  Invoke-CargoTest @('test', '-p', 'aionui-db', 'bootstrap_admin_is_org_admin')
} finally {
  Pop-Location
}
Write-Host '[OK] cargo tests passed' -ForegroundColor Green

# 3. Pack tarball (same as deploy-org-aioncore-vps.ps1, no scp)
$SeedFile = Join-Path $RepoRoot 'data\wanding_business_knowledge.md'
if (-not (Test-Path $SeedFile)) { throw "Missing seed: $SeedFile" }

New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null
Write-Host ''
Write-Host 'Packing AionCore tarball (exclude target*, .git, data-org/)...' -ForegroundColor Cyan
Push-Location $AionCore
try {
  & tar `
    --exclude=target `
    --exclude=target-* `
    --exclude=.git `
    --exclude=data-org `
    -czf $Tarball .
  if ($LASTEXITCODE -ne 0) { throw "tar failed ($LASTEXITCODE)" }
} finally {
  Pop-Location
}

$hash = (Get-FileHash -Algorithm SHA256 $Tarball).Hash
$tarMb = [math]::Round((Get-Item $Tarball).Length / 1MB, 1)
Write-Host "[OK] $Tarball ($tarMb MB)" -ForegroundColor Green
Write-Host "     SHA256: $hash" -ForegroundColor DarkGray

# 4. Write handoff snippet
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$handoffBody = @"
# VPS deploy handoff — org admin (Phase 3)

> Generated: $stamp  
> Tarball ready locally — **you upload + build on VPS**.

## Local prep (done)

| Item | Evidence |
|------|----------|
| Migration 025 | ``AionCore/crates/aionui-db/migrations/025_is_admin.sql`` |
| Routes | ``/api/org-users`` in ``aionui-work-tasks/src/routes.rs`` |
| Tests | ``cargo test -p aionui-work-tasks admin_*`` + ``bootstrap_admin_is_org_admin`` |
| Tarball | ``_tmp/aioncore-upload.tgz`` ($tarMb MB) |
| SHA256 | ``$hash`` |

## Your steps on VPS

### A. Upload (pick one)

**Option 1 — existing script (password SSH):**

``````powershell
cd D:\Projects\claude-code-best
.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
``````

**Option 2 — manual scp (if script hangs):**

``````powershell
scp -P 39222 _tmp\aioncore-upload.tgz root@67.216.206.3:/opt/aionorg/
``````

### B. SSH build + restart

``````bash
ssh -p 39222 root@67.216.206.3

cd /opt/aionorg
# if not using -ExtractOnRemote:
rm -rf AionCore && mkdir -p AionCore && tar -xzf aioncore-upload.tgz -C AionCore

grep -n org-users AionCore/crates/aionui-work-tasks/src/routes.rs
grep 025_is_admin AionCore/crates/aionui-db/migrations/*.sql

cd /opt/aionorg/AionCore
cargo build --release -p aionui-app

# Backup DB before first migration 025 on production:
cp -a /opt/aionorg/data-org/aionui-backend.db /opt/aionorg/data-org/aionui-backend.db.bak-YYYYMMDD

systemctl restart aionorg
systemctl status aionorg --no-pager | head -15
``````

**Do not run** ``bootstrap.sh`` on existing fleet DB (can overwrite ``/etc/aionorg/env``).

### C. Smoke (on VPS or from PC)

``````bash
# On VPS:
source /root/org-phase0.env   # or copy env.local to VPS
bash /opt/aionorg/AionCore/../scripts/org-phase0/vps-org-users-smoke.sh
``````

Or from Windows (after deploy):

``````powershell
.\scripts\org-phase0\vps-org-users-smoke.ps1
``````

Paste results into ``.trellis/tasks/07-13-07-13-org-admin-user-management/vps-smoke-log.md``.

## Desktop app

Rebuild/sync AionUI if employees use packaged exe — Phase 2 UI is in ``aionui-src`` (dev) or next installer.

"@

Set-Content -Path $Handoff -Value $handoffBody -Encoding UTF8
Write-Host ''
Write-Host "[OK] Handoff written: $Handoff" -ForegroundColor Green
Write-Host ''
Write-Host '=== You do next ===' -ForegroundColor Yellow
Write-Host '  1. scp/deploy tarball to VPS (see handoff)'
Write-Host '  2. cargo build --release -p aionui-app && systemctl restart aionorg'
Write-Host '  3. Run vps-org-users-smoke.ps1 or .sh'
Write-Host ''
