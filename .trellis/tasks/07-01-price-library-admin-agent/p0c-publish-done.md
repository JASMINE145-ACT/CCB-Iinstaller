# P0C — `publish_price_library_draft` + 409 mapping

**Date:** 2026-07-02  
**Task:** `07-01-price-library-admin-agent`

## Delivered

| Layer | Change |
|-------|--------|
| Client | `org_price_admin_client.publish_draft(reason, revision)` → `POST /api/price-library/draft/publish` + CSRF |
| Dispatch | `handle_publish_price_library_draft` — `confirmed=false` preview (revision, pending items, active version); `confirmed=true` publish |
| Error codes | `ERROR_CODE_REVISION_CONFLICT` — `OrgVersionConflictError` (HTTP 409) mapped in `price_library_tool_dispatch` |
| MCP | `publish_price_library_draft` registered in `mcp_servers/price-library-server/dist/index.js` |
| Tests | `python/tests/test_org_price_admin_client.py` — **14/14** pass |

## Verification

- `python -m pytest python/tests/test_org_price_admin_client.py` → 14 passed
- code-reviewer → **PASS** (after P1 starter fixes)
- Vendor sync: run `.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings` from repo root; **new MCP session** after sync

## VPS smoke (user — price_admin)

1. Org login as price_admin in AionUI dev
2. `get_price_library_draft` — note `revision`
3. `upsert_price_library_item` `confirmed=false` → `confirmed=true` on one test SKU
4. `publish_price_library_draft` `confirmed=false` → user confirms → `confirmed=true` with same `revision`
5. `get_price_library_active` — `version_number` incremented
6. Optional dual-admin: stale `revision` → expect `REVISION_CONFLICT`, re-read draft, no auto-replay

## Not in P0C

- import preview/apply, revert (P0D)
- MCP health manifest entry (P0D)
