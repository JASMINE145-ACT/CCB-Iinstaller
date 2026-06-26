# WanD MVP v1.0 — Ship Contract

> **Decision (2026-06-21):** First MVP ships **chat + MCP + local price lib + org knowledge (Phase 0 login) + internal update loop**. **Out of scope:** work-tasks sidebar. **Unified org SSO** ships in **v1.1** via `openspec/changes/unified-org-sso/` (implemented 2026-06-22 — ops creates VPS accounts only; employees login once).
>
> **Parent:** [`wanding-first-ship.md`](./wanding-first-ship.md) · **Update:** [`internal-update.md`](./internal-update.md) §6.2 · **Login:** [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md)

---

## 0. MVP definition

| Pillar | In v1.0 | Out (v1.1+) |
|--------|---------|-------------|
| **Pack** | v2 merged NSIS: AionUI + CCB dist + vendor/MCP/data + 8 agents | Work-tasks (`/tasks` — needs bundled aioncore 0.1.29+) |
| **Login** | Phase 0 fallback when `AIONUI_SSO_MODE=off`; **v1.1 SSO:** org IdP only + JIT local user | Dual-login maintenance after SSO pilot |
| **Update** | VPS manifest + launcher + About dual-track (P5) + shortcut/notify | HTTPS fleet flip, manifest-dev,「全部更新」一键 |

---

## 1. Pack — acceptance

**Build:**

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.1
# Do NOT use -SkipAionUiBuild or -SkipBuild unless emergency hotfix
```

**Automated smoke (install dir):**

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

**Manual:**

- Start via **`ccb-launch-aionui.cmd`** (not direct `AionUi.exe`)
- New chat → quotation agent → price query (no MCP misconfig)
- Word / Excel / PPT agent smoke optional same session

---

## 2. Login — Phase 0 acceptance

**Prerequisites:**

- VPS `aionorg` on `:13401`; employee IP allowed
- Install seeds `%APPDATA%\AionUi\aionui\org-server.json` → `http://67.216.206.3:13401`
- Org user **same username/password** as local AionUI login

**Verify:**

```powershell
.\scripts\org-phase0\verify-desktop.ps1
# After real login (no AIONUI_BYPASS_AUTH):
#   org-session.token present
#   shadow wanding_business_knowledge.md + .org-meta.json synced
```

**Pass:** Quotation session → Agent Read / MCP shows center knowledge (not stale vendor-only fallback).

---

## 3. Update — acceptance

**Ops:**

```powershell
.\scripts\update\publish-update-bundle.ps1 ... -Upload
.\ccb-installer\scripts\verify-update-server.ps1
# exit 0
```

**Manual:**

- `ccb-launch-aionui.cmd` → About → 检查更新
- Network: manifest host only — **no** `api.github.com`
- UpdateModal shows AionUI + 万鼎后端 rows when manifest has newer versions

---

## 4. Employee rollout (SSO v1.1)

| # | Action | Who |
|---|--------|-----|
| 1 | VPS `POST /api/users` create employee | Ops |
| 2 | Install **≥ 1.0.7** (JWT auto-seeded); ops verify `test-install-health.ps1` → `JWT_SECRET set`. **1.0.6:** manual `repair-employee-sso-env.ps1` or do not ship | Ops |
| 3 | Send installer + username/password; employee starts via **ccb-launch-aionui.cmd** (not raw `AionUi.exe`) | Ops → Employee |
| 4 | Employee logs in once; verify `verify-desktop.ps1` shows `org-session.token` | Employee / QA |

Phase 0 dual-login remains for dev when SSO env is unset — see [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md).

---

## 5. Execution checklist

| Step | Owner | Done |
|------|-------|------|
| `bun run build` claude-code-B | Dev | ☐ |
| aionui `--pack-only` + route-b | Dev | ☐ |
| `build-wanding.ps1 -Version 1.0.1` | Dev | ☐ |
| §1.5 smoke on clean VM or test install | QA | ☐ |
| VPS org accounts for pilot users | Ops | ☐ |
| `publish-update-bundle -Upload` | Ops | ☐ |
| `verify-update-server.ps1` exit 0 | Ops | ☐ |
| About update smoke (no GitHub) | QA | ☐ |
| 4 trial users hot-update optional | Ops | ☐ |

---

## 6. v1.1 backlog (explicit defer)

- Bundled **aioncore 0.1.29+** for work-tasks API → repack
- HTTPS updates (§4.2), Authenticode, `manifest-dev.json`
- Archive Phase 0-only dual-login code after full fleet SSO cutover
