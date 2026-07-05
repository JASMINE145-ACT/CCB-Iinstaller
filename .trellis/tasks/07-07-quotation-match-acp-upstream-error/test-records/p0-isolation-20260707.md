# P0 isolation — 2026-07-07

**Prompt:** `查询三通 DN50 价格`  
**Symptom (user):** `UNKNOWN_UPSTREAM_ERROR` / `Agent internal error (code -32603)` on `mcp__quotation__match_quotation`; retry → `AIONUI_INTERNAL_ERROR`  
**Nature:** intermittent (user confirmed)

## Layer matrix

| # | Layer | Command | Result | Notes |
|---|-------|---------|--------|-------|
| 1 | MCP stdio (default probe) | `node ccb-installer/scripts/test-mcp-probe-layer.mjs --server=quotation` | **PASS** | ~54s first run (plan session) |
| 2 | MCP stdio (user keyword) | inline probe `keywords=三通 DN50` | **PASS** | 24990ms, tool_count=9 |
| 3 | Session MCP bind | `node ccb-installer/test-mcp-session-health.mjs --profile=quotation-agent` | **PASS** | quotation+excel |
| 4 | Knowledge Read gate | `python -m unittest … test_knowledge_read_gate.py` | **PASS** | 14/14; deny is clean JSON, not -32603 |
| 5 | Native ACP full turn | `test-native-acp-agent.mjs` ×4 | **PASS 4/4** | 30–58s; `completed_tools` includes `mcp__quotation__match_quotation` |
| 6 | Live AionUI | user screenshot | **FAIL** (historical) | not reproduced this session |

## Native ACP runs (2026-07-07)

| Run | elapsed | completed_tools | exit |
|-----|---------|-----------------|------|
| 1 | ~58s | `mcp__quotation__match_quotation` | 0 |
| 2 | ~47s | `Read`, `mcp__quotation__match_quotation` | 0 |
| 3 | ~30s | `Read`, `mcp__quotation__match_quotation` | 0 |
| 4 | ~44s | `mcp__quotation__match_quotation` | 0 |

Log: `test-records/native-acp-run1.log` (run 1 full output)

## Working conclusion

- **MCP + Python + session profile path is healthy** on this machine today.
- **-32603** is JSON-RPC `InternalError` from upstream agent runtime (claude-code-B ACP), not quotation MCP `isError` payload.
- Failure is **ACP turn / provider / lifecycle** class — aligned with prior task `06-28-quotation-tool-interrupted-repeat`.
- **No code fix yet** — need failing run with upstream `details` (F12 / CCB stderr around tool_call).

## Next capture when it fails again

1. F12 → filter `32603`, `match_quotation`, `prompt failed`, `WanD MCP warmup`
2. `%LOCALAPPDATA%\CCB-Wanding\logs\` latest file tail
3. Note: Guid card vs default session; seconds after opening chat (warmup race?)
4. Re-run: `node ccb-installer/test-native-acp-agent.mjs` with same env as plan
