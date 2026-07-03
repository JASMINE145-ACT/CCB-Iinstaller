# P0 — Credential rotation runbook (ops only)

**Do not commit secrets.** Evidence of rotation stays in password manager or private ops channel — not in git.

**Staging file (gitignored):** `scripts/org-phase0/.p0-rotation-staging.env` — generated values for one-time apply, delete when done.

---

## Why

`.mcp.json`, `.env.accurate`, and `scripts/org-phase0/env.local` were previously git-tracked. Treat **all values that ever appeared in git history as compromised**, even after `6d81848f` removed them from the index.

---

## Checklist

| # | Asset | Where to rotate | Where to apply locally | VPS / cloud |
|---|-------|-----------------|------------------------|-------------|
| 1 | **JWT_SECRET** | Generate new (staging file or `openssl rand -base64 48`) | `scripts/org-phase0/env.local` → `repair-employee-sso-env.ps1` | `configure-vps-jwt-secret.sh` — see `phase1-jwt-secret-runbook.md` |
| 2 | **Org admin password** | Org user DB / admin API | `env.local` `ORG_ADMIN_PASSWORD` | VPS org service user store |
| 3 | **Employee password** | Same | `env.local` `EMPLOYEE_PASSWORD` | Must match AionUI login |
| 4 | **AOL token trio** | AOL workspace admin console | `.mcp.json` + `.env.accurate` (repo root, gitignored) | N/A |
| 5 | **CCB-Wanding vendor copy** | After local update | `D:\CCB-Wanding\vendor\wanding\.env.accurate` if used by probe | Sync via install path |

---

## Order (recommended)

```
1. AOL console  →  new AOL_*  →  .mcp.json + .env.accurate
2. JWT + org passwords  →  VPS first  →  then env.local + sso.env repair
3. Smoke: verify-sso-jit.ps1  +  test-mcp-health.ps1 -Probe
4. Delete .p0-rotation-staging.env
5. Mark P0-A ops done in password manager (not git)
```

---

## Commands (no secret values in this doc)

### JWT — VPS

```bash
# On VPS (see scripts/org-phase0/phase1-jwt-secret-runbook.md)
JWT_SECRET='<from-staging>' bash /root/configure-vps-jwt-secret.sh
bash /root/vps-fix-jwt-env-dropin.sh
```

### JWT — local employee

```powershell
# After env.local updated
powershell -NoProfile -File scripts\org-phase0\repair-employee-sso-env.ps1 -EnvLocalPath scripts\org-phase0\env.local
powershell -NoProfile -File scripts\org-phase0\verify-sso-jit.ps1
```

### MCP regression

```powershell
powershell -NoProfile -File ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet
```

---

## What agents cannot do for you

- **AOL console** — requires your AOL workspace admin login
- **VPS SSH** — requires `root@67.216.206.3:39222` (or current host from your env)
- **Proof of rotation** — store in 1Password / private ops note, not Trellis/git

---

## P0 acceptance

Epic P0-A checkbox: "已知暴露凭据已轮换（有证据，不写入 spec）" — satisfied when checklist 1–4 done + smoke PASS + staging file deleted.
