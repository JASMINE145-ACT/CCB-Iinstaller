# Delivery status — 06-29 ACP prompt orphan cleanup on query.next timeout

**Date:** 2026-06-29  
**Task:** [`prd.md`](./prd.md)

## Root cause

`acp-agent.js` drain loop (after `query.next` timeout) used `break` without setting a
"clean" flag when the stream ended (`done || !m`). If `MAX_DRAIN` was exhausted without
observing `session_state_changed: idle`, the silent retry still ran — sending a second
prompt to a still-busy CCB CLI subprocess → duplicate execution → 错乱.

## Code changes

### ACP slot (`ccb-installer/patches/aionui-acp/acp-agent.js`)

| Change | Lines |
|--------|-------|
| Added `let drainObservedClean = false` before drain loop | ~1194 |
| Set `drainObservedClean = true` on `done \|\| !m` (stream ended) | ~1201 |
| Set `drainObservedClean = true` on `session_state_changed: idle` | ~1205 |
| Silent retry gated on `drainObservedClean === true` | ~1219 |
| Drain-stuck path logs `drain-stuck: no retry` and throws immediately | ~1225-1228 |

## Spec updated

| Spec | Section |
|------|---------|
| `integration/agents-unified-model.md` | § Quotation/Accurate 卡住 table — new row: `query.next timeout drain-stuck orphan (2026-06-29)` |
| `backend/acp-session-flow.md` | § After 2026-06-29 idle resume drift — new section: `2026-06-29 (query.next drain-stuck orphan)` |

## Deploy

```powershell
# 1. Sync ACP slot patch to aioncore ACP dir
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-aionui-ccb-patch.ps1

# 2. Smoke: preset quotation session → first send (cold MCP) → observe log
#    Good: "prompt timeout retry attempt=1" (clean drain, retry)
#    Bad was: no log, second prompt executed silently
#    New path for stuck process: "prompt timeout drain-stuck: no retry"
```

## Behavior change summary

| Scenario | Before | After |
|----------|--------|-------|
| Timeout → clean drain → retry | Silent retry (correct) | Silent retry (unchanged) |
| Timeout → drain stuck → retry | Retry on busy process → 错乱 | No retry → immediate `首条响应超时` error |
| User clicks retry banner after error | New warmup → fresh session → works | Same (unchanged) |

## Not done / follow-up

- Per-conversation handoff filenames (concurrency hardening) — from 06-29 drift delivery-status
- Phase A: actual repro capture of drain-stuck scenario (rare, hard to reproduce)
