# Open questions — work-tasks RBAC closed-loop

## Q1（阻塞 · 产品）— 非 creator 的 manager 的「团队运维」范围？ — **LOCKED 2026-07-12: B**

场景：admin A 派给 yjc；另一位 manager B（或同一 admin 但未来多 manager）打开该任务。

| 选项 | 非 creator manager 可做 | 含义 |
|------|-------------------------|------|
| A — Creator 运维 | （未选） | — |
| **B — 任意 Manager 团队运维** ✅ **已选** | 任意 manager 可 **改派 / 推迟 / 删 / 改 due**；仍 **不可接受** | 小团队一人顶班；需放宽 Read/Meta/Status/Delete |
| C — 混合 | （未选） | — |

**锁定含义：**
1. 任意 `work_task_role=manager`：`UpdateMeta`（due/assignee/title）、`pending→deferred`、`Delete` — **不要求**是 creator
2. `pending_accept → accepted` 仍仅 assignee（ACCEPT_ACTOR.001 不变）
3. 任意 manager **可 Read detail** → `WANd.TASKS.MANAGER_READ.001`

---

## Q2（产品）— Manager 能否代完成？ — **LOCKED 2026-07-12: A**

| 选项 | `accepted → completed` / `incomplete` |
|------|----------------------------------------|
| **A — 任意 manager 可代关单** ✅ **已选** | 团队运维含关单；与 Q1=B 对齐 |
| B — 仅 assignee | （未选） |
| C — 仅 creator∧manager（AS-IS） | （未选） |

**锁定含义：**
1. `UpdateStatus`（除 accept 边）对 **任意 manager** 开放：defer / complete / incomplete / deferred→accepted
2. Accept 边仍仅 assignee
3. Phase 0 完成 → 等待「执行」

---

## Product lock summary（2026-07-12）

| Decision | Value |
|----------|-------|
| Q1 team ops | **B** — any manager: reassign / defer / delete / edit due (+ Read) |
| Q2 force-close | **A** — any manager may complete / incomplete |
| Accept | assignee-only (unchanged) |
