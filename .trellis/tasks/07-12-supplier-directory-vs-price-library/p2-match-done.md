# Phase 2 done — product match scorer + `/match`

**Date:** 2026-07-12  
**Contract:** `WANd.SUPPLIER.MATCH.001`

## Delivered

| Item | Path |
|------|------|
| Shared scorer | `AionCore/crates/aionui-supplier-directory/src/match_score.rs` |
| HTTP | `GET /api/suppliers/match?q=&top_n=` |
| DTOs | `SupplierMatchResponse` / `SupplierMatchHitResponse` |
| Vehicle helper | `match_vehicles` (Fixture C; MCP later) |

## GREEN

```text
cargo test -p aionui-supplier-directory --lib
→ 7 passed (Fixture A/C/D + flat_products + Phase 1 RBAC)
```

Fixture A: 「土工布」→ HAKUNA + 三信 with snippets.  
Fixture D: nonsense query → empty.  
Tie-break: score desc, then `name_zh` asc.
