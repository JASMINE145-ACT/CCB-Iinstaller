# Step 1 架构缺口 — explore 摘要

**Date:** 2026-07-06  
**Status:** approved for implementation (parent enrich task)

## 现象

Agent 调用 `mcp__excel__read_data_from_excel`（`A1:Q33`）→ ~104KB JSON 写入 `tool-results/*.txt` → `Read` 工具超 25k token / 100k char → 缩小 limit 仍失败 → 多轮 excel MCP 补救。

## 根因链

```
excel MCP 逐 cell + validation 元数据
  → context 爆炸
  → spill 文件仍不可读
  → Agent 补救循环

并行：离线 smoke 用 openpyxl + VANTSING_LAYOUT 稳定 PASS
```

## 决策（Lite，2026-07-06 approved）

Step 1 主路径 = `parse_excel_smart(max_rows=30)`；禁止 excel MCP。专用 `extract_learn_by_data_rows` defer。

## 未决（本 task 外）

- 韩总类等 **VANTSING 变体**：表头 F=图片、G=产品编号、`data_start_row≠8` — 需 layout profile 检测，另 task

## 证据路径

- Spill: `%LOCALAPPDATA%\CCB-Wanding\.claude\projects\.../tool-results/mcp-excel-read_data_from_excel-*.txt`
- Smoke reader: `python/scripts/smoke_learn_by_data_section_d.py` `_read_vantsing_rows`
- Layout: `python/quotation/layout.py` `VANTSING_LAYOUT`
