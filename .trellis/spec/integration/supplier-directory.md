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

Prefix `mcp__supplier-directory__`. **Consumer agent:** `quotation-agent` only（独立 `supplier-directory-agent` 已移除；legacy id 别名到 quotation）。

| Tool | Notes |
|------|-------|
| `suppliers_list` / `suppliers_get` | factory/address/contact lookup |
| `suppliers_match_product` | exact/controlled product scorer compatibility |
| `suppliers_hybrid_match` | multilingual/uncertain product search; calls `/api/suppliers/hybrid-match` and returns evidence fields |
| `logistics_vehicles_list` / `match` | read |
| `suppliers_upsert` / `logistics_vehicles_upsert` | `confirmed=false` preview; `true` + CSRF + whitelist; POST retries once on 401/403/419 after CSRF refresh |


## Hybrid supplier search (WANd.SUPPLIER.HYBRID.001)

Use hybrid search for product intent when the user wording may be multilingual, partial, or uncertain.

| Layer | Contract |
| --- | --- |
| Structured scorer | Remains the primary authority for known product/category hits and keeps `WANd.SUPPLIER.MATCH.001` behavior stable. |
| FTS recall | SQLite FTS5 indexes `name_zh`, `category`, `products_text`, `address`, `contact`, and `notes`; it may add candidates but must not fabricate rows. |
| Rerank | Deterministic merge: structured score dominates; FTS adds bounded recall evidence. Tie-break by supplier name. |
| Response evidence | Hybrid hits expose `matched_fields`, `score_breakdown`, `structured_score`, optional `fts_rank`, `matched_products`, and snippet evidence. |
| Negative result | Empty/unknown products return empty results; Agent must say the directory has no match. |
| Non-production path | Runtime grep, business markdown reads, and full-directory Agent reads are not default production query paths. Use MCP/API. |

Agent routing: factory/address lookup, product hybrid, and vehicle match all run on **`quotation-agent`** via supplier-directory MCP. Product quote+source also runs `match_quotation` same turn (`WANd.TRADE.SOURCING.DUAL.001`).

### Guid card must stay gone (`supplier-directory-agent` retired)

| Contract | Evidence |
|----------|----------|
| Seed | Repo **must not** ship `supplier-directory-agent.md` / `.aionui.json` under `packages/.../agents` or `seed/agents` |
| Live prune | `ccb-installer/config/agents/retired-agent-ids.json` includes `supplier-directory-agent`; `deploy-seed-agents.mjs` deletes those files from `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` |
| Install seed | `{install}/seed/agents/retired-agent-ids.json` must stay **synced** with repo (not an older list that only had cowork/word-form). Stale install seed + leftover md → Guid **供应商名录** card resurrects after bootstrap/hot |

**Common mistake:** Deleting only live agents, leaving `D:\CCB-Wanding\seed\agents\supplier-directory-agent.*` + old `retired-agent-ids.json` → next ship/bootstrap reintroduces Guid card. Fix: prune both **live** and **install seed**, copy retired list from repo, re-run `deploy-seed-agents.mjs --force-md`, refresh Guid.

## Query normalization (2026-07-12)

**Dual layer:** Agent should pass extracted `q` phrases; server normalizes as fallback.

| Path | Function | Example |
|------|----------|---------|
| Match | `normalize_product_query` in `match_score.rs` | `土工布谁有货？` → `土工布` |
| List | `normalize_supplier_search_query` in `service.rs` | `双林仓库地址是什么？` → `双林` |

Agent contract: `quotation-agent.md` §工具决策表（名录路径）+ `dual-call-contract.md`.

## Contracts

`WANd.SUPPLIER.DIR.001` · `SEED.001` · **`FIDELITY.001`** · `VEHICLE.001` · `MATCH.001` · `AGENT.001` · `CRUD.001` · `ROUTING.SUPPLIER_DIR.001`
