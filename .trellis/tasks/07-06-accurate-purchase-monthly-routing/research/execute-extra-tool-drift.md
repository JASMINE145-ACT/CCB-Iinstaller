# Research — ExecuteExtraTool vs direct MCP (accurate-agent)

**Date:** 2026-07-06  
**Task:** `07-06-accurate-purchase-monthly-routing`

## User evidence

### Working path (sales 1–5月 via ExecuteExtraTool)

```json
ExecuteExtraTool({
  "tool_name": "mcp__accurate__accurate_summarize_records",
  "params": {
    "table_name": "sales-invoice",
    "start_date": "01/01/2026",
    "end_date": "31/05/2026",
    "group_by": "month",
    ...
  }
})
```

**Output:** 366 scanned, 5 monthly groups, `total_amount` 11.68B — **MCP summarize works**.

### Broken path (purchase 1–5月, prior session)

- Multiple `accurate_fetch_by_date` per month
- Temp `agg_purchase.py`
- User asked **采购** but some calls may have mixed tables

### Quotation specialist

User: **报价助手 direct MCP 没问题** — no ExecuteExtraTool.

## Root cause (confirmed)

| Agent | L1 SOP | Model behavior |
|-------|--------|------------------|
| `quotation-agent.md` | **直接调用** `mcp__quotation__*`；**禁止 ExecuteExtraTool** (2026-06-18) | Direct MCP ✓ |
| `accurate-agent.md` | Playbook examples still use `ExecuteExtraTool({tool_name:…})` | Model copies ExecuteExtraTool ✗ |

Spec: `agents-unified-model.md` L1076 — accurate should follow same rule as quotation; **Do not document ExecuteExtraTool**.

Runtime: `ENABLE_SEARCH_EXTRA_TOOLS=false` in route-b — MCP tools are in `tools[]`; direct call is canonical. ExecuteExtraTool is legacy/indirect path; works sometimes but:

- View Steps shows `ExecuteExtraToolexecute` (title glue)
- Model may take different fallback paths (fetch/python) when indirect
- Hooks/subagent-gate matchers target `mcp__accurate__*` names, not ExecuteExtraTool wrapper

## Hypothesis update

| ID | Verdict |
|----|---------|
| H2 summarize MCP broken | **REJECTED** (sales summarize OK) |
| H5 model ignores rules | **PARTIAL** — follows **examples** in L1 (ExecuteExtraTool) |
| **H7 accurate L1 doc drift** | **CONFIRMED** — seed still ExecuteExtraTool; quotation fixed 2026-06-18, accurate not |

## Recommended fix (P2D — no code in MCP)

1. Rewrite `accurate-agent.md` all JSON examples → direct tool calls (params only), mirror `quotation-agent.md` line 49.
2. Add hard rule: **禁止 ExecuteExtraTool**；直接 `mcp__accurate__*`。
3. `deploy-seed-agents.ps1 -ForceMd` to live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`.
4. **New Guid session** → 万鼎账务专家 →「1-5月采购额」→ expect `mcp__accurate__accurate_summarize_records` on `purchase-invoice`, 1 call.

## Purchase vs sales

User question 采购 must use `table_name: purchase-invoice`. Sales example proves toolchain; wrong table would still “work” but wrong business answer.

## Out of scope for this note

- Whether ExecuteExtraTool should be disabled at runtime for accurate sessions (already false globally; model still chooses wrapper if trained by L1)
