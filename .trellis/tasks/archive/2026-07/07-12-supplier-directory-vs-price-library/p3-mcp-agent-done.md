# Phase 3 done — MCP read + supplier-directory-agent

**Date:** 2026-07-12  
**Contracts:** AGENT.001 (read), ROUTING.SUPPLIER_DIR.001 (stubs), REG.001 (partial)

## Delivered

| Item | Path |
|------|------|
| MCP (read) | `mcp_servers/supplier-directory-server/index.mjs` (+ staged vendor copy) |
| Agent | `.../agents/supplier-directory-agent.md` + `.aionui.json` |
| Orchestrator route | `wande-orchestrator.md` SUPPLIER_DIR.001 |
| Package / health / registry | `package.json`, `mcp-health-manifest.json`, `package-registry.snapshot.json` |
| ACP guard | `agentSessionProfile` + `packageRegistry` forbid/delegate lists |

## Tools (read)

- `suppliers_list` / `suppliers_get` / `suppliers_match_product`
- `logistics_vehicles_list` / `logistics_vehicles_match`

## Pending live

- Deploy aioncore migration 022 + seed + JWT smoke for fixtures A/B/C
- Phase 4 confirmed write tools
- Phase 5 UI `#/suppliers`
