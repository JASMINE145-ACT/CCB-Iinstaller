# Supplier Directory Hybrid Search — Research Notes

## Decision

Use structured supplier matching as the primary path, and add database-backed broad recall as a fallback. Do not make runtime grep or full-directory Agent reads the normal query path.

## Why not grep as the main path

- Grep returns text lines, not supplier entities with field provenance.
- Grep has no stable ranking, permission boundary, pagination, or API contract.
- Grep does not compose cleanly with VPS/API/MCP deployment.
- Agent full reads scale poorly and increase hallucination/privacy risk.

## Recommended shape

```text
User prompt
  -> intent route
  -> query normalization + alias expansion
  -> structured scorer primary
  -> SQLite FTS/BM25 fallback recall
  -> merge + rerank + snippets/evidence
  -> Agent answers only from topK returned evidence
```

## Search layers

| Layer | Purpose | Authority |
| --- | --- | --- |
| Structured scorer | Business correctness for product matching | Primary rank source |
| SQL LIKE | Exact name/address/contact browsing | Browse/search source |
| SQLite FTS5/BM25 | Broad fallback recall across long text and aliases | Recall source, not sole authority |
| Agent reasoning | Explanation and light disambiguation | Cannot invent beyond returned candidates |

## MVP hybrid scoring

Keep existing `match_suppliers` score. Add a hybrid endpoint or mode that merges structured hits and FTS hits:

```text
final_score = structured_score * 10
            + fts_rank_score
            + exact_product_bonus
            + alias_hit_bonus
            - category_only_penalty
```

Return `score_breakdown`, `matched_fields`, and snippets so the Agent can explain why a row was returned.

## Acceptance fixtures

- `土工布谁有货？` returns HAKUNA + 三信 from structured scorer, with product snippets.
- `geotextile supplier` also recalls HAKUNA/三信 through aliases/FTS.
- `双林仓库地址是什么？` uses supplier list/search semantics and returns 双林 address.
- `送管材用什么车？` remains vehicle matching, not supplier product matching.
- Unknown product returns empty/no-match, not invented factories.
