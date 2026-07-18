# Business Closure Contract — 员工体系 × 业务纵向闭环

> **Status:** LOCKED for plan rewrite (2026-07-14) — absorbs system-review + independent review  
> **Parent:** `07-14-employee-intelligence-layer`  
> **Companion plan:** `execution-plan-business-closure.md`  
> **Supersedes:** horizontal Wave A/B/C/D ordering in prior draft of that plan

## 0. Definition of closed loop (non-negotiable)

```text
Org identity (DB)
  → lifecycle status
  → capability grant
  → data scope resolve
  → REST / MCP / AI execute (same gates)
  → audit ledger
  → admin can operate / recover / explain
```

A path is **closed** only if **all** of the following hold for a concrete user story:

1. Actor fields come from **DB via JWT subject lookup** (not JWT claim alone, not env username, not `username === "admin"`).
2. Lifecycle blocks both **login** and **mutating MCP/API**.
3. At least one **business write** denies without capability and allows with it (REST **and** MCP).
4. Scope denies cross-actor reads (v1: **direct_reports** for managers).
5. Critical actions leave an **audit row** with actor/target/action/source/result.
6. Admin can reset/recover without SSH, with **target-only** session invalidation (no global JWT rotate).

**Not closed:** prompt-only hints, UI chips without gate, REST-only gate, audit deferred, scope as `data_scope_max` text.

## 1. Frozen v1 execution model

| Concept | v1 source of truth | Forbidden as sole authority |
|---------|-------------------|-----------------------------|
| System admin | `users.is_admin` | JWT claim, username==admin |
| Task role | `users.work_task_role` | `WORK_TASKS_AGENT_ROLE` env override (must deprecate) |
| Business write rights | `users.capabilities[]` whitelist | Prompt text; free-form tags |
| Lifecycle | `users.employment_status` | Client-only profile |
| Scope | resolver on DB graph | Tool payload `scope` |

**`business_roles` (quotation/procurement/…):** design-only mapping target. **Do not** enter v1 gates. Capabilities remain the only write ACL until a later task promotes roles.

## 2. Minimum audit event (Phase 1 schema)

Every closed-loop event MUST persist:

| Field | Meaning |
|-------|---------|
| `id` | opaque id |
| `at` | ms epoch |
| `actor_user_id` | JWT subject |
| `target_user_id` | nullable (admin ops / task assignee) |
| `action` | stable enum string |
| `source` | `rest` \| `mcp` \| `admin_ui` \| `system` |
| `resource` | e.g. `org_user`, `price_library`, `work_task` |
| `result` | `ok` \| `denied` \| `error` |
| `detail` | short JSON (no secrets/passwords) |

**Phase 1 must log at least:** admin create/update/delete/reset-password/set-is_admin; MCP mutating deny/allow for lifecycle smoke.  
**Phase 2+:** price write ok/denied.

## 3. Capability gate (v1 wedge)

**First closed business path:** `price_library.write`.

| Surface | Must call same predicate |
|---------|--------------------------|
| REST price write routes | `is_admin OR has(price_library.write)` — **remove or fail-closed transitional `PRICE_ADMIN_USERNAMES` for non-admin closure smoke** |
| MCP price mutating tools | Same effective decision (via org JWT → user row → capabilities) |

`supplier_directory.write` = Phase 4 widen, not MVP wedge.

## 4. Scope resolver (v1)

| Scope | Meaning | Who |
|-------|---------|-----|
| `self` | actor only | employee+ |
| `direct_reports` | `manager_user_id = actor` | manager+ |
| `department` | **deferred** (no department entity) | — |
| `company` | all org users | `is_admin` only |

Managers do **not** get company via prompt. Existing “manager sees all company tasks” product flags must be explicitly reconciled or scoped down for closure smoke.

## 5. Admin ops (Phase 1)

| Op | Rules |
|----|-------|
| Reset password | admin only; strength validation; **target-only** invalidation (no `rotate_secret` global) |
| Set `is_admin` | admin only; cannot clear last real admin; cannot demote self if sole admin |
| Delete | already shipped: no self, no last admin, no `system_default_user` |

## 6. Companion docs (fill during Phase 0 / early Phase 1)

| Doc | Role |
|-----|------|
| `cap-gate-matrix.md` | REST/MCP tool → capability |
| `scope-resolver-contract.md` | inputs/outputs/edges |
| `audit-event-schema.md` | action enum + retention |
| `closure-smoke-matrix.md` | one-page end-to-end ACC |

## 7. Explicit non-goals (MVP)

Full HR, department table, Excel import, LDAP, supplier cap (until Phase 4), `business_roles` gates, org-chart Rudder fidelity as Phase-1 blocker.
