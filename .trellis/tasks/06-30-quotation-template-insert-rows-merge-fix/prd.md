# 报价单超 10 行插行 — 修复 footer merge 污染（方案 A）

## Goal

当 `fill_quotation_sheet` / `fill_quotation` 写入 **超过 VANTSING 模板默认 10 条数据行**（行 8–17）时，自动在 Total 行前插行，且 **新行与模板内行一致**：完整写入产品编号、报价名称、规格、数量、单价、总价等列，**边框/样式不残缺**。

## 问题（2026-06-30 探索复现）

用户反馈（企微 lian）：「目前报价单格式是十行，ai还不能自动增加」；截图显示第 11 行起规格列有值但缺表格线、行不完整。

本地复现（`data/空白标准报价单.xlsx` + 12 条 `fill_items`）：

| 行 | 结果 |
|----|------|
| 8–17 | 正常：编码、名称、规格、单价、总价齐全 |
| 18–19（插行后） | **仅** C 列规格 + N 列总价；F/G/I 等报价列为空 |

根因：`ws.insert_rows(total_row)` 后，原 footer 的合并区域（如 `C18:M18` Total 标签跨列）**落在新数据行上**，openpyxl 将这些列标为 `MergedCell`，`_set_cell_value_merged_safe` 无法写入报价列。

## 已确认决策

| 问题 | 决定 |
|------|------|
| 修复方案 | **方案 A** — 修 `_ensure_data_rows_before_total` 的 merge + 样式处理 |
| 不做 | **方案 B** — 扩模板到 20–30 空行（另开 task 若业务后续要求） |
| 模板容量 | 保持 10 行默认；超行靠代码插行 |
| Agent | 仍禁止 excel MCP 结构性填表；插行由 `fill_quotation_sheet` 负责 |

## 不在范围

- 修改 `空白标准报价单.xlsx` 预置行数（方案 B）
- excel MCP 批量补行
- LINGWEI 旧模板（若结构不同，本 task 仅保证 VANTSING；lingwei 可 follow-up）
- O 列供应商备注（见 `06-30-quotation-supplier-remark`）

## 技术方案（方案 A）

### 插行前

1. 记录 footer 区域所有 `merged_cells`（Total 行及其后 3 行税费区）。
2. **Unmerge** 即将被 `insert_rows` 影响的 merge（至少 Total 行 `A:B`、`C:M` 及后续 footer merges）。

### 插行

3. `ws.insert_rows(total_row_1based, insert_count)`（现有逻辑）。

### 插行后

4. 对每个新数据行（`total_row` .. `total_row + insert_count - 1`）：
   - **Unmerge** 任何落在数据区的 stray merges（尤其 `C:M`）。
   - 从 `style_row`（插行前末条数据行，通常 row 17）**逐列复制样式**（现有 `_copy_cell_style`）。
5. 在 **新 Total 行位置** 重新应用 footer merges（`A:B` 标签 + `C:M` 值区等），与模板原 footer 结构一致。
6. 更新 `total_row_1based += insert_count`（现有逻辑）。

### 填值

7. `fill_quotation` 主循环不变；插行后 F/G/I/N 等列应可正常写入。

```text
Before insert (row 18 = Total, C18:M18 merged)
  8-17  data rows
  18    Total (merged footer)

insert_rows(18, 2)  — naive
  8-17  data
  18-19 NEW rows inherit C:M merge  ← BUG
  20    Total

After fix
  8-17  data
  18-19 NEW rows: unmerged + styled like row 17
  20    Total with footer merges restored
```

## 实现阶段

### P0 — Unmerge + 样式 + footer 重建

- [x] 抽取 `_unmerge_ranges_touching_rows(ws, row_start, row_end)` helper（或内联于 `quote_tools.py`）
- [x] 动态 footer merge 保存/恢复（`_unmerge_ranges_from_row` + `_apply_merge_ranges`；未用硬编码 `_restore_vantsing_footer_merges`）
- [x] 改 `_ensure_data_rows_before_total`：插行前 unmerge footer → insert → 新行 unmerge + copy style → 新 total 行 restore merges
- [x] 确认 `fill_quotation` 在插行后 `total_row_1based` 正确传递给 totals 写入

### P1 — 测试 + smoke

- [x] 新测 `python/tests/test_quote_tools_insert_rows.py`：
  - 12 行 fill → 行 18–19 的 F/G/I/N 均有值
  - 新行 col 6/7/9 不是 `MergedCell`
  - Total 行仍在 merge 后正确写入合计
- [x] 边界：恰好 10 行不插行；11 行插 1 行（20 行插 10 行未单测，可 follow-up）
- [ ] 手工 smoke：空白模板 Path C 出 12 品报价单 → Excel 打开无「飘着」的规格行（operator）

### P2 — 部署

- [ ] `sync-dev-wanding-vendor.ps1` 同步 `python/quotation/quote_tools.py`（operator）
- [ ] hot zip `vendor/wanding/python` 或随下一版 CCB dist（operator）
- [x] `quotation-agent.md` 补一句：「>10 行由 fill 自动扩行，禁止 excel 插行」

## Acceptance

1. **12 行自动化测试通过**：插行后第 11–12 条数据 F/G/I/N 列有值，无 stray `C:M` merge 落在数据行。
2. **≤10 行回归**：不插行，输出与现网一致。
3. **Footer 回归**：Total / PPN / 运费 / 含税总价四行 merge 与金额正确。
4. **用户场景**：lian 类 >10 品报价单，不再出现「只有规格、没边框」的残行。

## 验证命令（实现后）

```powershell
cd D:\Projects\claude-code-best
$env:PYTHONPATH = "D:\Projects\claude-code-best\python"
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = "1"
python -m pytest python/tests/test_quote_tools_insert_rows.py python/tests/test_quote_tools_formulas.py -v
```

## Priority

**P1** — 影响多品出单；有 workaround（人工删行 / 拆单）但体验差。

---

## P3 扩充 — 自动生成报价单写入 Excel 公式（2026-06-30 探索）

### 用户问题

自动生成的报价单单元格能否带公式？主要场景：**改数量/单价后总额自动重算**；与插行后的 **SUM 范围** 一致。

### 探索结论：**不难，模板本来就有公式，是 fill 把它盖掉了**

`空白标准报价单.xlsx` 已内置：

| 单元格 | 公式 | 含义 |
|--------|------|------|
| N18 | `=SUM(N8:N17)` | 不含税总价 |
| N19 | `=N18*0.11` | PPN 11% |
| N20 | （手填） | 运费 |
| N21 | `=SUM(N18:N20)` | 含税总价 |

数据行 N 列在模板里**无**公式；`fill_quotation` 当前用 Python 算 `round(up*q, 2)` **写死数值**，并 **覆盖** footer 公式（见 `quote_tools.py` Safe document-fill 注释）。

```text
模板设计          fill_quotation 现状
─────────         ───────────────────
N8  =M8*K8  (无)   N8  = 静态数字
N18 =SUM(...)      N18 = Python sum  ← 盖掉公式
>10 行插行后       SUM 仍写死 N8:N17  ← 更错
```

### 难度评估

| 项 | 难度 | 说明 |
|----|------|------|
| 行总价 `=M{row}*K{row}` | 低 | openpyxl `cell.value = "=M8*K8"` |
| Footer 动态 `=SUM(N{start}:N{end})` | 低 | 插行后已知 `data_start_row` 与 `total_row-1` |
| PPN `=N{total}*0.11` | 低 | 相对引用随 total 行移动 |
| 含税 `=SUM(N{total}:N{total+2})` | 低 | 含运费行 |
| 无货行 | 中 | `=0` 或 `=IF(F8="无货",0,M8*K8)` |
| **测试** | 中 | openpyxl **不算公式**；测公式字符串 + Python 旁路校验，或 `data_only` 读缓存值 |
| Agent 抽检 | 低 | excel read 在 Excel 打开后会显示计算结果 |

**总体：中等偏低** — 主要工作是改 fill 逻辑 + 动态范围，不是新能力。

### 已确认方向（待实现时拍板）

| 问题 | 建议 |
|------|------|
| 行 N 列 | 有单价+数量 → `=M{row}*K{row}`；无货 → `0` 或 IF |
| Footer | **写公式、不写 Python 汇总值**；运费 N{total+2} 仍写数值（默认 0） |
| 插行后 | `=SUM(N8:N{last})` 用 layout + total_row 动态生成 |
| 回归 | `fill_quotation` 返回值 `total_excluding_ppn` 仍可由 Python 侧 sum 计算（不依赖 Excel 引擎） |

### P3 实现清单

- [x] `_row_line_total_formula(layout, row)` → `=M8*K8`（VANTSING col 13×11）
- [x] `_apply_footer_total_formulas(...)` → SUM / PPN / grand total
- [x] `fill_quotation`：N 列与 footer 改写公式；保留 M/K 写数值
- [x] 插行 12 行测试：Total 行 `=SUM(N8:N19)`；行 18 `=M18*K18`
- [x] 无货行：N=0（静态，非 IF 公式）
- [x] `quotation-agent.md`：改价/改量后无需 agent 重算总额；禁止 excel 覆盖 N/footer 公式

### P3 Acceptance

1. 出单后 Excel 打开：改 K 列数量，N 列行总价与 footer 自动变。
2. 12 行出单：Total 行 SUM 包含 N8–N19（非写死 N17）。
3. 单元测试断言公式字符串（不依赖 openpyxl 计算引擎）。
