# Employee Intelligence Layer (EIL) — integration spec

> **Status:** slice shipped 2026-07-11 (org context + settings read-only + subagent inherit). Full EIL (scope, audit, lifecycle) pending.

## Slice contracts (shipped)

| ID | Behavior |
|----|----------|
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | `GET /api/users/me/context` → handoff `org` block → CCB prompt; org wins over client for dept/title/name |
| `WANd.EMPLOYEE.SETTINGS_MERGE.001` | Settings org section read-only; client supplement (notes, email, phone, addressName) editable |
| `WANd.EMPLOYEE.SUBAGENT_INHERIT.001` | `runAgent` reads same handoff as `session/new` (07-06 P9 path) |

## API

### `GET /api/users/me/context` (authenticated)

Returns `ApiResponse<UserOrgContextResponse>`:

- `user_id`, `username`, `display_name` (v1 = username)
- `department`, `manager_user_id`, `manager_username`, `job_title`
- `work_task_role`, `employment_status`, `data_scope_max` (prompt hint only)

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
- `07-14-employee-intelligence-layer` — full EIL umbrella (planning)

## Deferred (full EIL)

- `is_admin`, business_roles, scope resolver enforcement
- `employee_audit_log`, lifecycle gates
- Manager department query filters
