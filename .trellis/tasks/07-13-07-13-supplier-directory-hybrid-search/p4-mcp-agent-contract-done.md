# Phase 4 Done — MCP + Agent Contract

## Changes

- Added MCP tool `suppliers_hybrid_match` to source and staging supplier-directory servers.
- Routed the tool to `GET /api/suppliers/hybrid-match?q=&top_n=`.
- Kept `suppliers_match_product` for exact/controlled scorer compatibility.
- Rewrote source and staging `supplier-directory-agent.md` as clean UTF-8 with explicit routing:
  - search factory/address -> `suppliers_list`
  - product query -> `suppliers_hybrid_match`
  - exact fixture/scorer path -> `suppliers_match_product`
  - vehicle recommendation -> `logistics_vehicles_match`
- Added hard boundary: no runtime grep, business markdown, price-library, Accurate, or full-directory read as the default production path.

## Verification

- `node --check mcp_servers\supplier-directory-server\index.mjs`
- `node --check ccb-installer\staging\vendor\mcp-servers\supplier-directory\index.mjs`
- `bun test mcp_servers\supplier-directory-server\preview.test.mjs` → 4 passed