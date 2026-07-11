# Research: agent work tasks baseline

- **Query**: Baseline for agent-side create/query of work tasks, with manager/employee RBAC and admin-agent extension path.
- **Scope**: mixed (existing internal APIs/contracts + proposed tool/API contracts)
- **Date**: 2026-07-09

## 1) Existing work-tasks APIs + RBAC relevant to agent create/query

Primary source: `.trellis/spec/integration/aioncore-work-tasks.md`.

### Current REST endpoints (auth required)

- `GET /api/work-tasks?scope=&status=`: list tasks (`scope`: `visible` default, `mine`, `assigned` manager-only use case, `owned`).
- `POST /api/work-tasks`: create task; self-create defaults to `accepted`, manager assigning employee defaults to `pending_accept`.
- `GET /api/work-tasks/query?status=&assignee_id=&overdue=`: manager-only query/summary endpoint (closest existing backend surface for admin/manager query tools).
- `GET /api/work-tasks/:id`, `PUT /api/work-tasks/:id`, `DELETE /api/work-tasks/:id`.
- Attachments: `POST/DELETE /api/work-tasks/:id/attachments...`.
- User directory + role admin endpoints:
  - `GET /api/users` (id/username/work_task_role),
  - `POST /api/users` manager-only,
  - `PUT /api/users/:id/work-task-role` manager-only.

### RBAC baseline (manager vs employee)

- Role storage: `users.work_task_role` (`manager` | `employee`) from migration `014_work_task_roles.sql`.
- `manager`:
  - can assign tasks to others,
  - can use `scope=assigned`,
  - can call `/api/work-tasks/query`.
- `employee`:
  - cannot assign to others,
  - cannot use manager query endpoint.
- JWT is required for these routes (401 without token is expected baseline in spec and smoke docs).

### Notes for agent create/query

- Existing backend already has a safe manager query endpoint (`/api/work-tasks/query`) so query-tool MVP should prefer mapping to this endpoint rather than inventing a new backend route first.
- Task create semantics already encode manager-vs-self behavior and state initialization; tool contract should avoid duplicating state logic in prompt/tool layer.

## 2) Existing agent architecture docs/contracts relevant to Admin Agent

Primary sources:
- `.trellis/spec/integration/agent-team-architecture.md`
- `.trellis/spec/integration/work-routing-execution-contracts.md`
- `.trellis/spec/integration/contracts/agent-runtime-registry.yml`
- `.trellis/spec/integration/price-library.md` (admin-only agent pattern)

### Reusable architecture constraints

- Routing contract: orchestrator should delegate to specialist/admin agents via `Agent(subagent_type=...)`, and top-level orchestrator direct business MCP should stay blocked by guard contracts (`WANd.ROUTING.ASSIGNMENT.*`).
- Execution contract: delegated agent runs synchronously (`WANd.RUN.EXECUTION.001` / `WANd.RUN.ADMISSION.001`), so admin query/create flows can return same-turn results.
- Existing "admin-only specialist" precedent exists:
  - `price-library-agent` uses `delegatable: false` in sidecar plus role-gated visibility (`requires_price_admin`) at UI/catalog layer,
  - backend remains final authority via 403 on non-admin JWT.

### Implication for new Admin Agent (employee task query)

- A `work-tasks-admin-agent` can follow the same pattern:
  1) constrained exposure in catalog/routing,
  2) role checks in tool/backend,
  3) orchestrator delegates but does not directly query employee tasks itself.

## 3) Suggested API/tool contract options (`agent_create_task`, `admin_agent_query_tasks`)

## Option A (recommended MVP): thin wrappers over existing REST

### `agent_create_task` (general user + manager behavior)

- Maps to `POST /api/work-tasks`.
- Inputs (suggested):
  - `title` (required),
  - `description` (optional),
  - `assignee_id` (optional; if omitted means self),
  - `due_at` (optional),
  - `priority` (optional, if backend supports),
  - `idempotency_key` (optional but recommended).
- Server/tool rules:
  - if caller role is employee and `assignee_id != self` => reject (403/validation error),
  - manager assigning employee uses existing backend default status `pending_accept`,
  - self-create uses existing backend default status `accepted`.
- Return:
  - canonical task object (`id`, `status`, `assignee`, `created_by`, timestamps).

### `admin_agent_query_tasks` (admin/manager query surface)

- Maps to `GET /api/work-tasks/query`.
- Inputs (suggested):
  - `assignee_id` (optional),
  - `status` (optional list),
  - `overdue` (optional bool),
  - `date_from`/`date_to` (optional if backend extension added),
  - `limit`/`cursor` for pagination (recommended if backend currently returns large list).
- Access:
  - manager/admin only; employee gets 403.
- Return:
  - `summary` (counts by status/overdue),
  - `items` (task list),
  - pagination metadata if enabled.

## Option B: specialized admin endpoint first

- Add new route such as `GET /api/work-tasks/admin-query` with richer filters (team/department/creator).
- Pros: clearer semantics and future extensibility.
- Cons: larger backend change before proving product value.

## Option C: MCP-native aggregator layer

- Keep backend unchanged; build MCP/admin-tool that fans out existing list/query calls and computes aggregates.
- Pros: quickest experimentation.
- Cons: duplicated auth/filter logic risk and weaker audit consistency if not tightly constrained.

## Recommendation

- Start with **Option A** for MVP (least moving parts, aligned with existing RBAC and route behavior), then evolve to Option B only if filter/report requirements exceed `/query`.

## 4) Key risks (auth impersonation, auditability, ACL, rate/abuse)

### Auth impersonation

- Risk: tool accepts `assignee_id`/`actor`-like fields and trusts caller-provided identity.
- Mitigation:
  - derive actor from JWT only; never trust tool-supplied actor identity,
  - reject cross-user create/query unless role permits.

### Auditability

- Risk: missing traceability between agent action and backend mutation/query.
- Mitigation:
  - log `request_id`, `session_id`, `agent_id`, `tool_name`, caller user id, target ids, and result count,
  - persist immutable audit rows for create/update/delete and privileged query access.

### ACL drift

- Risk: UI/catalog hides admin tools but backend/mcp still callable by non-admin paths.
- Mitigation:
  - enforce authorization in backend route/tool implementation as source of truth (not UI),
  - align with runtime contract style used by `price-library-agent` (visibility gate + backend 403).

### Rate/abuse

- Risk: bulk or repeated admin queries degrade service or leak too much employee data.
- Mitigation:
  - require pagination and cap limits,
  - apply per-user/per-agent query rate limits,
  - add minimum filter constraints for heavy exports,
  - monitor anomalous query volume by actor/agent.

## 5) MVP recommendation in 2 phases

## Phase 1 (minimal, safe, shippable)

- Add tools:
  - `agent_create_task` -> `POST /api/work-tasks`,
  - `admin_agent_query_tasks` -> `GET /api/work-tasks/query`.
- Enforce JWT-derived actor + existing manager/employee RBAC.
- Add structured audit logging for both tools.
- Keep response compact and paginated for query path.
- Keep orchestrator behavior: delegate to specialist/admin agent, no direct privileged business MCP at top-level.

## Phase 2 (controlled expansion)

- Expand admin query filters (date range, creator, optional team/department if backend model supports).
- Add aggregate reporting views (status SLA/overdue trends).
- Add stronger abuse controls (adaptive rate limits, suspicious pattern alerts).
- Consider dedicated admin route if `/query` extension becomes complex.

## Caveats / Not Found

- No dedicated existing `agent_create_task` or `admin_agent_query_tasks` tool names were found in current specs; recommendations are contract proposals mapped to existing REST.
- "Admin Agent" for work-tasks is not yet explicitly defined in current runtime registry; closest proven pattern is `price-library-agent` admin gating model.
