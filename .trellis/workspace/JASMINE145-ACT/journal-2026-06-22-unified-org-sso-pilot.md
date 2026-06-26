# Session: Unified Org SSO — Pilot Verification

**Date:** 2026-06-22  
**Scope:** `openspec/changes/unified-org-sso/` — VPS JWT alignment + dev JIT smoke

---

## Delivered (prior sessions)

- AionCore: `AIONUI_SSO_MODE`, JIT `upsert_from_token`, login/QR 403, bypass gate
- AionUI: org-only login, unified token, org knowledge guard
- Installer: `sso.env.example`, `ccb-launch-aionui.cmd` loader
- Scripts: `verify-sso-jit.ps1`, `_verify_jwt_crypto.py`, `vps-fix-jwt-env-dropin.sh`

---

## Pilot debug (2026-06-22)

| Issue | Root cause | Resolution |
|-------|------------|------------|
| Local 401 after org login OK | `/etc/aionorg/env` existed but **no** `aionorg.service.d/jwt-secret.conf` — process env had no `JWT_SECRET` | Created drop-in; `grep JWT_SECRET /proc/$PID/environ` non-empty |
| User pasted `<JWT_SECRET>` with brackets | Doc placeholder copied literally | Remove `<>`; raw value only |
| Local 500 after crypto fixed | Phase 0 dev DB had `yjc` with **different id** than org JWT `user_id` | Deleted orphan row from `AionUi-Dev/aionui-backend.db` |

---

## Verified (evidence)

```text
python scripts/org-phase0/_verify_jwt_crypto.py
→ CRYPTO PASS: env.local JWT_SECRET validates org-issued token

.\scripts\org-phase0\verify-sso-jit.ps1 -StartDev
→ [OK] org accepts token user=yjc
→ [OK] local API 200
→ [OK] local /login -> 403 Forbidden
→ PASS: org JWT works on local aioncore (SSO JIT)
```

Prior automated gates: `cargo test -p aionui-auth -p aionui-db` (707), AionUI SSO unit tests (9), Python org client (3).

---

## Trellis capture

- **Spec:** [`.trellis/spec/integration/unified-org-sso-rollout.md`](../../spec/integration/unified-org-sso-rollout.md)
- **Runbook updated:** `scripts/org-phase0/phase1-jwt-secret-runbook.md` (systemd drop-in required)

---

## Still deferred

- Fleet rollout (10 employees) — tasks §5.2
- JIT username-collision migration (Phase 0 → SSO) — automate orphan cleanup tasks §7.1
- `buildSpawnEnv` explicit `JWT_SECRET` passthrough in aionui-src (inherit works when shell sets env before `bun run dev`)
