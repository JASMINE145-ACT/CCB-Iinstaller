# Deploy smoke — WebUI business parity (2026-07-15)

## Build / deploy

| Step | Result |
|------|--------|
| `node scripts/build-with-builder.js auto --win --pack-only` | PASS |
| `bunx electron-builder --win --x64 --dir` | PASS → `out\win-unpacked` |
| `prepareHubResources.js` | PASS |
| robocopy → `D:\CCB-Wanding\AionUi` | PASS (exit 1) |
| `sync-aionui-ccb-route-b.ps1 -InstallDir D:\CCB-Wanding` | PASS (3 targets) |
| Inject self-built `AionCore\target\release\aioncore.exe` | **Required** — bundled aioncore failed migration 12 |
| `dist/VERSION` restored | **1.1.9** |
| WebUI prefs | `webui.desktop.enabled/allowRemote=true`, port `25809` |
| Launch | `D:\CCB-Wanding\ccb-launch-aionui.cmd` |

## HTTP smoke (127.0.0.1:25809)

| Route | Status |
|-------|--------|
| `GET /api/webui/runtime-config` | 200 `orgServerUrl` present |
| `GET /api/webui/ccb/authority` | 200 `{"active":true}` |
| `GET /api/webui/ccb/agents` | 200 agents list |
| `GET /` | 200 SPA |
| `GET /api/webui/org/api/org-knowledge` | non-404 (auth required) |

## Ops notes

- Do **not** launch bare `AionUi.exe` without launcher.
- After packaging fresh win-unpacked from aionui-src, **re-copy** project aioncore if DB already has fork migrations.
- `start-dev-full` may re-stamp `dist/VERSION` → restore `1.1.9` when hosting Apple Web.
- Tailscale was **Stopped** after relaunch; ran `tailscale up` → `100.93.152.114` / MagicDNS authority `{"active":true}`.
