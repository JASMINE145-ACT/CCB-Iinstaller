# Research — Supplier directory vs price library

**Date:** 2026-07-12  
**Source HTML:** `research/index-supplier-directory.html` (copy of企微 `index.html`)  
**Stats script:** `research/parse_html_stats.py`

## Domain model (user-confirmed)

```
┌─────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ 供应商目录 Supplier Directory         │     │ 价格库 Price Library                   │
│ (index.html / Excel → HTML)          │     │ (Org AionCore /api/price-library)     │
├─────────────────────────────────────┤     ├──────────────────────────────────────┤
│ • 全量在地供应商（含未合作）            │     │ • 仅合作过、有物料编码的 SKU             │
│ • 地址 / 联系人 / 品类 / 产品文字描述   │     │ • 单价档位 + material_code              │
│ • 供应商编码目前多为空                 │     │ • supplier 字段 = 合作供应商备注         │
│ • 用途：查找「谁卖什么、在哪、怎么联系」 │     │ • 用途：查价 / 报价 / 出单编码           │
└─────────────────────────────────────┘     └──────────────────────────────────────┘
         ▲                                              ▲
         │ 不互相替代                                    │
         └──────── 可日后用「工厂全称 ≈ supplier」弱关联 ──┘
```

## Snapshot from HTML (2026-07)

| Metric | Value |
|--------|-------|
| Supplier rows (`allData`) | **27** |
| Non-empty `供应商编码` | **0** |
| Non-empty address | **21** |
| Non-empty contact | **17** |
| Categories | 建材五金 14 · 钢材相关 7 · 管材管道 5 · 电气相关 1 |
| Modes in UI | 供应商浏览 / 产品匹配 / 运输车辆 |
| Maintenance note in footer | Data maintained in Excel; HTML synced |

**FIELD_KEYS:** 供应商编码, 工厂全称, 主营产品大类, 产品名称, 规格型号, 详细技术参数, 原材料材质, 人民币单价/单位, MOQ, 标准交期, 工厂完整仓库地址, 国内对接联系人, 联系电话, WhatsApp, 业务邮箱, 工厂资质, 供应商等级, 备注

Most price/MOQ/grade fields are empty in this dump — the live value is **directory + product-capability text**, not SKU pricing.

## Existing WanD systems (do not conflate)

| System | What it stores | Spec / task |
|--------|----------------|-------------|
| Price library `supplier` column (migration 018) | Optional text on **SKU row** (294/3299 nonempty on v3) | `price-library.md`, `07-03-price-library-supplier-ui-column` |
| Quotation O-column / mapping | material_code → third-party supplier name for 备注 | `06-30-quotation-supplier-remark` |
| Accurate `vendor` master | Accounting vendor IDs / 采购汇总 | `accurate-agent` |
| Org knowledge | Business rules markdown | `org-knowledge.md` — **not** supplier CRM |

## Gap today

- No Agent/MCP can answer:「附近谁做土工布？」「双林仓库地址？」「按产品关键词匹配供应商」
- Orchestrator routes「供应商」stats → `accurate-agent` (账务), not directory lookup
- Price-library-agent only sees cooperated SKUs with codes

## Decision (2026-07-12)

User locked: **A + B + whitelist edit** + **full v1** (browse **+ product-match mode + vehicles**).  
HTML = seed; Org = authority. UI = AionUI-native shell with **feature parity** to HTML three modes.  
Agent must use all three data surfaces (search / match / vehicles); writes shared fleet-wide.

Still reject: merge into price library.
