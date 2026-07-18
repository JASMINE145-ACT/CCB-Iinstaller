# D2 diagnosis + fix — Case1 / Case3 (2026-07-15)

## Repro pins

| Pin | Value |
|-----|--------|
| Install | `D:\CCB-Wanding` via `CCB_WANDING_HOME` / route-b skip monorepo |
| Config | `%LOCALAPPDATA%\CCB-Wanding\.claude` |
| Model | `minimax-m3` |
| Outer timeout | 180s |

## Case3 (was: L0 bleed)

| Before | After |
|--------|--------|
| Harness walkUp → `…\ccb-installer` as install | Pin/`isDevTreeInstall` → `D:\CCB-Wanding` |
| AskUser + Grep, no `match_quotation` | `mcp__quotation__match_quotation` + ¥1219 path |
| Classic L0「不得直接调用业务 MCP」 | **Not observed** on pinned install |

**Verdict:** Primary fail was **wrong install resolution** (monorepo looking like product install), not missing `userContextOverride`. Specialist isolation code remains; unit asserts override has no L0 forbid text.

Evidence: `research/d2b-case3-pinned.log` (exit 0).

## Case1 (was: timeout / no Agent)

| Before (pinned install) | After |
|-------------------------|--------|
| `Agent(quotation-agent)` OK | same |
| Parallel spawn-kill warm + subagent `match_quotation` → **Python 90s timeout** | Orchestrator **skips** spawn warm |
| Fabricated/knowledge fallback after tool fail | Real MCP candidates (`8020020755` / 1219) |

**Root cause:** `scheduleWanDMcpWarmup` for orchestrator started a **throwaway** quotation process that raced the Agent subagent’s first real call; both paid ~90s cold start → `QUOTATION_PYTHON_TIMEOUT_MS` (90s) killed the real call.

**Fixes:**

1. `resolveWanDWarmupServers` — empty for `wande-orchestrator`
2. Default / settings `QUOTATION_PYTHON_TIMEOUT_MS=120000`
3. Harness + route-b: don’t prefer `ccb-installer` monorepo tree

Evidence: `research/d2a-case1-fix-v2.log` — warmup skipped; `completed_tools` includes `mcp__quotation__match_quotation` + `Agent`; end_turn ~93s.

## Related

- App Guid 90s soft banner → still owned by `07-15-quotation-mcp-warm-timeout` (outer UI budget).
- D3: R2/R3 + latency thirds; Guid 零卡 still blocked.
