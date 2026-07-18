# Cap gate matrix (v1 wedge)

> Fill completeness during Phase 0.2. Authority: `business-closure-contract.md` §3.

| Capability | REST entrypoints (must gate) | MCP tools (must gate) | Notes |
|------------|------------------------------|-----------------------|-------|
| `price_library.write` | draft upsert/delete/restore, import apply, publish, revert *(enumerate in implement)* | mutating tools in `price-library-server` | **MVP wedge** |
| `supplier_directory.write` | supplier write routes | supplier-directory mutating tools | Phase 4 |
| *(admin)* | org-users mutating | N/A | `is_admin`, not capability |

**Shared predicate:** `is_admin OR has_capability(cap)`.  
`PRICE_ADMIN_USERNAMES` applies **only** when `PRICE_LIBRARY_ENV_BREAK_GLASS=1` (break-glass; **not** a closure PASS).
