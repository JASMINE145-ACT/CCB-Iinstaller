# API / MCP Contract Matrix — Work Tasks Platform v2

> **Task:** `07-11-work-tasks-platform-v2`  
> **Status:** locked for P1–P3 (2026-07-11)  
> **Authority:** Blocks coding until referenced; supersedes soft wording in baseline.md for brief/scope

## P1–P3 scope contract (temporary vs EIL)

| Actor | `work_task_role` | Query / list semantics in **P1–P3** | P4 (EIL) |
|-------|------------------|--------------------------------------|----------|
| employee | `employee` | **Only own** via `scope=mine` / `list_mine` / `brief` | unchanged |
| manager | `manager` | **Retain current** `GET /api/work-tasks/query` → `list_all` (org-visible to managers) | Narrow to direct_reports / department per EIL |
| admin username | often `manager` via legacy | Same as manager in P1–P3 | Prefer `is_admin=true` → company scope |
| `is_admin=true` | orthogonal | **Not implemented in P1–P3** — AC9 deferred | Company-wide query |

**Explicit temporary rule:** Do **not** pretend P1–P3 already have EIL dept/direct_reports. Document manager = existing all-query until P4.

**Legacy:** MCP `resolveRole()` mapping `username===admin` → `manager` remains until P4; mark as legacy in code comments when touching.

---

## Tool × role matrix

| Tool | employee | manager | Notes |
|------|----------|---------|-------|
| `work_tasks_create` | self only | self + assign other | existing |
| `work_tasks_edit` | ACL | ACL | existing |
| `work_tasks_query` | ❌ 403 | ✅ | existing `/query` → list_all |
| `work_tasks_list_mine` | ✅ | ✅ | `GET /api/work-tasks?scope=mine` |
| `work_tasks_brief` | ✅ | ✅ (own only) | **Must NOT call `/query`** |
| `work_tasks_get` | ✅ if ACL | ✅ if ACL | `GET /api/work-tasks/:id` |
| `work_tasks_resolve_assignee` | ❌ 403 | ✅ | `GET /api/users` filter username |

---

## `work_tasks_brief` hard boundary

| Rule | Value |
|------|--------|
| Data source | **Only** `GET /api/work-tasks?scope=mine` (+ optional client overdue filter on that set) |
| Forbidden | Calling `GET /api/work-tasks/query` for employee or for “brief” |
| Response shape | `{ summary: { total, pending_accept, accepted, overdue_count }, items: Task[] }` capped (e.g. items ≤ 20) |
| Manager using brief | Still **own** tasks only; org overview uses `work_tasks_query` |

---

## `work_tasks_resolve_assignee`

| Input | Output |
|-------|--------|
| `username` (string, required) | `{ user_id, username, work_task_role }` or not-found error |
| Ambiguous / missing | Clear error; do not invent id |

Create flow: agent may call resolve then `work_tasks_create({ assignee_id })`. Optional later: create accepts `assignee_username` and resolves server-side — **not required in P2** if resolve tool exists.

---

## Acceptance matrix (RED before implement)

Extend `scripts/test-work-tasks-agent-acceptance.mjs` (API-level; MCP tools map 1:1 to REST):

| Case ID | Actor | Action | Expect |
|---------|-------|--------|--------|
| V2-E1 | employee | `GET ?scope=mine` | 200; all items assignee/self |
| V2-E2 | employee | `GET /query` | 403 |
| V2-E3 | employee | brief compose from mine | no foreign assignee_id |
| V2-E4 | employee | `GET /users` resolve for assign | 403 or empty (no assign) |
| V2-M1 | manager | `GET /query` | 200 + summary |
| V2-M2 | manager | resolve username `yjc` | user_id present |
| V2-M3 | manager | create with assignee_id | `pending_accept` |
| V2-G1 | employee | get own task id | 200 |
| V2-G2 | employee | get other user's task | 403/404 per ACL |
| V2-A1 | any | audit fields on new tools | request_id, tool_name, actor present (MCP stderr when MCP tested) |

**RED evidence:** before P2, V2-E1/E3/M2/G1 may fail or be unimplemented — add failing asserts first, then implement.

---

## REST mapping (no new tables required for P1–P3)

| MCP | REST |
|-----|------|
| list_mine | `GET /api/work-tasks?scope=mine` |
| brief | compose from mine (MCP-side) |
| get | `GET /api/work-tasks/:id` |
| resolve_assignee | `GET /api/users` + filter |
| query | `GET /api/work-tasks/query` (unchanged P1–P3) |

P1 AionCore: **optional** — only add query `scope` param if needed for P4 prep; **not blocking** P2 if manager keeps list_all.
