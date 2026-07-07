# Work Tasks Phase 4 — 中心化（云端 + 经理全员）

> **Task:** `07-03-work-tasks-center-sync`  
> **Parent:** [`06-15-aionui-work-tasks`](../06-15-aionui-work-tasks/prd.md)  
> **Status:** `completed` (2026-07-06) — VPS + dev UI 验收 PASS；P4-E 部分 defer
> **Priority:** P1  
> **Decisions:** [`research/decisions.md`](./research/decisions.md)

---

## Goal

将组织工作任务从 **本机 SQLite** 迁到 **中心 org aioncore（VPS）**，使：

1. 任意员工电脑登录后看到 **同一份** 任务数据  
2. **经理** 可查看 **组织全员** 任务（query + 团队概览）  
3. 指派对象来自 **org 用户目录**，而非本机 `users` 表  

---

## Problem（为何需要 extend）

| 现状（06-15 Phase 1–3） | 产品期望 |
|-------------------------|----------|
| `%APPDATA%/AionUi*/aionui-backend.db` | VPS org SQLite |
| 每台电脑数据隔离 | 跨设备一致 |
| 经理只见本机 DB 全量 | 经理见 **组织** 全量 |
| `httpBridge` → localhost | `orgHttpBridge` → `ORG_SERVER_URL` |

---

## Architecture（目标态）

```
┌─────────────────────────────────────────────────────────┐
│  Org VPS (aionorg.service, :13401)                      │
│  SQLite: work_tasks, work_task_attachments, users+role  │
│  REST: /api/work-tasks/*  (已有 crate，数据改走此实例)    │
└───────────────────────────▲─────────────────────────────┘
                            │ org JWT + orgHttpBridge IPC
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    员工 A /tasks       员工 B /tasks      经理 query 全员
```

**Local aioncore** 继续负责：chat、cron、MCP warmup — **不再** 持久化 work_tasks。

---

## Scope — 分阶段

### Phase 4-A — Org HTTP 接线（P0）

- [x] `ipcBridge.workTask.*` 改走 org HTTP（照 `orgKnowledge` 模式）
- [x] `useWorkTasks` / 附件 upload 路径对齐 org（或明确附件策略 O6）
- [x] Dev smoke：`GET {ORG}/api/work-tasks` 带 JWT → 200
- [ ] 本机 `/api/work-tasks` 对 UI **停用或只读降级**（避免双写）— **defer P4-E**

### Phase 4-B — VPS 数据与部署（P0）

- [x] 确认 org DB 已跑 migration 013/014
- [x] `deploy-org-aioncore-vps.ps1` smoke：work-tasks CRUD
- [x] `work_task_role` 在 VPS 用户上可管理（经理 bootstrap）

### Phase 4-C — 用户与 RBAC（P0）

- [x] 指派下拉：`GET /api/users` 来自 **org**（非本机）
- [x] 员工 scope 不变（visible/mine）；经理 assigned + query 全员
- [x] 文档：admin 与 manager 关系（D7 + `effective_work_task_role`）

### Phase 4-D — 实时与角标（P1）

- [x] `pending_accept` 侧栏角标：**SWR 轮询 30–60s** + `revalidateOnFocus`（**不接 org WebSocket 首版**）
- [x] 移除对本机 `workTask.onTaskCreated` WS 的跨设备依赖（仅作本机优化可选）

### Phase 4-E — 下线本机（P1）

- [x] 本机历史任务 **不迁移**（丢弃）
- [x] 离线：org 不可达 → 明确空态/错误（无 shadow）
- [x] admin → `work_task_role=manager` bootstrap
- [x] 附件：org 中心 upload + link
- [ ] 附件 **打开/下载** 经 org（VPS 路径）— **defer**
- [ ] 更新 `aioncore-work-tasks.md` 架构表 — **follow-up**

---

## Acceptance

| # | 场景 | 期望 |
|---|------|------|
| 1 | 经理在 A 电脑创建任务指派员工 B | B 在另一台电脑登录可见 `pending_accept` |
| 2 | 经理打开团队概览 | 看到组织内 **所有** 任务统计与列表 |
| 3 | 员工 C | 仅见自己相关任务，不能 query 全员 |
| 4 | 断网 | 行为符合 O2 决策 |
| 5 | VPS deploy | `GET /api/work-tasks` 401 无 token；带 org JWT 200 |

---

## Non-goals

- 部门过滤（除非 O3 锁定后单独立项）
- Agent team_tasks / Cron 合并
- Neon / 外部 DB（首版沿用 org SQLite）

---

## Related

| Item | Path |
|------|------|
| Local MVP PRD | `06-15-aionui-work-tasks/prd.md` |
| API spec | `.trellis/spec/integration/aioncore-work-tasks.md` |
| Org HTTP 样板 | `.trellis/spec/integration/org-knowledge.md` |
| VPS checklist | `scripts/org-phase0/vps-org-api-deploy-checklist.md` |
| Dev launcher | `ccb-installer/scripts/start-dev-full.ps1` |

---

## Product decisions（2026-07-01 锁定）

| 项 | 决定 |
|----|------|
| 本机旧任务 | **丢弃** |
| 离线 | **必须在线** |
| 经理范围 | **全公司** |
| admin | **自动 manager** |
| 实时 | **首版 SWR 轮询 + 聚焦刷新**（无 org WS） |
| 附件 | **中心存储**（org `/api/fs/upload`） |

---

## Open questions

~~O1–O6~~ → 已全部锁定，见 [`research/decisions.md`](./research/decisions.md)。
