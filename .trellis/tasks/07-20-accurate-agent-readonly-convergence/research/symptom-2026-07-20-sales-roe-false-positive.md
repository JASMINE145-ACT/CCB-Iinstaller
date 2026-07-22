# Symptom — Accurate 只读查询 + ROE 误伤（2026-07-20）

## What the user saw

**Prompt:** `查询 5月份销售额`  
**Entry:** Orchestrator（工作助手；无专家卡片）  
**Delegation:** ✅ `Agent(accurate-agent)` / 万鼎账务专家

| Observed | Expected |
|----------|----------|
| · blocked · **10 tools** | ≤2 MCP（理想 1） |
| `mcp__accurate__accurate_summarize_records` | ✅ keep |
| `Write sales_summary_2026-05.md` / `.csv` / handoff md | ❌ |
| 3× `mcp__accurate__accurate_batch_get_detail` | ❌（月报禁止扫单明细） |
| `python -c` + openpyxl → xlsx | ❌（L1 禁 Shell/python 临时脚本） |
| `ExecuteExtraTool` ×2 | ❌（`ENABLE_SEARCH_EXTRA_TOOLS=false`） |
| 父泡：已有 **1,470,601,570 IDR / 68 单**，却报「ROE-GATE 终审未通过」「MCP 只读无写权限」+ A/B/C | 原样转发数字后结束 |

## Layer labels

| Layer | Label | Notes |
|-------|-------|-------|
| H-Acc-1 | Over-delivery on readonly | Summarize 已够；仍落盘/明细 |
| H-ROE-1 | ROE false positive / wrong L2 | `:roe-judge` block；L2 markers 是报价写工具；通用 `Write` 不算 L2 →「Write not landed」 |
| H-Orch-1 | Fabricated gate narrative | 数字已在子结果；父代理编造权限/终审失败 |

## ROE mechanism (code)

- Profile: `accurate-agent:roe-judge` = **`block`**（`modes.json`）
- Default L2 markers（`roe-judge-profiles/default.json`）:
  - `fill_quotation_sheet` / `edit_excel` / `mcp__excel__write`
- Pure lookup should hit `READONLY_LOOKUP_RE`（含「查询」）→ `has_write_intent=False` → pass `no_write_intent`
- If any write-intent anchor appears（Brief 加码「导出/生成」、或会话内自造写意图），gate requires L2 success; `Write` tool ≠ marker → block up to `max_blocks` (profile default **5**) then escalate→pass

**Important:** User-facing「Accurate MCP 全为只读…未拿到写权限」is **not** what ROE checks. ROE checks write-intent vs L2 tool success in transcript.

## Usable result from the failed UX

- 5 月销售额：**1,470,601,570 IDR**
- 单据数：**68**
- 口径：`sales-invoice` / `transDate` / 2026-05

Ignore A/B/C unless user explicitly wants memory L2 write.

## Relation to quotation sibling

| Task | Focus |
|------|-------|
| `07-19-quotation-agent-prompt` | quotation L1 slim + full relay + NO_DIY |
| **This task** | accurate readonly converge + ROE skip + orch no-fabricate |

Shared surface: `wande-orchestrator` outcome relay; `parse_transcript_roe_judge.py`.
