# Phase 1 done — host lock + parity (2026-07-14)

## Host lock

| Field | Value |
|-------|--------|
| Host machine | **JASMINE** (`COMPUTERNAME=JASMINE`) |
| Owner | m1774 (this developer machine — temp Apple-access host) |
| Install dir | `D:\CCB-Wanding` |
| `dist/VERSION` | **1.1.9** (restored; was wrongly stamped `1.1.6-dev` by `start-dev-full` earlier today; backup `dist.backup-20260714-132102` had 1.1.9; `config_generation=7`; aioncore x64 77224960) |
| Account mode | shared WebUI login (MVP) |
| Shared-account risk | acknowledged — sessions/MCP/data on host |
| Tailscale | **Installed** `Tailscale.Tailscale` 1.98.8 — service Running — **NeedsLogin** (blocked on human login) |
| WebUI URL | pending enable — default port **25808** once Settings → Enable WebUI + allowRemote |

## GREEN evidence

| Check | Result | Transcript |
|-------|--------|------------|
| VERSION | 1.1.9 | `evidence/host-identity.txt` |
| install-health | **PASS** | `evidence/install-health-2026-07-14.txt` |
| mcp-health (config after node abs path) | **PASS** | `evidence/mcp-health-after-node-patch-2026-07-14.txt` |
| mcp-health Probe+Session (pre-patch) | probe **5/5** · session **8/8** · overall exit 1 due to bare `node` Test-Path | `evidence/mcp-health-repair-2026-07-14.txt` |
| Launcher | `ccb-launch-aionui.cmd` started → AionUi + aioncore running | process list |

## Known follow-ups (do not claim full task PASS yet)

1. **Human:** Tailscale login on JASMINE (`tailscale login`) → record MagicDNS / 100.x → fill runbook URL  
2. **Human:** AionUI Settings → Enable WebUI → allow remote (for Tailscale) → confirm `http://127.0.0.1:25808` locally  
3. **Human:** reboot restore row in `smoke.md`  
4. **Human:** Matrix A (Mac) + Matrix B (iPhone)  
5. **Hardening:** `ensure-wanding-settings.ps1` still writes bare `command: "node"`; live settings patched to `C:\nvm4w\nodejs\node.exe` for health — **Repair may overwrite**; promote absolute-node resolve in a follow-up code change  

## Contract status

| Contract | Status |
|----------|--------|
| `WANd.WEB.PARITY_119.001` | **PASS** on this host (VERSION + install-health + mcp config PASS) |
| `WANd.WEB.IOS_HOST.001` | **blocked** — Tailscale login + WebUI enable + Apple smoke pending |
