# Research — PreToolUse / subagent transcript parity audit (2026-07-05)

## Bug class

PreToolUse **deny** hooks that detect prior `Read` by scanning `transcript_path` only:

1. CCB PreToolUse does **not** pass `agent_transcript_path`
2. Subagent `Read` lives in `{sessionId}/subagents/agent-{agentId}.jsonl`
3. Read may not be flushed before retry → race

**Fix pattern (quotation, done):** derive subagent path + PostToolUse session flag + Stop alignment.

## Inventory

| Hook / gate | Event | Deny? | Subagent path | Session flag | Risk |
|-------------|-------|-------|---------------|--------------|------|
| `pre-match-knowledge-gate.py` | PreToolUse | **deny** | ✅ fixed | ✅ `post-knowledge-read-mark.py` | was P0 |
| `pre-price-library-data-md-gate.py` | PreToolUse | **deny** | ✅ fixed (P5) | ✅ `post-data-md-read-mark.py` | was P0 |
| `post-price-tiers-nudge.py` | PostToolUse | nudge only | N/A | dedupe flag | P1 policy gap |
| `quotation-knowledge-read.sh` | Stop | block | ✅ via SubagentStop swap | ✅ session_id | fixed |
| `price-library-unpublished.sh` | Stop | warn | ✅ SubagentStop | N/A | low |
| Office / MCP / ROE validators | Stop | block/warn | ✅ SubagentStop | N/A | low |
| `post-personal-memory-stop.py` | Stop | enqueue | ✅ explicit SubagentStop | N/A | reference impl |

## Root cause timeline

| Date | Change | Effect |
|------|--------|--------|
| 2026-06-19 | PostToolUse nudge + Stop **warn** | No deny loop |
| 2026-06-30 | PreToolUse **deny** knowledge Read | Latent gap → user-visible loop |
| 2026-07-03 | PreToolUse **deny** price-library data.Md | Same latent gap, not yet reported |
| 2026-07-05 | Knowledge gate fix | Pattern established |

## Not conflicts

Employee profile P9, org price library, VPS deploy — unrelated to hook transcript scanning.

## Recommended fix order

1. **P0** Mirror knowledge pattern for `data.Md` gate
2. **P1** Extract `hook_transcript.py` shared lib
3. **P2** Decide PreToolUse for `get_product_price_tiers` (policy)
4. **P3** Spec + packaging backlog parity row
