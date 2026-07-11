# Work Tasks 中心化 — 产品决策记录

> **Task:** `07-03-work-tasks-center-sync`  
> **Parent:** `06-15-aionui-work-tasks` (Phase 1–3 local MVP, completed)  
> **Date:** 2026-07-01（O1–O6 锁定）  
> **Status:** Phase 4 产品契约已锁定，可进实现

---

## 背景

`06-15` 交付的是 **本机 SQLite** 工作任务。产品要求：**云端权威 + 经理看全公司全员任务**。  
本文件 supersede `06-11` *Work-tasks remain local* 假设。

---

## 已锁定决策

| # | 议题 | 决定 |
|---|------|------|
| D1 | **存储位置** | **云端（中心 org aioncore / VPS）** 为唯一真相 |
| D2 | **经理可见性** | **全公司** — `query` 看组织内全部任务（无 `department_id` 过滤） |
| D3 | **HTTP 路径** | 桌面 `/tasks` 走 **`orgHttpBridge`**（同 org-knowledge） |
| D4 | **与 06-15** | Extend Phase 4；本机 MVP 历史保留 `completed` |
| D5 | **本机旧数据 (O1)** | **丢弃** — 不导入、不双轨；切换后本机 `work_tasks` 表不再使用 |
| D6 | **离线 (O2)** | **必须在线** — 无网时 `/tasks` 显示不可用（不做 shadow 缓存） |
| D7 | **admin (O4)** | **`admin` 用户自动视为 `work_task_role = manager`**（VPS bootstrap / JIT 规则） |
| D8 | **实时更新 (O5)** | **首版：SWR 轮询 + 窗口聚焦刷新**（见下 § O5 说明）；**不接 org WebSocket**（P4-D 可后补） |
| D9 | **附件 (O6)** | **元数据中心 + 字节本地** — VPS 仅存 `storage_mode=local` 元数据（`file_name`/`size`/`uploaded_by_id`）；字节在员工本机 `%APPDATA%/AionUi/work-task-attachments/{id}`；经理只见文件名，不能跨设备打开（2026-07-09 P5） |
| D9b | **附件 legacy** | 迁移前 `storage_mode=remote` 行保留 VPS 路径语义；新上传默认 `local` |

---

## O5 — 「实时更新」是什么意思？

**场景：** 经理在 A 电脑给员工派了任务，员工正在 B 电脑聊天 — 侧栏「任务」红点什么时候出现？

```
方案 A — WebSocket 推送（更即时）
  VPS 有变更 → 推事件到所有在线客户端 → 立刻刷新列表/角标
  优点：秒级
  缺点：要在 org aioncore 做 WS 广播（现 work-task WS 只在本机）

方案 B — 轮询（更简单）★ 首版选这个
  客户端每 30–60 秒问一次 VPS「有没有新任务？」
  + 用户切回窗口 / 点开「任务」页时再刷一次
  优点：实现快，和「必须在线」一致
  缺点：最多延迟几十秒才看到角标

方案 C — 混合
  轮询 + 以后再加 WS
```

**锁定 D8：** Phase 4 先做 **方案 B**；若上线后觉得角标太慢，再开子项接 org WebSocket。

本机版现用 `ipcBridge.workTask.onTaskCreated`（本机 WS）— 中心化后 **本机 WS 对跨设备无效**，必须换成 B 或 A。

---

## 实现含义速查

| 决策 | 工程上意味着什么 |
|------|------------------|
| 丢本机数据 | 切换后 UI 只打 org API；可选一次性删本机 `work_tasks` 行（非必须） |
| 必须在线 | `isOrgServerConfigured()` false 或 org 请求失败 → 空态 + 提示联网 |
| 全公司 | 现有 `list_all` 不过滤部门；**不**做 migration 016 department |
| admin=manager | VPS：admin 账号创建/登录时 `work_task_role=manager`；或 middleware 特判 |
| 轮询 | `useWorkTasks` / pending badge：`refreshInterval` 30–60s + `revalidateOnFocus` |
| 中心附件 | upload metadata org `POST .../attachments` (`storage_mode=local`); blob 本机 `work-task-attachments/`；**不上传** org `/api/fs/upload` |

---

## 非目标（已确认不做）

- 本机任务导入 / 双轨过渡
- 离线只读缓存
- 部门维度经理视图
- Phase 4 首版 org WebSocket（可后续加）
- Cron / team_tasks 合并

---

## 技术锚点

| 组件 | 路径 |
|------|------|
| Rust crate | `AionCore/crates/aionui-work-tasks/` |
| Org HTTP 样板 | `orgHttpBridge.ts`, `org-knowledge` IPC |
| PRD | `../prd.md` |
| VPS deploy | `scripts/org-phase0/vps-org-api-deploy-checklist.md` |

---

## References

- `06-15-aionui-work-tasks/prd.md`
- `.trellis/spec/integration/aioncore-work-tasks.md`
- `.trellis/spec/integration/org-knowledge.md`
