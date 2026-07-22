# Employee Intelligence Layer (EIL) — integration spec

> **Status:** org-context slice shipped 2026-07-11; **org admin + capabilities + delete/lifecycle login** advanced 2026-07-13/14. Full EIL (scope resolver, audit ledger, MCP gates) tracked by Business Closure MVP.

## Slice contracts (shipped)

| ID | Behavior |
|----|----------|
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | `GET /api/users/me/context` → handoff `org` block → CCB prompt; org wins over client for dept/title/name |
| `WANd.EMPLOYEE.SETTINGS_MERGE.001` | Settings org section read-only; client supplement (notes, email, phone, addressName) editable |
| `WANd.EMPLOYEE.SUBAGENT_INHERIT.001` | `runAgent` reads same handoff as `session/new` (07-06 P9 path) |
| `WANd.ORG.USER_ADMIN.001` | Admin org-users CRUD + delete guards; list includes bootstrap admin |
| `WANd.ORG.CAPABILITY.001` | `users.capabilities` whitelist (`price_library.write`, `supplier_directory.write`) |

## Also shipped (ops / auth)

| Item | Notes |
|------|-------|
| `users.is_admin` | Migration **025**; orthogonal to `work_task_role` |
| Soft-disable login gate | `employment_status` ∉ `{active,transferred}` → login/middleware reject |
| Hard delete | `DELETE /api/org-users/{id}` + manager unlink (Phase 5.1–5.5 accepted) |
| Admin reset password | `POST /api/org-users/{id}/reset-password`; **target-only** `jwt_secret` bump (Business Closure P1) |
| `employee_audit_log` | Migration **027**; admin mutate + lifecycle deny on identity/mutating paths |
| MCP lifecycle | work-tasks-query-server fail-closed; deny → ledger via auth middleware |

## Deferred (Business Closure remaining)

| Item | Phase |
|------|-------|
| Price write REST+MCP same gate; close `PRICE_ADMIN_USERNAMES` non-admin hole | 2 |
| Scope resolver `self` + `direct_reports` | 3 |
| Deprecate `WORK_TASKS_AGENT_ROLE` | 3.2 |
| Admin UI polish / org-chart encoding | 4 |

See `.trellis/tasks/07-14-employee-intelligence-layer/execution-plan-business-closure.md`.

## API

### `GET /api/users/me/context` (authenticated)

Returns `ApiResponse<UserOrgContextResponse>`:

- `user_id`, `username`, `display_name` (v1 = username)
- `department`, `manager_user_id`, `manager_username`, `job_title`
- `work_task_role`, `employment_status`, `data_scope_max` (prompt hint only until scope resolver lands)

**Auth:** same JWT as `/api/auth/user`. Available on org VPS and local aioncore after migration `021`.

## Handoff file

Path: `%LOCALAPPDATA%\CCB-Wanding\.claude\employee-profile.json`

```json
{
  "org": { "username": "yjc", "displayName": "yjc", "department": "采购部", ... },
  "client": { "addressName": "嘉诚", "notes": "习惯先查库存", "email": "...", "phone": "..." },
  "updatedAt": "..."
}
```

Legacy flat v1 shape still supported (read-only compat).

## Merge order (CCB)

1. Assistant/specialist claudeMd
2. **Org identity block** (server)
3. **Client supplemental block** (notes, etc.)
4. currentDate

## Related tasks

- `07-06-employee-profile-settings-prompt` — plumbing (completed)
- `07-13-org-admin-user-management` — admin UI + delete (5.1–5.5 accepted)
- `07-14-employee-intelligence-layer` — umbrella + **Business Closure MVP** (`execution-plan-business-closure.md`)

## In progress / next (Business Closure)

Phase 0–2 **done** (`p0` / `p1` / `p2-price-cap-gate-done.md`).

**Next — Phase 3:** scope resolver `self` + `direct_reports`; deprecate `WORK_TASKS_AGENT_ROLE`.

## Deferred (still)

- `business_roles` enum as gate authority (capabilities remain v1)
- `department` / `company` scope (no department entity yet)
- Supplier write gate widen (after price closure)
- Manager department query filters / Rudder org-chart fidelity
