---
name: price-library-edit
description: >
  Organization price library edit SOP: single-item upsert, export-edit-import bulk,
  and full prepare-price-library-import.py workflow. Use for 改价, 批量维护, 导入发布, 回滚.
---

# Price Library Edit / 价格库维护 SOP

> **Authority:** org MCP write path only. Never edit bundled seed xlsx as source of truth.

## Route by scope (三分法)

| Scope | Path |
|-------|------|
| **1–5 rows, few fields** | `get_price_library_draft` → `upsert` `confirmed=false` → user OK → `confirmed=true` → publish two-phase |
| **Tens of rows** | `export_price_library` → excel MCP edit → `preview_price_library_import` → `apply` two-phase → publish |
| **Full normalize / dedupe / tax mapping** | Run `prepare-price-library-import.py` (repo) → `data/price_library_import_ready.xlsx` → `preview`/`apply` → publish |

**Wrong:** Run prepare script for a 3-row tweak. **Wrong:** upsert 3000 rows one by one.

## prepare-price-library-import.py (full bulk only)

```powershell
cd D:\Projects\claude-code-best
python scripts/org-phase0/prepare-price-library-import.py
```

| Output | Meaning |
|--------|---------|
| `data/price_library_import_ready.xlsx` | Importable workbook (deduped material keys) |
| `data/price_library_import_skipped.json` | skipped / catalog-only / deduped row audit |

**Mapping (empty abcd only):** `price_b` ← local tax; `price_c` ← factory tax.  
**Dedupe:** one row per `material`; prefer `is_preferred_price=True`.  
**Tension:** `data.Md` documents PE/LESSO overlap history; org active has **unique** material — explain dedupe, do not delete via import omission.

## Single-item upsert

1. Read `data/data.Md` once per session if field semantics unclear (RUCIKA / supplier / tiers).
2. `get_price_library_draft` — note `revision`.
3. `upsert_price_library_item` `confirmed=false` — show markdown diff table.
4. User confirms → `confirmed=true`.
5. Publish two-phase if change should be visible org-wide.

**New SKU:** include `material_code` + required fields; set `is_preferred_price` when adding preferred row.

**Supplier:** optional metadata; multi-value `A / B` preserved as-is.

## Import preview summary (required format)

After `preview_price_library_import` or `apply` preview:

| Metric | Value |
|--------|------:|
| create | … |
| update | … |
| unchanged | … |
| errors | … |

List first 5 `errors` if `error_count > 0`. Never apply with errors without user ack.

## Revert

1. `list_price_library_versions` — pick `version_id` (not version_number).
2. `revert_price_library_version` two-phase confirm.
3. `get_price_library_active` verify new `version_number`.

## After publish

Remind: employees need **new quotation session** for `org_api` price; mention `version_number`.
