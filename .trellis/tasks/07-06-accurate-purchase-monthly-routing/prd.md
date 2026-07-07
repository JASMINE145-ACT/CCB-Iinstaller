# PRD — Accurate 主会话「1-5 月采购额」错误工具链

## Goal

用户从 **万鼎账务专家（accurate-agent Guid 直开会话）** 提问「查询 1-5 月的采购额」时，Agent 应 **1 次** `accurate_summarize_records`（`group_by: month`）输出 Markdown 月报表，而不是多次 `accurate_fetch_by_date` + 本地 Python 汇总。

## Observed (user debug 2026-07-06)

| Step | Tool | Problem |
|------|------|---------|
| 1 | `accurate_summarize_records` | 可能已调用（View Steps · 11） |
| 2–8 | `accurate_fetch_by_date` ×7 | **违反** L1「全公司月报禁止 fetch 汇总」 |
| 9–10 | Write `agg_purchase.py` + `ls Temp` | **违反** L1「禁止 python 临时脚本」 |
| UI | View Steps · 11 | 步骤过多、用户感知「卡住/在 debug」 |

示例 fetch 参数（2 月）：`purchase-invoice`, `01/02/2026`~`28/02/2026`, 40 条 — 说明模型在**按月拆 raw 列表**而非 summarize。

## Expected (seed L1)

`ccb-installer/packages/vertical/com.wanding.trade/agents/accurate-agent.md` §全公司采购月报：

```json
accurate_summarize_records({
  "table_name": "purchase-invoice",
  "start_date": "01/01/2026",
  "end_date": "31/05/2026",
  "date_field": "transDate",
  "group_by": "month",
  "amount_fields": ["totalAmount","total","amount","grandTotal"]
})
```

→ 1 次调用 → Markdown 表格 → 结束。

## Hypotheses (to eliminate in order)

| ID | Hypothesis | Check |
|----|------------|-------|
| H1 | Live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\accurate-agent.md` **stale**（deploy 默认 skip user .md） | diff vs seed; `-ForceMd` deploy |
| H2 | `accurate_summarize_records` **失败/空结果**，模型 fallback fetch | MCP direct smoke + transcript tool error |
| H3 | Session **非 specialist direct**（profile 未 applied / 默认 orchestrator） | log `[ACP] agent session profile applied: accurate-agent` |
| H4 | **Repeat guard** 阻断第 2 次 summarize，模型改走 fetch | `mcpToolRepeatGuard.ts` scope + tool name |
| H5 | **Model**（minimax-m3 thinking）忽略 L1 硬规则 | harness + prompt 强化 / 工具描述 |
| H6 | View Steps **展示**问题（工具名粘连 `fetch_by_dateexecute`） | 07-04 已修 title；本 task 非主因 |

## Acceptance criteria

- [ ] Guid **万鼎账务专家** →「查询 1-5 月采购额」→ **≤2** 次 accurate MCP 调用（理想 1 次 summarize）
- [ ] 输出含 1–5 月 Markdown 表格 + 合计行
- [ ] **无** `accurate_fetch_by_date` 用于全公司月汇总
- [ ] **无** temp 目录 python 脚本
- [ ] Live `accurate-agent.md` 与 seed 对齐（或 documented exception）
- [ ] Harness 或 transcript 证据归档到 `{task}/research/`

## Out of scope (initial)

- 改 Accurate Online API 本身
- quotation-agent 路径
- View Steps UI 重设计（除非 title 回归）

## References

- L1 seed: `ccb-installer/packages/vertical/com.wanding.trade/agents/accurate-agent.md`
- Spec: `.trellis/spec/integration/agents-unified-model.md` § Specialist direct session
- Prior: `07-04-orchestrator-dispatch-hardening` smoke matrix row #4
