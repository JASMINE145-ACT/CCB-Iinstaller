# Session: CCB-Wanding 1.0.7 — SSO JWT pack fix + fleet stable

**Date:** 2026-06-23  
**Scope:** Installer SSO seed · 1.0.6 regression · employee login

---

## Problem (1.0.6)

| Symptom | Root cause |
|---------|------------|
| Org `/login` OK; UI bounces to login | Local aioncore **401** — cannot verify org JWT |
| `sso.env` has `JWT_SECRET=` empty | `build-wanding.ps1` injected JWT only into `staging\resources\sso.env.example` |
| Bootstrap copies wrong file | `ensure-wanding-settings.ps1` seeds from `vendor\wanding\config\sso.env.example` (never injected) |

**Not caused by:** launcher, Route-B, `claude.cmd`, i18n.

---

## Fix (source)

| File | Change |
|------|--------|
| `ccb-installer/scripts/build-wanding.ps1` | `Set-StagedSsoJwtSecret` → **both** `resources\` and `vendor\wanding\config\` templates |
| `ccb-installer/scripts/ensure-wanding-settings.ps1` | Prefer template with JWT; repair empty `sso.env` on bootstrap |
| `scripts/org-phase0/repair-employee-sso-env.ps1` | One-shot fix for 1.0.6 deployed machines |
| `ccb-installer/resources/install-health-manifest.json` | Doc: ≥ 1.0.7 auto-seed |

---

## Ship

| Artifact | Result |
|----------|--------|
| `CCB-Wanding-1.0.7.exe` | Built incremental (`-SkipAionUiBuild -SkipBuild`) ~31 min |
| Staging verify | Both `sso.env.example` paths contain 64-char `JWT_SECRET` |
| Employee test | **yjc login stable** (user confirmed 2026-06-23) |

---

## Ops notes

- **Fleet minimum:** 1.0.7 for SSO rollout; do not distribute 1.0.6.
- **Upgrade from 1.0.6:** delete stale `sso.env` or run `repair-employee-sso-env.ps1` if JWT still empty after reinstall.
- **Build contract:** `scripts/org-phase0/env.local` must exist on pack machine (JWT injected at build time — not committed).

---

## Trellis updated

- `.trellis/spec/integration/unified-org-sso-rollout.md` — § Pack 1.0.7, error matrix, changelog
- `.trellis/spec/integration/wanding-mvp-v1.md` — §4 employee rollout
- `.trellis/spec/integration/index.md`
- `scripts/org-phase0/README.md`
