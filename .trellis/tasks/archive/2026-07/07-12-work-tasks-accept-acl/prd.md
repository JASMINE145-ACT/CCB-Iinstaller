# PRD — Work Tasks「接受」权限边界（assignee-only vs manager force）

> **Task:** `07-12-work-tasks-accept-acl`  
> **Status:** ready_to_implement (Option **A** locked 2026-07-12)  
> **Priority:** P1  
> **Date:** 2026-07-12  
> **Parent / baseline:** `07-09-agent-work-tasks-collaboration-system` (`WANd.TASKS.AGENT_RBAC.001`)  
> **Related:** `07-11-work-tasks-platform-v2`（dashboard / UI）

## Symptom (user)

admin 打开执行人为 **yjc**、状态为 **待接受** 的任务详情时，仍能看到并点击「接受」——语义上像是「替员工接单」。

截图例：任务「查询直接50报价」· 执行人 yjc · 指派人 admin · 已有「已接受」/「AI 创建」标签；详情仍暴露状态变更能力。

## Root cause (code — 已证实)

| 层 | 行为 | 位置 |
|----|------|------|
| **Backend RBAC** | `UpdateStatus` = **assignee** OR **(creator ∧ manager)** | `aionui-work-tasks/src/rbac.rs:57` |
| **UI 接受按钮** | 仅看 `status === pending_accept` + 状态机，**不校验当前用户是否 assignee** | `WorkTaskDetailPage.tsx` ~416；列表 `WorkTasksPage` 亦同 |
| **「更改状态」** | 同上，manager-creator 可走后端合法路径 | 同一详情页 |

因此：**不是偶然 bug，而是后端刻意允许「派单经理改状态」+ UI 把该能力标成「接受」。**

## Product tension

「接受」在业务语义上 = **执行人确认接单**。  
「经理把 pending_accept → accepted」在运维上 = **代接受 / 强制开工**。

两者合用同一按钮与同一 API 路径 → admin 体验「我也可以接受别人的 task」。

## In scope (after product lock)

- Clarify contract `WANd.TASKS.ACCEPT_ACTOR.001`（provisional）
- UI：谁看到「接受」vs「更改状态」vs「代接受」
- Backend：是否收紧 `UpdateStatus` 对 `pending_accept → accepted`
- Tests：rbac + UI gating + acceptance script row

## Out of scope (until decided)

- EIL `is_admin` 公司级 scope（仍归 07-14）
- Reassign / bulk accept
- Agent MCP `work_tasks_edit` 代接受策略（可跟同一契约，但第二阶段）

## Acceptance (Option A)

- [x] **AC1** `pending_accept → accepted` 仅 assignee（API Forbidden for manager-creator）
- [x] **AC2** UI「接受」仅 assignee 可见（详情 + 列表）
- [x] **AC3** 非 assignee 的「更改状态」不含 `accepted`（pending 边）
- [x] **AC4** manager 仍可：改派 / 删除 / `pending→deferred`（若状态机允许）
- [x] **AC5** Spec `aioncore-work-tasks.md` + `WANd.TASKS.ACCEPT_ACTOR.001` 文档化

> Smoke remaining: admin opens yjc `pending_accept` → no Accept; yjc can Accept.

## Open decision

Q1 **LOCKED = A** — 见 `open-questions.md`。说「执行」后开工。