# PRD — Work Tasks Platform v2（MCP 工具 + 经理 Dashboard）

> **Task:** `07-11-work-tasks-platform-v2`  
> **Status:** completed (P1–P3 + P6; P4 AC9 deferred to 07-14 EIL)  
> **Priority:** P1  
> **Date:** 2026-07-11  
> **Completed:** 2026-07-11 (user smoke OK)

## One-line definition

**统一升级工作任务体系**：补齐 `work-tasks-agent` MCP 工具集（员工可读自己的任务、经理可按人分配/查询），并在 AionUI `/tasks` 提供 **经理/管理员任务 Dashboard**（按人/逾期/摘要视图）。与 07-09 agent 协作、07-11 主入口 extension slot S6、07-14 EIL scope 对齐。

## Problem

07-09 交付了 manager 的 create/edit/query 三工具 + RBAC，但仍有明显缺口：

| 缺口 | 谁受影响 | 现状 |
|------|----------|------|
| 员工 agent **无法列出自己的任务** | employee + 主入口 P2 brief | 只有 create/edit；「今天有什么」必须委派或走 UI |
| 经理 **按用户名分配** | manager agent | 只有 `assignee_id`；无 username→id 解析 tool |
| 无 **单条 get** | agent 编辑流 | 依赖用户口述 task id |
| UI **无按员工 Dashboard** | manager/admin | 仅有折叠 summary + Tab；无按人/逾期驾驶舱 |
| **admin vs manager scope** 未区分 | admin | `admin` 用户名≈manager；EIL `is_admin` 公司级 query 未落地 |

用户截图（yjc 员工）已验证：AI 创建标签、admin 派单 pending_accept 正常；下一步是 **工具完整度 + 管理视图**。

## Strategic boundary

| In scope (this task) | Out of scope |
|----------------------|--------------|
| MCP v2 tools（见下） | 自动排程 / 智能派单 |
| `/tasks` manager dashboard（按人 + 逾期 + 摘要） | 完整 BI / 绩效报表 |
| Query API scope 参数（manager / admin 分级） | 部门树编辑器 |
| `resolve_assignee` helper（username→id） | 跨租户 org admin 控制台 |
| Employee `list_mine` / `brief` | 主入口挂 business MCP |
| 与 EIL `is_admin` **兼容**（P3 可软依赖 EIL P1） | 完整 EIL 全栈（归 07-14） |

## Goal

```text
┌─────────────────────────────────────────────────────────┐
│              Work Tasks Platform v2                      │
├──────────────────────┬──────────────────────────────────┤
│  MCP layer           │  UI layer                         │
│  work-tasks-agent    │  /tasks Manager Dashboard         │
│  + new read tools    │  + per-assignee / overdue views   │
│  + assignee resolve  │  + uses same query API            │
├──────────────────────┴──────────────────────────────────┤
│  AionCore query/list scope (manager vs is_admin)         │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
   07-09 RBAC base            07-14 EIL scope (optional P3)
```

## MCP v2 tool catalog (target)

| Tool | employee | manager | admin (`is_admin`) | API |
|------|----------|---------|-------------------|-----|
| `work_tasks_create` | ✅ | ✅ | ✅ | existing POST |
| `work_tasks_edit` | ✅ | ✅ | ✅ | existing PUT |
| `work_tasks_query` | ❌ | ✅ scoped | ✅ company | existing GET /query + scope param |
| **`work_tasks_list_mine`** | ✅ | ✅ | ✅ | GET /api/work-tasks?scope=mine |
| **`work_tasks_brief`** | ✅ | ✅ (own only) | ✅ (own only) | **Compose from `scope=mine` only — never `/query`** |
| **`work_tasks_get`** | ✅ ACL | ✅ | ✅ | GET /api/work-tasks/:id |
| **`work_tasks_resolve_assignee`** | ❌ | ✅ | ✅ | GET /api/users filter by username |

**Hard rules (see `research/api-contract-matrix.md`):**

- Employee brief/list_mine: **no org leak**; must not call `/query`.
- P1–P3 manager `/query` = **existing `list_all`** (temporary); company/`is_admin` = **P4 only**.
- `username===admin` → manager in MCP is **legacy** until EIL P4.

**Note:** `work_tasks_brief` 也可作为未来主入口 `employee-context` MCP 的后端；本 task 先挂在 `work-tasks-agent` server。

## UI: Manager Dashboard (target)

**Route:** `/tasks`（manager/admin 可见区块，非新路由）

| 区块 | 内容 |
|------|------|
| 摘要条 | 保留并增强现有 Collapse overview |
| **按员工分组** | assignee → 任务数、逾期数、待接受数 |
| **逾期列表** | 可筛 assignee / 状态；可点进详情 |
| **快速分配** | 复用 CreateWorkTaskDialog + assignee picker |

Employee 视图不变（无 dashboard 区块）。

## Relationship to other tasks

| Task | Relationship |
|------|----------------|
| `07-09-agent-work-tasks-collaboration-system` | **Baseline** — extend, do not replace RBAC |
| `07-11-orchestrator-employee-primary-entry` | S6 `my_tasks_brief` **consumes** `work_tasks_brief` contract |
| `07-14-employee-intelligence-layer` | P3 **soft dependency** for `is_admin` + department scope; P1–P2 work with `work_task_role` only |

## Acceptance criteria

### MCP / API
- [x] **AC1** Employee JWT: `work_tasks_list_mine` + `work_tasks_brief` return only own tasks; brief **must not** call `/query`; no org-wide leak
- [x] **AC2** Manager JWT: `work_tasks_query` + `work_tasks_resolve_assignee`; create with resolved id assigns `pending_accept`
- [x] **AC3** `work_tasks_get` respects existing task ACL (V2-G1; G2 skipped when no sample)
- [x] **AC4** All new tools emit structured audit (same envelope as 07-09)
- [x] **AC5** Acceptance script includes V2-E*/M*/G* cases — ALL PASS 2026-07-11

### UI
- [x] **AC6** Manager login: per-assignee breakdown + overdue list; items capped (≤200) with banner if truncated — **PASS 2026-07-11** (user smoke)
- [x] **AC7** Employee login: no dashboard block; existing list unchanged; `/query` still 403 — **PASS 2026-07-11** (user smoke)
- [x] **AC8** Manual smoke: admin assigns via UI + agent; employee sees pending + AI tag — **PASS 2026-07-11** (prior + this session)

### UI drill-down (P6 — Plan A; contract in dashboard-data-contract.md)
- [x] **AC-D1** Manager clicks assignee row → list shows **only** that assignee’s tasks via `/query?assignee_id=`; URL has `assignee=` — **PASS 2026-07-11**
- [x] **AC-D2** Filter chip clear **pushes** cleared URL — **PASS 2026-07-11**
- [x] **AC-D3** Browser **Back** restores previous filter; invalid params **replace** — **PASS 2026-07-11** (impl + user OK)
- [x] **AC-D4** KPI pending / overdue / status + Status Select via same helper — **PASS 2026-07-11** (overdue client-side; no `/query?overdue=`)
- [x] **AC-D5** Employee strip + no `/query` when `!isManager` — **PASS 2026-07-11** (impl + user OK)
- [x] **AC-D6** Unassigned client filter + truncation warning — **PASS** (impl)
- [x] **AC-D7** Overdue panel compact when count=0 — **PASS**
- [x] **AC-D8** Unit: parse/serialize/toQueryParams/employee normalize — **17 PASS**
- [x] **AC-D9** Known-assignee uses `/query` not cap-200 client-filter — **PASS**
- [x] **AC-D10** `queryTasks` IPC accepts query params — **PASS** (`assignee_id`/`status` only)

### EIL compatibility (P4 — deferred)
- [ ] **AC9** When `is_admin=true`: query scope = company — **DEFERRED** → `07-14-employee-intelligence-layer`
- [x] **AC10** Spec + `work-tasks-agent.md` tool table updated; vendor MCP synced to `D:\CCB-Wanding\vendor\...`

## Non-goals

- Draft task workflow（员工建单等 admin 分配）
- Bulk assign / 模板派单
- Delete tool in v2
- Replacing work-tasks-agent with main-entry MCP mutate
- Implementing EIL dept/direct_reports in P1–P3 (keep manager list_all)
- P6 Phase 1: row quick-assign、Drawer、People page、cap-200 client-filter happy path for known assignee

## Open questions (defaults)

| # | Question | Default |
|---|----------|---------|
| Q1 | `is_admin` in same task or wait EIL P1? | P1–P3 ship with manager list_all; **P4** when EIL API exists |
| Q2 | `brief` on work-tasks-agent vs new employee-context MCP? | Same server in v2; extract later |
| Q3 | Dashboard new route `/tasks/dashboard`? | No — enhance `/tasks` page |
| Q4 | P1 change AionCore query scope now? | **No** — optional prep only; P2 MCP unblocked |
| Q5 | P6 drill-down nav model? | **A filter-in-place** (employee-filtered list); B/C → P7 |
| Q6 | Filtered list data source? | **Required** `/query` refetch; no cap-200 client-filter happy path |
| Q7 | Back vs clear? | Back = history restore; Chip clear = push empty; normalize/employee = replace |

## Canonical files (expected)

- `mcp_servers/work-tasks-query-server/index.mjs`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/work-tasks-agent.md`
- `AionCore/crates/aionui-work-tasks/` (P4 / optional P1)
- `aionui-src/.../pages/workTasks/WorkTasksPage/` + grouping helper
- `aionui-src/.../pages/workTasks/useWorkTasks.ts`
- `scripts/test-work-tasks-agent-acceptance.mjs`
- `.trellis/spec/integration/aioncore-work-tasks.md`
- `research/api-contract-matrix.md`, `research/dashboard-data-contract.md`
