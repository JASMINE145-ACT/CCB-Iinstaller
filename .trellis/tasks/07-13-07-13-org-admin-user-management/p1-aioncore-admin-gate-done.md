# Phase 1 done — AionCore admin gate + `/api/org-users`

**Date:** 2026-07-13  
**Contract:** `WANd.ORG.USER_ADMIN.001`

## Delivered

| Item | Evidence |
|------|----------|
| Migration `025_is_admin.sql` | column + UPDATE seed (existing rows) |
| Bootstrap seed | `ensure_system_user` sets `is_admin=1` for admin / system_default_user |
| `CurrentUser.is_admin` | middleware loads from DB |
| `/api/auth/user` | `PublicUser.is_admin` |
| `GET /api/users` | manager+ roster PublicUser |
| `GET/POST /api/org-users`, `PUT /api/org-users/{id}` | admin-only OrgUser* |
| `update_org_identity` | repo method |

## GREEN

```text
cargo test -p aionui-db bootstrap_admin_is_org_admin_after_fresh_init  → ok
cargo test -p aionui-work-tasks --test service_integration             → 17 ok
  incl. admin_creates_org_user_with_department, manager_cannot_create,
        admin_only_list, employee_cannot_list_roster, admin_updates_org_user_identity
```

## code-reviewer

1. First pass **FAIL** — bootstrap seed order (Critical)  
2. Fix applied → re-review **PASS** (see chat agent `3f3a2007` / follow-up)

## Remaining (Phase 2 UI — not started)

- aionui-src `#/org-users` + sidebar gate on `is_admin`
- VPS deploy + `vps-smoke-log.md`
