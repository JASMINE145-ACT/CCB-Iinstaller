# 产品增补 — Phase 5：组织用户生命周期完整性

> **Task:** `07-13-org-admin-user-management`  
> **Date:** 2026-07-14  
> **Trigger:** 用户反馈「用户表无删除」+ 要求从全面性 / 完整性补齐缺口  
> **Status:** Phase 5 **product backlog** open; **5.1–5.5 implement plan LOCKED** in `phase5-delete-state-contract.md` (2026-07-14, system-review Option B). Coding starts only after「执行 5.1–5.5」.

## 1. 为何需要第五阶段

MVP + Phase 4 已覆盖：**建号、改身份、业务权限位、设置入口、架构 Tab（半成品）**。  
运维闭环仍缺：**删人 / 停用语义 / 改密 / 提拔管理员 / 列表可用性 / 架构图可读**。

没有删除时：smoke 测试账号堆积、误建账号无法回收、离职只能靠改状态且 UI 不明显。

## 2. 缺口总表（按优先级）

### P0 — 生命周期闭环（本阶段必做）

| ID | 工作项 | 说明 | 建议契约 |
|----|--------|------|----------|
| **5.1** | **删除用户** | `DELETE /api/org-users/{id}` + UI「删除」+ 二次确认 | `WANd.ORG.USER_ADMIN.001` 扩展 |
| **5.2** | 删除安全门禁 | 禁止删自己；禁止删「最后一个 `is_admin`」；目标不存在 → 404 | 同上 |
| **5.3** | 下属上级处理 | 被删用户若是他人 `manager_user_id`：默认 **清空下属上级**（或可选「转给指定人」）— MVP 先清空 + 提示影响人数 | 同上 |
| **5.4** | 会话失效 | 删除后吊销该用户 org sessions（或等价：下次鉴权 401） | 安全 |
| **5.5** | 停用 vs 删除语义 | UI 明确区分：**停用/离职**（改 `employment_status`，保留行）vs **删除**（移出账号）；停用后禁止登录 | UX + ACL |

### P1 — 管理员日常运维（强烈建议同阶段或紧随）

| ID | 工作项 | 说明 |
|----|--------|------|
| **5.6** | **管理员重置密码** | `POST /api/org-users/{id}/reset-password`（或 PUT 字段）；仅 admin；强制强度校验 |
| **5.7** | **提拔 / 撤销系统管理员** | UI 可改 `is_admin`；禁止撤销最后一个 admin；与 `work_task_role` 正交 |
| **5.8** | 列表信息完整性 | 表格增加：**上级姓名**、**业务权限芯片**（非全「—」时）、可选「系统管理员」标记 |
| **5.9** | 搜索 / 筛选 | 按用户名、部门、状态、角色过滤（≥10 人时已难用） |
| **5.10** | 中文乱码排查 | 列表出现 `???` / `????`（截图已见）— 查写入编码 / SQLite / 响应 charset，作为 bug 门禁 |

### P1 — 架构图债务（已开做但未达标）

| ID | 工作项 | 说明 |
|----|--------|------|
| **5.11** | Rudder 级架构图完成度 | 有 `manager_user_id` 时必须有 **正交连线 + 树布局**；默认可读缩放；对照 `docs/reference/rudder/ui/src/pages/OrgChart.tsx` |
| **5.12** | 架构图验收夹具 | 至少 1 经理 + 2 下属的固定测试数据或 smoke 步骤，禁止「全扁平无上级」当唯一验收 |

### P2 — 可延后但仍登记（避免再次遗忘）

| ID | 工作项 | 说明 | 与旧延期关系 |
|----|--------|------|----------------|
| **5.13** | 员工自助改密 | 登录后改自己的密码 | 原 `deferred` 2.2 半截 |
| **5.14** | 审计日志 | admin 建/改/删/重置密码写入 audit（谁、何时、对谁、字段摘要） | 新 |
| **5.15** | 批量清理 smoke 账号 | 运维脚本或 UI 多选删除（依赖 5.1） | 新 |
| **5.16** | 部门实体表 | 独立 `departments` + 下拉 | 原 deferred 2.1 |
| **5.17** | Excel 批量导入 | 可选 | 原 deferred 2.5 |
| **5.18** | 域控同步 | 调研 | 原 deferred 2.4 |
| **5.19** | 强制首次改密 | 新建用户首次登录必须改初始密码 | 新（安全增强） |

### 明确仍不做

薪酬、考勤、招聘、审批流设计器、整组织 Import/Export（Rudder 级）、员工自改部门/上级（除非另立策略）。

## 3. 删除 API 契约草案（批准后写入 `admin-rbac-contract.md` §2）

| Method | Path | ACL | 成功 | 失败 |
|--------|------|-----|------|------|
| `DELETE` | `/api/org-users/{id}` | 仅 `is_admin` | 204 或 200+body | 403 非 admin；400 删自己 / 删最后 admin；404 不存在 |

**副作用（事务内）：**

1. 将 `manager_user_id = {id}` 的用户更新为 `NULL`（记录 `cleared_reports_count`）
2. 删除或标记失效该用户的 sessions
3. 删除 `users` 行（硬删）— MVP 不做软删表；软禁用走 `employment_status`

**前端：**

- 操作列：`编辑` | `删除`
- 删除：Modal 确认，展示用户名 +「将解除 N 名下属的上级关系」
- `ipcBridge.orgUsers.delete`

## 4. 建议执行顺序

```text
5.1–5.5 删除 + 停用语义     → security-review → UI
5.6–5.7 改密 + is_admin UI   → 可与上并行后端、串行 UI
5.8–5.10 列表可用性 + 乱码
5.11–5.12 架构图达标（可另开子会话，对照 Rudder）
5.13+ 进 deferred 或下一批
```

## 5. 验收（Phase 5 DoD 摘要）

- [ ] admin 可删除非己、非「唯一 admin」的用户；列表消失；该账号无法再登录
- [ ] 删除有下属的经理后，下属 `manager_user_id` 为空；架构图不再挂到已删节点
- [ ] 非 admin `DELETE` → 403
- [ ] 停用用户无法登录；删除与停用文案不混淆
- [ ]（P1）admin 可重置密码；可勾选/取消 `is_admin`（保留 ≥1 个 admin）
- [ ]（P1）列表无 `???` 乱码；上级与权限位可见
- [ ]（P1）有上下级时架构图可见连线且默认可读

## 6. 相关文件（实现时）

| 层 | 路径 |
|----|------|
| 契约 | `{task}/admin-rbac-contract.md` |
| 后端 | `AionCore/.../work-tasks/routes.rs` + `service.rs` + user repo |
| 前端 | `aionui-src/.../orgUsers/*` + `ipcBridge.orgUsers` |
| 架构图 | `OrgStructureChart.tsx` / `orgChartLayout.ts`（对照 Rudder） |
| 冒烟 | `scripts/org-phase0/` 增补 delete 用例 |

## 7. 批准门

说 **「执行 Phase 5」** 或 **「先做删除 5.1–5.5」** 后再写代码。  
仅本文档入库 = 任务增补完成，不等于已实现。
