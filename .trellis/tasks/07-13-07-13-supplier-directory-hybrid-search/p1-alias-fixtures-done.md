# Phase 1 done — alias expansion + multilingual fixtures

**Task:** `07-13-07-13-supplier-directory-hybrid-search`  
**Date:** 2026-07-13  
**Contract:** `WANd.SUPPLIER.HYBRID.001` + existing `WANd.SUPPLIER.MATCH.001`

## Files Changed

| File | Change |
| --- | --- |
| `AionCore/crates/aionui-supplier-directory/src/match_score.rs` | Added English intent-word stripping and minimal alias expansion for geotextile/geotekstil, pipe/pipa, steel/baja |
| `.trellis/tasks/07-13-07-13-supplier-directory-hybrid-search/execution-plan.md` | Advanced active phase and recorded evidence |

## RED Evidence

```text
cargo test -p aionui-supplier-directory fixture_alias_geotextile_recalls_tugongbu_suppliers
→ FAILED: `geotextile supplier` returned []
```

The failure confirmed the current structured scorer did not recall Chinese geotextile suppliers from English product wording.

## GREEN Evidence

```text
cargo test -p aionui-supplier-directory
→ 10 passed
```

Covered fixtures:

- Existing `土工布` fixture still returns HAKUNA + 三信.
- Natural-language Chinese query still returns HAKUNA + 三信.
- New `geotextile supplier` fixture returns HAKUNA + 三信.
- Negative no-match fixture remains empty.
- Vehicle fixture still avoids motorcycle as primary for 管材.

## Remaining Risks

- This phase only adds alias expansion inside the shared scorer. It does not implement SQLite FTS/BM25 recall yet.
- Alias list is intentionally small; Phase 2 should decide whether aliases live in code, DB seed, or config.
- Hybrid evidence fields (`matched_fields`, `score_breakdown`) are not implemented yet.

## Next Phase

Phase 2 — FTS/BM25 recall design + migration.
