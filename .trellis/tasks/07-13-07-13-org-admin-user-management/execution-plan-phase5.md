# Execution Plan — Phase 5.1–5.5 only (Delete + Soft-Disable)

| Field | Value |
|-------|--------|
| **Status** | **ACCEPTED** (2026-07-14 user smoke) — see `phase5-smoke-log.md` |
| **Contract** | `phase5-delete-state-contract.md` |
| **Done note** | `p5-1-5-delete-done.md` |
| **Parent** | `product-delta-phase5.md` · `execution-plan.md` |
| **Approved slice** | 5.1–5.5 (system-review Option B, 2026-07-14) |
| **Deferred** | 5.6+ until separate approval |

## Why this plan exists

System-review: risk is treating delete as CRUD and missing login gate / session proof / history policy.  
This plan maps **four atoms** → concrete files → GREEN matrix before UI polish.

## Workstreams (serial within backend; UI after Atom C exists)

| Step | Atom | Work | Files (primary) | Done when |
|------|------|------|-----------------|-----------|
| 1 | A+B+D repo | count_admins, clear_manager_refs, delete_user_by_id + unit tests | `aionui-db` `IUserRepository` / `sqlite_user.rs` | cargo tests GREEN |
| 2 | A+B+D service | `delete_org_user` transaction + structured log | `aionui-work-tasks` `service.rs` | service tests GREEN |
| 3 | A route | `DELETE /api/org-users/{id}` | `work-tasks/routes.rs` | route ACL tests GREEN |
| 4 | C login | reject non-`active`/`transferred` after password OK | `aionui-auth` `routes.rs` login | login tests GREEN |
| 5 | C middleware | same reject after `find_by_id` | `aionui-auth` `middleware.rs` | middleware/integration GREEN |
| 6 | UI | `orgUsers.delete` + 删除 + confirm modal | `aionui-src` ipcBridge + OrgUsersPage + i18n | manual + smoke |
| 7 | Gate | security-reviewer → code-reviewer → smoke | agents + `scripts/org-phase0/smoke-delete-user.ps1` | PASS + `phase5-smoke-log.md` |

## Historical references (locked)

- **Allow** hard delete with orphan `work_tasks` user IDs.
- Display 「已删除用户」 when resolving missing user — **same PR if cheap**, else note in smoke log as follow-up.
- Server **does not** block delete for open tasks in this slice.

## Session invalidation (locked)

| Path | Mechanism |
|------|-----------|
| Hard delete | Middleware user miss → 401 (no global JWT rotate) |
| Soft disable | Login + middleware employment_status gate |

## Verification commands (implement phase)

```text
cargo test -p aionui-db … delete / count_admins / clear_manager
cargo test -p aionui-work-tasks … delete_org_user / admin_only_delete
cargo test -p aionui-auth … employment_status / login_rejected
# then
scripts/org-phase0/smoke-delete-user.ps1  → phase5-smoke-log.md
```

## Gate order

```text
security-reviewer PASS → code-reviewer PASS → smoke PASS → update Trellis (p5-*-done.md)
```

## Out of this plan

Reset password, is_admin toggle, search, encoding, org chart, audit table, Excel, LDAP.
