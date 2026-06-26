# Phase 1 — JWT_SECRET rollout (unified-org-sso)

> **Ops only.** Do not commit secrets. See `openspec/changes/unified-org-sso/tasks.md` §2 and [`.trellis/spec/integration/unified-org-sso-rollout.md`](../../.trellis/spec/integration/unified-org-sso-rollout.md).

## Goal

Org VPS and employee local aioncore verify the **same** JWT with `JWT_SECRET`. After this, an org-issued token can authenticate local API calls (Phase 2 JIT builds on this).

## 1. Generate secret (once per company)

```powershell
# Example — use your password manager to store the output
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

## 2. VPS (`67.216.206.3`)

**Critical:** `/etc/aionorg/env` alone is **not enough**. systemd must load it into the aioncore process.

```bash
ssh -p 39222 root@67.216.206.3

# Write secret (NO angle brackets — do not copy <JWT_SECRET> placeholder literally)
mkdir -p /etc/aionorg
echo 'JWT_SECRET=YOUR_64_CHAR_SECRET' > /etc/aionorg/env   # or nano
chmod 600 /etc/aionorg/env

# One-shot fix (upload script or paste):
bash /root/vps-fix-jwt-env-dropin.sh
# OR manually:
mkdir -p /etc/systemd/system/aionorg.service.d
cat > /etc/systemd/system/aionorg.service.d/jwt-secret.conf <<'EOF'
[Service]
EnvironmentFile=/etc/aionorg/env
EOF
systemctl daemon-reload
systemctl restart aionorg

# Verify process env (must print JWT_SECRET=...)
PID=$(pgrep -f 'aioncore.*13401' | head -1)
tr '\0' '\n' < /proc/$PID/environ | grep JWT_SECRET

# Smoke login still works
curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}'
```

## 3. Pilot employee machine (local aioncore)

Set the **same** `JWT_SECRET` in the environment of the local `aioncore` subprocess (installer / launch script — not in git).

Dev smoke (after secret aligned):

```powershell
cd D:\Projects\claude-code-best

# Crypto check (org token signed with same secret as env.local)
python scripts/org-phase0/_verify_jwt_crypto.py

# Full JIT smoke (starts dev if needed)
.\scripts\org-phase0\verify-sso-jit.ps1 -StartDev
# Expect: PASS: org JWT works on local aioncore (SSO JIT)
```

**Phase 0 migration note:** If dev DB already has a local `yjc` user with a **different id** than org JWT, JIT returns 500 (`Username already exists`). Delete orphan row or use clean profile — see unified-org-sso-rollout.md §5.

## 4. user_id stability

- Org SQLite `users.id` must **not** change when password is reset.
- Local JIT (Phase 2) maps `payload.user_id` → local `users.id`.

## 5. Knowledge shadow (Phase 0 close-out)

Automatic on AionUI org login (aionui-src). Manual:

```powershell
.\scripts\org-phase0\sync-org-knowledge-shadow.ps1 -Dev -Username yjc -Password '<PWD>'
```

Verify: edit doc on VPS org UI → sync → `wanding_business_knowledge.md.org-meta.json` version bumps → Agent Read shows new text.

## Rollback

Remove `JWT_SECRET` override on VPS (falls back to DB-stored secret) and set `AIONUI_SSO_MODE=off` on employees until Phase 2 is reverted.
