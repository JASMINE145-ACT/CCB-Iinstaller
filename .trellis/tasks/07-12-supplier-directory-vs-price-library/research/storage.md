# Storage — Org structured tables (locked)

**Date:** 2026-07-12  
**Decision:** Source of truth = **AionCore Org SQLite tables + REST**, same center as price-library / work-tasks / org-knowledge.

## Tables (provisional names)

| Table | Row means | Key fields (illustrative) |
|-------|-----------|---------------------------|
| `suppliers` | One factory / vendor in directory | `id`, `name_zh` (unique natural key), `category`, `products_text`, `address`, `contact`, `phone`, `whatsapp`, `email`, `notes`, `source`, `seed_version`, `created_at`, `updated_at` |
| `logistics_vehicles` | One vehicle type | `id`, `seed_key` (`lalamove:{n}`), `name_zh`, `name_id`, `load`, `size`, `use_zh`, `use_id`, … |

Product match does **not** require a third “match results” table: score over `products_text` (and optional glossary) at query time.

## Rejected storage

| Approach | Why rejected |
|----------|--------------|
| Business-knowledge md as SoT | Unstable ranking; shadow sync pitfalls; poor row edits |
| Agent Grep on repo/vendor md | Not fleet-shared; not UI-同源; no confirmed write contract |
| Embed in `price_products.supplier` | That column is SKU remark for cooperated coded items only |

## Allowed non-authoritative

- Read-only **export** of tables → md for humans  
- Knowledge-base **policy** sentences (preferences), not directory rows  

## Ops

- Seed: `research/seed-contract.md` (idempotent upsert)  
- Env write gate: `SUPPLIER_DIR_ADMIN_USERNAMES`  
- CSRF on mutating HTTP (same as price-library / knowledge)
