# VPS deploy handoff 鈥?org admin (Phase 3)

> Generated: 2026-07-14 10:15:53  
> Tarball ready locally 鈥?**you upload + build on VPS**.

## Local prep (done)

| Item | Evidence |
|------|----------|
| Migration 025 | `AionCore/crates/aionui-db/migrations/025_is_admin.sql` |
| Routes | `/api/org-users` in `aionui-work-tasks/src/routes.rs` |
| Tests | `cargo test -p aionui-work-tasks admin_*` + `bootstrap_admin_is_org_admin` |
| Tarball | `_tmp/aioncore-upload.tgz` (3.8 MB) |
| SHA256 | `A969E8D65AFBFBA1061A4191142C2AA9E1D05DDDD0D9C489415B0EF0F3E51558` |

## Your steps on VPS

### A. Upload (pick one)

**Option 1 鈥?existing script (password SSH):**

```powershell
cd D:\Projects\claude-code-best
.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
```

**Option 2 鈥?manual scp (if script hangs):**

```powershell
scp -P 39222 _tmp\aioncore-upload.tgz root@67.216.206.3:/opt/aionorg/
```

### B. SSH build + restart

```bash
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
```

**Do not run** `bootstrap.sh` on existing fleet DB (can overwrite `/etc/aionorg/env`).

### C. Smoke (on VPS or from PC)

```bash
# On VPS:
source /root/org-phase0.env   # or copy env.local to VPS
bash /opt/aionorg/AionCore/../scripts/org-phase0/vps-org-users-smoke.sh
```

Or from Windows (after deploy):

```powershell
.\scripts\org-phase0\vps-org-users-smoke.ps1
```

Paste results into `.trellis/tasks/07-13-07-13-org-admin-user-management/vps-smoke-log.md`.

## Desktop app

Rebuild/sync AionUI if employees use packaged exe 鈥?Phase 2 UI is in `aionui-src` (dev) or next installer.

