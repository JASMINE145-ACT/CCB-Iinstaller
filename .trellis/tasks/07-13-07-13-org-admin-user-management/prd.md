# PRD — Org Admin 用户管理（桌面端）

> **Task:** `07-13-org-admin-user-management`  
> **Status:** planning  
> **Priority:** P1  
> **Date:** 2026-07-13

## One-line

让 **admin 账号在 CCB-Wanding 桌面端** 直接创建员工、配置部门/岗位/上级等组织信息，**替代日常 VPS SSH + curl** 运维流程。

## Problem

| 今天 | 痛点 |
|------|------|
| 运维 SSH 上 VPS，`POST /api/users` 建号 | 非技术人员无法自助；易漏填部门 |
| 部门/岗位写在 migration seed 或手工 SQL | 新员工 org context 为空，AI 不知道归属 |
| `GET /api/users/me/context` 已读部门 | 但没有写入口（除 VPS 直改 DB） |
| 已有 manager-only 创建 API | 无 UI；`CreateOrgUserRequest` 不含 department 等字段 |

## Goal

1. **admin** 登录后，在 AionUI 打开 **组织用户管理** 页面：
   - 列表：用户名、部门、岗位、角色、状态
   - 新建：用户名、初始密码、部门、岗位、上级（下拉）、work_task_role
   - 编辑：部门、岗位、上级、角色、在职状态（改密 → Phase 2）
2. 数据写入 **org VPS SQLite**（与 SSO 同源），员工下次登录 / 新会话即生效。
3. 日常 onboarding **不再需要 SSH**；VPS runbook 保留为灾备。

## Scope by phase

### Phase 1（MVP — 先做）

- admin 桌面端建号 + 配置组织身份（扁平 `department` 字符串）
- `is_admin` API 门禁 + VPS 部署
- Settings 组织字段仍只读（员工侧）

### Phase 2（明确排期，不做「永远不做」）

| 项 | Phase 2 / 后续交付 |
|----|----------------|
| 部门结构 | `departments` 表 + 部门树 / 下拉（替代纯字符串；用户表可保留 denormalized display） |
| LDAP / AD | 调研 + 可选同步（只读导入账号/部门；不强制首批） |
| Settings 组织字段 | 员工可申请 / admin 可改；或受控可编辑（修订 EIL Q4） |
| 员工自助改密 | 登录后改自己的密码 |
| 轻量组织能力 | 批量导入 Excel（可选）；审计日志 |

### Phase 5（生命周期完整性 — 2026-07-14 增补）

见 `product-delta-phase5.md`：

- **删除用户** + 最后 admin / 自删保护 + 下属上级清空 + 会话失效
- 停用 vs 删除语义；管理员重置密码；提拔/撤销 `is_admin`
- 列表上级/权限展示、搜索、乱码修复；架构图 Rudder 保真度

### 仍不做（即使 Phase 2 / 5）

- 完整 HR（薪酬、考勤、招聘流水线、绩效）
- 复杂审批工作流设计器

## Alignment

- Parent umbrella: `07-14-employee-intelligence-layer` — 本任务是其 **P1 运维切片**（User admin APIs + 最小 UI）
- RBAC contract: `{task}/admin-rbac-contract.md` — `is_admin`；`GET /api/users` = roster；`/api/org-users` = admin
- Existing baseline: `POST/GET /api/users`, `PUT /api/users/:id/work-task-role`（manager create → **replace** with admin `/api/org-users`）
- Migration: **`025_is_admin.sql`**（022–024 已占用）

## Acceptance criteria

### AC1 — Admin gate
- [ ] 非 admin 访问用户管理 API → **403**
- [ ] employee / 普通 manager 看不到 `#/org-users` 入口

### AC2 — Create user
- [ ] admin 创建用户：username + password + department + job_title + optional manager + work_task_role
- [ ] 新员工 org 登录成功；`GET /api/users/me/context` 返回正确 department

### AC3 — Update identity
- [ ] admin 可修改已有用户的 department / job_title / manager_user_id / employment_status / work_task_role
- [ ] 修改后员工新会话 org context 更新

### AC4 — List
- [ ] admin 可列出全部有效 org 用户（含组织字段，不含 password_hash）

### AC5 — Ops
- [ ] `vps-create-employee-runbook.md` 标注「日常用桌面 admin UI；SSH 仅灾备」
- [ ] VPS 部署新 aioncore 后 smoke PASS

### AC6 — Phase 5 Delete（见 `product-delta-phase5.md`）
- [ ] admin 可删除用户（非自己、非唯一 admin）；非 admin → 403
- [ ] 删除后下属上级清空；目标无法再登录
- [ ] UI 区分「停用/离职」与「删除」

## Out of scope (MVP)
### AC6 — Phase 2（排期，不阻塞 Phase 1 完工）
- [ ] 部门树 CRUD + 用户绑定部门 ID
- [ ] admin 重置密码 + 员工 Settings 改密
- [ ] Settings 组织字段受控可编辑（策略定稿后实现）
- [ ] LDAP 同步：至少有 research + 是否做的 go/no-go

## Manual smoke（Phase 1）

```text
admin 登录 → #/org-users → 新建「测试员 / 采购部」→ 登出
新员工登录 → 设置页组织信息只读显示「采购部」→ 新 Guid 会话 AI context 含部门
```
