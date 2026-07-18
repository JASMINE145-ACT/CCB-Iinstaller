# Phase 3 Done — Hybrid Merge/Rerank Evidence Response

## Changes

- Added `/api/suppliers/hybrid-match` route and API response DTOs.
- Added `hybrid_match_products` service path that merges structured scorer hits with SQLite FTS recall candidates.
- Returned deterministic evidence fields:
  - `final_score`
  - `structured_score`
  - `fts_rank`
  - `matched_fields`
  - `score_breakdown`
  - merged structured/FTS snippet evidence when both are available.

## Verification

- `cargo fmt -p aionui-supplier-directory -p aionui-api-types`
- `cargo test -p aionui-supplier-directory` → 13 passed

## Notes

Hybrid recall adds candidates, but structured product scoring remains the primary authority in rerank weight. Unknown product fixtures still return empty.