# CCB-Wanding 1.1.4 — full NSIS delivery (2026-07-01)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-1.1.4.exe` |
| **Size** | ~852.6 MB |
| **Built** | 2026-07-01 12:48 local |
| **dist/VERSION** | `1.1.4` |
| **aioncore** | v0.1.29 embedded (`AionCore\target\release\aioncore.exe`) |
| **BUILD-INFO** | ccb `e3bffd10`, aionui `b7fc914` (dirty working trees) |
| **Log** | `ccb-installer\build-1.1.4-staging-nsis.log` |

## Upgrade path

- **From 1.1.3:** run `CCB-Wanding-1.1.4.exe` (or `/S` silent). NSIS v2 backs up `%LOCALAPPDATA%\CCB-Wanding\.claude` before install; user AppData / org tokens preserved.
- **Do not** Ctrl+R Electron after install — full quit + relaunch.

## Task content included (since 1.1.3)

| Task / area | Packaged in |
|-------------|-------------|
| **07-02** org_session profile-strict JWT | `vendor/wanding/python/admin/org_session.py` + clients; `ensure-wanding-settings` → `AIONUI_APPDATA_PROFILE` |
| **07-01** full-auto permission sync | `ensureCcbSessionPreferredMode/Model` → `acpConfigOptionsAdapter` (aionui `b7fc914`) |
| **07-01** agent attention notifications | HashRouter init + Windows `setAppUserModelId` (aionui) |
| **06-30** supplier / data.Md / dev sync | quotation python + `data/data.Md` + agent SOP |
| **1.1.3.x** fill / ROE / MCP gates | staging validation 29 files PASS |

## Post-install smoke (recommended)

```powershell
# After install to default or D:\CCB-Wanding
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "D:\CCB-Wanding"
```

Manual: org SSO login → 万鼎报价专家 → permission 全自动 + screenshot Read → no spurious badge when on-session; off-session → toast + sidebar badge.

## Ops (not run in this build)

- `publish-update-bundle.ps1` + VPS manifest `ccb.version` / `full_installer` row for 1.1.4 — when ready to fleet push.
