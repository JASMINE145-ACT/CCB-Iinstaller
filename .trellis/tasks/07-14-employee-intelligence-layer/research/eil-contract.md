# EIL v1 Contract — Locked Decisions

> **Task:** `07-14-employee-intelligence-layer`  
> **Status:** approved decisions (2026-07-09)  
> **Authority:** Engineering defaults — blocks P1 implementation until referenced in code

## Decision log

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Admin source | **`is_admin` boolean, separate from `work_task_role`** | Manager = business scope (tasks, direct reports). Admin = system scope (company-wide query, user admin, audit export). Whitelist is brittle; conflating manager+admin breaks least-privilege. Migration: existing `admin` username → `is_admin=true` one-time seed. |
| Q2 | Department model | **v1 flat `department` string on `users`** | No `departments` table in v1. Sufficient for 「采购部逾期任务」filter (`WHERE department = ?`). P3+ may add `departments` table + FK without breaking v1 API (string remains denormalized display). |
| Q3 | Business roles | **v1 static enum, validated JSON array** | Known set: `quotation`, `procurement`, `finance`, `warehouse`, `sales`. Server rejects unknown values on write. Enables deterministic MCP tool permission matrix. Free tags deferred to P4. |
| Q4 | Settings UI | **Org fields read-only; client `notes` editable** | Org VPS is source of truth for dept/manager/title/status/roles. Settings shows merged view: server fields locked, `notes` + optional local supplemental keys editable. Prevents ACL drift from client edits. |
| Q5 | Audit retention | **90 days default; env-configurable** | `EMPLOYEE_AUDIT_RETENTION_DAYS` (default 90). VPS cron or startup purge of rows older than retention. Pagination on query API from day one. |
| Q6 | 07-09 sequencing | **07-09 finishes standalone first; EIL P2 absorbs unified audit** | Ship work-tasks-agent value now (MCP + role gates + Guid + UI smoke). 07-09 AC4 uses **structured application log** (request_id, session_id, agent_id, tool_name, actor). EIL P1 creates `employee_audit_log` table; EIL P2 **migrates** MCP + API writers to unified table. No duplicate permission models. |

---

## Role model (canonical)

### System roles (orthogonal)

| Field | Values | Purpose |
|-------|--------|---------|
| `work_task_role` | `manager` \| `employee` | Work-task assign/query scope (existing migration 014) |
| `is_admin` | boolean | System admin: company scope, user admin, audit export |

**Effective capability matrix (v1):**

| Capability | employee | manager | admin (`is_admin=true`) |
|------------|----------|---------|-------------------------|
| `work_tasks_create` (self) | ✅ | ✅ | ✅ |
| `work_tasks_create` (assign other) | ❌ | ✅ | ✅ |
| `work_tasks_edit` (own ACL) | ✅ | ✅ | ✅ |
| `work_tasks_query` (direct reports) | ❌ | ✅ | ✅ |
| `work_tasks_query` (department) | ❌ | ✅* | ✅ |
| `work_tasks_query` (company) | ❌ | ❌ | ✅ |
| User admin APIs | ❌ | ❌ | ✅ |
| Audit export | ❌ | ❌ | ✅ |

\* Manager department query only when `users.department` matches target assignees' department.

### Business roles (tags)

```typescript
type BusinessRole =
  | 'quotation'
  | 'procurement'
  | 'finance'
  | 'warehouse'
  | 'sales';

// Stored: users.business_roles JSON array; validate on POST/PUT
```

Tool gates may require business role **in addition to** system role (future agents; work-tasks-agent v1 uses system role only).

---

## Data scope resolver (v1)

```text
self           → actor_user_id only
direct_reports → users WHERE manager_user_id = actor_user_id
department     → users WHERE department = actor.department (manager+ only)
company        → all users (is_admin only)
```

Resolver is **pure function** in AionCore; MCP and REST both call it. Never trust scope from tool payload.

---

## Identity context DTO (v1)

`GET /api/users/me/context` (or extend `/api/auth/user`):

```json
{
  "user_id": "uuid",
  "username": "yjc",
  "display_name": "…",
  "department": "采购部",
  "manager_user_id": "uuid|null",
  "job_title": "采购专员",
  "job_family": "procurement",
  "business_roles": ["procurement"],
  "work_task_role": "employee",
  "is_admin": false,
  "employment_status": "active",
  "region": null,
  "business_line": null,
  "data_scope_max": "self"
}
```

`data_scope_max` is computed server-side for prompt hint only; enforcement remains in API/MCP.

---

## Settings merge policy (Q4)

| Field | Source | Settings UI |
|-------|--------|-------------|
| displayName, department, jobTitle, employeeId | Org API | Read-only |
| manager, status, business_roles | Org API | Read-only |
| notes | Client `user.employeeProfile` | Editable |
| email, phone | Client (optional) | Editable if not in org |

Prompt merge order (unchanged from 07-06):

1. Assistant/specialist claudeMd  
2. **Org identity block** (server)  
3. **Client supplemental block** (notes only)  
4. currentDate  

---

## Audit architecture (Q5 + Q6)

### Phase A — 07-09 standalone (now)

- MCP `work_tasks_*` writes **structured log line** via existing tracing/logger
- Fields: `actor_user_id`, `agent_id`, `tool_name`, `session_id`, `request_id`, `target_*`, `result`
- Satisfies 07-09 AC4 without waiting for EIL migration

### Phase B — EIL P1 (table)

```sql
CREATE TABLE employee_audit_log ( … );  -- see prd.md
```

### Phase C — EIL P2 (unified writer)

- Single `AuditService::record()` used by REST + MCP
- 07-09 log writer becomes thin wrapper calling AuditService
- Retention job purges `created_at < now() - retention_days`

---

## 07-09 handoff checklist

Before EIL P2 starts:

- [ ] 07-09 status → `completed`
- [ ] work-tasks-agent Guid card + MCP role gates PASS
- [ ] 07-09 structured log fields documented in `agent-work-tasks-baseline.md`
- [ ] No `employee_audit_log` table in 07-09 scope (explicit defer to EIL)

---

## Migration sketch (v1)

```sql
-- 019_employee_intelligence_layer.sql (number TBD at implement)
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN manager_user_id TEXT;
ALTER TABLE users ADD COLUMN job_family TEXT;
ALTER TABLE users ADD COLUMN business_roles TEXT; -- JSON array, validated
ALTER TABLE users ADD COLUMN employment_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN region TEXT;
ALTER TABLE users ADD COLUMN business_line TEXT;

-- Seed: UPDATE users SET is_admin=1 WHERE username='admin';

CREATE TABLE employee_audit_log ( … );
CREATE INDEX idx_audit_actor ON employee_audit_log(actor_user_id, created_at);
CREATE INDEX idx_audit_task ON employee_audit_log(task_id);
```

---

## References

- `prd.md` §Decisions (mirrors this doc)
- `07-09-agent-work-tasks-collaboration-system` — finish before EIL P2 audit migration
- `07-06-employee-profile-settings-prompt` — Settings read-only merge
