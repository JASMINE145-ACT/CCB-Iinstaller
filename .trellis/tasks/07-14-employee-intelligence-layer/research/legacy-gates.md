# Legacy gates inventory (Phase 0.3)

> Date: 2026-07-14  
> Closure contract: `business-closure-contract.md`  
> Goal: list authz bypasses that block claiming WANd.ORG.CLOSURE.001

## Active (must reconcile)

| Gate | Location | Current behavior | Closure disposition |
|------|----------|------------------|---------------------|
| `PRICE_ADMIN_USERNAMES` | `aionui-price-library/src/rbac.rs` | **Phase 2 DONE:** ignored unless `PRICE_LIBRARY_ENV_BREAK_GLASS=1`; default = is_admin \| `price_library.write` | Break-glass only |
| `MAPPING_ADMIN_USERNAMES` / falls back to `PRICE_ADMIN_USERNAMES` | `aionui-quotation-mapping/src/rbac.rs` | env allow-list for mapping publish | Track parallel to price; not MVP wedge |
| `WORK_TASKS_AGENT_ROLE` | `mcp_servers/work-tasks-query-server/index.mjs` | **Phase 3.2 DONE:** ignored unless `WORK_TASKS_ALLOW_ROLE_OVERRIDE=1` | Break-glass only |
| Legacy `username===admin` → manager | common `effective_work_task_role` + MCP | **Phase 3.2 DONE:** removed; use DB `work_task_role` / `is_admin` | Closed |

## Test-only / OK

| Pattern | Location | Notes |
|---------|----------|-------|
| `username == "admin"` in test helpers | `aionui-app/tests/*`, `aionui-auth/tests` | Test fixtures only — not runtime product gate |

## Already closed (do not re-open)

| Mechanism | Evidence |
|-----------|----------|
| Org admin = `users.is_admin` | migration 025 + `ensure_org_admin` |
| Capability whitelist | migration 026 + `validate_capabilities` |
| Login lifecycle | `is_employment_status_login_allowed` on login + middleware |
| Target-only session bump | `users.jwt_secret` as `session_version` claim |

## MCP employment gate

As of inventory (2026-07-14): **no** MCP-layer `employment_status` check found under `mcp_servers/` mutating tools. Suspended users may still call MCP until Phase 1.4 lands (org JWT middleware already rejects if MCP hits authenticated aioncore with user token; path risk is MCP that trusts env/role without middleware).
