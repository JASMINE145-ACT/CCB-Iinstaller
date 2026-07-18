# PRD — Supplier Directory Hybrid Search

## Goal

Improve supplier-directory recall without weakening the existing business matching contract. The product scorer remains the primary authority for “who makes/sells product X”; hybrid search adds bounded broad recall for aliases, multilingual terms, and long product text.

## Problem

The current supplier-directory paths are correct but narrow:

- `suppliers_list` is SQL LIKE for browse/search by name, address, contact, or raw product text.
- `suppliers_match_product` is structured product scoring over flattened product names.
- `logistics_vehicles_match` is vehicle-use scoring.

This works for fixtures like `土工布`, `双林`, and `送管材`, but it can miss natural or multilingual variants such as `geotextile`, `geotekstil`, `pipe supplier`, or product words buried inside long `products_text`.

## Decision

Build hybrid search as:

1. structured scorer first;
2. alias/query expansion;
3. SQLite FTS/BM25 fallback recall;
4. merge + rerank + evidence payload;
5. Agent consumes topK evidence only.

Do not use runtime grep or Agent full-directory reads as the normal production query path.

## Scope

### In Scope

- Add a hybrid product-search mode or endpoint for supplier directory.
- Keep existing `/api/suppliers/match` behavior stable unless explicitly routed to hybrid mode.
- Add alias expansion for common supplier terms: `土工布/geotextile/geotekstil`, `管材/pipe/pipa`, `钢材/steel/baja`, etc.
- Add FTS-backed broad recall over supplier fields.
- Return enough evidence for Agent answers: matched fields, snippets, score breakdown.
- Update supplier-directory MCP and agent prompt to prefer hybrid where appropriate.
- Add fixtures for Chinese, English, Indonesian, negative no-match, and route separation.

### Out of Scope

- Replacing the existing scorer with embeddings.
- Letting Agent read the full supplier table by default.
- Runtime grep over markdown/files as source of truth.
- Changing price-library or quotation supplier semantics.
- Reworking vehicle matching beyond preserving current behavior.

## Acceptance Criteria

- [ ] Existing fixture A/B/C/D still pass.
- [ ] `土工布谁有货？` returns HAKUNA + 三信 with product evidence.
- [ ] `geotextile supplier` recalls the same relevant geotextile suppliers through alias/FTS fallback.
- [ ] `双林仓库地址是什么？` remains a list/search path, not product match.
- [ ] `送管材用什么车？` remains vehicle match and does not recommend motorcycle as primary.
- [ ] Unknown product returns no-match without invented suppliers.
- [ ] MCP response includes `matched_fields` and `score_breakdown` for hybrid hits.
- [ ] Agent prompt states: no full-directory read by default; answer only from returned candidates.

## Safety Requirements

- Read permissions remain any authenticated Org user unless the existing spec changes separately.
- Write path remains unchanged: whitelist + CSRF + confirmed preview.
- Hybrid search must not query price-library, Accurate, or business markdown for supplier authority.
- FTS index/schema changes must be migration-backed and idempotent.

## References

- `.trellis/spec/integration/supplier-directory.md`
- `.trellis/tasks/archive/2026-07/07-12-supplier-directory-vs-price-library/research/match-fixtures.md`
- `.trellis/tasks/07-13-07-13-supplier-directory-hybrid-search/research/hybrid-search.md`
