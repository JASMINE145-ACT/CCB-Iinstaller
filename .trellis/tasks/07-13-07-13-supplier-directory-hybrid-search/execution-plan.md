# Execution Plan — `07-13-07-13-supplier-directory-hybrid-search`

| Field | Value |
| --- | --- |
| **Status** | **done** |
| **Approved** | 2026-07-13 by user (`可以`) |
| **Active phase** | Complete |
| **Plan depth** | Standard |
| **Verification profile** | Backend + MCP |
| **Primary contract** | `WANd.SUPPLIER.HYBRID.001` |
| **Non-goal** | Runtime grep / Agent full table read as production path |

## Progress Snapshot

| Phase | State | Evidence |
| --- | --- | --- |
| Phase 0 task setup | done | `prd.md`, `research/hybrid-search.md`, context jsonl, approved plan |
| Phase 1 alias + RED fixtures | done | RED: `geotextile supplier` returned `[]`; GREEN: `cargo test -p aionui-supplier-directory` → 10 passed |
| Phase 2 FTS recall | done | `024_supplier_search_fts.sql`; `recall_suppliers_fts`; `cargo test -p aionui-supplier-directory` → 12 passed; SQLite migration smoke PASS |
| Phase 3 hybrid merge/rerank | done | `/api/suppliers/hybrid-match`; `matched_fields`; `score_breakdown`; `cargo test -p aionui-supplier-directory` → 13 passed |
| Phase 4 MCP + Agent contract | done | `suppliers_hybrid_match` MCP tool; source/staging `node --check`; Bun preview tests → 4 passed; Agent forbids full-directory read |
| Phase 5 verification/spec | done | Rust/db/node/bun/SQLite/Trellis validation passed; supplier-directory spec documents hybrid boundary |

## Contract Map

| Contract | Behavior Protected | Primary Code | Tests / Smoke | Risk |
| --- | --- | --- | --- | --- |
| `WANd.SUPPLIER.MATCH.001` | Existing product scorer fixtures stay stable | `match_score.rs` | `cargo test -p aionui-supplier-directory` | Regression in known Chinese fixtures |
| `WANd.SUPPLIER.HYBRID.001` | Hybrid search improves recall without replacing scorer authority | supplier-directory service/API/MCP | alias + FTS + negative fixtures | Wrong supplier recall / overbroad answers |
| `WANd.ROUTING.SUPPLIER_DIR.001` | Directory intents do not leak to price-library/Accurate/md | supplier agent/orchestrator docs | Agent fixture prompts | Cross-system contamination |
| `WANd.SUPPLIER.CRUD.001` | Write path unchanged | MCP preview/upsert | existing Bun preview tests | Accidental write-path regression |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Files | Required output | Profile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Alias expansion + RED/GREEN fixtures | MATCH, HYBRID | matcher | `match_score.rs`, tests | multilingual alias fixtures pass | Backend |
| 2 | P0 | FTS/BM25 recall design + migration | HYBRID | migration | supplier crate, db migration | indexed recall over products/address/notes | Backend |
| 3 | P0 | Hybrid merge/rerank evidence response | HYBRID | ranking | supplier service/routes/API types | `matched_fields`, `score_breakdown`, snippets | Backend |
| 4 | P1 | MCP + Agent contract | ROUTING, HYBRID | agent | supplier MCP, agent md, staging copies | hybrid tool/mode; no full-read default | MCP |
| 5 | P1 | Verify + spec update | all | docs | spec/task docs | tests green; spec documents hybrid boundary | Review |

## TDD Contract

| Workstream | RED Evidence | GREEN Command | Refactor Guard |
| --- | --- | --- | --- |
| Alias fixtures | `geotextile supplier` misses expected suppliers | `cargo test -p aionui-supplier-directory` | existing Fixture A/B/C/D still green |
| FTS recall | alias-only term has no candidates | cargo test for recall/index layer | unknown product still empty |
| Hybrid response | no matched field/score evidence | cargo test/API unit | score merge deterministic |
| MCP/Agent | Agent contract allows full read or wrong tool | `node --check` + Bun tests | existing preview/write tests green |

## Execution Rules

- Execute only the active phase.
- Keep `/api/suppliers/match` existing behavior stable until a hybrid mode/endpoint is explicitly introduced.
- Do not touch price-library, quotation, Accurate, or org-knowledge authority paths.
- Do not commit unless explicitly requested.

## Phase 1 Steps

1. Read `.trellis/spec/integration/supplier-directory.md` and archived match fixtures.
2. Add alias normalization/expansion tests for product matching.
3. Implement minimal alias expansion inside shared scorer or a small shared helper.
4. Run `cargo test -p aionui-supplier-directory`.
5. Update this Progress Snapshot and write `p1-alias-fixtures-done.md`.


