# Admin RBAC Contract — Org User Management

> **Task:** `07-13-org-admin-user-management`  
> **Contract:** `WANd.ORG.USER_ADMIN.001`  
> **Status:** locked for MVP (2026-07-13, post system-review)  
> **Authority:** overrides vague “manager can create users” in current service code

## 1. Identity of admin

| Layer | Field / claim | Notes |
|-------|---------------|-------|
| DB | `users.is_admin INTEGER NOT NULL DEFAULT 0` | Migration **`025_is_admin.sql`** (next after 024; directory is source of truth) |
| Seed | `UPDATE users SET is_admin=1 WHERE username='admin'` in migration **and** idempotent `ensure_system_user` after insert | Migration alone is insufficient on fresh DB (admin row created after migrations) |
| Model | `User.is_admin: bool` | From SQLite integer |
| `CurrentUser` | `is_admin: bool` | Loaded in auth middleware from DB row (not from JWT alone) |
| API responses | `PublicUser.is_admin` optional **or** separate admin flag on `/api/auth/user` | UI sidebar needs it; prefer `/api/auth/user` + `UserInfoResponse.is_admin` |
| JWT | **MVP: do not require `is_admin` in JWT claims** | Avoid token re-issue on promote; middleware loads from DB each request |

**Orthogonal to `work_task_role`:**  
`manager` ≠ `is_admin`. A manager may assign tasks; only `is_admin` may create/update org identity.

## 2. Endpoint ACL matrix

| Method | Path | employee | manager | admin (`is_admin`) | Purpose |
|--------|------|----------|---------|-------------------|---------|
| `GET` | `/api/users` | ❌ 403 | ✅ roster | ✅ roster | Work-task assignee picker — **PublicUser only** (id, username, work_task_role) |
| `GET` | `/api/org-users` | ❌ 403 | ❌ 403 | ✅ | Admin UI — **OrgUserResponse** (identity fields, no password_hash) |
| `POST` | `/api/org-users` | ❌ 403 | ❌ 403 | ✅ 201 | Create with identity |
| `PUT` | `/api/org-users/{id}` | ❌ 403 | ❌ 403 | ✅ | Update identity (not role-only route) |
| `DELETE` | `/api/org-users/{id}` | ❌ 403 | ❌ 403 | ✅ | **Phase 5** — hard delete; see §10 |
| `POST` | `/api/org-users/{id}/reset-password` | ❌ 403 | ❌ 403 | ✅ | **Phase 5** — admin password reset |
| `PUT` | `/api/users/{id}/work-task-role` | ❌ 403 | ✅* | ✅ | Existing; *keep manager for task RBAC; out of admin-UI MVP if unused |
| `GET` | `/api/users/me/context` | ✅ self | ✅ self | ✅ self | Unchanged |

\* Review finding: today `list_org_users` ignores `_actor` — **must** enforce manager+ (or authenticated org member) for roster; **must not** expose department/manager to non-admin via roster.

**Do not** make `GET /api/users` admin-only — that breaks `/tasks` assignee roster (`ipcBridge.workTasks.listMembers`).

### 2.1 Admin list completeness (`GET /api/org-users`)

| Rule | Detail |
|------|--------|
| **Include** | Bootstrap admin (`system_default_user` / username `admin`) when `password_hash` is non-empty |
| **Exclude** | Incomplete stubs (`password_hash` empty) only |
| **UI** | Show `is_admin` badge; disable delete for self and `system_default_user` |
| **Anti-pattern** | Filtering system admin out of the management table so operators conclude “admin was deleted” |

Assignee roster (`GET /api/users`) may still omit system user — that is a **different** surface (task picker), not the org admin Users page.

## 3. DTOs (do not pollute work-task types)

```rust
// New in aionui-api-types (org_users.rs or work_tasks.rs sibling)

OrgUserResponse {
  id, username, work_task_role, is_admin,
  department, job_title, manager_user_id,
  employment_status
}

OrgUserCreateRequest {
  username, password,
  work_task_role: Option,
  department: Option, job_title: Option,
  manager_user_id: Option,
  employment_status: Option  // default active
}

OrgUserUpdateRequest {
  work_task_role: Option,
  department: Option, job_title: Option,
  manager_user_id: Option,
  employment_status: Option
  // no password in MVP update — Phase 4 password UI
}
```

`CreateOrgUserRequest` (3 fields) — **deprecate for admin path**; keep temporarily if manager-create is removed.

## 4. Repo methods

```text
IUserRepository::
  update_org_identity(user_id, OrgIdentityPatch) -> Result<User>
  // fields: department, job_title, manager_user_id, employment_status, optional work_task_role

WorkTaskActor / OrgAdminActor::
  is_admin() -> bool   // from CurrentUser.is_admin
```

Create path: `create_user` then `update_org_identity` (or single transactional insert with identity columns).

## 5. Test matrix (mandatory GREEN)

| Case | Expect |
|------|--------|
| employee `GET /api/org-users` | 403 |
| manager `GET /api/org-users` | 403 |
| manager `GET /api/users` | 200 PublicUser[] (no department field required) |
| admin `GET /api/org-users` | 200 OrgUserResponse[] |
| employee `POST /api/org-users` | 403 |
| manager `POST /api/org-users` | 403 |
| admin `POST /api/org-users` with department | 201 + body has department |
| admin create → login as new user → `GET /api/users/me/context` | department matches |
| admin `PUT /api/org-users/{id}` | 200; context readback updates |

## 6. JWT / VPS smoke (beyond unit cargo)

```text
admin JWT:   POST /api/org-users → 201
manager JWT: POST /api/org-users → 403
employee JWT: GET /api/org-users → 403
new user JWT: GET /api/users/me/context → department == created value
```

Evidence → `{task}/vps-smoke-log.md` after deploy.

## 7. Migration / rollback

- File: `AionCore/crates/aionui-db/migrations/025_is_admin.sql`
- Before VPS apply: backup org SQLite
- Rollback: restore backup (SQLite ALTER ADD cannot drop easily); do not renumber migrations

## 8. UI sources of `is_admin` (MVP)

1. After login / auth verify: read `is_admin` from `/api/auth/user` (org VPS via orgHttp).
2. Sidebar show `#/org-users` only if `is_admin === true`.
3. Do not trust client-only flag for API calls — server enforces.

## 9. Phase 4 hard gates (2026-07-13 有条件批准)

### 9.1 Business capabilities (`WANd.ORG.CAPABILITY.001`)

| Rule | Detail |
|------|--------|
| Storage | MVP: `users.capabilities` (JSON/text list) |
| **Whitelist only** | `price_library.write`, `supplier_directory.write` — reject any other string on write |
| **Write API gate** | `is_admin` **OR** capability present; env `PRICE_ADMIN_USERNAMES` / `SUPPLIER_DIR_ADMIN_USERNAMES` = transitional **OR** only |
| Not final source | Env username lists must not remain sole authority after Phase 4.2 |

### 9.2 Manager cycle (`WANd.ORG.USER_ADMIN.001` update)

On `PUT /api/org-users/{id}` when setting `manager_user_id`:

- Reject if manager == self
- Reject if manager is in the descendant chain of the user (would create a cycle)

### 9.3 Settings placement

Moving UI to Settings does **not** relax §2 ACL — `/api/org-users` stays `is_admin` only.

### 9.4 Team Members settings retired (2026-07-13)

| Item | Status |
|------|--------|
| Settings「团队成员」 / `#/settings/team-members` create form | **Removed** — redirect to `#/settings/org` |
| Canonical create / role / identity | Settings → 组织 → `orgUsers.*` → `/api/org-users` |
| Roster for work-task assignee | **Unchanged** — `GET /api/users` / `workTask.listMembers` |
| Local `/api/auth/internal/users` (non-system) from UI | **No longer called** from desktop settings |

Contract: `WANd.ORG.TEAM_MEMBERS_RETIRE.001` (task `07-13-retire-team-members-settings`).

## 10. Phase 5 — Delete & admin lifecycle

> **5.1–5.5 implement contract (LOCKED):** `phase5-delete-state-contract.md`  
> Product backlog (5.6+): `product-delta-phase5.md`

### 10.1 `DELETE /api/org-users/{id}`

See `phase5-delete-state-contract.md` §1–4 (four atoms A–D). Summary:

| Rule | Detail |
|------|--------|
| ACL | `is_admin` only |
| Reject self | `id == CurrentUser.id` → 400 |
| Reject last admin | If target `is_admin` and count(`is_admin=1`) == 1 → 400 |
| Reports | Clear `manager_user_id` in transaction; return `cleared_reports_count` |
| Sessions | Hard delete → middleware user-miss 401; **no** global JWT rotate |
| History | Orphan `work_tasks` IDs allowed; UI shows「已删除用户」when unresolved |

### 10.2 Soft disable vs delete

| Action | Mechanism | Login / API |
|--------|-----------|-------------|
| 停用 / 离职 | `PUT` `employment_status` = `suspended` \| `terminated` | Login + middleware reject (status ∉ active/transferred) |
| 删除 | `DELETE` hard remove row | Login fail; API 401 |

### 10.3 Promote / demote `is_admin` (Phase 5.7 — not in 5.1–5.5)

| Rule | Detail |
|------|--------|
| Who | Only existing `is_admin` via `PUT /api/org-users/{id}` field `is_admin` |
| Last admin | Cannot set last admin’s `is_admin` to false |
| Orthogonal | Independent of `work_task_role` |

### 10.4 Password reset (Phase 5.6 — not in 5.1–5.5)

| Rule | Detail |
|------|--------|
| Who | `is_admin` only |
| Path | `POST /api/org-users/{id}/reset-password` body `{ password }` |
| Invalidation | **Target-only** — must not call global `rotate_secret()` |

