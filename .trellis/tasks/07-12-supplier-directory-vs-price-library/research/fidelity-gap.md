# Fidelity gap — HTML source vs Org seed/UI (2026-07-12)

**Source of truth for seed:** `index.html` (`FIELD_KEYS` + `allData` + HTML-only overlays)  
**User snapshot:** `c:\Users\m1774\Documents\WXWork\1688857212807317\Cache\File\2026-07\index.html`  
**Repo copy:** `.trellis/tasks/07-12-supplier-directory-vs-price-library/research/index-supplier-directory.html`

## User-reported gaps

1. **缺少距离列** — HTML shows `距仓库约Xkm` badge; AionUI browse table has no distance column.
2. **多余符号** — Raw `products_text` with `;;` grouping delimiters shown verbatim in UI.
3. **产品信息列不全** — HTML product accordion has 6 columns (name/spec/material/price/MOQ/lead); mostly `—` in source but structure must be preserved for future edits.

## HTML `FIELD_KEYS` (18 columns)

```text
供应商编码, 工厂全称, 主营产品大类, 产品名称,
规格型号, 详细技术参数, 原材料材质, 人民币单价/单位,
MOQ最小起订量, 标准交期（天）,
工厂完整仓库地址, 国内对接联系人, 联系电话, WhatsApp账号, 业务邮箱,
工厂资质, 供应商等级, 备注
```

## Gap matrix

| Field / behavior | HTML | `supplier_directory_parse.py` | DB `022` | API DTO | `#/suppliers` UI |
|------------------|------|-------------------------------|----------|---------|------------------|
| 供应商编码 | ✓ | ✓ `code` | ✓ | ✓ | drawer (partial) |
| 工厂全称 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 主营产品大类 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 产品名称 (raw) | ✓ `;;` grouped | ✓ raw only | ✓ `products_text` | ✓ | ✓ raw with `;;` |
| 产品分组展示 | `splitProductsGrouped` | ✗ | ✗ | ✗ | ✗ |
| 规格型号 | row-level (empty) | ✗ | column exists, **unused** | ✗ | ✗ |
| 详细技术参数 | row-level (empty) | ✗ | column exists, **unused** | ✗ | ✗ |
| 原材料材质 | row-level (empty) | ✗ | column exists, **unused** | ✗ | ✗ |
| 人民币单价/单位 | row-level (empty) | ✗ | column exists, **unused** | ✗ | ✗ |
| MOQ | row-level (empty) | ✗ | column exists, **unused** | ✗ | ✗ |
| 标准交期（天） | row-level (empty) | ✗ | column exists, **unused** | ✗ | ✗ |
| 地址 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 多地址+分距 | 凌威/奎鑫 hardcoded in `buildCard` | ✗ | single `address` | ✗ | ✗ |
| 距离 | `备注` regex `距仓库约(\d+)km` + per-row overlays | in `notes` mixed | ✗ dedicated | ✗ | ✗ |
| 联系人/电话/WA/邮箱 | ✓ | ✓ (7 fields) | ✓ subset in service | partial | drawer partial |
| 工厂资质 | ✓ | ✗ | column exists, **unused** | ✗ | ✗ |
| 供应商等级 | ✓ | ✓ | ✓ | ✓ | ✗ browse |
| 备注 (non-distance) | 凌威 PT 名等 | mixed into `notes` | ✓ | ✓ | ✓ |

## Distance inventory (from `allData` 备注)

| Supplier | 备注 pattern | Extracted km |
|----------|--------------|--------------|
| 双林 | 距仓库约70km | 70 |
| 三信 | 距仓库约56km | 56 |
| 凯顺德 | 距仓库约35km | 35 |
| GSMI | 距仓库约17km | 17 |
| 恒信 | 距仓库约6km | 6 |
| 宏源 | 距仓库约13km | 13 |
| … | (14 suppliers with distance in 备注) | … |
| 凌威 | PT entity name (not km) | overlay: 7km warehouse, 10km store |

## Product encoding (HTML)

- **Flat:** `prod1、prod2、prod3`
- **Grouped:** `;;大类;;产品1、产品2;;大类2;;…` — UI must not show raw `;;`; match scorer already uses `flatProducts()` (same as HTML).

## HTML-only overlays (not in `allData`)

| Supplier | Overlay data |
|----------|--------------|
| 凌威 | 仓库 7km + 门店 10km + separate phones |
| PT KUIXIN BAJA 奎鑫印尼 | 丹格朗 + 勿加泗 second address |

Store in `research/seed-overlays.json` (seed-owned, versioned).

## Design principle: 求同存异

- **求同:** All 18 `FIELD_KEYS` → structured columns; distance as first-class; products display = HTML grouping logic.
- **存异:** Row-level empty spec/MOQ/price columns kept for wholesale edits; per-product child table deferred to v1.1 unless needed for accordion rows (use `products_json` groups + empty detail cols).
