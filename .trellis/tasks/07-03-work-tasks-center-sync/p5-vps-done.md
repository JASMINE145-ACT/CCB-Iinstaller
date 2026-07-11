# P5 VPS deploy — Delivery note

**Date:** 2026-07-09  
**Operator:** user (SSH hot-snap-1)

## Evidence

| Check | Result |
|-------|--------|
| `tar -xzf aioncore-upload.tgz` + `cargo build --release -p aionui-app` | **PASS** (~2m) |
| `GET /api/work-tasks` (no JWT) | **401** |
| `GET /api/users` (no JWT) | **401** |
| admin login | **PASS** — `work_task_role=manager` |
| `GET /api/work-tasks` + Bearer | **PASS** — task list with assignee yjc |

## Deferred (non-blocking)

- Desktop UI manual: employee local attachment upload/open + manager metadata-only
- `verify-work-tasks-p5.ps1 -OrgSmoke` from Windows post-restart
- P4-E: local API sunset, TeamMembersPage org
