# 报价单备注 O 列 — 第三方供应商映射

## Goal

万鼎报价出单时：**若物料编码在固定映射表中有明确的第三方采购供应商**，自动把供应商名称写入标准 VANTSING 报价单 **O 列（Catatan / 备注）**。

业务场景（企微确认）：部分客户要求知道货源来自哪家供应商；例如采购自 `HENG XIN INTERNATIONAL INDONESIA` 的编码，报价备注需体现该供应商。

## 已确认决策（2026-06-30）

| 问题 | 决定 |
|------|------|
| 数据源 | **固定表**，格式类似 `采购订单明细.xlsx`（供应商 + 物料编码 + 可选名称列） |
| 哪些品写备注 | **仅第三方供应商**（如 HENG XIN）；联塑直采 / 默认货源 **不写** |
| 无映射时 | **留空**（不猜、不写占位符） |
| 备注列 | 模板 O 列 = `Catatan` / 备注（`layout` 当前未接） |

## 不在范围

- Accurate 实时查 vendor / 采购历史推导
- 按客户区分的供应商映射
- 改 `price_library` schema（价目 `source_sheet` ≠ 采购供应商）
- 用 excel MCP 替代 `fill_quotation_sheet` 写 O 列（应走 fill 管道）

## 现状（探索结论）

```
match_quotation → code + 价格
fill_quotation_sheet → A~N 列（含 L 品牌）
                      ✗ O 备注未写

price_library：material + source_sheet（LESSO管材）— 无 supplier 列
采购订单明细：supplier + 产品编码 — 可作为映射表 seed 格式
```

**L 列品牌 vs O 列备注：**

| 列 | 含义 | 例 |
|----|------|-----|
| L Brand | 产品品牌 | LESSO |
| O Catatan | 采购供应商 | HENG XIN INTERNATIONAL INDONESIA |

## 数据契约（草案）

**文件：** `data/supplier_product_mapping.xlsx`（或同名 csv，部署到 `vendor/wanding/data/`）

| 列 | 必填 | 说明 |
|----|------|------|
| `material` | ✓ | 物料编码，与 match 结果 `code` 对齐 |
| `supplier_name` | ✓ | 写入 O 列的供应商全称 |
| `supplier_short` | | 可选简称（展示/去重用） |
| `notes` | | 运维备注，不写入报价单 |

**表内只收录第三方供应商行**；联塑直采编码不入表 → 查不到 → O 列留空。

**Seed：** 从 `采购订单明细.xlsx` 导入（供应商列 + 产品编码列）；需人工剔除不需写备注的行。

## 实现阶段

### P0 — 打通 O 列填表管道

- [ ] `QuotationTemplateLayout` 增加 `remark_col=15`（VANTSING；lingwei 若无可为 `None`）
- [ ] `fill_quotation` / `fill_items` 支持 `remark` / `catatan` 字段写入 O 列
- [ ] 单元测试：给定 `fill_items[].remark`，O 列有值

### P1 — 映射表 + 自动 lookup

- [ ] `python/quotation/supplier_mapping.py`：加载映射表，`lookup_supplier(material) -> str | None`
- [ ] `enrich_fill_item` 或 fill 前处理：有 code 且映射命中 → 设置 `remark`；未命中 → 不设置
- [ ] 配置路径：`SUPPLIER_MAPPING_PATH` 或默认 `data/supplier_product_mapping.xlsx`
- [ ] `sync-dev-wanding-vendor.ps1` 同步 data 文件
- [ ] 单元测试：命中 / 未命中 / 空表

### P2 — Agent SOP + 部署

- [ ] `quotation-agent.md`：出单流程说明 O 列由 fill 自动填供应商；禁止用 excel 批量改 O（除单格修正）
- [ ] `deploy-seed-agents.ps1 -ForceMd` 验证
- [ ] 手工 smoke：PO 样例编码出单 → O 列有 HENG XIN；仅 LESSO 直采编码 → O 列为空

## Acceptance

- [ ] `8010012697`（映射表有 HENG XIN）出单后 O 列 = `HENG XIN INTERNATIONAL INDONESIA`（或表内规范名）
- [ ] 映射表无记录的编码出单后 O 列为空
- [ ] L 列品牌逻辑不变（LESSO 等仍走 `fill_enrich`）
- [ ] `fill_quotation_sheet` 单轮完成；不依赖 agent 事后 `write_data_to_excel` 写 O 列

## 风险 / 待观察

| 风险 | 缓解 |
|------|------|
| 映射表维护滞后 | 文档化导入流程；表放 `data/` + vendor sync |
| 一码多供应商 | v1 取表内唯一行；冲突行 build/import 时报错 |
| 供应商名称过长 | O 列原样写入；模板列宽由业务接受 |

## 参考

- 探索对话：侧栏数据库 task 同会话
- 样例：`采购订单明细.xlsx`（企微附件）
- 模板：`data/空白标准报价单.xlsx` 第 7 行 O = 备注
- Agent 现状：`quotation-agent.md` §excel 后置「备注 O / 单格修正」
