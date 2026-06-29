# Price library — full schema recovery (2026-06-28)

## Problem

MVP shipped **7 columns** while `data/data.Md` defines **41 columns**. VPS v1/3082 rows were structurally incomplete.

## Goal

41 fields end-to-end: DB (`017`) → API → AionUI → VPS v2 publish.

**Status: completed (2026-06-28)**

---

## Done

### Code + local

- [x] Migration `017_price_library_full_schema.sql`
- [x] AionCore excel/service/api-types full fields
- [x] AionUI `PRICE_LIBRARY_COLUMNS` (41)
- [x] `prepare-price-library-import.py` — quotable columns + full header
- [x] `data/price_library_import_ready.xlsx` (3082 × 41 cols)
- [x] `cargo test -p aionui-price-library` — 21 pass
- [x] Dev bundled aioncore sync + smoke 401×3

### VPS v2 (verified on host)

- [x] Deploy + build + restart aionorg
- [x] import/publish **v2** (`reason: full schema v2`)
- [x] `GET /active`: **version 2**, **3082** products
- [x] RUCIKA sample: `product_type=RUCIKA JIS`, `factory_inc_tax=63008`, `price_b=66757`, `price_d=70929`

## Deferred (not blocking closure)

- [ ] AionUI `#/price-library` employee sign-off with live v2 (41 cols)
- [ ] Quotation `org_api` E2E
- [ ] AionUI price_admin UI
- [ ] Quotation stale metadata in output files

## Out of scope

- Full PRD admin UI / PR0 legacy smoke removal
