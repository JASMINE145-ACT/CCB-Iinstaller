# Research: Local-only work-task attachments (VPS metadata, employee-local blobs)

- **Query**: Feasibility of keeping task metadata on org VPS while storing attachment bytes only on the employee's machine (no VPS upload), extending task `07-03-work-tasks-center-sync`.
- **Scope**: mixed (internal codebase + product/architecture tradeoffs)
- **Date**: 2026-07-09

## Findings

### 1. Current attachment data model (DB + API)

#### Database (`013_work_tasks.sql`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | Prefixed `wta_*` at insert time |
| `task_id` | TEXT FK | `ON DELETE CASCADE` from `work_tasks` |
| `file_name` | TEXT NOT NULL | Display name |
| `file_path` | TEXT NOT NULL | **Absolute path on the machine that ran `/api/fs/upload`** |
| `mime_type` | TEXT | Optional |
| `size` | INTEGER | Bytes |
| `created_at` | INTEGER | ms epoch |

No `storage_mode`, `uploaded_by_id`, or content hash columns exist today.

#### API contract

**Create link** — `POST /api/work-tasks/:id/attachments`

Request (`AddWorkTaskAttachmentRequest`):

```json
{
  "file_name": "report.pdf",
  "file_path": "C:\\Users\\...\\Temp\\aionui\\general\\report.pdf",
  "mime_type": "application/pdf",
  "size": 12345
}
```

Response: full `WorkTaskResponse` including `attachments[]` with the same `file_path` echoed to every authorized viewer.

**Delete link** — `DELETE /api/work-tasks/:id/attachments/:attachment_id` — removes DB row only; **does not delete bytes on disk** (VPS or local).

**List/detail** — attachments embedded in every `GET /api/work-tasks` and `GET /api/work-tasks/:id`.

#### Current desktop upload flow (shipped Phase 4 / D9)

```
WorkTaskDetailPage
  → uploadFileViaOrgHttp(file)          // orgHttpBridge.ts
  → main process proxyOrgFsUpload       // orgHttpProxy.ts
  → VPS POST /api/fs/upload             // aionui-file
  → writes to VPS temp: {TMP}/aionui/general/{file}
  → returns absolute VPS path
  → org POST .../attachments { file_path: <VPS path> }
```

Open/download today:

| Action | Implementation | Backend used |
|--------|----------------|--------------|
| Open (Electron) | `ipcBridge.shell.openFile.invoke(att.file_path)` | **Local** aioncore `/api/shell/open-file` |
| Download | `downloadFileFromPath` → `ipcBridge.fs.getImageBase64` | **Local** aioncore `/api/fs/get-image-base64` |

**Important gap in current center-storage design:** upload lands on **VPS**, but open/download still call **local** aioncore. That only works if the VPS path is somehow visible to the employee's local FS (it is not in production). Phase 4 shipped org upload but did not add org-side read/shell proxy — cross-device attachment open was already broken for manager viewers; even the uploader may fail open unless paths coincide.

#### Server validation on `add_attachment`

`WorkTaskService::add_attachment` stores `req.file_path` verbatim. The server **never** `stat`s or reads the file. No existence check, no path allowlist, no upload ownership proof.

### 2. What breaks if `file_path` is an employee local path while task lives on VPS

| Area | Breakage |
|------|----------|
| **Manager / other device** | API returns `C:\Users\employee\...` or `/home/employee/...`. Viewer runs `shell.openFile` / `getImageBase64` on **their** machine → file missing, wrong file, or sandbox denied. |
| **Same employee, second PC** | Path points to first PC's disk; blob unavailable. |
| **Path stability** | Raw picker paths can be temp/moved; user may delete source file after upload. |
| **Local FS sandbox** | `get_image_base64` validates against `allowed_roots` on **local** aioncore — arbitrary user paths outside workspace/temp may be rejected (`path_safety.rs`). |
| **WebUI** | `uploadFileViaOrgHttp` requires Electron IPC; open uses download path — no local blob story. |
| **WS / SWR payloads** | `work-task.updated` broadcasts full `file_path` to all connected clients — leaks uploader filesystem layout org-wide. |
| **Delete semantics** | Removing attachment or task does not garbage-collect local bytes; orphaned files accumulate. |
| **Product decision D9** | Locked **center storage** (`decisions.md` O6) — local-only is an explicit contract change. |

**What does *not* break:** task CRUD, status machine, assignee RBAC, attachment **metadata** list (names, counts, sizes) on VPS.

**SSRF note:** Today **no server-side SSRF** — paths are opaque strings in SQLite. Risk appears only if a future feature makes the server read `file_path` (serve/download proxy).

### 3. Cross-device visibility (concrete scenario)

**Setup:** Manager on PC-A assigns task. Employee on PC-B adds attachment.

| Actor | Sees in UI | Can open/download |
|-------|------------|-------------------|
| Employee PC-B (uploader) | Filename, size, metadata | **Yes**, if blob stored under stable local store and resolved on this device |
| Manager PC-A | Same metadata + **leaked PC-B path string** | **No** (path meaningless on PC-A) |
| Employee PC-C (same account, new machine) | Metadata | **No** unless blob replicated |
| Manager query API | Attachment count in list | Count yes; content no |

**Who can see what:** Any user with task read access sees **full attachment metadata including `file_path`** today. Content access is accidental-only when viewer's local FS happens to contain that exact path.

### 4. Architecture options

#### (A) Metadata on VPS + store employee `file_path` in `file_path`

- **Effort:** Minimal (skip org upload; POST picker path).
- **Pros:** Saves VPS disk immediately.
- **Cons:** Cross-device broken; path leakage; unstable paths; violates D9 intent; worst security/privacy story.
- **Verdict:** **Not recommended** except as a throwaway spike.

#### (B) VPS metadata + local blob store keyed by `attachment_id`

- VPS stores: `id`, `file_name`, `mime_type`, `size`, `uploaded_by_id`, `storage_mode=local`.
- Client copies bytes to e.g. `%APPDATA%/AionUi/work-task-attachments/{attachment_id}` **before** POST.
- `file_path` on server empty or omitted; client maintains `attachment_id → local path` index.
- Open: resolve locally by `attachment_id`; if missing → "not on this device".
- **Pros:** No VPS disk; no real path over wire; stable blob location; works offline for uploader.
- **Cons:** Manager never gets bytes; multi-device uploader needs re-upload; GC on delete; new client module + optional IPC.

#### (C) Hybrid with explicit `local_only` flag (recommended shape of B)

Same as (B) but first-class in API/DB:

```sql
-- illustrative migration 017
storage_mode TEXT NOT NULL DEFAULT 'remote'
  CHECK (storage_mode IN ('remote', 'local'));
uploaded_by_id TEXT;  -- set server-side from JWT on insert
-- file_path nullable when storage_mode = 'local'
```

API response:

```json
{
  "id": "wta_...",
  "file_name": "report.pdf",
  "storage_mode": "local",
  "uploaded_by_id": "user_employee",
  "mime_type": "application/pdf",
  "size": 12345,
  "file_path": null
}
```

UI rules:

- `local` + blob present locally → open/download enabled.
- `local` + blob absent → show badge "仅上传者本机可用" / disabled actions.
- `remote` (legacy rows) → keep current behavior until migrated or deprecated.

Allows future `storage_mode=remote` via object storage without another redesign.

#### (D) Revert — no cross-device attachments

- Disable attachment UI when `isOrgServerConfigured()` or hide for non-creator.
- **Pros:** Honest, zero VPS disk.
- **Cons:** Product regression vs Phase 1–4; managers lose audit trail of filenames.

### 5. Security implications

| Risk | Severity (local path in VPS DB) | Mitigation in option C |
|------|--------------------------------|------------------------|
| **Filesystem path leakage** to all task viewers | High — exposes usernames, project folders | Do not store real paths on VPS; `file_path` null for `local` |
| **Server SSRF** via `file_path` | None today (path not read) | Keep server path-blind; never add blind server read |
| **Client path injection** | Low server impact; pollutes DB | Server sets `uploaded_by_id` from JWT; ignore client path when `storage_mode=local` |
| **Local blob theft** | Local malware scope | Store under app data; optional OS ACL — same as other local caches |
| **Orphan blobs** | Low | Delete local file on `removeAttachment` + periodic GC by index |
| **CSRF / auth** | Unchanged | Attachment POST still requires org JWT + RBAC |

### 6. Minimal change set vs full redesign

#### Minimal viable (option C, ~1 sprint)

| Layer | Change |
|-------|--------|
| DB | Migration `017`: `storage_mode`, `uploaded_by_id`; nullable `file_path` |
| Rust | `add_attachment` sets `uploaded_by_id` from actor; branch on `storage_mode`; DTO exposes new fields |
| Desktop | New `workTaskAttachmentStore.ts` — copy to app-data, resolve, delete |
| UI | `WorkTaskDetailPage` — replace `uploadFileViaOrgHttp` with local store + POST metadata |
| UI | Open/download — resolve via store; disabled state + i18n for remote viewers |
| Types | `workTaskTypes.ts`, `ipcBridge` body map |
| Docs | Amend D9 in `decisions.md`; update `aioncore-work-tasks.md` |

**Out of minimal scope:** manager download, second-device sync, WebUI upload, org WS, VPS file GC.

#### Full redesign (defer)

- Shared object storage (S3/MinIO) for `remote` attachments with signed URLs.
- Optional "request file" workflow (employee approves upload to shared store).
- Per-device attachment index sync.
- Content-hash dedup, quota, antivirus scan on VPS.

### 7. Recommendation

**Verdict: GO WITH CONSTRAINTS** — implement **option C** (hybrid, `storage_mode=local`, client blob store keyed by `attachment_id`).

**Constraints to accept explicitly:**

1. **Cross-device content access is unsupported** — managers see filename/size/uploader, not bytes.
2. **Supersedes D9/O6** ("center storage") — metadata central, bytes local.
3. **Electron desktop only** for upload/open in v1; WebUI shows metadata-only or hides upload.
4. **Uploader must use app-managed copy**, not raw picker path.
5. **Legacy `remote` rows** (VPS paths from current deploy) need a one-line UI note or migration to `local` with broken open until re-upload.

**No-go for:** naive option A (raw local path in VPS `file_path`) — leaks paths and fails silently on manager machines.

---

### Files Found

| File Path | Description |
|-----------|-------------|
| `AionCore/crates/aionui-db/migrations/013_work_tasks.sql` | `work_task_attachments` schema |
| `AionCore/crates/aionui-db/src/models/work_task.rs` | `WorkTaskAttachmentRow` |
| `AionCore/crates/aionui-db/src/repository/sqlite_work_task.rs` | Attachment CRUD SQL |
| `AionCore/crates/aionui-api-types/src/work_tasks.rs` | Request/response DTOs |
| `AionCore/crates/aionui-work-tasks/src/service.rs` | `add_attachment` / `remove_attachment` |
| `AionCore/crates/aionui-work-tasks/src/routes.rs` | REST routes |
| `AionCore/crates/aionui-file/src/routes.rs` | `POST /api/fs/upload` |
| `AionCore/crates/aionui-file/src/service.rs` | `create_upload_file` → VPS temp dir |
| `AionCore/crates/aionui-shell/src/shell.rs` | `open_file` local validation |
| `aionui-src/.../orgHttpBridge.ts` | `uploadFileViaOrgHttp`, org HTTP helpers |
| `aionui-src/.../orgHttpProxy.ts` | Main-process org upload proxy |
| `aionui-src/.../ipcBridge.ts` | `workTask.addAttachment` → org HTTP |
| `aionui-src/.../WorkTaskDetailPage.tsx` | Upload / open / download UI |
| `aionui-src/.../workTaskTypes.ts` | TS attachment types |
| `aionui-src/.../download.ts` | Local `getImageBase64` download path |
| `.trellis/spec/integration/aioncore-work-tasks.md` | Integration spec (attachment section) |
| `.trellis/tasks/07-03-work-tasks-center-sync/research/decisions.md` | D9 center-storage lock |

### Code Patterns

**Attachment insert (server trusts client path):**

```267:285:AionCore/crates/aionui-work-tasks/src/service.rs
    pub async fn add_attachment(
        ...
        let row = WorkTaskAttachmentRow {
            id: generate_prefixed_id("wta"),
            task_id: task_id.to_owned(),
            file_name: req.file_name,
            file_path: req.file_path,
            ...
        };
        self.repo.insert_attachment(&row).await?;
```

**VPS upload target (current):**

```928:952:AionCore/crates/aionui-file/src/service.rs
            let mut dir = std::env::temp_dir().join("aionui");
            ...
            dir = dir.join("general");
            ...
            return Ok(file_path.to_string_lossy().into_owned());
```

**Desktop upload entry:**

```74:88:aionui-src/packages/desktop/src/renderer/pages/workTasks/WorkTasksPage/WorkTaskDetailPage.tsx
        const file_path = await uploadFileViaOrgHttp(file, '');
        await ipcBridge.workTask.addAttachment.invoke({
          task_id,
          file_name: file.name,
          file_path,
          ...
        });
```

### External References

- N/A — purely internal architecture; no third-party attachment sync library required for MVP.

### Related Specs

- `.trellis/spec/integration/aioncore-work-tasks.md` — REST table, attachment open/download matrix (assumes path on disk readable by local aioncore)
- `.trellis/tasks/07-03-work-tasks-center-sync/research/decisions.md` — **D9 must be amended** if proceeding

## Caveats / Not Found

- No existing `workTaskAttachmentStore` or local attachment index in `aionui-src` — greenfield client module.
- No server-side attachment integration tests for `add_attachment` path validation (tests focus on RBAC/state machine).
- Org-side read proxy for `remote` attachments was **not found** — confirms open/download gap for VPS-stored files.
- Active Trellis task pointer was unset (`task.py current` → none); output written to requested path `07-03-work-tasks-center-sync/research/`.

---

## Implementation checklist (if approved)

### Key blockers before coding

1. Product sign-off to **supersede D9** and accept manager cannot open attachments.
2. Choose local store root (proposed: `%APPDATA%/AionUi/work-task-attachments/`).
3. Decide legacy VPS `remote` rows: hide open vs migrate vs force re-upload.

### Files to change

**Backend (AionCore)**

- `crates/aionui-db/migrations/017_work_task_attachment_storage.sql` (new)
- `crates/aionui-db/src/models/work_task.rs`
- `crates/aionui-db/src/repository/sqlite_work_task.rs`
- `crates/aionui-api-types/src/work_tasks.rs`
- `crates/aionui-work-tasks/src/service.rs`
- `crates/aionui-work-tasks/tests/service_integration.rs` (attachment + storage_mode cases)

**Frontend (aionui-src)**

- `packages/desktop/src/common/types/workTasks/workTaskTypes.ts`
- `packages/desktop/src/common/adapter/ipcBridge.ts`
- `packages/desktop/src/renderer/pages/workTasks/WorkTasksPage/WorkTaskDetailPage.tsx`
- `packages/desktop/src/renderer/services/workTaskAttachmentStore.ts` (new)
- `packages/desktop/src/process/bridge/` — optional IPC for copy/delete if renderer cannot write app-data directly
- `packages/desktop/src/renderer/services/i18n/locales/*/workTasks.json`
- `tests/unit/...` — store + UI guard tests

**Docs / Trellis**

- `.trellis/spec/integration/aioncore-work-tasks.md`
- `.trellis/tasks/07-03-work-tasks-center-sync/research/decisions.md` (D9 amendment)

**Can deprecate / leave unused**

- `uploadFileViaOrgHttp` for work tasks (keep for other features if any)
- `ORG_FS_UPLOAD_CHANNEL` usage from work tasks only
