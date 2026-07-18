# Phase 2 done — FTS/BM25 recall index

**Task:** `07-13-07-13-supplier-directory-hybrid-search`  
**Date:** 2026-07-13  
**Contract:** `WANd.SUPPLIER.HYBRID.001`

## Files Changed

| File | Change |
| --- | --- |
| `AionCore/crates/aionui-db/migrations/024_supplier_search_fts.sql` | Added SQLite FTS5 external-content index for `suppliers` with insert/update/delete triggers and rebuild |
| `AionCore/crates/aionui-supplier-directory/src/service.rs` | Added `SupplierFtsRecallHit`, FTS query builder, and `recall_suppliers_fts` recall method |
| `.trellis/tasks/07-13-07-13-supplier-directory-hybrid-search/execution-plan.md` | Advanced active phase and recorded verification evidence |

## Implementation Notes

- FTS is recall-only. It does not replace `match_suppliers` ranking.
- Indexed fields: `name_zh`, `category`, `products_text`, `address`, `contact`, `notes`.
- `supplier_search_fts` uses external content bound to `suppliers.rowid`.
- Triggers keep the FTS index synchronized after supplier insert/update/delete.
- `recall_suppliers_fts` normalizes product queries and uses BM25 ordering; lower rank is better.
- Snippet column selection uses `snippet(..., -1, ...)` so SQLite picks the matched column.

## RED / Debug Evidence

Initial FTS recall test showed that recall could find the row, but the snippet was fixed to `products_text` and missed a hit in `notes`:

```text
fts_recall_finds_long_text_alias_candidate ... FAILED
assertion failed: hits[0].snippet.to_ascii_lowercase().contains("geotextile")
```

Fix: switch snippet column from `2` to `-1`.

## GREEN Evidence

```text
cargo test -p aionui-supplier-directory
→ 12 passed

$env:CARGO_TARGET_DIR='D:\tmp\aionui-db-check-target'; cargo check -p aionui-db
→ finished dev profile successfully

python sqlite3 executes 022 + 023 + 024 and INSERT supplier
→ FTS query `geotextile` returns `sup1`
```

## Remaining Risks

- No public HTTP/API response uses FTS yet; this is intentional for Phase 2.
- Phase 3 must merge structured scorer hits and FTS hits deterministically.
- Phase 3 must add evidence payload (`matched_fields`, `score_breakdown`) before Agent/MCP exposure.
- SQLite FTS tokenization is not a semantic embedding substitute; aliases remain necessary for multilingual query terms.

## Next Phase

Phase 3 — Hybrid merge/rerank evidence response.
