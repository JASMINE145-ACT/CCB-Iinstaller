# Unified Org SSO — Ops & Verification (pilot verified 2026-06-22)

> **OpenSpec:** `openspec/changes/unified-org-sso/` · **Parent:** [`org-knowledge.md`](./org-knowledge.md) · **Scripts:** [`scripts/org-phase0/README.md`](../../scripts/org-phase0/README.md)

> **Current fleet (2026-06-26):** Production install **`1.1.2`** at `D:\CCB-Wanding` (Mixing UI + org login). SSO rules below unchanged. **`1.0.6` / `1.0.7`** pack notes are historical regression context only.

**Pilot outcome:** VPS `67.216.206.3:13401` + dev desktop (`AionUi-Dev`) — `verify-sso-jit.ps1` **PASS** after systemd drop-in fix and Phase 0 orphan user cleanup.

**First fleet SSO pack (historical):** **`CCB-Wanding-1.0.7.exe`** — JWT auto-seeded at install; employee **yjc** login stable on packaged install (verified 2026-06-23). Do **not** ship **1.0.6** for SSO rollout (empty `JWT_SECRET` bug — see § Pack / 1.0.6 regression).

---

## Scenario: Employee SSO login (org-idp)

### 1. Scope / Trigger

- Ops creates account on **org VPS only**; employee installs CCB-Wanding, logs in **once**.
- Shared `JWT_SECRET` must be loaded by **both** org aioncore (VPS) and local aioncore subprocess (employee PC).
- JIT provisions local `users` row from org JWT `user_id` on first authenticated local API call.

### 2. Signatures

| Component | Entry |
|-----------|--------|
| Org login | `POST {ORG_SERVER_URL}/login` body `{ username, password }` → `{ token }` or `{ data: { token } }` |
| Local auth (SSO) | `GET http://127.0.0.1:{localPort}/api/auth/user` header `Authorization: Bearer {orgJwt}` |
| Local login blocked | `POST http://127.0.0.1:{localPort}/login` → **403** when `AIONUI_SSO_MODE=org-idp` |
| JIT upsert | `IUserRepository::upsert_from_token(user_id, username)` — `ON CONFLICT(id) DO UPDATE username` |
| VPS env fix | `bash scripts/org-phase0/vps-fix-jwt-env-dropin.sh` |

### 3. Contracts

| Key | Where | Required |
|-----|-------|----------|
| `JWT_SECRET` | VPS `/etc/aionorg/env` + employee `sso.env` (seeded from install template **≥ 1.0.7**) or dev `scripts/org-phase0/env.local` | **Same 64-char value everywhere** |
| `AIONUI_SSO_MODE` | `org-idp` on employee/dev; omit or `off` for Phase 0 fallback | SSO rollout |
| Org URL | `%APPDATA%/AionUi/aionui/org-server.json` → `{ "url": "http://67.216.206.3:13401" }` | Yes |
| Token stores | Same JWT string → `aionui-session-token` + `org-session.token` | SSO mode |
| Launcher | Start via `ccb-launch-aionui.cmd` (loads `%LOCALAPPDATA%\CCB-Wanding\config\sso.env`) | Production |

**VPS systemd (mandatory — file alone is not enough):**

```ini
# /etc/systemd/system/aionorg.service.d/jwt-secret.conf
[Service]
EnvironmentFile=/etc/aionorg/env
```

`/etc/aionorg/env` format (no angle brackets, no quotes):

```text
JWT_SECRET=<64-char secret from password manager>
```

### 4. Validation & Error Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| Org login OK; local `/api/auth/user` **401** | VPS process env missing `JWT_SECRET` (drop-in not created) or secret ≠ employee env | Run `vps-fix-jwt-env-dropin.sh`; verify `tr '\0' '\n' < /proc/$PID/environ \| grep JWT_SECRET` |
| `_verify_jwt_crypto.py` **CRYPTO FAIL** | Org still signing with DB secret, not `/etc/aionorg/env` | Same as above + `systemctl restart aionorg` |
| Org login OK; UI **bounces back**; health **JWT empty** | **1.0.6 pack bug:** JWT injected only to `resources\` template; bootstrap copies empty `vendor\wanding\config\` template | Ship **≥ 1.0.7**; or `repair-employee-sso-env.ps1`; delete stale `sso.env` + re-bootstrap |
| Local `/api/auth/user` **500**; log `Username 'x' already exists` | Phase 0 local user same **username**, different **id** than org JWT | Delete orphan local row before JIT (see §5 Bad case) |
| `verify-sso-jit` picks wrong port **404** | Non-aioncore listener on adjacent port | Script probes `/api/auth/status` (fixed 2026-06-22) |
| Doc placeholder copied literally | `JWT_SECRET=<secret>` written with `<>` | Remove brackets; value only after `=` |

### 5. Good / Base / Bad Cases

**Good (pilot 2026-06-22):**

1. VPS drop-in loaded; process env shows `JWT_SECRET=…`
2. `python scripts/org-phase0/_verify_jwt_crypto.py` → `CRYPTO PASS`
3. `.\scripts\org-phase0\verify-sso-jit.ps1 -StartDev` → `PASS: org JWT works on local aioncore (SSO JIT)`
4. Electron login once → chat + `#/org-knowledge` without second org login

**Base:** Fresh employee install (no Phase 0 local user) — JIT insert succeeds on first API call.

**Bad:** Dev machine had Phase 0 user `yjc` with id `user_019ede8f-…` while org JWT carries `user_019ede87-…` → JIT INSERT hits `users.username UNIQUE` → 500.

**Orphan cleanup (dev only):**

```powershell
# Stop electron/aioncore first
python -c "import sqlite3; c=sqlite3.connect(r'%APPDATA%\AionUi-Dev\aionui\aionui-backend.db'); c.execute('DELETE FROM users WHERE username=? AND id!=?', ('yjc','user_019ede87-9c27-7352-8087-584b78b69b2e')); c.commit()"
```

Production: prefer clean profile or ops script (deferred: tasks §7.1 orphan cleanup).

### Pack — JWT in installer (≥ 1.0.7)

| Version | `sso.env` at first install | Notes |
|---------|---------------------------|--------|
| **1.0.7+** | `ensure-wanding-settings.ps1` seeds from template with **non-empty** `JWT_SECRET` | `build-wanding.ps1` injects from `scripts/org-phase0/env.local` into **both** `staging\resources\sso.env.example` and `staging\vendor\wanding\config\sso.env.example` |
| **1.0.6** | `AIONUI_SSO_MODE=org-idp` but `JWT_SECRET=` empty | **Do not fleet-ship** — org `/login` OK, local 401, login bounce |

**Build (SSO fleet):**

```powershell
# env.local must contain JWT_SECRET= (same as VPS)
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.7
# Script-only hotfix after AionUI already built:
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.7 -SkipAionUiBuild -SkipBuild
```

**Post-install gates:**

```powershell
.\ccb-installer\scripts\test-install-health.ps1   # sso.env org-idp + JWT_SECRET set
.\scripts\org-phase0\verify-sso-jit.ps1            # optional on pack machine
```

**Upgrade from 1.0.6:** If `%LOCALAPPDATA%\CCB-Wanding\config\sso.env` already exists with empty JWT, reinstall alone may not fix — run `repair-employee-sso-env.ps1` or delete `sso.env` then launcher (bootstrap re-seeds from 1.0.7 template). New `ensure-wanding-settings.ps1` also **repairs** empty JWT when install template has secret.

### 6. Tests Required

| Gate | Command | Assert |
|------|---------|--------|
| Crypto align | `python scripts/org-phase0/_verify_jwt_crypto.py` | `CRYPTO PASS` |
| End-to-end JIT | `.\scripts\org-phase0\verify-sso-jit.ps1` | steps 2b–4 OK; final `PASS` |
| Rust SSO | `cargo test -p aionui-auth sso -- --test-threads=1` | login/QR 403, bypass+SSO 401, JIT 200 |
| AionUI | `bun test tests/unit/common-auth/orgAuthLogin.test.ts tests/unit/common-adapter/orgHttpBridge.test.ts` | unified token write |
| Desktop config | `.\scripts\org-phase0\verify-desktop.ps1 -Dev` | `org-session.token` len>50 after login |

### 7. Wrong vs Correct

#### Wrong — env file without systemd drop-in

```bash
echo 'JWT_SECRET=abc...' >> /etc/aionorg/env
systemctl restart aionorg
# pgrep environ has NO JWT_SECRET → org signs with DB secret → local 401
```

#### Correct

```bash
bash scripts/org-phase0/vps-fix-jwt-env-dropin.sh
# OR manually create aionorg.service.d/jwt-secret.conf + daemon-reload + restart
PID=$(pgrep -f 'aioncore.*13401' | head -1)
tr '\0' '\n' < /proc/$PID/environ | grep JWT_SECRET   # must print line
python scripts/org-phase0/_verify_jwt_crypto.py       # CRYPTO PASS
```

#### Wrong — placeholder brackets in env

```text
JWT_SECRET=<nUGIBanC8Wdg8XAT...>
```

#### Correct

```text
JWT_SECRET=nUGIBanC8Wdg8XAT...
```

---

## Script index

| Script | Purpose |
|--------|---------|
| `verify-sso-jit.ps1` | Org JWT → local `/api/auth/user` + local `/login` 403 |
| `_verify_jwt_crypto.py` | PyJWT verify org token against `env.local` secret |
| `vps-fix-jwt-env-dropin.sh` | Create systemd drop-in + restart + smoke |
| `configure-vps-jwt-secret.sh` | Write `/etc/aionorg/env` + drop-in (same as fix script) |
| `start-aionui-dev-org-test.ps1` | **Retired** → redirects to `start-dev-full.ps1` | Dev org SSO test |
| `ccb-installer/scripts/start-dev-full.ps1` | Dev: org SSO env from `scripts/org-phase0/env.local` or `%LOCALAPPDATA%\CCB-Wanding\config\sso.env` + CCB bootstrap + route-b — **2026-06-26** |
| `repair-employee-sso-env.ps1` | Fix empty `sso.env` on 1.0.6 installs (`-EnvLocalPath env.local`) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-22 | Pilot PASS; VPS drop-in; JIT orphan cleanup |
| 2026-06-23 | **1.0.7 fleet pack** — JWT inject both template paths; `ensure-wanding-settings` repair; `repair-employee-sso-env.ps1`; employee login stable |
| 2026-06-26 | **`start-dev-full.ps1`** loads `env.local` / `sso.env` before `bun run dev` — fixes dev posting to local `/login` instead of org VPS |

---

## Related

- Employee onboarding SOP: [`docs/org-knowledge-deploy.md`](../../docs/org-knowledge-deploy.md) §13
- Phase 0 fallback: [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md)
- MVP contract: [`wanding-mvp-v1.md`](./wanding-mvp-v1.md) §4 employee rollout
