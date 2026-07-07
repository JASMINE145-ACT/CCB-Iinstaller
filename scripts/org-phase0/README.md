# Org Knowledge Phase 0 — Reproducible Scripts

One-page runbook: Phase 0 [`org-knowledge-phase0-rollout.md`](../../.trellis/spec/integration/org-knowledge-phase0-rollout.md) · SSO [`unified-org-sso-rollout.md`](../../.trellis/spec/integration/unified-org-sso-rollout.md)

**VPS 建员工账号（手动 curl 全流程）：** [`vps-create-employee-runbook.md`](./vps-create-employee-runbook.md)

**WanD 1.0.8 发版（打包 + manifest + 上传）：** [`ccb-installer/docs/wanding-1.0.8-release-runbook.md`](../../ccb-installer/docs/wanding-1.0.8-release-runbook.md)

## Files

| Script | Where to run | Purpose |
|--------|--------------|---------|
| `vps-create-employee-runbook.md` | Ops | **SSH → admin TOKEN → POST /api/users → 验证 → env.local 登记** |
| `env.example` / `env.local.example` | Copy → `env.local` (gitignored) | Secrets template — prefer `env.local.example` |
| `bootstrap-quotation-mapping.py` | Windows / VPS | Import `mapping_table.xlsx` → org `qmap_*` only (API draft + publish) |
| `vps-smoke.sh` | VPS | systemd + auth/status + optional knowledge count |
| `vps-create-employee.sh` | VPS | Promote admin → manager + create employee + verify org login |
| `verify-desktop.ps1` | Windows | org-server.json, org-session.token, center reachability |
| `verify-sso-jit.ps1` | Windows | Org JWT → local JIT + local `/login` 403 (**pilot gate**) |
| `_verify_jwt_crypto.py` | Windows | PyJWT: org token vs `env.local` secret |
| `start-aionui-dev-org-test.ps1` | Windows | Unified SSO dev (`AIONUI_SSO_MODE=org-idp`, no bypass) |
| `configure-vps-jwt-secret.sh` | VPS | Write `/etc/aionorg/env` + systemd drop-in |
| `vps-fix-jwt-env-dropin.sh` | VPS | Fix missing `EnvironmentFile=` drop-in only |
| `repair-employee-sso-env.ps1` | Windows | Fix empty `sso.env` on 1.0.6 installs |
| `phase1-jwt-secret-runbook.md` | Ops | Phase 1 `JWT_SECRET` distribution |
| `sync-org-knowledge-shadow.ps1` | Windows | Manual pull org doc → local shadow md |

Fresh VPS build: [`../vps-org-aioncore-bootstrap.sh`](../vps-org-aioncore-bootstrap.sh) (includes admin manager fix after seed).

## Quick reproduce — new employee

### 1. VPS (SSH)

```bash
# Upload secrets once (from Windows project root)
scp -P 39222 scripts/org-phase0/env.local root@67.216.206.3:/root/org-phase0.env

# On VPS
ssh -p 39222 root@67.216.206.3
source /root/org-phase0.env
bash /opt/aionorg/scripts/org-phase0/vps-create-employee.sh   # or scp script each time:
# bash -s < vps-create-employee.sh  with env exported
```

Or inline:

```bash
ORG_ADMIN_PASSWORD='...' EMPLOYEE_USERNAME=yjc EMPLOYEE_PASSWORD='...' \
  bash vps-create-employee.sh
```

### 2. Windows (employee PC — unified SSO)

```powershell
cd D:\Projects\claude-code-best
python scripts/org-phase0/_verify_jwt_crypto.py          # CRYPTO PASS
.\scripts\org-phase0\verify-sso-jit.ps1 -StartDev        # PASS
.\scripts\org-phase0\start-aionui-dev-org-test.ps1       # manual UI smoke
# Login with EMPLOYEE_USERNAME / EMPLOYEE_PASSWORD (org IdP only)
.\scripts\org-phase0\verify-desktop.ps1 -Dev
```

Phase 0 dual-login (local then silent org): omit `sso.env` or set `AIONUI_SSO_MODE=off`.

### 3. Acceptance

After login (AionUI auto-syncs shadow md):

1. `%APPDATA%\AionUi-Dev\aionui\org-session.token` non-empty  
2. Shadow file exists (default `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md`) with sibling `.org-meta.json`  
3. Edit knowledge on VPS → re-login or run `sync-org-knowledge-shadow.ps1` → Agent Read same path shows updated content  
4. MCP stderr may show `[KNOWLEDGE_SOURCE] Org API` on Python internal loads (optional)

## Secrets

- **Never commit** `env.local` or `/root/org-phase0.env`.
- Store admin password from bootstrap `reset-password` in team password manager.
- Employee password in `env.local` must match **local AionUI login**.
