# PRD — Employee Intelligence Layer / 员工智能层

> **Task:** `07-14-employee-intelligence-layer`  
> **Status:** draft (planning)  
> **Priority:** P1  
> **Date:** 2026-07-09

## One-line definition

**Employee Intelligence Layer (EIL)** is WanD's AI-native **organizational identity infrastructure** — not a traditional HR archive page. It tells AI **who you are**, **what you may do**, **what data you may see**, **what work context applies**, and **what was done on your behalf** — with backend enforcement and audit, not prompt-only trust.

## Problem

Today we have **fragments**, not a layer:

| Fragment | Status | Gap |
|----------|--------|-----|
| `employee-profile.json` prompt injection | ✅ shipped (`07-06`) | Client-side handoff; no org authority; no lifecycle |
| `work_task_role` manager \| employee | ✅ shipped (`07-03`) | Too coarse; no dept scope, no business roles |
| `work-tasks-agent` MCP | 🔄 in progress (`07-09`) | Tools exist; audit envelope incomplete |
| Personal memory | 🔄 partial (`07-06` memory) | Not formally bound to employee identity |
| Org knowledge | ✅ shipped | Not scoped per employee role/approval |

AI cannot reliably answer enterprise questions like:

- 「这个人属于哪里、能代表谁、能管谁？」
- 「张三本周任务完成情况？」
- 「采购部有哪些逾期任务？」
- 「帮我创建一个明天下午跟进报价的任务」— with correct scope and audit trail

## Strategic boundary (user decision — locked for v1)

> **Serve internal AI collaboration + task management first.**  
> **Do NOT build a full HR / org management product in v1.**

| In scope (v1) | Out of scope (v1) |
|---------------|-------------------|
| Org identity fields AI needs (dept, manager, team, status) | Payroll, attendance, recruitment pipeline |
| Role + data scope for AI tools | Full HR workflow engine |
| Employee lifecycle gates for auth/permissions | LDAP/AD auto-sync (research only) |
| Task + agent audit linkage | BI dashboard / performance review UI |
| Manager AI queries (scoped) | Cross-tenant org admin console |

## Goal

Build the **six linkage planes** between employees and AI:

```text
Identity        → AI knows who you are
Role            → AI knows what you may do on behalf of the org
Scope           → AI knows whose data you may see
Work Context    → AI knows what to advance now
Personal Memory → AI adapts to your work habits (bounded)
Org Knowledge   → AI uses company rules (bounded)
Audit           → AI actions are traceable to JWT actor
```

Implementation principle: **never prompt-only security**.

| Plane | v1 mechanism |
|-------|----------------|
| Prompt injection | Extend `employee-profile` → org-enriched context block |
| Tool permission | MCP allowlist + runtime role gate (pattern: `work-tasks-agent`) |
| Backend RBAC | AionCore authoritative checks on every mutating/query API |
| Task linkage | `work_tasks_*` tools + human `/tasks` same rows |
| Memory linkage | Personal memory scoped to `actor_user_id`; dedup vs profile |
| Audit linkage | Unified audit table for agent tool + API actions |

## Non-goals (v1)

- Full HR system / employee self-service portal
- Complex approval workflow designer (use fixed policy table only)
- Auto-assignment / scheduling optimization
- Department hierarchy editor UI (API + seed data OK)
- Replacing existing human `/tasks` UX
- Multi-tenant org admin beyond current VPS org model

## Existing baseline (do not re-invent)

| Asset | Location | Reuse |
|-------|----------|-------|
| Employee profile prompt | `07-06-employee-profile-settings-prompt` (completed) | Upgrade source from client JSON → org-enriched |
| Work tasks API + RBAC | `aioncore-work-tasks`, migration 014 | Extend metadata + audit; keep state machine |
| Work-tasks agent MCP | `07-09` (in progress) | Child capability under EIL |
| Agent team architecture | `agent-team-architecture.md` | Profile injection at session/new + runAgent |
| Org auth / JWT | org VPS `67.216.206.3:13401` | Actor = JWT subject; never tool payload |

## Target architecture (v1 conceptual)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Employee Intelligence Layer               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Identity     │ Role & Scope │ Lifecycle    │ AI Work Profile │
│ (who)        │ (can do/see) │ (active/left)│ (agents/habits) │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ Work Context (tasks)  │  Audit Ledger  │  Approval Policy   │
└───────────────────────┴────────────────┴────────────────────┘
         │                        │
         ▼                        ▼
   AionCore APIs            MCP tool gates
         │                        │
         ▼                        ▼
   AionUI / ACP prompt     work-tasks-agent, future agents
```

## Module breakdown (phased)

### P0 — Foundation contract (design + minimal schema)

1. **Org identity model** — extend user record (not new HR DB):
   - `department` (flat string, v1 — no departments table)
   - `manager_user_id` (reporting chain L1)
   - `job_family` / `job_title` (existing profile fields migrate here)
   - `team_ids[]` optional
   - `region` / `business_line` optional
   - `employment_status`: `active` | `transferred` | `suspended` | `terminated`

2. **Role model** (two layers — see `research/eil-contract.md`):
   - **System:** `work_task_role` (`manager` | `employee`) + **`is_admin` boolean** (orthogonal)
   - **Business role tags:** static enum `quotation` | `procurement` | `finance` | `warehouse` | `sales` (validated JSON array)

3. **Data scope enum:** `self` | `direct_reports` | `department` | `company`
   - Bound to tool/API, not prompt text

4. **Audit envelope** (unified):
   - `actor_user_id`, `agent_id`, `tool_name`, `session_id`, `request_id`
   - `target_employee_id`, `task_id`, `action`, `result`, `timestamp`

### P1 — AI context upgrade (ship first user-visible value)

5. **Org-enriched employee context** — replace/merge client-only `employee-profile.json`:
   - Source of truth: `GET /api/auth/user` + `GET /api/users/:id/context` (new)
   - Inject at `session/new` + `runAgent` (same as P9 employee-profile pattern)
   - Subagent inherits identity block

6. **Tool permission matrix** (extend `07-09` pattern):
   - Per-tool: required system role + business role + data scope
   - Example: `work_tasks_query` → manager + scope ≥ `direct_reports`

### P2 — Lifecycle + manager AI

7. **Lifecycle gates:**
   - `suspended` / `terminated` → JWT invalid or scoped deny on mutating tools
   - Agent sessions for terminated users cannot create tasks / write org knowledge

8. **Manager AI queries** (natural language → scoped API):
   - 「张三本周任务完成情况」→ `work_tasks_query` with `assignee_id` + date filter
   - 「采购部逾期任务」→ query with `department` scope filter (manager only)

9. **Employee AI actions** (natural language → scoped API):
   - 「帮我创建明天下午跟进报价的任务」→ `work_tasks_create` self-scope

### P3 — Work profile + collaboration metadata (defer OK)

10. **AI work profile** (per employee, server-side):
    - preferred agents, work preferences, correction history summary
    - Integrate with personal memory boundaries (no duplicate profile fields)

11. **Task collaboration metadata:**
    - `created_by_agent`, `assigned_by_user`, `ai_participated`, `requires_confirmation`
    - Manager cockpit data source (API only; UI later)

### P4 — Approval policy + advanced audit (defer OK)

12. **Fixed approval policy table** (not workflow designer):
    - e.g. org knowledge write → confirm; bulk assign → confirm; export employee data → admin only

13. **Audit replay API** for manager/admin

## Acceptance criteria (v1 MVP = P0 + P1 + P2 core)

### AC1 — Identity context
- [ ] AI session receives org-enriched identity (name, dept, manager, job, status) from server, not only client JSON
- [ ] Subagent delegation inherits same identity block
- [ ] Identity block does not appear in user-visible chat bubbles

### AC2 — Role & scope enforcement
- [ ] `work_tasks_query` denied for employee context (403) — extends `07-09`
- [ ] Manager can query direct reports; cannot query out-of-scope employees
- [ ] Admin can query company scope
- [ ] Tool permission checks match backend RBAC (no prompt-only gate)

### AC3 — Lifecycle
- [ ] `terminated` user cannot create/edit tasks via API or MCP
- [ ] Existing sessions for suspended users get deny on mutating tools

### AC4 — Manager / employee AI scenarios
- [ ] Manager: 「张三本周任务完成情况」returns scoped task summary
- [ ] Manager: 「采购部有哪些逾期任务」returns department-scoped overdue list (when dept data exists)
- [ ] Employee: 「帮我创建明天下午跟进报价的任务」creates self-scoped task with audit row

### AC5 — Audit
- [ ] Every agent tool call on work-tasks writes audit row with actor, agent, session, request, target, result
- [ ] Audit rows queryable by `actor_user_id` and `task_id`

### AC6 — Regression
- [ ] Human `/tasks` UI unchanged for manager assign / employee accept flows
- [ ] `07-06` employee profile Settings still works (may show read-only org fields)
- [ ] `07-09` work-tasks-agent MCP remains single-agent model

### AC7 — Documentation
- [ ] New spec: `.trellis/spec/integration/employee-intelligence-layer.md`
- [ ] Cross-links from `agent-team-architecture.md`, `aioncore-work-tasks.md`

## Data model sketch (v1 minimal)

```sql
-- Extend users (migration 019+)
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN manager_user_id TEXT;
ALTER TABLE users ADD COLUMN job_family TEXT;
ALTER TABLE users ADD COLUMN business_roles TEXT; -- JSON array
ALTER TABLE users ADD COLUMN employment_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN region TEXT;
ALTER TABLE users ADD COLUMN business_line TEXT;

-- Audit (new table)
CREATE TABLE employee_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  agent_id TEXT,
  tool_name TEXT,
  session_id TEXT,
  request_id TEXT,
  target_employee_id TEXT,
  task_id TEXT,
  action TEXT NOT NULL,
  result TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
```

Exact migration numbers TBD at implement time (current next: check `aionui-db/migrations/`).

## Risks

| Risk | Tag | Mitigation |
|------|-----|------------|
| Scope creep into HR product | — | Locked non-goals; P0 design review |
| Identity spoofing via tool payload | security | Actor always from JWT; reject payload actor fields |
| ACL drift UI vs backend | security | Backend is source of truth; MCP mirrors API |
| Client profile vs org profile conflict | cross-repo | Org wins; client profile = supplemental notes only |
| Terminated user token still valid | security | Lifecycle check middleware on mutating routes |
| Audit volume | long-running | Pagination + retention policy in P4 |

## Relationship to sibling tasks

| Task | Relationship |
|------|--------------|
| `07-06-employee-profile-settings-prompt` | **Upgrade** — client profile becomes supplemental; org is authority |
| `07-09-agent-work-tasks-collaboration-system` | **Prerequisite** — finish standalone (MCP + role gates + app log); EIL P2 absorbs unified audit table |
| `07-03-work-tasks-center-sync` | **Depends on** — VPS org + work-tasks API baseline |
| `07-06-ccb-memory-auto-accumulation` | **Integrate** — personal memory bounded by EIL identity |

## Decisions (locked 2026-07-09 — see `research/eil-contract.md`)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Admin source | **`is_admin` boolean**, orthogonal to `work_task_role`. Manager ≠ admin. No username whitelist. Seed `admin` user → `is_admin=true`. |
| Q2 | Department model | **v1 flat `department` string** on `users`. No `departments` table until P3+. |
| Q3 | Business roles | **v1 static enum** (`quotation`, `procurement`, `finance`, `warehouse`, `sales`) as validated JSON array. |
| Q4 | Settings UI | **Org fields read-only**; client `notes` (+ optional email/phone) editable. Server wins for identity. |
| Q5 | Audit retention | **90 days default**, `EMPLOYEE_AUDIT_RETENTION_DAYS` env override. |
| Q6 | 07-09 sequencing | **07-09 finishes standalone first** (MCP + role gates + structured app log). EIL P2 owns `employee_audit_log` unified table. |

## Open questions

_None — all resolved. P1 may proceed after execution-plan approved._

## References

- `.trellis/tasks/07-06-employee-profile-settings-prompt/prd.md`
- `.trellis/tasks/07-09-agent-work-tasks-collaboration-system/prd.md`
- `.trellis/spec/integration/aioncore-work-tasks.md`
- `.trellis/spec/integration/agent-team-architecture.md`
- `.trellis/spec/integration/agents-unified-model.md`
