# Context — 报价单插行 merge 修复

## 业务触发

企微对话（lian）：

- 「目前报价单格式是十行，ai还不能自动增加」
- 「要不模板改多点行，删比加方便」

开发侧记得已加过自动扩行；探索确认 **代码存在但行为错误**。

## 模板结构（`data/空白标准报价单.xlsx`）

| 区域 | Excel 行 | 说明 |
|------|----------|------|
| 表头 | 1–7 | PENAWARAN HARGA 等 |
| 数据 | **8–17** | **10 行**；`VANTSING_LAYOUT.data_start_row=8` |
| Total | **18** | `Total Excluding PPN不含税总价` |
| 税费 | 19–21 | PPN / 运费 / 含税总价 |

数据区 **无** merge；footer 区有 merge（例：`A18:B18`, `C18:M18`）。

## 现有代码路径

```
fill_quotation_sheet (MCP)
  → fill_quotation (quote_tools.py)
       → validate_and_fix_fill_rows
       → locate Total row
       → _ensure_data_rows_before_total   ← 插行 + copy style
       → loop fill_items → _set_cell_value_merged_safe
       → write totals footer values
```

`_ensure_data_rows_before_total` 注释已写明「VANTSING 默认 10 条」；`fill_template_with_inquiry_items` 另有 `allow_insert_rows=False` 默认（询价模板路径，本 task 不主改）。

## 复现证据（2026-06-30 本地）

12 条 `fill_items`（row 8–19）写入后：

```
R17  完整一行（第 10 条）
R18  仅 C=dn75, N=20000；F/G/I 空
R19  仅 C=dn80, N=21000；F/G/I 空
R20  Total Excluding PPN
```

插行后 merge 检查：

```
A18:B18, C18:M18   ← 本应只在 Total 行，却留在新数据行 18
A19:B19, C19:M19
...
Row 18 col6/7/9: type=MergedCell
```

## 与方案 B 对比（本 task 不采用）

| | 方案 A（本 task） | 方案 B |
|--|------------------|--------|
| 改动 | `quote_tools.py` merge 逻辑 | 改 xlsx 模板 + layout 行号 |
| 部署 | python vendor sync | data + python |
| 风险 | openpyxl merge 边界 | 用户删多余空行 |
| 业务偏好 | 技术债清晰 | lian 倾向「删比加方便」 |

产品选择 **A**；B 可作为后续优化若 A 仍不稳。

## 次要路径（排查用）

若修复后仍有个案「只有 C 列有值」：

- 查 agent 是否用 **excel MCP** 补写规格（违反 SOP）
- 查 live `vendor/wanding/python/quote_tools.py` 是否含 `_ensure_data_rows_before_total`（旧包无插行）

## 关联 spec / task

- `python/quotation/layout.py` — `VANTSING_LAYOUT`
- `06-30-quotation-supplier-remark` — 同填表管道，O 列备注（独立）
- `internal-update.md` §12.9 #9–#11 — fill Python 走 hot zip

## P3 公式扩充（2026-06-30 探索）

**用户问：** 自动生成报价单能否带公式？难吗？

**答案：** 模板 footer 已有公式；`fill_quotation` 故意写静态值（Safe document-fill）。改回公式工作量小，且与 P0 插行强相关——插行后必须用动态 `SUM(N8:N{last})`，否则 >10 行合计错。

**VANTSING 列号（1-based）：** K=11 数量，M=13 单价，N=14 行总价。

**注意：** openpyxl 保存时不计算公式；自动化测试查 `cell.value` 是否为 `=...` 字符串，金额正确性用 Python 旁路或人工 Excel smoke。

## Spec 记录（2026-06-30）

| 文档 | 章节 |
|------|------|
| `.trellis/spec/backend/mcp-business.md` | § VANTSING fill insert-rows & Excel formulas |
| `.trellis/spec/integration/agents-unified-model.md` | § VANTSING sheet capacity & Excel formulas |
