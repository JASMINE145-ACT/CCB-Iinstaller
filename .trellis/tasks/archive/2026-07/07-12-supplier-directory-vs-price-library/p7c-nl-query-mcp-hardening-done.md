# Phase 7c — NL query normalize + MCP CSRF hardening (done)

**Date:** 2026-07-12  
**Touches:** `WANd.SUPPLIER.MATCH.001`, `WANd.SUPPLIER.CRUD.001`, `WANd.SUPPLIER.AGENT.001`

## Problem

Users and agents often pass **full natural-language sentences** as tool/API `q` (e.g. `土工布谁有货？`, `双林仓库地址是什么？`). Raw substring scoring and SQL `LIKE` on intent words reduced recall or missed factory names.

MCP write path could fail on stale CSRF after session refresh (401/403/419). Vehicle match in Node used literal CJK in source — Windows encoding risk.

## Changes

| Area | File | Behavior |
|------|------|----------|
| Product match normalize | `AionCore/.../match_score.rs` `normalize_product_query` | Strip intent tokens (谁有货/谁做/工厂/请问/…) + punctuation before `keyword_list` → `match_suppliers` |
| List/search normalize | `AionCore/.../service.rs` `normalize_supplier_search_query` | Strip lookup fluff (仓库地址/是什么/在哪里/…) before SQL `LIKE` in `list_suppliers` |
| Agent contract | `supplier-directory-agent.md` §Query parameter contract | Tool `q` = extracted phrase, not full user sentence (server normalize is fallback) |
| MCP CSRF | `mcp_servers/supplier-directory-server/index.mjs` | POST 401/403/419 → clear CSRF cache, retry once; `/api/auth/status` bootstrap sends JWT |
| Vehicle Unicode | same `index.mjs` | `\u7ba1\u6750`, `\u6469\u6258` escapes in vehicle needles / moto penalty |
| Staging sync | `ccb-installer/staging/vendor/.../index.mjs`, `staging/seed/agents/supplier-directory-agent.md` | Mirror package/MCP |

## Examples (locked)

| User utterance | Tool | `q` after normalize |
|--------------|------|---------------------|
| 土工布谁有货？ | `suppliers_match_product` | `土工布` |
| 双林仓库地址是什么？ | `suppliers_list` | `双林` |
| 送管材用什么车？ | `logistics_vehicles_match` | use-case phrase OK (e.g. `送管材`) |

## Verification (2026-07-12)

```text
cargo test -p aionui-supplier-directory     → 9 passed
node --check mcp_servers/supplier-directory-server/index.mjs
node --check ccb-installer/staging/vendor/mcp-servers/supplier-directory/index.mjs
bun test mcp_servers/supplier-directory-server/preview.test.mjs → 4 passed
```

New tests: `fixture_a_accepts_natural_language_product_query`, `supplier_search_query_removes_lookup_intent_words`.

## Ops note

- Redeploy MCP vendor copy to `D:\CCB-Wanding\vendor/mcp-servers/supplier-directory/` after pull.
- `AionCore/.git/index.lock` was stale (no active git/cargo); remove if `git status` blocks.

## Not in scope

- Phase 8 HTML field fidelity (`WANd.SUPPLIER.FIDELITY.001`) — still pending approval.
