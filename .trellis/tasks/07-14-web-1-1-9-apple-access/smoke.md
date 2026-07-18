# Smoke — WanD 1.1.9 Apple browser access

| Field | Value |
|-------|--------|
| **Task** | `07-14-web-1-1-9-apple-access` |
| **Contract** | `WANd.WEB.IOS_HOST.001` · `WANd.WEB.PARITY_119.001` |
| **Network** | Tailscale only（裸公网测通 = FAIL） |
| **Status** | preflight partial — Tailscale/WebUI blocked on human |

## Preflight (host) — must PASS before Apple rows

| Check | Command / action | Result | Evidence path |
|-------|------------------|--------|---------------|
| Host lock filled | PRD Host lock table | ☑ | `prd.md` · `p1-host-parity-done.md` |
| VERSION | `Get-Content D:\CCB-Wanding\dist\VERSION` → `1.1.9` | ☑ | `evidence/host-identity.txt` |
| Install health | `test-install-health.ps1 -InstallDir D:\CCB-Wanding` | ☑ | `evidence/install-health-2026-07-14.txt` |
| MCP health | config PASS; Probe 5/5 · Session 8/8 | ☑ | `evidence/mcp-health-*.txt` |
| Start via launcher | `ccb-launch-aionui.cmd` | ☑ | AionUi + aioncore |
| WebUI enabled | Settings → WebUI on; note port | ☐ | port: ____ |
| Tailscale up | host MagicDNS / 100.x reachable from Apple | ☐ | login: `evidence/tailscale-login-url.txt` |
| URL | `http://____:____` | ☐ | |
| Reboot restore | reboot host → same URL loads login | ☐ | |

## Matrix A — Mac browser

| # | Step | Expected | Pass | Notes / screenshot |
|---|------|----------|------|--------------------|
| A1 | Open WebUI URL over Tailscale | Login surface | ☐ | |
| A2 | Login (shared MVP account OK) | Enter app | ☐ | |
| A3 | New conversation | Session created | ☐ | |
| A4 | Guid or quotation path — send message | Streaming reply non-empty | ☐ | |
| A5 | Observe MCP / tool in session | Tool completes (host MCP) | ☐ | |
| A6 | Wait several minutes → second message | Replies again (idle/reconnect) | ☐ | |
| A7 | Optional: upload/download | Document actual behavior | ☐ | gap OK if noted |

**Mac browser overall:** ☐ PASS · ☐ FAIL · Tester: ____ · Date: ____

## Matrix B — iPhone Safari

| # | Step | Expected | Pass | Notes / screenshot |
|---|------|----------|------|--------------------|
| B1 | Open same URL over Tailscale (Safari) | Login surface | ☐ | |
| B2 | Login | Enter app | ☐ | |
| B3 | New conversation | Session created | ☐ | |
| B4 | Guid or quotation path | Streaming reply | ☐ | |
| B5 | Tool / MCP completes | Visible completion | ☐ | |
| B6 | Idle → second message | Works | ☐ | |
| B7 | Upload/download on iOS | Document gap if any | ☐ | |

**iPhone Safari overall:** ☐ PASS · ☐ FAIL · Tester: ____ · Date: ____

## Gate

| Rule | |
|------|--|
| P0 claim「能给苹果同事用」 | Preflight all PASS **and** Matrix A PASS **and** Matrix B PASS |
| One side only | = 试探成功，**不得**关 task |

## Fail → next

| Symptom | Likely | Next |
|---------|--------|------|
| Cannot reach URL | Tailscale / host sleep / firewall / WebUI off | Host + network |
| Login OK, chat empty | aioncore / route-b / ACP | Host logs + MCP health |
| Tool missing | Started without CCB launcher | Relaunch via `ccb-launch-aionui.cmd` |
| Works then dies after reboot | WebUI enable persistence | Fix `webui.desktop.*` path / re-enable; track as code bug if needed |
| Used `ccb-wanding-web/` | Wrong entry | Stop; use AionUI WebUI only |
