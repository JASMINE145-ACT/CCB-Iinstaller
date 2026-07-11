# PRD ?? Agent ?? Work Tasks ��?????

> **Task:** `07-09-agent-work-tasks-collaboration-system`  
> **Status:** draft (planning)  
> **Priority:** P1  
> **Date:** 2026-07-09

## Problem

Current work-tasks system is human-driven (`/tasks`, manager/employee RBAC, org VPS as source of truth).  
Agent runtime can already delegate work, but there is no formal MCP contract for role-based task operations.

1. Agent creating and editing work tasks on behalf of user intent
2. Admin-level query of employee tasks under controlled authorization

Without a contract, teams risk ACL bypass, identity spoofing, and poor auditability.

## Goal

Build a production-safe **human + agent collaborative task system** where:

- A single `work-tasks-agent` is used for both employee and admin contexts
- MCP permissions are role-based:
  - employee: `create`, `edit` (allowed scope only)
  - admin/manager: `create`, `edit`, `query`
- Backend remains the source of truth for RBAC, status transitions, and auditing

## Non-goals (v1)

- Auto-assignment optimization / scheduling engine
- Department hierarchy model changes
- Agent modifying task status workflows beyond existing backend state machine
- Cross-system workflow orchestration with cron/team_tasks merge

## Existing Baseline (confirmed)

From `research/agent-work-tasks-baseline.md` and `aioncore-work-tasks.md`:

- `POST /api/work-tasks` already encodes self-vs-manager create behavior
- `GET /api/work-tasks/query` is manager-only and usable for admin-agent querying
- JWT actor + `work_task_role` is already enforced server-side

## v1 Architecture

```text
User Intent
    ??
Orchestrator (route/guard)
    ?? delegate
Work-Tasks Agent (single)
    ?? tools
work_tasks_create -> POST /api/work-tasks
work_tasks_edit -> PUT /api/work-tasks/:id
work_tasks_query -> GET /api/work-tasks/query (admin/manager only)
    ??
AionCore work-tasks RBAC + audit log
```

## Acceptance Criteria

### AC1 ?? Agent create (employee-safe)
- [x] Employee-context agent can create task for self only
- [x] Employee-context agent cannot assign tasks to others (403 / validation error)
- [x] Manager-context agent can assign tasks to employees (status `pending_accept`)

### AC2 ?? Agent edit
- [x] Employee-context agent can edit only tasks within existing backend-allowed scope
- [x] Employee-context agent cannot edit manager-owned fields outside ACL
- [x] Manager-context agent edit behavior remains consistent with current `/tasks` RBAC

### AC3 ?? Admin query
- [x] Admin/manager context can query employee tasks with filters (`assignee_id`, `status`, `overdue`)
- [x] Employee context cannot call query endpoint (403)
- [x] Query responses are paginated/capped for safety

### AC4 ?? Identity & audit
- [x] Actor identity always derives from JWT/session, never from tool payload
- [x] Structured audit entries include `request_id`, `session_id`, `agent_id`, `tool_name`, actor, target, result count
- [x] Sensitive privileged queries are traceable in logs

### AC5 ?? UX integration (AionUI)
- [x] Clear UX indicates whether action came from human or agent (minimal metadata tag)
- [x] Manager can review agent-created tasks in existing `/tasks` flow

### AC6 ?? Regression
- [x] Existing human `/tasks` behavior unchanged (manager/employee flows remain valid)
- [x] Existing P5 local attachment behavior unchanged

## MCP permission matrix

| Tool | employee | admin/manager |
|------|----------|---------------|
| `work_tasks_create` | allow (self scope) | allow |
| `work_tasks_edit` | allow (existing ACL only) | allow |
| `work_tasks_query` | deny (403) | allow |

## Risks

- **security**: identity spoofing if tool accepts actor fields
- **acl-drift**: UI-level restriction without backend enforcement
- **abuse/perf**: unrestricted query scans
- **operability**: missing audit signals for delegated agent actions

## References

- `.trellis/tasks/07-09-agent-work-tasks-collaboration-system/research/agent-work-tasks-baseline.md`
- `.trellis/spec/integration/aioncore-work-tasks.md`
- `.trellis/spec/integration/agents-unified-model.md`
