# Research — Work Tasks RBAC AS-IS → TO-BE

> Task: `07-12-work-tasks-rbac-closed-loop`  
> Source: `AionCore/crates/aionui-work-tasks/src/rbac.rs` + `service.rs` + `aioncore-work-tasks.md`  
> Date: 2026-07-12

## 1. Two axes (must not conflate)

| Axis | Values | Meaning |
|------|--------|---------|
| **Role** | `manager` \| `employee` | Capability ceiling (`users.work_task_role`) |
| **Relation** | `creator` \| `assignee` \| `owner*` \| `unrelated` | Per-task membership |

\*Today `owner_user_id` ≈ creator namespace (Phase 1). Treat **owner ≈ creator** unless a future split lands.

**Rule of thumb:** Role opens *team-level* doors (assign others, `/query`); Relation opens *this-task* doors (read/edit/status/delete).

---

## 2. AS-IS matrix (code truth)

### 2.1 Role-level (no specific task)

| Capability | employee | manager |
|------------|----------|---------|
| Create task for **self** → `accepted` | ✓ | ✓ |
| Create / assign to **other employee** → `pending_accept` | ✗ | ✓ |
| List `scope=mine` / `visible` | ✓ | ✓ |
| List `scope=assigned` | ✗ | ✓ |
| `GET /api/work-tasks/query` (team dashboard) | ✗ | ✓ |
| Create org user / change `work_task_role` | ✗ | ✓ |
| MCP `work_tasks_create` | self only | ✓ |
| MCP `work_tasks_edit` | backend ACL | backend ACL |
| MCP `work_tasks_query` / list_assignees | ✗ | ✓ |

### 2.2 Relation-level (`can_access_task`)

| Action | creator | assignee | owner∧manager | unrelated |
|--------|---------|----------|---------------|-----------|
| **Read** | ✓ | ✓ | ✓ (if owner) | ✗ |
| **UpdateStatus** (coarse) | ✓ if manager | ✓ | — | ✗ |
| **UpdateMeta** (title/due/…) | ✓ | ✗ | ✓ | ✗ |
| **ManageAttachments** | ✓ | ✓ | — | ✗ |
| **Delete** | ✓ if manager **or** (creator∧assignee) | only if also creator | — | ✗ |

### 2.3 Status edges (after coarse UpdateStatus)

| Edge | Who (AS-IS) |
|------|-------------|
| `pending_accept → accepted` | **assignee only** (ACCEPT_ACTOR.001) |
| `pending_accept → deferred` | anyone with UpdateStatus (assignee **or** creator∧manager) |
| `accepted → completed \| incomplete \| deferred` | same UpdateStatus set |
| `deferred → accepted` | same UpdateStatus set |
| Terminal `completed` / `incomplete` | no further transitions |

### 2.4 Known asymmetries (not bugs until product says so)

1. **Query vs Read:** Manager sees tasks in `/query`, but `GET :id` still requires Read (creator|assignee|owner). Non-creator manager may see list rows yet **403 on detail** — UX hole.
2. **Reassign:** Changing `assignee_id` to another user requires `is_manager()`, but also **UpdateMeta** → effectively **creator-manager** (or owner-manager), not “any manager”.
3. **Force-complete:** Manager-creator may `accepted → completed` without being assignee (accept is locked; complete is not).
4. **Self-delete:** Employee can delete only if creator∧assignee (typical self-created task).

---

## 3. Recommended TO-BE closed loop (proposal)

### Design intent

```text
Manager = 派单 / 监督 / 运维（不替员工「接单」）
Employee = 接单 / 执行 / 交付（不对他人派单）
Accept   = 责任交接的签字（仅 assignee）
```

### Lifecycle ownership

| Phase | Owner of truth | Manager may | Employee (assignee) may |
|-------|----------------|-------------|-------------------------|
| **Create / assign** | Creator (must be manager if target ≠ self) | Assign, set due/title | Create self only |
| **Accept** | Assignee | ✗ force-accept; may **defer / reassign / delete** (per Q1) | ✓ Accept |
| **Execute** | Assignee | View (after Read policy), defer, reassign | Complete / incomplete / defer / attach |
| **Close** | Assignee (preferred) | Optional force-close — **Q2** | Complete / incomplete |
| **Supervise** | Any manager | `/query` + dashboard | ✗ |

### TO-BE action matrix (**Q1=B locked**)

Legend: ✓ allow · ✗ deny

| Action | Emp self-task | Emp as assignee | Emp unrelated | **Any manager** | Mgr as assignee |
|--------|---------------|-----------------|---------------|-----------------|-----------------|
| Create self | ✓ | — | — | ✓ | — |
| Assign other | ✗ | ✗ | ✗ | ✓ | — |
| Team query | ✗ | ✗ | ✗ | ✓ | ✓ |
| Read detail | ✓ | ✓ | ✗ | ✓ (**MANAGER_READ**) | ✓ |
| Accept | — | ✓ | ✗ | ✗ | ✓ |
| Defer | if UpdateStatus | ✓ | ✗ | ✓ | ✓ |
| Complete / incomplete | if assignee | ✓ | ✗ | ✓ (**Q2=A**) | ✓ |
| Edit due / title (meta) | if creator | ✗ | ✗ | ✓ | ✗* |
| Reassign | ✗ | ✗ | ✗ | ✓ | ✗* |
| Attachments | creator/assignee | ✓ | ✗ | creator/assignee only† | ✓ |
| Delete | creator∧assignee | ✗ | ✗ | ✓ | creator∧assignee |

\*When manager is also assignee, assignee rules apply for status; meta/reassign still via manager ops.  
†Attachments stay creator|assignee unless product expands later (out of Q1 scope).

### Implementation implication (Q1=B)

| Today | Need |
|-------|------|
| `UpdateMeta` = creator \|\| (owner∧manager) | → **any manager** (or new `ManageOps`) |
| `UpdateStatus` = assignee \|\| (creator∧manager) | → assignee \|\| **any manager**, except accept edge |
| `Delete` = (creator∧manager) \|\| (creator∧assignee) | → **any manager** \|\| (creator∧assignee) |
| `Read` = owner\|creator\|assignee | → **+ any manager** |

### Proposed contracts

| ID | Behavior |
|----|----------|
| `WANd.TASKS.ACCEPT_ACTOR.001` | **Locked** — accept assignee-only |
| `WANd.TASKS.RBAC_MATRIX.001` | **Provisional** — full role×relation×action table above |
| `WANd.TASKS.AGENT_RBAC.001` | Existing — MCP must mirror matrix (no widen) |
| `WANd.TASKS.MANAGER_READ.001` | **Provisional** — any manager may Read any task visible in `/query` |

---

## 4. Gap list (after locking Q1/Q2)

| Gap | AS-IS | TO-BE if Q1=team-ops | TO-BE if Q1=creator-only |
|-----|-------|----------------------|---------------------------|
| Manager detail Read | often 403 if not creator | allow for all managers | keep; UI must not deep-link |
| Reassign by other mgr | blocked (no UpdateMeta) | allow UpdateMeta or new ManageOps | keep |
| Force-complete | creator∧mgr OK | keep or tighten to assignee (Q2) | same |
| UI gating | Accept done; other actions uneven | mirror matrix helpers | mirror |
| VPS binary | may lag local | deploy with matrix | deploy |

---

## 5. Verification sketch

* Table-driven Rust tests: one case per matrix cell (or pairwise critical cells)
* Vitest helpers mirroring UI CTAs
* Manual: admin ↔ yjc assign / accept / defer / complete / query
* MCP: employee forbidden on query; manager query OK; edit cannot accept for other
