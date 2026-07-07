# Phase 4-B VPS — Delivery note

**Date:** 2026-07-06  
**Operator:** user (VPS SSH)

## Evidence

| Check | Result |
|-------|--------|
| `deploy-org-aioncore-vps.ps1 -ExtractOnRemote` | tarball 628MB uploaded (seed scp interrupted; manual extract OK) |
| `cargo build --release -p aionui-app` | success |
| `systemctl restart aionorg` | active (running) |
| `GET /api/work-tasks` (no JWT) | **401** |
| `GET /api/users` (no JWT) | **401** |
| Admin login + work-task CRUD | user confirmed PASS |
| Dev `#/tasks` UI | user confirmed basically done |

## Deferred (non-blocking)

- P4-E: attachment open from VPS path (local `shell.openFile`)
- P4-E: local `/api/work-tasks` read-only sunset
- TeamMembersPage still uses local `auth.createUser`
