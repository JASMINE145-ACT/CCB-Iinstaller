# Ops draft — 2.0.0 stale-purge + Symptom A/B expectations

> Draft for merge into `release-notes-ops.md` / `release-notes-员工.md` when 2.0.0 ships.
> Task: `.trellis/tasks/07-15-install-1-1-9-residue-continuity`

## Ship checklist (must both land)

1. **NSIS / CCB installer** with `DirectoryLeave` stale purge + expanded post-check.
2. **AionUI desktop** build that includes `ccbWandingRuntimeNode` InstallDir resolve (Programs + HKCU registry) — **not** only route-b patch.

## What this release fixes

| Symptom | After 2.0.0 (when both land) |
|---------|------------------------------|
| **A** — 「无法读取当前安装版本信息」with old `D:\` / LocalAppData tree beside Programs | Purge removes non-Keep trees; desktop resolve prefers registry → Programs. |
| Multi-root leftover (stale `dist` / AionUi under old paths) | Installer prompts (or `/S` auto-purges); Start Menu **Purge Stale Installs** remains. |

## Explicitly **not** fixed in this purge (Symptom B class)

If after a clean Programs install Check Install / Guid still fails on:

- `quotation/vendor/wanding/.env.accurate`
- `price-library/vendor/mcp-servers/price-library-server/dist/index.js`
- `price-library/vendor/wanding/python/price_library_main.py`

→ root cause is **bootstrap / packaging**, not multi-root residue.

### IT temporary

```powershell
$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
$CONFIG  = "$env:LOCALAPPDATA\CCB-Wanding\.claude"
& "$INSTALL\scripts\ensure-wanding-settings.ps1" -InstallDir $INSTALL -ConfigDir $CONFIG
```

Then re-run **Check Install**. If price-library vendor paths still missing → staging/ship gap (H2/H3), not purge.

## Silent `/S`

`/S` (About one-click upgrade) skips MUI pages. Stale purge runs via **Preserve section** `IfSilent` → `Call DirectoryLeave` (auto-Apply; detect/purge failure **Abort**). Treat as **IT pre-approval**. Do not use `/S` on machines where a second intentional install tree must be kept.

## Operator tips

- Ask users to **fully quit AionUI (tray)** before confirmed purge.
- Detect report: `%LOCALAPPDATA%\CCB-Wanding\logs\install-stale-report-<ver>.txt`
- Detect / purge logs: `install-stale-detect-*.log` / `install-stale-purge-*.log`
- Incomplete purge (AV lock) → installer **aborts** (exit 1); log should show `residual after purge` / `still present after delete`.
