# AionUI Work Tasks — PRD

> Task: `06-15-aionui-work-tasks` | Priority: P2 | Package: aionui + aioncore | **Status: Phase 1–3 delivered (2026-06-15)**

## Goal

Organization-level human work tasks at `/tasks`, separate from cron (`/scheduled`) and agent `team_tasks`.

## Phase 1 (MVP) — delivered

- Single user: `owner_user_id` = `created_by_id` = `assignee_id` = current login user
- CRUD + 5-state workflow + file attachments (via `/api/fs/upload` + link API)
- Sidebar entry below scheduled tasks
- Backend: AionCore `aionui-work-tasks` crate (fork at `D:\Projects\claude-code-best\AionCore`)
- AionUI blocked empty state when bundled aioncore lacks API

## Status machine

| enum | UI |
|------|-----|
| `pending_accept` | 未接受 |
| `accepted` | 已接受 |
| `completed` | 已完成 |
| `incomplete` | 未完成 |
| `deferred` | 推迟 |

Self-created tasks default to `accepted`.

## API

See [`.trellis/spec/integration/aioncore-work-tasks.md`](../../spec/integration/aioncore-work-tasks.md).

## DDL (AionCore migration 013)

Tables: `work_tasks`, `work_task_attachments` — see `AionCore/crates/aionui-db/migrations/013_work_tasks.sql`.

## Phase 2 — delivered

- `users.work_task_role` (`manager` | `employee`), migration `014`
- RBAC: assign, scope list (`visible` / `mine` / `assigned`), server state machine
- `GET /api/users`, `PUT /api/users/:id/work-task-role`
- AionUI: dual-view tabs, assignee/due_at form, card enrichment, accept CTA, sidebar badge

## Phase 3 — delivered

- `GET /api/work-tasks/query` (manager-only summary + list)
- Manager team overview collapse on `/tasks`
- Optional MCP: `mcp_servers/work-tasks-query-server` → `work_tasks_summary`

## Out of scope (post Phase 3)
- Desktop `schema.ts` changes

## Phase 4 — center sync (extend)

> **Task:** [`07-03-work-tasks-center-sync`](../07-03-work-tasks-center-sync/prd.md) — 云端 VPS 权威 + 经理组织全员可见；UI 改 `orgHttpBridge`。本 Phase 1–3 本机 MVP 保持 `completed` 不变。

## Verification

| Check | Result |
|-------|--------|
| `bun test workTaskTypes.test.ts` | **8/8 PASS** (status machine + scope/overdue) |
| `cargo test -p aionui-work-tasks` | **14/14 PASS** (RBAC integration + regression) |
| code-review | **PASS** (incl. `update_task` UpdateStatus/UpdateMeta split) |
| `cargo build --release` | Required after AionCore changes — `scripts/build-aioncore-work-tasks.cmd` |
| Phase 2–3 UI smoke (dual-account) | Manual — see [`../../spec/frontend/dev-test-ship.md`](../../spec/frontend/dev-test-ship.md) §9 |

### Build toolchain (Windows)

1. **Rust:** `winget install Rustlang.Rustup` → rustup stable (rustc 1.96+). If `cargo` not on PATH: `%USERPROFILE%\.cargo\bin\cargo.exe`
2. **MSVC:** VS 2022 Build Tools + C++ workload (`link.exe` required)
3. **Build:** `scripts\build-aioncore-work-tasks.cmd`
4. **Dev:** `scripts\start-aionui-dev-work-tasks.ps1`

Steps: [`../../spec/frontend/dev-test-ship.md`](../../spec/frontend/dev-test-ship.md) §9.

## Acceptance (Phase 2–3)

| Scenario | Expected |
|----------|----------|
| Manager assigns employee | Task `pending_accept`; employee sidebar badge |
| Employee accepts | `accepted`; badge clears |
| Employee completes | `completed`; manager sees in **我分配的** + query summary |
| Employee assigns others | **403** |
| Employee query API | **403** |
| Assignee edits title via status PUT | **403** (meta/status permission split) |
