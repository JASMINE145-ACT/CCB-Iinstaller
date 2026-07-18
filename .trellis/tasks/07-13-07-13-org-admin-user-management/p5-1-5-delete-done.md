# Phase 5.1–5.5 — implementation done

> Date: 2026-07-14  
> Contract: `phase5-delete-state-contract.md`

## Delivered

| Atom | Implementation |
|------|----------------|
| A Authz | `DELETE /api/org-users/{id}` + self / last-admin / 404 |
| B Unbind | `clear_manager_refs` + `cleared_reports_count` |
| C Session | Hard delete → middleware user-miss; soft disable → login + middleware employment gate |
| D Hard delete | `delete_user_by_id` + UI delete confirm |

## Evidence

- `cargo test -p aionui-common --lib capability_tests` PASS (4)
- `cargo test -p aionui-db --lib count_admins_and_delete` PASS
- `cargo test -p aionui-work-tasks --test service_integration delete` PASS (5)
- Frontend: `ipcBridge.orgUsers.delete` + OrgUsersPage 删除确认
- security-reviewer: **PASS** (txn last-admin)
- code-reviewer: **PASS** (Layer A PASS, Layer B N/A for Rust; UI smoke prior PASS)

## Atomic delete

`delete_user_clearing_reports`: `pool.begin()` → re-check last admin → clear reports → DELETE → `tx.commit()`  
(Do **not** use raw `BEGIN`/`COMMIT` on `&pool` — production `max_connections>1` caused HTTP 500.)

## Acceptance

- 2026-07-14: user accepted create / permissions / delete / admin still present. Log: `phase5-smoke-log.md`.

## Follow-ups (not this slice)

- 5.6+ reset password / is_admin UI / search / encoding / org-chart
- Task list display「已删除用户」for orphan IDs
- Soft-disable login message i18n polish
- Deploy AionCore list-includes-admin to VPS (UI merge already bridges)
