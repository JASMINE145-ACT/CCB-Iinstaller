# Phase 2 done — Price write capability gate

**Date:** 2026-07-14  
**Parent:** `07-14-employee-intelligence-layer`  
**Contract:** `WANd.ORG.CAP_GATE.001` / Business Closure §3

## Delivered

| Workstream | Change |
|------------|--------|
| 2.1 REST gate | `can_write_price_library` = `is_admin` OR `price_library.write` only by default. Env list ignored unless `PRICE_LIBRARY_ENV_BREAK_GLASS=1` |
| 2.2 MCP | `price-library-server` preflight via `/api/auth/user` (`is_admin` or cap); authoritative deny still Org REST |
| 2.3 Audit | Denied writes → `employee_audit_log` (`price_library.write` / denied); ok → draft_upsert / publish / revert / import_apply |
| Identity | `PublicUser.capabilities` returned from `/api/auth/user` for MCP/client gates |

## Tests

- `cargo test -p aionui-price-library --lib` — 28 ok (incl. env bypass closed + break-glass)
- `cargo check -p aionui-app` — ok

## Ops notes (VPS)

- Existing `PRICE_ADMIN_USERNAMES=admin` is **ignored** for grant unless break-glass is on; **`users.is_admin` still allows** `admin`.
- Redeploy aioncore for REST + audit + PublicUser.capabilities.
- Sync `mcp_servers/price-library-server/dist/index.js` into install/vendor MCP when shipping CCB.

## Not Phase 2

- Supplier write widen (Phase 4.3)
- Scope resolver (Phase 3)
