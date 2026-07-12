# Seed contract — supplier directory + logistics vehicles

**Status:** execution contract (Phase 8 fidelity 2026-07-12)  
**Date:** 2026-07-12  
**Source:** `research/index-supplier-directory.html` + `research/seed-overlays.json`

## Seed fidelity principles (reuse on HTML/Excel imports)

1. **Source Field Parity** — Before seed GREEN: gap matrix (source ↔ parse ↔ DB ↔ API ↔ UI). See `research/fidelity-gap.md`.
2. **Encode ≠ Display** — Keep encoded raw for match/hash; expose normalized columns for humans (`products_json`, `products_summary`, `distance_km`).
3. **Dead column rule** — Schema-only columns without full-stack wiring do not count as shipped.
4. **Not pixel clone ≠ field loss** — UI may differ; fields and overlays must not be dropped.

## Field parity checklist (HTML FIELD_KEYS → Org)

| HTML key | Org column | Required in seed v2 |
|----------|------------|----------------------|
| 供应商编码 | `code` | yes |
| 工厂全称 | `name_zh` | yes (natural key) |
| 主营产品大类 | `category` | yes |
| 产品名称 | `products_text` + `products_json` | yes |
| 规格型号 | `spec` | yes (empty OK) |
| 详细技术参数 | `tech_params` | yes |
| 原材料材质 | `material` | yes |
| 人民币单价/单位 | `price_note` | yes |
| MOQ最小起订量 | `moq` | yes |
| 标准交期（天） | `lead_days` | yes |
| 工厂完整仓库地址 | `address` | yes |
| 国内对接联系人 | `contact` | yes |
| 联系电话 | `phone` | yes |
| WhatsApp账号 | `whatsapp` | yes |
| 业务邮箱 | `email` | yes |
| 工厂资质 | `qualification` | yes |
| 供应商等级 | `grade` | yes |
| 备注 | `notes` + `distance_km` | split `距仓库约Xkm` |
| *(overlay)* | `locations_json` | 凌威 / 奎鑫 multi-address |

**Spot-check suppliers (manual):** GSMI 17km · 双林 70km + grouped products · 凌威 2 locations · 三信 土工布 match.

## Goal

Seed must be **idempotent**: re-running import on the same Org DB does not duplicate rows and does not wipe whitelist edits unless explicitly forced.

## Datasets

| Dataset | Count (HTML snapshot) | Org table (provisional) |
|---------|----------------------|-------------------------|
| Suppliers | ≥27 | `suppliers` |
| Vehicles | 10 (Lalamove ID) | `logistics_vehicles` |
| Glossary (optional v1) | HTML ID map | `supplier_product_glossary` or bundled with scorer |

## Unique keys

| Entity | Natural key | Notes |
|--------|-------------|-------|
| Supplier | `normalize(name_zh)` where `name_zh` = 工厂全称 | Trim; collapse internal whitespace; case-fold Latin; keep CJK as-is. Provisional `code` empty in HTML → **do not** use empty code as key. |
| Vehicle | `seed_key` = `lalamove:{no}` (HTML `no` 1..10) | Also store `name_zh` / `name_id` |
| Glossary | `term_zh` | Optional |

Also store:

- `source` = `html_seed_2026_07`
- `source_hash` = sha256 of canonical JSON row at seed time
- `seed_version` = integer (**2** after Phase 8 fidelity; bump when HTML dump replaced)

## Upsert rules

```text
ON CONFLICT (natural_key):
  IF row.updated_at > row.seeded_at (user/admin edited after seed):
    KEEP user fields (name/address/contact/products/vehicle specs)
    ONLY refresh seed metadata if --refresh-meta
  ELSE:
    UPSERT all seed-owned columns from HTML
```

Default seed CLI: **upsert unlocked/unedited rows only**; never DELETE missing-from-seed rows on re-run (orphan retention) unless `--prune-missing` (manual ops, documented).

## Repeat-run expectations

| Run | Expectation |
|-----|-------------|
| 1st seed | inserts 27 suppliers + 10 vehicles |
| 2nd seed (no edits) | 0 inserts; 0 duplicates; counts unchanged |
| After whitelist edit address | 2nd seed **preserves** edited address |
| `--force-overwrite-seed` | ops-only; overwrites even edited (requires confirm) |

## GREEN (implement phase)

```text
python -m unittest scripts/org-phase0/test_supplier_directory_parse.py  # 13 tests
cargo test -p aionui-supplier-directory                                   # match fixtures
bootstrap-supplier-directory.py → suppliers≥27 vehicles≥10
GET GSMI distance_km=17; 凌威 locations_json len=2
```

## Out of scope for seed

- Live Lalamove API sync  
- Mapping directory names onto price-library `supplier` column  
