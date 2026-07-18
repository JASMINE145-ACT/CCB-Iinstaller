# PRD — 退役设置页「团队成员」

> **Task:** `07-13-retire-team-members-settings`  
> **Status:** completed  
> **Completed:** 2026-07-14  
> **Priority:** P1  
> **Date:** 2026-07-13  
> **Parent:** `07-14-employee-intelligence-layer`  
> **Related:** `07-13-org-admin-user-management`（组织用户已上线）

## One-line

删除设置里冗余的「团队成员」页；账号创建与角色分配统一走 **设置 → 组织**（`is_admin` + `/api/org-users`）。

## Problem

| 今天 | 痛点 |
|------|------|
| 设置同时有「团队成员」与「组织」 | 两条建号入口，运营易走错 |
| 「团队成员」走本地 `/api/auth/internal/users` | **不是** org VPS 用户库；建出的号没有部门/上级/org context |
| 「团队成员」可改角色，但 `auth.updateWorkTaskRole` 已是 stub | UI 假装能改角色，实际无效 |
| 可见性：`work_task_role=manager` | 与契约「仅 `is_admin` 可建号」冲突 |

## Goal

1. 设置侧栏与路由 **不再暴露**「团队成员」。
2. 旧路径 `/settings/team-members` → 重定向到 `/settings/org`（admin）或安全回退（非 admin → model）。
3. **保留** 工作任务派工名单：`GET /api/users` / `workTask.listMembers`（契约已锁定，不可删）。
4. **保留** 本地 bootstrap：`/api/auth/internal/users/system*`（安装/WebUI 种子账号，与本页无关）。

## Non-goals

- 不改 `/api/org-users` 行为
- 不删 `GET /api/users` roster
- 不做部门表 / 改密（仍属 org-admin deferred）
- 不在本任务发版打包

## Acceptance criteria

### AC1 — UI 消失
- [x] 设置侧栏无「团队成员」项（manager / admin 皆不可见）
- [x] `TeamMembersPage` 路由移除或仅 redirect，无独立表单页

### AC2 — 建号唯一入口
- [x] admin：设置 → 组织仍可建号（含角色）—(代码路径保留；待人工 smoke)
- [x] 非 admin：无建号 UI；调 `/api/org-users` 仍 403（既有契约）

### AC3 — 不破坏派工
- [x] 工作任务创建/指派仍能拉成员名单（`listMembers` / `GET /api/users`）— 代码未改 roster

### AC4 — 死代码清理
- [x] 删除 `TeamMembersPage`；locale 文件按计划留一迭代
- [x] `auth.createUser` / `auth.listUsers` 已从 ipcBridge `auth` 移除

## Manual smoke

```text
1. manager 登录 → 设置侧栏无「团队成员」；任务页仍可选指派人
2. admin 登录 → 设置 → 组织 → 仍可新建用户并设角色
3. 直开 #/settings/team-members → 落到组织页或安全回退，无建号表单
```
