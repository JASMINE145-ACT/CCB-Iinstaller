# Open questions — work-tasks accept ACL

## Q1（阻塞 · 产品）— 经理能否代接受？ — **LOCKED 2026-07-12: A**

截图场景：admin 派给 yjc → `pending_accept`。admin 打开详情时：

| 选项 | 「接受」按钮 | manager 「更改状态」→ accepted | Backend `UpdateStatus` |
|------|-------------|-------------------------------|------------------------|
| **A — 严格执行人** ✅ **已选** | **仅 assignee** | 隐藏或禁用 pending→accepted；经理可用推迟/改派/删除 | `pending_accept→accepted` **仅 assignee** |
| B — 维持现状 | （未选） | — | — |
| C — 双按钮「代接受」 | （未选） | — | — |

**锁定含义：**
1. UI「接受」仅当 `currentUser.id === assignee_id`
2. 「更改状态」对非 assignee **不得**提供 `accepted`（pending 边）
3. Backend：`pending_accept → accepted` 仅 assignee；manager-creator 对该边 → Forbidden（仍可 deferred / 改派 / 删）

**Implemented 2026-07-12** — see `execution-plan.md` / AC1–5. Await smoke.

---

后续（实现时顺带确认，默认否）：

- Q2：非 creator 的 manager 能否改别人的 pending 单？→ **默认否**（与现 RBAC 一致：只有 assignee 或 creator∧manager；接受边再收紧为仅 assignee）
- Q3：MCP `work_tasks_edit` 同边 → **同 UI/API，禁止 manager 代接受**
