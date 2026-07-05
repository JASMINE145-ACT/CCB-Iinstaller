# PRD — Quotation `match_quotation` ACP upstream error (-32603)

## Status

`draft` — debug plan only; implementation after approval.

## Problem (user report 2026-07-05)

Guid / 万鼎报价专家会话，用户发送 **「查询三通 DN50 价格」**：

1. 模型调用 `mcp__quotation__match_quotation`
2. UI 展示 **上游 Agent 或模型服务商出错** — `UNKNOWN_UPSTREAM_ERROR`
3. 详情：`Agent internal error (code -32603)`（JSON-RPC Internal Error）
4. 用户重试同 prompt → **应用处理失败** — `AIONUI_INTERNAL_ERROR`

## Scope

Trace full lifecycle:

1. AionUI send / ACP session / error classification
2. CCB-Wanding agent runtime (claude-code-B / route-b)
3. PreToolUse hooks (`pre-match-knowledge-gate.py`)
4. quotation MCP stdio + Python `match_quotation`

## Out of scope (unless repro proves otherwise)

- 价格库 agent 误路由（见 `07-04-orchestrator-dispatch-hardening`）
- 个人记忆 Stop hook（`07-06-ccb-memory-auto-accumulation`）
- 匹配算法调参（除非 Python 层抛未捕获异常）

## Baseline evidence (plan session 2026-07-05)

| Check | Result |
|-------|--------|
| `test-mcp-probe-layer.mjs --server=quotation` | **PASS** — `tool_call=match_quotation+get_inventory_by_code` (~54s) |
| `test-mcp-session-health.mjs --profile=quotation-agent` | **PASS** — `expected=[quotation,excel] actual=[excel,quotation]` |

→ MCP config + session registration healthy; failure likely **ACP turn / agent runtime / hook / timeout / provider** layer.

## Acceptance criteria

- [ ] Failing run classified: MCP error vs hook deny vs agent timeout vs MiniMax provider vs AionUI mis-map
- [ ] Root cause has regression test or documented N/A with evidence
- [ ] Fix verified: same prompt **「查询三通 DN50 价格」** returns price table (Guid 万鼎报价专家 or default→quotation path)
- [ ] If error UX wrong: `UNKNOWN_UPSTREAM_ERROR` / `AIONUI_INTERNAL_ERROR` ownership corrected
- [ ] Spec row in `mcp-health.md` or `chat-acp-flow.md` if cross-layer contract changed

## Non-goals

- Broad error-code refactor across all agents
- Changing quotation matching weights without repro on Python layer
