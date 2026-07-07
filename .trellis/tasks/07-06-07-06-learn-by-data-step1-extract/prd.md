# learn-by-data Step 1 — 规范修正（parse_excel_smart 主路径）

## Goal

修复 learn-by-data **Step 1** 工具选型：线上 Agent 按 SKILL 误用 **excel MCP** 全表 `read_data_from_excel` 导致 context 爆炸。改为 **quotation MCP `parse_excel_smart`** 作为主读表工具，配合 SKILL 固定列图（B/C/F/G）解析行数据。

## Problem (observed)

| 路径 | 工具 | 结果 |
|------|------|------|
| SKILL 原写法 | excel MCP bulk read | ~100KB JSON → spill → Read 超 token |
| 正确规范 | `parse_excel_smart(max_rows≈30)` | fixture ~4KB Markdown，Agent 可消费 |

**根因：** 规范写反了（「Prefer excel MCP」），非缺新 MCP。

## Requirements (Lite)

### R1 — SKILL Step 1 改写

- **主路径：** `mcp__quotation__parse_excel_smart`，`file_path` 绝对路径，`max_rows=30`（禁止默认 500 扫全表）。
- **禁止：** excel MCP `read_data_from_excel` 及任何 bulk range 读表（Step 1）。
- **列映射：** 从 Markdown 表按固定列号取字段（列 2=B, 3=C, 6=F, 7=G）；`excel_row` = 表内行号（与 Excel 1-based 行号一致）。
- **数据区：** 从 row 8 起至 `Total Excluding PPN` 前；跳过空 `keywords` 行。
- **校验：** 解析数据行数与预期不符 → 阻塞问用户确认列图（一次）。

### R2 — eval 对齐

- `quote-smoke-learn-by-data-vantsing` / `quote-smoke-learn-by-data-section-d`：`forbidden_tools` 含 excel read；`pass_if_any` 含 `parse_excel_smart` → `match_quotation_batch` 分支。

### R3 — 部署

- `deploy-ccb-skills.ps1` 更新 SKILL 到 `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\`

## Acceptance Criteria

- [x] SKILL Step 1 以 `parse_excel_smart` 为主，明确禁止 excel MCP bulk read
- [x] learn-by-data eval cases 禁止 excel read、要求 parse → batch
- [x] `node eval/run-agent-eval.mjs --suite smoke` schema 通过
- [ ] 手动 smoke：learn-by-data 会话 Step 1 无 excel spill 循环（人工）

## Deferred (separate task)

- `extract_learn_by_data_rows` MCP（结构化行 JSON，与 smoke Python 统一）
- VANTSING 变体列图（F=图片、data_start_row≠8）

## Parent

`07-06-learn-by-data-price-library-enrich`
