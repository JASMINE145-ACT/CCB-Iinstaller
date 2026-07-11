# AionCore Work Tasks API

> Human organization tasks (`/tasks` in AionUI). Separate from cron jobs (`/scheduled`) and agent `team_tasks` MCP.

**Status:** Phase 1–3 implemented (2026-06-15). Phase 4 center sync **shipped 2026-07-06** — employee `/tasks` UI uses **org VPS** via `orgHttpBridge` (not local aioncore). Self-built aioncore required — bundled v0.1.27 still lacks `/api/work-tasks`. **2026-06-27:** `aionui-work-tasks` re-merged into `aionui-app` router; smoke **401** on `GET /api/work-tasks`. **2026-07-06:** VPS deploy verified (`/api/work-tasks` + `/api/users` → 401 without JWT; CRUD + dev UI PASS). See task `07-03-work-tasks-center-sync`.

---

## Domain separation (do not confuse)

| Feature | Route | Backend | Purpose |
|---------|-------|---------|---------|
| **定时任务** (cron) | `/scheduled` | `/api/cron/*` | AI scheduled jobs |
| **工作任务** (human) | `/tasks` | `/api/work-tasks/*` | Org todo / work orders |
| Agent task board | `/team/:id` | MCP `team_task_*` only | Agent slot dependencies |

CCB-Wanding **does not participate** in work tasks. All CRUD goes through aioncore → SQLite.

---

## ACP model/mode → config-options (2026-06-16)

Self-built aioncore **v0.1.29+** removed legacy `GET/PUT /api/conversations/:id/model|mode`. AionUI `ipcBridge.acpConversation` now routes through **`acpConfigOptionsAdapter`** (dual-path):

| ipcBridge | Primary (0.1.29+) | Legacy fallback (bundled 0.1.27) |
|-----------|-------------------|----------------------------------|
| `getModel` / `setModel` | `GET/PUT …/config-options` (`model`) | `GET/PUT …/model` |
| `getMode` / `setMode` | same (`mode` option) | `GET/PUT …/mode` |

- **404 handling:** pre-warmup (no agent), missing config-options route, or removed legacy route → reads return `{ model_info: null }` / `{ mode: 'default', initialized: false }` without throwing.
- **Detection cache:** module-level; only caches “route missing” (`Route not found.`) — not “no active agent”.
- **Source:** `aionui-src/packages/desktop/src/common/adapter/acpConfigOptionsAdapter.ts`
- **Dev:** use **`ccb-installer/scripts/start-dev-full.ps1`** only — syncs self-built aioncore with `/api/work-tasks` + org SSO. Retired: `start-aionui-dev-work-tasks.ps1`.
- **Verified 2026-06-16:** user acceptance — new CCB「你好」+ `/tasks` CRUD on unified dev smoke **PASS**.

---

## Source

| Item | Path / detail |
|------|----------------|
| Upstream repo | [iOfficeAI/AionCore](https://github.com/iOfficeAI/AionCore) (Apache-2.0) |
| Local fork | `D:\Projects\claude-code-best\AionCore` |
| Rust crate | `crates/aionui-work-tasks/` (mirrors `aionui-cron`) |
| DB migration | `013_work_tasks.sql`, `014_work_task_roles.sql` |
| Build script | `scripts/build-aioncore-work-tasks.cmd` (vcvars + cargo) · `scripts/build-aioncore-work-tasks.ps1` |
| Dev start script | ~~`scripts/start-aionui-dev-work-tasks.ps1`~~ → **`start-dev-full.ps1`** |
| Bundled baseline | `AionUi/resources/bundled-aioncore/win32-x64/aioncore.exe` v0.1.27 — **no** work-tasks API |
| Minimum version (local) | **v0.1.29** self-built (`AionCore/target/release/aioncore.exe`, verified 2026-06-15) |

---

## AionCore Development Model

**Self-built fork is the primary development line for all org-service features.** The bundled binary is a static baseline that never receives feature updates.

| Instance | Path | Role |
|----------|------|------|
| **Self-built (primary)** | `AionCore/target/release/aioncore.exe` | All new crate development; deployed to VPS org service |
| **Bundled baseline** | `AionUi/resources/bundled-aioncore/win32-x64/aioncore.exe` | Static v0.1.27; "no org-server" offline fallback only |

### Rules (all new feature work)

1. New crates go into `D:\Projects\claude-code-best\AionCore\crates\` — never into the bundled binary.
2. Bundled baseline stays at v0.1.27; it is never rebuilt for feature additions.
3. Both dev workstation and VPS org server must run self-built binary to use new APIs.
4. Build command: `scripts/build-aioncore-work-tasks.cmd` (vcvars64 + `cargo build --release`).
5. Dev launcher: **`ccb-installer/scripts/start-dev-full.ps1`** only (Rule 0 — see [`dev-sync-playbook.md`](./dev-sync-playbook.md) §1). Retired: `start-aionui-dev-work-tasks.ps1` (redirects).

### Migration sequence (append-only; never edit deployed migrations)

| Migration | File | Feature |
|-----------|------|---------|
| 013 | `013_work_tasks.sql` | Work tasks |
| 014 | `014_work_task_roles.sql` | Work task RBAC |
| 015 | `015_org_knowledge.sql` | Org knowledge |
| **016+** | `016_price_library.sql` … | Price library (PR1 — next) |

Next migration number: **016**. Add SQL files to `AionCore/crates/aionui-db/migrations/`.

---

## REST (auth required)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/work-tasks?scope=&status=` | List; `scope`: `visible` (default), `mine`, `assigned` (manager), `owned` |
| POST | `/api/work-tasks` | Create; manager → other user = `pending_accept`; self = `accepted` |
| GET | `/api/work-tasks/query?status=&assignee_id=&overdue=` | **Manager only** — summary + list |
| GET | `/api/work-tasks/:id` | Detail + attachments + `assignee` / `created_by` user summary |
| PUT | `/api/work-tasks/:id` | Update fields / status (server enforces state machine) |
| DELETE | `/api/work-tasks/:id` | Delete task + attachment rows |
| POST | `/api/work-tasks/:id/attachments` | Link file already uploaded via `/api/fs/upload` |
| DELETE | `/api/work-tasks/:id/attachments/:attachment_id` | Remove attachment link |
| GET | `/api/users` | JWT member directory `{ id, username, work_task_role }` for assignee picker |
| POST | `/api/users` | **Manager-only** — create user (`username`, plaintext `password`, `work_task_role` default `employee`); server bcrypt |
| PUT | `/api/users/:id/work-task-role` | Manager-only role change; **409** if demoting the last `manager` |

### Local mode (`--local`) JWT contract (2026-06-15)

- `auth_routes` authenticated subtree already used `AuthState { local: false }` — `/api/auth/user`, `/api/users*` always required JWT.
- Domain routes (`/api/work-tasks`, `/api/settings`, …) use `auth_mw_state.local = services.local`; **as of org-login**, `local == true` no longer injects `system_default_user` — valid JWT (cookie or `Authorization: Bearer`) required **unless** `AIONUI_BYPASS_AUTH=1` (see below).
- WS: `build_ws_state` validates JWT in local mode (no `token_validator: |_| true` bypass) **unless** `AIONUI_BYPASS_AUTH=1`.

### Desktop HTTP fetch contract (2026-06-15)

Cross-layer contract for renderer → aioncore HTTP in Electron dev.

#### 1. Scope / Trigger

- Org-login added session cookies + Bearer token support.
- Any renderer `fetch` to `http://127.0.0.1:<port>/api/*` from `http://localhost:5173` (Electron dev).
- Do **not** change aioncore local CORS to credentialed wildcard — use frontend policy below.

#### 2. Signatures

```typescript
// aionui-src/packages/desktop/src/common/adapter/httpBridge.ts
export function backendFetchCredentials(): RequestCredentials;
// Returns 'omit' when window.__backendPort is set (Electron desktop / main)
// Returns 'include' when WebUI browser mode (window + document, no __backendPort)

export async function httpRequest<T>(method: string, path: string, body?: unknown, options?: HttpRequestOptions): Promise<T>;
// Always: credentials: backendFetchCredentials()
// When session token present: Authorization: Bearer <token>
```

#### 3. Contracts

| Field | Desktop Electron | WebUI browser |
|-------|------------------|---------------|
| Base URL | `http://127.0.0.1:${window.__backendPort}` | `''` (same-origin `/api`) |
| `fetch` credentials | `omit` | `include` |
| Auth header | `Authorization: Bearer` from `sessionStorage` | Cookie `aionui-session` (+ CSRF on login POST) |
| aioncore CORS (`--local`) | `Access-Control-Allow-Origin: *` (no credentials) | Proxied same-origin — CORS N/A |

Env: `AIONUI_BYPASS_AUTH=1` — skips JWT on domain routes + WS; desktop dev script sets this by default.

#### 4. Validation & Error Matrix

| Condition | Client symptom | Fix |
|-----------|----------------|-----|
| `credentials: 'include'` + desktop cross-origin | Browser CORS error; toast `Failed to fetch (127.0.0.1:port)` | Use `backendFetchCredentials()` |
| No Bearer + bypass off + local domain route | HTTP 401 | Login or enable `AIONUI_BYPASS_AUTH=1` in dev |
| Stale `window.__backendPort` after aioncore restart | ECONNREFUSED / wrong port | Restart Electron (port injected at startup) |
| WebUI login without `include` | Cookie not sent | WebUI must use `backendFetchCredentials()` → `include` |

#### 5. Good / Base / Bad Cases

- **Good:** Desktop dev send message — `credentials: 'omit'`, Bearer absent when bypass on, API 200.
- **Base:** Desktop real login — `credentials: 'omit'`, Bearer set after `POST /login` returns `token`, subsequent API 200.
- **Bad:** Desktop `credentials: 'include'` — all APIs fail before reaching handler (browser CORS).

#### 6. Tests Required

| Test | Assertion |
|------|-----------|
| `httpBridge.test.ts` `backendFetchCredentials` | `window.__backendPort` → `omit`; WebUI mode → `include` |
| `httpBridge.test.ts` `httpRequest` | fetch options include `credentials: 'omit'` in node env |
| Manual CDP | `fetch('http://127.0.0.1:'+__backendPort+'/health',{credentials:'omit'})` → 200 |

#### 7. Wrong vs Correct

```typescript
// Wrong
fetch(url, { credentials: 'include' });

// Correct
fetch(url, { credentials: backendFetchCredentials(), headers: bearerHeaders });
```

**Related frontend files:** `httpBridge.ts`, `AuthContext.tsx`, `DirectorySelectionModal.tsx`. **Backend CORS:** `AionCore/crates/aionui-app/src/router/routes.rs` (`allow_origin(Any)` when `services.local`).

### Dev bypass (`AIONUI_BYPASS_AUTH=1`, 2026-06-15)

Temporary desktop dev escape hatch while org-login E2E is deferred:

| Layer | When env set | Behavior |
|-------|----------------|----------|
| ~~`scripts/start-aionui-dev-work-tasks.ps1`~~ (retired) | historically set `AIONUI_BYPASS_AUTH=1` | Use `start-dev-full.ps1` |
| `aionui-auth` `auth_middleware` | `local && auth_bypass_enabled()` | Injects `system_default_user` / `manager` |
| `build_ws_state` | same | WS token validator accepts all |
| Preload `__bypassAuth` | mirrors env | Renderer reads bypass flag |
| `AuthContext.tsx` | `__bypassAuth` on desktop | Skips login page; silent `system` manager |

**Re-enable real login:** remove `$env:AIONUI_BYPASS_AUTH = '1'` from the dev start script, rebuild `aioncore`, restart dev. Org-login code (POST `/api/users`, `TeamMembersPage`, Bearer session) remains in tree.

**Desktop org SSO wiring (2026-06-26, uncommitted):** `start-dev-full.ps1` sets `AIONUI_SSO_MODE=org-idp` + `JWT_SECRET`; preload exposes `__ssoMode`, `__orgServerUrl`, `__bypassAuth`, `__forceRelogin`; `AuthContext` calls `performOrgLogin` on desktop; `/tasks` + `SiderWorkTasksEntry` + sider user chip wired. See task `06-26-aionui-source-level-recovery/dev-parity-wiring-2026-06-26.md`.

**First admin password:** `POST /api/webui/reset-password` when `needs_setup: true`; username default `admin`.

### Post-reinstall JWT / stale session (2026-06-22)

**Symptom:** `Invalid or expired token`, all `/api/*` → 401, Agents「Claude Code was not detected」, UI falls back to English — **Route-B / CCB install OK**.

**Cause:** aioncore rotates `jwt_secret` on fresh DB; Electron `sessionStorage` still holds pre-reinstall Bearer token.

**Fix (shipped):**

| Layer | Behavior |
|-------|----------|
| `run-wanding-bootstrap.ps1 -Mode Full` | writes `%LOCALAPPDATA%\CCB-Wanding\.claude\.auth-reset-required` |
| `ccb-launch-aionui.cmd` | sets `AIONUI_FORCE_RELOGIN=1`, deletes marker |
| preload `__forceRelogin` | renderer clears tokens before `/api/auth/user` |
| `AuthContext` + `httpBridge` | 401 → `invalidateAuthSession` → login page |
| `configService` | sends Bearer; 401 triggers same invalidation |

**User action after reinstall:** quit WanD fully → start from launcher → **log in again**. English UI resolves after login (i18n + settings load).

**Wrong vs Correct:**

| Wrong | Correct |
|-------|---------|
| Diagnose as Route-B / MCP broken | Check `/api/auth/user` + JWT; re-login first |
| Hot zip only `dist` expecting login to persist | Full NSIS reinstall invalidates JWT — re-login required |

### Roles (`users.work_task_role`)

| Role | Create for others | List `assigned` | Query API |
|------|-------------------|-----------------|-----------|
| `manager` | ✓ → `pending_accept` | ✓ | ✓ |
| `employee` | ✗ | ✗ | ✗ |

Migration: `014_work_task_roles.sql` — first real user + `system_default_user` bootstrap to `manager`.

### Create defaults

- Self-assign: status `accepted`
- Manager assigns employee: status `pending_accept`; assignee must be `employee`
- `owner_user_id` = creator namespace (unchanged from Phase 1)

---

## Status machine (5 states)

| enum | UI (zh-CN) | Notes |
|------|------------|-------|
| `pending_accept` | 未接受 | Phase 2: assigned by others |
| `accepted` | 已接受 | In progress; self-create default |
| `completed` | 已完成 | Terminal |
| `incomplete` | 未完成 | Terminal |
| `deferred` | 推迟 | Can resume → `accepted` |

UI transition guards: `canTransitionWorkTaskStatus()` in `workTaskTypes.ts`. **Backend enforces the same graph** in `aionui-work-tasks/src/rbac.rs` — illegal transitions → `400 InvalidStatus`.

---

## WebSocket events

| Event | Payload highlight |
|-------|-------------------|
| `work-task.created` | Full `WorkTaskResponse` |
| `work-task.updated` | Full `WorkTaskResponse` |
| `work-task.deleted` | `{ task_id: string }` — **not** `{ id }` |

AionUI: `ipcBridge.workTask.onTaskCreated|Updated|Deleted` + `useWorkTasks.ts` SWR refresh.

---

## Database

Runtime DB is owned by **aioncore**, not Electron legacy migrations.

| Profile | SQLite path (Windows) |
|---------|----------------------|
| Dev (`bun run dev`) | `%APPDATA%\AionUi-Dev\aionui\aionui-backend.db` |
| Production exe | `%APPDATA%\AionUi\aionui\aionui-backend.db` |

> Legacy Electron path `{dataDir}/aionui.db` is **not** the runtime backend DB.

Tables: `work_tasks`, `work_task_attachments`; `users.work_task_role` (`manager` | `employee`). **Do not** add DDL to desktop `schema.ts` — legacy one-shot only.

Verify migrations:

```powershell
sqlite3 "$env:APPDATA\AionUi-Dev\aionui\aionui-backend.db" ".tables" | Select-String work_task
sqlite3 "$env:APPDATA\AionUi-Dev\aionui\aionui-backend.db" "PRAGMA table_info(users);" | Select-String work_task_role
```

---

## AionUI integration

### Types & IPC

| File | Role |
|------|------|
| `packages/desktop/src/common/types/workTasks/workTaskTypes.ts` | Domain types + `canTransitionWorkTaskStatus()` |
| `packages/desktop/src/common/adapter/ipcBridge.ts` | `workTask.*` HTTP + WS emitters |
| `tests/e2e/helpers/bridge/routes.ts` | IPC → HTTP route map (work-task CRUD + query + members) |

### UI (mirror cron pattern)

| File | Role |
|------|------|
| `pages/workTasks/WorkTasksPage/index.tsx` | Scope tabs + status filter + **manager team overview** + **P6 drill-down** (`?assignee=&status=&overdue=`). Assignee/status → `/query`; **`overdue` client-only** (never on `/query` wire — AionCore rejects it) |
| `pages/workTasks/components/WorkTaskManagerDashboard.tsx` | KPI cards, workload bars, overdue panel; clickable assignee/KPI; Soft UI `compact` when filter active |
| `common/types/workTasks/workTaskFilterState.ts` | URL filter parse/serialize + list-mode mapping (`WANd.TASKS.DASHBOARD_DRILLDOWN.001`); `overdueClient` / `overview_client` / `unassigned_client` |
| `pages/workTasks/WorkTasksPage/WorkTaskDetailPage.tsx` | Detail, accept CTA, **了解任务**（agent picker + new chat handoff）, assignee/creator/due, attachments open/download |
| `pages/workTasks/components/CreateWorkTaskDialog.tsx` | Assignee picker (manager), due date |
| `pages/workTasks/components/WorkTaskStatusTag.tsx` | 5-state tag |
| `pages/workTasks/useWorkTasks.ts` | SWR + scope + members + query + pending badge count |
| `components/layout/Sider/SiderNav/SiderWorkTasksEntry.tsx` | Sidebar **任务** + pending_accept badge |
| `Router.tsx` | `/tasks`, `/tasks/:task_id` |
| i18n | `renderer/services/i18n/locales/{zh-CN,en-US}/workTasks.json` |

### 了解任务（Agent）handoff (2026-07-11)

**Semantically understand, not execute.** Detail CTA `了解任务` + agent Select (default `wande-orchestrator`).

| Step | Behavior |
|------|----------|
| Click | Always **new** ACP conversation; `session_mode=bypassPermissions`（UI「全自动」）; stage first message via `stageAcpInitialMessage` (**no attachments**) |
| Prompt | Task snapshot + 硬约束：先介绍、默认不 `work_tasks_edit` 改状态 |
| Write-back | UI appends `[Agent 了解] … · 会话 <shortId>` to `description` (dedupe by conversation id); failure does not roll back chat |
| Files | `common/workTasks/workTaskOpenAgent.ts`, `openWorkTaskUnderstandConversation.ts`, `WorkTaskDetailPage.tsx` |

Contracts: `WANd.TASKS.OPEN_UNDERSTAND.001`, `WANd.TASKS.BRIEF_PATH_WRITEBACK.001`, `WANd.TASKS.AGENT_PICKER.001`.

Attachments (P5 local-only, 2026-07-09): metadata via org `workTask.addAttachment` with `storage_mode: local`; bytes copied to Electron `userData/work-task-attachments/{attachment_id}` via main-process IPC (`workTaskAttachmentBridge.ts`). **No VPS disk** for new uploads.

### Attachment storage modes

| `storage_mode` | VPS stores | Bytes | Who can open |
|----------------|------------|-------|--------------|
| `local` (default) | `file_name`, `size`, `mime_type`, `uploaded_by_id`; `file_path` empty | Uploader device only | Uploader on same device |
| `remote` (legacy) | Full `file_path` from pre-P5 org upload | VPS `/tmp/aionui/...` | Same-machine path only (legacy) |

Migration: `020_work_task_attachment_storage.sql` — adds `storage_mode`, `uploaded_by_id`.

RBAC: `ManageAttachments` — creator **or** assignee may add/remove attachment metadata.

### Attachment open/download (UI)

| Mode | Desktop open | Manager / other device |
|------|--------------|------------------------|
| `local` | Resolve blob by `attachment_id` → `shell.openFile` | Filename visible; open **disabled** |
| `remote` (legacy) | `shell.openFile(file_path)` if path non-empty | May fail if path is VPS-only |

**Smoke (P5):** employee uploads PDF → local open works; manager sees filename only → open disabled; VPS `/tmp/aionui` unchanged.

---

## Dev: self-built aioncore (Windows)

### Prerequisites (verified 2026-06-15)

| Tool | Install | Notes |
|------|---------|-------|
| Rust | `winget install Rustlang.Rustup` | stable rustc 1.96+ |
| MSVC linker | VS 2022 Build Tools + **C++ workload** | `link.exe` required; MinGW-only path fails on build scripts |

### Build + run

```powershell
# Build (uses vcvars64 + cargo build --release)
D:\Projects\claude-code-best\scripts\build-aioncore-work-tasks.cmd

# Dev — self-built aioncore FIRST, bundled second (managed-resources)
D:\Projects\claude-code-best\ccb-installer\scripts\start-dev-full.ps1
```

Manual PATH override:

```powershell
$env:PATH = "D:\Projects\claude-code-best\AionCore\target\release;D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64;" + $env:PATH
cd D:\Projects\aionui-src; bun run dev
```

### Runtime verification

Dev log should show:

```text
[aioncore] starting: ...\AionCore\target\release\aioncore.exe ...
AIONCORE_LISTENING {"host":"127.0.0.1","port":<ephemeral>}
```

API probe (replace port from log):

```powershell
curl.exe -s -w "\nHTTP %{http_code}\n" "http://127.0.0.1:<port>/api/work-tasks"
# → {"success":true,"data":[]} HTTP 200
```

Smoke: sidebar **任务** → create task → change status → upload attachment → optional DB row in `aionui-backend.db`.

Without self-built aioncore, UI shows API-unavailable / blocked empty state (Phase 1a behavior).

---

## Verification (automated)

```powershell
cd D:\Projects\aionui-src
bun test tests/unit/common-utils/workTaskTypes.test.ts tests/unit/common-utils/workTaskDashboard.test.ts

cd D:\Projects\claude-code-best\AionCore
cargo test -p aionui-work-tasks                      # RBAC integration tests

cd D:\Projects\claude-code-best
scripts\build-aioncore-work-tasks.cmd                   # release build (~4–5 min first time)
```

### Multi-user smoke (Phase 2–3)

1. Build aioncore; start `ccb-installer/scripts/start-dev-full.ps1`
2. User A = `manager`, User B = `employee` (migration bootstrap or `PUT /api/users/:id/work-task-role`)
3. A creates task assigned to B → B sidebar badge + `pending_accept`
4. B accepts → completes → A sees in **我分配的** and query overview

### Optional MCP (work-tasks-agent)

`mcp_servers/work-tasks-query-server/index.mjs` — single **`work-tasks-agent`** MCP (v2.3.0):

| Tool | employee | manager/admin |
|------|----------|---------------|
| `work_tasks_create` | yes (self scope via API) | yes |
| `work_tasks_edit` | yes (ACL) | yes |
| `work_tasks_query` | **denied** | yes (P1–P3: org `list_all`; EIL P4 narrows scope) |
| `work_tasks_list_mine` | yes | yes |
| `work_tasks_brief` | yes (own only; **never** `/query`) | yes (own only) |
| `work_tasks_get` | yes (ACL) | yes (ACL) |
| `work_tasks_list_assignees` | **denied** | yes (live `/api/users`; default employee-only roster) |
| `work_tasks_resolve_assignee` | **denied** | yes (username → user_id) |

- **Deploy:** `vendor/mcp-servers/work-tasks-agent/index.mjs` + `node_modules` junction → `quotation-server` (see `sync-dev-wanding-vendor.ps1`).
- **Config:** `ccb-installer/packages/vertical/com.wanding.trade/package.json` + `ensure-wanding-settings.ps1` entry `work-tasks-agent`.
- **Env:** `ORG_SERVER_URL`, `ORG_SESSION_TOKEN_FILE` (preferred); fallback `AIONCORE_PORT` + `AIONCORE_JWT`.
- **Audit (07-09):** stderr JSON `work_tasks_tool_audit` per tool call (unified DB deferred to EIL P2).
- **UI:** Agent-created tasks stamp `metadata.source=agent`; `/tasks` shows **AI 创建** tag; manager **团队概览** shows per-assignee breakdown (`workTaskDashboard.ts`).
- **Acceptance:** `node scripts/test-work-tasks-agent-acceptance.mjs` (07-09 + V2-E*/M*/G* cases)

Legacy alias: `work_tasks_summary` → same handler as `work_tasks_query` (not listed in `ListTools`).

`cargo build --release` requires Rust + VS 2022 Build Tools (see `AionCore/rust-toolchain.toml`). If `cargo` is missing from shell PATH, use `%USERPROFILE%\.cargo\bin\cargo.exe`.

---

## Out of scope (post Phase 3)

- Department-scoped manager query (`department_id`)
- Desktop `schema.ts` / `migrations.ts` changes
- Upstream bundled release (optional PR path; fork self-build is primary)
- User-scoped WebSocket channels (global broadcast + client filter for now)
