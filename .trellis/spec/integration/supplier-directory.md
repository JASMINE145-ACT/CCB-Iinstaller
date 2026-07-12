# Supplier directory (Org center)

> Org-shared factory roster + logistics vehicles. **Not** price-library SKU `supplier` column. **Not** Accurate vendor. **Not** business-knowledge md.

**Status (2026-07-12):** migration `022`/`023` + REST + match + MCP + `#/suppliers` UI. Phase 8 fidelity: full HTML field parity.

## Seed fidelity principles (WANd.SUPPLIER.FIDELITY.001)

Applies to **any** HTML/Excel snapshot seed into Org tables:

1. **Source Field Parity** — Enumerate source columns first; build parse → DB → API → UI gap matrix before calling seed done. Row counts (27/10) are necessary but not sufficient.
2. **Encode ≠ Display** — Delimiter-encoded fields (e.g. `;;` product groups) may stay raw for match/idempotency; UI must use normalized `products_json` / `products_summary`, never raw encoding.
3. **Dead column rule** — A migration column counts as delivered only when parse, service, DTO, and UI (or MCP) all read/write it.
4. **Not pixel clone ≠ field loss** — AionUI-native UI is fine; business fields and semantics must match the source snapshot (including HTML render overlays in `seed-overlays.json`).

See also: `research/seed-contract.md` § Field parity checklist · `research/fidelity-gap.md`.

## Supplier row fields (GET `/api/suppliers`)

| Field | Notes |
|-------|-------|
| Core | `name_zh`, `category`, `code`, `grade` |
| Products | `products_text` (match raw), `products_json`, `products_summary` |
| Product detail (row-level) | `spec`, `tech_params`, `material`, `price_note`, `moq`, `lead_days`, `qualification` |
| Location | `address`, `distance_km`, `locations_json` |
| Contact | `contact`, `phone`, `whatsapp`, `email`, `notes` |

## Boundary

| System | Role |
|--------|------|
| **This module** | Who sells what / address / contact / vehicle types |
| Price library | Coded SKUs + prices; optional SKU `supplier` remark |
| Org knowledge | Policy markdown rules |
| Accurate | Accounting vendor IDs |

## HTTP (Phase 1–2)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/suppliers?q=&category=` | any JWT — `q` normalized (strip 地址/是什么/… intent words) before SQL `LIKE` |
| GET | `/api/suppliers/match?q=&top_n=` | any JWT — shared scorer; `q` normalized (strip 谁有货/工厂/… ) before token match |
| GET | `/api/suppliers/{id}` | any JWT |
| POST | `/api/suppliers` | `SUPPLIER_DIR_ADMIN_USERNAMES` + CSRF |
| GET | `/api/logistics-vehicles` | any JWT |
| POST | `/api/logistics-vehicles` | whitelist + CSRF |

Empty `SUPPLIER_DIR_ADMIN_USERNAMES` → **deny all writes**.

## Seed

- HTML → `scripts/org-phase0/supplier_directory_parse.py`
- HTTP upsert → `bootstrap-supplier-directory.py`
- Contract: `.trellis/tasks/07-12-supplier-directory-vs-price-library/research/seed-contract.md`

## MCP (Phase 3–4)

Prefix `mcp__supplier-directory__`. Agent: `supplier-directory-agent`.

| Tool | Notes |
|------|-------|
| `suppliers_list` / `get` / `match_product` | read |
| `logistics_vehicles_list` / `match` | read |
| `suppliers_upsert` / `logistics_vehicles_upsert` | `confirmed=false` preview; `true` + CSRF + whitelist; POST retries once on 401/403/419 after CSRF refresh |

## Query normalization (2026-07-12)

**Dual layer:** Agent should pass extracted `q` phrases; server normalizes as fallback.

| Path | Function | Example |
|------|----------|---------|
| Match | `normalize_product_query` in `match_score.rs` | `土工布谁有货？` → `土工布` |
| List | `normalize_supplier_search_query` in `service.rs` | `双林仓库地址是什么？` → `双林` |

Agent contract: `supplier-directory-agent.md` §Query parameter contract.

## Contracts

`WANd.SUPPLIER.DIR.001` · `SEED.001` · **`FIDELITY.001`** · `VEHICLE.001` · `MATCH.001` · `AGENT.001` · `CRUD.001` · `ROUTING.SUPPLIER_DIR.001`
