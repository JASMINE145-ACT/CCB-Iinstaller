# p-d2 — Case1 / Case3 harden done

**Date:** 2026-07-15  
**Phase:** D2a + D2b

## Delivered

| Item | Change |
|------|--------|
| Route-b install | Skip monorepo `ccb-installer` unless `CCB_ALLOW_REPO_INSTALL=1` |
| Smoke harness | Always set `CCB_WANDING_HOME` / `CCB_INSTALL_DIR` from install pin |
| ACP warmup | Orchestrator skips spawn-and-kill quotation/accurate warm |
| Quotation Python | Default/settings timeout **120s** |
| Tests | `wanDMcpWarmup.test.ts` (3); route-b `install-resolve.test.mjs` (1) |

## Evidence

- Case3 pinned: `research/d2b-case3-pinned.log` PASS (`match_quotation`)
- Case1 after fix: `research/d2a-case1-fix-v2.log` PASS (Agent + match + price)
- Unit: `bun test …/wanDMcpWarmup.test.ts` → 3 pass
- Unit: `node --test …/install-resolve.test.mjs` → 1 pass

## Live patches applied for smoke

- `D:\CCB-Wanding\dist\chunk-fxhtzd6x.js` — orchestrator warm skip (mirror source)
- `D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\python-spawner.js` — 120s default
- `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` — `QUOTATION_PYTHON_TIMEOUT_MS=120000`

Rebuild/deploy still required to bake ACP change into future installs from source.

## Next

D3 matrix R1–R3 with latency thirds; then G 零卡.
