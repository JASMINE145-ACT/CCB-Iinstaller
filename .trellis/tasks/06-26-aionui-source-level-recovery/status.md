# AionUi Recovery Status — 2026-06-26

## Summary

**Runtime recovery: ~complete.** Bundled 1.1.2 (Mixing UI + 万鼎 Guid cards) is restorable and usable from `D:\CCB-Wanding`.

**Source-level pipeline: still open.** `aionui-src` has ~130 uncommitted CCB files; full rebuild-from-source → staging → NSIS not yet proven.

---

## What Was Broken

| Symptom | Root cause |
|--------|------------|
| Old upstream UI (AionUi / Aion CLI / 3D游戏 cards) | Dev launcher (`start-aionui-dev.ps1`) or CCB authority inactive path |
| New UI missing 万鼎报价专家 | Same — need bundled + CCB `settings.json` + agent sidecars |
| Mixing login「连接失败」 | `org-server.json` written with UTF-8 BOM → `JSON.parse` failed → `__orgServerUrl` empty |
| `git restore` aftermath | Architecture refactor lost; `aionui-src` CCB integration mostly untracked |

---

## What Works Now

- `D:\CCB-Wanding\AionUi\` matches `ccb-installer/staging/AionUi` (app.asar SHA256 identical).
- Bootstrap + route-b sync + seed agents deploy OK.
- Agent sidecar: `quotation-agent.aionui.json` → `display_name: 万鼎报价专家`, `guid_primary: true`.
- Org VPS `http://67.216.206.3:13401` reachable; `yjc` login POST succeeds.
- Bundled launch: `D:\CCB-Wanding\ccb-launch-aionui.cmd` → window title **Mixing**, org SSO login.
- One-click recovery script: `ccb-installer/scripts/recover-aionui-new-ui.ps1`.

---

## Fixes Applied This Session

| Change | Location |
|--------|----------|
| Recovery launcher script | `ccb-installer/scripts/recover-aionui-new-ui.ps1` |
| `ORG_SERVER_URL` env fallback | `ccb-installer/ccb-launch-aionui.cmd` (+ synced to `D:\CCB-Wanding`) |
| Strip UTF-8 BOM on read | `aionui-src/.../orgServerConfig.ts` |
| Rewrite `org-server.json` without BOM | `%APPDATA%\AionUi\aionui\`, `%APPDATA%\AionUi-Dev\aionui\` |
| Guid loader matches bundled 1.1.2 | `aionui-src/.../useCustomAgentsLoader.ts` (`isAuthorityActive` branch) |

---

## How To Run (Daily)

```powershell
# Preferred — bundled Mixing UI
D:\CCB-Wanding\ccb-launch-aionui.cmd
# or
.\ccb-installer\scripts\recover-aionui-new-ui.ps1

# Login: org SSO (yjc + employee password from scripts/org-phase0/env.local)
# Do NOT use start-aionui-dev.ps1 for the WanD Guid UI (upstream dev shell)
```

---

## Remaining (Source-Level — Phase 3+)

1. **Snapshot/commit** ~130 untracked paths in `D:\Projects\aionui-src` before any more `git restore`.
2. **Rebuild pipeline**: `build-wanding.ps1 -Version 1.1.3-dev -SkipNsis` → verify Guid cards without hand-copying staging.
3. **Dev parity**: bundled shows Mixing branding; dev source may still differ until rebuild.
4. **Optional**: fix `D:\CCB-Wanding\scripts\ccb-update-auto.ps1` encoding parse error (non-blocking).
5. **Phase 5**: archive stale generated artifacts after pipeline proven.

---

## Verification Evidence

See `check.jsonl` phases: `baseline`, `source-gap`, `dev-parity`, `ui-recovery`, `org-login-fix`.

Key commands that passed:

- `Get-FileHash` staging vs `D:\CCB-Wanding` app.asar — match
- `POST http://67.216.206.3:13401/login` (yjc) — success
- `bun test tests/unit/common-config/ccbAgentCatalog.test.ts` — pass
- User confirmed: **恢复的差不多** (2026-06-26)
