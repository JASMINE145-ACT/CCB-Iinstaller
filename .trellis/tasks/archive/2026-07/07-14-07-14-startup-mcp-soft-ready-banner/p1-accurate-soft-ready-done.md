# Phase 1–2 done — accurate pywin32 + soft_ready UX (2026-07-14)

## GREEN evidence

| Check | Result |
|-------|--------|
| `PYTHONNOUSERSITE=1; python-wanding -c "import mcp, pywintypes"` | OK |
| `warm-wanding-mcp.mjs --servers=accurate` | PASS ~5–15s |
| `warm … quotation,accurate` | both PASS |
| dead child fail-fast | FAIL ~0.25s with stderr (not 120s) |
| `bun test ccbStartupReadinessShared.test.ts` | **7/7 PASS** |
| code-reviewer | **Overall PASS** (Layer A/B PASS); Important #1–3 fixed + re-PASS |
| Layer B smoke-renderer-imports | PASS |

## Files

**ccb-installer:** `ensure-python-wanding-pywin32.ps1` (new); `install-office-word-mcp.ps1`; `run-wanding-bootstrap.ps1`; `start-dev-full.ps1`; `build-wanding.ps1` `$shipScripts`; `build-wanding-lib.ps1` Get-WandingShipScripts; `lib/warm-wanding-mcp.mjs`

**aionui-src:** `ccbStartupReadiness(Shared).ts`; IPC retry; Banner dismiss/retry; hook; GuidPage; unit tests

**spec:** `mcp-health.md` § startup; `wanding-packaging-whitelist.md` §7 + §8.4

## Manual remaining

- [ ] Cold Guid UI: no permanent soft_ready after restart with repaired install
