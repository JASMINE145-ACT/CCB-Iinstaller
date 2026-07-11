# 07-09 wrap-up evidence — 2026-07-09

## Scope closed

- MCP `work-tasks-agent`: create / edit / query + role gates + CSRF
- Structured stderr audit (`work_tasks_tool_audit`)
- Agent metadata on create (`metadata.source=agent`, `agent_id`, `created_via`)
- CCB config: `package.json`, `ensure-wanding-settings.ps1`, `sync-dev-wanding-vendor.ps1`, health manifest
- Vendor: `D:\CCB-Wanding\vendor\mcp-servers\work-tasks-agent\` + `node_modules` junction
- UI: `WorkTaskSourceTag` on list + detail (`AI 创建`)
- Acceptance script: `scripts/test-work-tasks-agent-acceptance.mjs`

## Verification

| Gate | Result |
|------|--------|
| `node --check mcp_servers/work-tasks-query-server/index.mjs` | PASS |
| `node scripts/test-work-tasks-agent-acceptance.mjs` | **ALL PASS** (employee query 403, manager query 200, assign gates) |
| `bun test workTaskTypes.test.ts` | 11/11 PASS |
| Vendor MCP SDK import | PASS (`SDK OK` from `vendor/mcp-servers/work-tasks-agent`) |
| Code-review (1st) | FAIL → vendor node_modules fixed |
| Code-review (2nd) | vendor junction applied; Layer B PASS |

## Manual UI (user)

- [x] `start-dev-full.ps1` → Guid 📋 工作任务助手 → conversation not white screen — **PASS** 2026-07-09 user confirm
- [x] Agent creates task → `/tasks` shows **AI 创建** tag — **PASS** 2026-07-09 user confirm

## Deferred to EIL (07-14)

- `employee_audit_log` unified table (07-09 uses stderr app log only)
