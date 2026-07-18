# Phase 5.1–5.5 — Delete & Soft-Disable State Contract

> **Task:** `07-13-org-admin-user-management`  
> **Contract extension:** `WANd.ORG.USER_ADMIN.001` (lifecycle)  
> **Status:** **LOCKED for implement** (2026-07-14) — absorbs system-review Option B  
> **Scope:** 5.1–5.5 only. 5.6+ stay in `product-delta-phase5.md` until separately approved.

## 0. Design principle

Do **not** implement delete as single-table CRUD. Treat “remove account” as **four atomic contracts** in one service transaction (where applicable):

| Atom | Name | Must succeed before next |
|------|------|--------------------------|
| **A** | Authz + preconditions | admin · not self · not last admin · target exists |
| **B** | Relationship unbind | clear `manager_user_id` pointing at target |
| **C** | Login/session invalidation | target cannot keep using API with old token |
| **D** | Hard delete + proof | row gone · list empty · login 401 |

Soft-disable (5.5) is a **parallel path** that does A (admin) + status update + C, **without** D.

---

## 1. Atom A — Authz & preconditions

### API

```http
DELETE /api/org-users/{id}
Authorization: Bearer <admin>
```

| Check | HTTP | Message (stable code optional) |
|-------|------|--------------------------------|
| Caller not `is_admin` | 403 | forbidden |
| Target not found | 404 | user not found |
| `id == CurrentUser.id` | 400 | cannot delete self |
| Target `is_admin` and `COUNT(is_admin=1) == 1` | 400 | cannot delete last admin |

Repo methods needed:

```text
IUserRepository::
  count_admins() -> Result<i64>
  count_reports(manager_user_id) -> Result<i64>   // for UI confirm + response
  clear_manager_refs(manager_user_id) -> Result<u64>
  delete_user_by_id(id) -> Result<()>             // org users table, not channel repo
```

All of A–D for hard delete run in **one DB transaction** (SQLite).

---

## 2. Atom B — Relationship unbind

| Rule | Detail |
|------|--------|
| Action | `UPDATE users SET manager_user_id = NULL WHERE manager_user_id = ?` |
| Response field | `cleared_reports_count: number` |
| Transfer-to-other | **Out of scope** for 5.1–5.5 |
| UI | Confirm modal must show count before call (from list client-side map **or** preview; server still authoritative) |

---

## 3. Atom C — Login / session invalidation

### Evidence of current JWT behavior

- Tokens signed with **process-global** JWT secret (`JwtService`), payload carries `user_id`.
- Auth middleware: verify JWT → `find_by_id` → inject `CurrentUser`.  
  If user row **missing** → **401** already (`middleware.rs`).
- Self password change currently calls **global** `rotate_secret()` — **must NOT** be reused for per-user admin ops (would kick everyone).

### Locked MVP strategies

| Event | Invalidation mechanism |
|-------|------------------------|
| **Hard DELETE** | Rely on middleware `find_by_id` miss → 401. No global rotate. Optional: structured log `org_user_deleted`. |
| **Soft disable** (`suspended` / `terminated`) | (1) **Login:** after password OK, reject if status ∉ `{active, transferred}` → 401/403 with clear message. (2) **Middleware:** after user load, same reject → existing tokens die on next request. |
| Admin reset password (5.6, later) | Must invalidate **only target** — prefer bump per-user token version **or** blacklist pattern; **never** global rotate. Not in 5.1–5.5. |

Allowed login statuses: `active`, `transferred`.  
Blocked: `suspended`, `terminated`, unknown/empty → treat as blocked (fail closed).

---

## 4. Atom D — Hard delete & historical references

### Hard delete

- Delete row from `users` (org identity).
- Success response: **200** JSON preferred for UI proof:

```json
{
  "success": true,
  "data": {
    "id": "<deleted_id>",
    "username": "<was>",
    "cleared_reports_count": 0
  }
}
```

(Alternative 204 accepted if bridge handles empty body; prefer 200+body.)

### Historical `work_tasks` references (no FK)

Evidence: `013_work_tasks.sql` stores `owner_user_id` / `created_by_id` / `assignee_id` as TEXT **without** FK.

| Decision (MVP locked) | Detail |
|-----------------------|--------|
| **Allow delete** even if user appears on historical tasks | Do not block delete for closed history |
| **Keep orphan IDs** in `work_tasks` | No cascade rewrite |
| **Display policy** | Task UI resolving user name: if missing → show **「已删除用户」** (can land in same PR if cheap; else explicit follow-up ticket referenced in smoke log) |
| **Open tasks soft gate (optional warning)** | UI confirm may warn if target is assignee/owner of **non-terminal** tasks; **server does not block** in 5.1–5.5 |

Not in scope: rewrite history, anonymize PII tables beyond username display.

---

## 5. Soft-disable vs delete (5.5)

| | Soft-disable | Hard delete |
|--|--------------|-------------|
| API | existing `PUT /api/org-users/{id}` `employment_status` | `DELETE /api/org-users/{id}` |
| Row | kept | removed |
| Login | rejected (Atom C) | N/A / 401 invalid credentials |
| API with old token | middleware 401 | middleware 401 |
| List | still visible (status badge) | gone |
| UI copy | 「停用」「离职」 | 「删除」+ irreversible confirm |

Edit form already has status; ensure labels + confirm on delete are distinct.

---

## 6. Frontend modification plan (5.1–5.5 only)

| File | Change |
|------|--------|
| `ipcBridge.ts` `orgUsers` | add `delete: (user_id) => DELETE /api/org-users/{id}` |
| `OrgUsersPage` | Actions: 编辑 \| **删除**; Modal: username + cleared reports estimate; on OK → delete → refresh list |
| i18n `orgUsers.json` | delete / confirm / cannot delete self (if surfaced) / success |
| Login error UX | if backend returns employment blocked message, show readable Chinese |

**Not in this slice:** reset-password modal, is_admin toggle, search, manager column, org-chart work.

---

## 7. Backend modification plan (ordered)

1. Repo: `count_admins`, `clear_manager_refs`, `delete_user_by_id` (+ tests)
2. Service: `delete_org_user(actor, id)` implementing A→B→D in transaction; log structured event
3. Route: `DELETE /api/org-users/{id}` behind `ensure_org_admin`
4. Auth login: employment_status gate after password OK
5. Auth middleware: employment_status gate after user load (non-local)
6. Cargo tests: matrix below
7. Frontend bridge + delete UI
8. security-reviewer → code-reviewer → smoke script

---

## 8. Test / smoke matrix (must be GREEN)

| Case | Expect |
|------|--------|
| employee/manager `DELETE` | 403 |
| admin `DELETE` other non-admin | 200; list excludes; `GET` by id N/A |
| admin `DELETE` self | 400 |
| admin `DELETE` sole admin | 400 |
| admin `DELETE` manager with 2 reports | 200; `cleared_reports_count=2`; reports `manager_user_id` null |
| deleted user old JWT → any authed API | 401 |
| deleted user `POST /login` | 401 invalid credentials |
| `PUT` status=`suspended` then login | fail (not 200 token) |
| suspended user existing JWT → API | 401 |
| `terminated` same as suspended | fail login + middleware |

Smoke artifact: `scripts/org-phase0/smoke-delete-user.ps1` + `{task}/phase5-smoke-log.md` (create on first run).

---

## 9. Explicit non-goals (this slice)

- 5.6 reset-password / 5.7 is_admin UI
- 5.8–5.12 list UX / encoding / org chart
- Full audit table (emit `tracing` structured log only)
- Global JWT rotate
- Transfer manager on delete

---

## 10. Approval → implement

This document **is** the modification plan for Option B.  
Next user phrase to start coding: **「执行 5.1–5.5」** / **「按 phase5-delete-state-contract 实现」**.
