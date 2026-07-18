# Phase 3 done — Scope resolver + role env deprecate

**Date:** 2026-07-14  
**Parent:** `07-14-employee-intelligence-layer`  
**Contract:** `WANd.EMPLOYEE.SCOPE.001` / Phase 3.2 TASKS.RBAC

## Delivered

| Workstream | Change |
|------------|--------|
| 3.1 Scope | `aionui-work-tasks/src/scope.rs` — `resolve_data_scope` / `task_in_scope` / `visible_ids_self_and_reports` |
| 3.1 Query | Manager default `direct_reports`; org admin default `company`; manager deny `company`; employees forbidden to query |
| 3.1 Detail | Non-party managers limited to direct_reports visible set in `require_task` |
| 3.1 Repo | `IUserRepository::list_direct_report_ids` |
| 3.2 MCP | `WORK_TASKS_AGENT_ROLE` ignored unless `WORK_TASKS_ALLOW_ROLE_OVERRIDE=1`; optional `scope` on `work_tasks_query` |
| 3.2 REST | `effective_work_task_role` / `resolve_work_task_role` no longer elevate `username===admin` |

## Evidence

**Code-review:** PASS — Layer A PASS; Layer B N/A; Runtime Crash Checklist OK  
**Security-review:** PASS  
**Tests:**
- `cargo test -p aionui-work-tasks --lib scope::` — 5 ok
- `cargo test -p aionui-work-tasks --test service_integration` — 29 ok
- `cargo test -p aionui-common --lib` — 80 ok

## Ops (single VPS deploy with Phase 2)

1. Upload/extract AionCore → `/opt/aionorg`
2. `cargo build --release -p aionui-app`
3. Backup DB → `systemctl restart aionorg`
4. Sync MCP: `mcp_servers/work-tasks-query-server/index.mjs` (+ price dist if not yet)

Do **not** run `bootstrap.sh` on live fleet.

## Deferred

- 3.3 Manual AI smoke (`closure-smoke-matrix`) — P1
- Phase 4 UI polish / supplier write widen
