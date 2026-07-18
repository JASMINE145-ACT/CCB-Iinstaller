# Execution Plan Supplement — Phase 4（设置 / 业务权限 / 架构图）

| Field | Value |
|-------|--------|
| **Status** | planning → ready（带硬条件批准） |
| **Scenario** | A + H（权限安全）+ UI |
| **Plan depth** | Standard |
| **Verification profile** | Security + UI |
| **Active phase** | Phase 4.4（云端部署迁移 026） |
| **Approved** | **2026-07-13 有条件批准**；4.1–4.3 已实现 |
| **Parent** | `execution-plan.md`（前三阶段已完成） |
| **Delta** | `product-delta-phase4.md` |

## 有条件批准 — 硬条件（4.2 未满足不得宣称完成）

| # | 硬条件 | 验收必须看到 |
|---|--------|--------------|
| H1 | **接口强制业务权限校验** | 价格库 / 供应商**写接口**判定：`系统管理员` **或** 用户权限列表含对应项；禁止只改界面勾选 |
| H2 | **权限值白名单** | 入库前只允许：`price_library.write`、`supplier_directory.write`；前端乱传其它字符串 → **拒绝**，不得入库 |
| H3 | **上级循环检测** | 改「直属上级」时：不能设为自己、也不能设为自己的下级；违规 → **拒绝**（避免架构图死循环） |

过渡期：环境变量白名单（价格库 / 供应商）与权限位 **OR**；文档写明最终权限源是用户表权限位，环境变量只过渡。

证据对齐：组织用户仍仅 `is_admin`（`admin-rbac-contract.md` + `vps-smoke-log.md` 已证）；迁设置不削弱后端门禁。

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | 契约 → 测试 → 验收 |
| skill-selection | Read: | 安全改动须安全审查 |
| trellis-before-dev | Read: | 设置侧栏、价格库/供应商环境变量白名单、管理员契约 |
| 产品评审回写 | Read: | 用户 2026-07-13：批准 + H1/H2/H3 |
| 产品增补 | Write: | `product-delta-phase4.md` 硬条件已锁 |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| MVP 0–3 | **done** | 建号 + 桌面 + 云端验收全绿 |
| Phase 4.0 | **done** | 硬条件写入计划；有条件批准 |
| Phase 4.1 | **done** | `p4-1-settings-structure-done.md` — 设置→组织 |
| Phase 4.2 | **done** | `p4-2-aioncore-capability-done.md` — H1–H3 GREEN；security-review **PASS** |
| Phase 4.3 | **done** | 只读架构图（管理员）；code-reviewer Layer A/B **PASS** |
| Phase 4.4 | pending | 云端部署迁移 026 + 二进制 |
| Contract Verification | partial | 本地 GREEN + 双审查 PASS；云端 026 待你部署 |

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| 规格 / 权限 | 产品增补 + 管理员契约 + 本计划硬条件 | available | — |
| 测试驱动 | superpowers:test-driven-development | available | 手工红绿 |
| 后端 | trellis-implement | available | 本会话手写 |
| 前端 | trellis-implement | available | aionui-src |
| 安全审查 | Agent: security-reviewer | **4.2 后必做** | — |
| 代码审查 | Agent: code-reviewer | required | 分层门禁 |

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| `WANd.ORG.USER_ADMIN.001` | 仅系统管理员可建号 / 改身份；改上级含 **H3 循环检测** | org-users 更新路径 | 自指/下级作上级 → 拒绝；云端回归 | security |
| `WANd.ORG.SETTINGS_PLACEMENT.001` | 组织管理只在设置；主侧栏无入口；**后端仍 is_admin** | 设置侧栏、路由 | 手工 + 非管理员调接口仍拒 | ui |
| `WANd.ORG.CAPABILITY.001` | **H1+H2**：写接口 `is_admin OR 白名单权限`；乱传权限字符串拒 | 迁移、鉴权、价格库与供应商写接口 | 见 TDD；环境变量仅过渡 OR | security |
| `WANd.ORG.STRUCTURE_UI.001` | 只读树，数据源直属上级；不引入部门实体表 | 设置 → 组织 → 架构 | 手工对照；死循环不得出现 | ui |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 4.0 | P0 | 锁硬条件 + 有条件批准 | docs-only/no-runtime-contract | — | — | 本文件、产品增补 | ✅ 本轮 | Fast |
| 4.1 | P0 | 迁入设置、去掉主侧栏 | `WANd.ORG.SETTINGS_PLACEMENT.001` | ui | trellis-implement | 设置侧栏、路由 | 设置→组织；后端门禁不变 | UI |
| 4.2a | P0 | 权限位存库 + **白名单校验入库**（H2） | `WANd.ORG.CAPABILITY.001` | security | TDD → trellis-implement | 迁移、用户模型、org-users 更新 | 非法字符串拒；合法可存 | Security |
| 4.2b | P0 | 价格库 / 供应商写接口 **强制**（H1） | `WANd.ORG.CAPABILITY.001` | security | TDD → trellis-implement | 价格库与供应商鉴权（替换「仅环境变量」为最终源） | 无权限必拒；有权限或管理员可写 | Security |
| 4.2c | P0 | 改上级 **循环检测**（H3） | `WANd.ORG.USER_ADMIN.001` | security | TDD → trellis-implement | org-users update | 自指/成环拒 | Security |
| 4.2d | P0 | 安全审查 | `WANd.ORG.CAPABILITY.001` | security | Agent: security-reviewer | — | PASS；核对 H1–H3 | Security |
| 4.3 | P1 | 架构图只读界面 | `WANd.ORG.STRUCTURE_UI.001` | ui | trellis-implement | 设置→组织→架构 | 卡片树 + 缩放；不拖拽改上级 | UI |
| 4.4 | P1 | 代码审查 + 云端部署 | 全部契约 | cross-repo | code-reviewer + checklist | 云端重建（迁移） | 分层通过 + 冒烟 | Release |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 4.2a 白名单 | `WANd.ORG.CAPABILITY.001` | 任意字符串可写入权限字段 | `cargo test`：非法 capability → 拒；仅两枚举可存 | 同左 |
| 4.2b 价格库 | `WANd.ORG.CAPABILITY.001` | 无权限员工仍能发布 | 价格库鉴权：无 cap → 403；有 cap 或管理员 → 通 | 同左 |
| 4.2b 供应商 | `WANd.ORG.CAPABILITY.001` | 无权限员工仍能改 | 供应商鉴权同上 | 同左 |
| 4.2c 成环 | `WANd.ORG.USER_ADMIN.001` | 可把上级设成自己/下级 | update 成环 → 拒 | 同左 |
| 4.1 设置入口 | `WANd.ORG.SETTINGS_PLACEMENT.001` | 主侧栏还有入口 | 手工 + 渲染冒烟 | 同左 |
| 4.3 架构图 | `WANd.ORG.STRUCTURE_UI.001` | 无「架构」页 | 手工对照直属上级 | 同左 |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.ORG.USER_ADMIN.001` | 云端回归 + **H3** 成环用例 | 全绿 + 成环拒 | PASS（MVP）；H3 pending |
| `WANd.ORG.SETTINGS_PLACEMENT.001` | 设置→组织；主侧栏无入口；非管理员接口仍拒 | 说明 / 截图 | pending |
| `WANd.ORG.CAPABILITY.001` | **H1+H2**：接口强制 + 白名单 | 测试 + 云端；缺一则 FAIL | pending |
| `WANd.ORG.STRUCTURE_UI.001` | 只读树与直属上级一致 | 手工 | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-13-07-13-org-admin-user-management/execution-plan-phase4.md` | PASS | PASS |

## 开放问题（已按评审锁定）

| 编号 | 结论 |
|------|------|
| 甲 | 用户表权限列表字段（JSON/文本）作 MVP；**仅白名单两值** |
| 乙 | 谁能看架构图 | **MVP 收窄**：架构图在「设置→组织」内，仅系统管理员可见（与入口一致）。全员只读树需另开只读接口，延后 |
| 丙 | 树上不拖拽；改上级在用户表单 + **H3** |
| 丁 | 界面文案：「价格库写入」「供应商写入」 |
| 戊 | 环境变量白名单过渡 OR；**最终权限源是用户权限位** |

## 并行与回退

串行：4.1 → 4.2（H1–H3 + 安全审查）→ 4.3 → 4.4。

| 触发 | 动作 |
|------|------|
| 只改 UI 勾选、写接口仍只认环境变量 | **FAIL 4.2** — 不满足 H1 |
| 前端任意字符串入库 | **FAIL 4.2** — 不满足 H2 |
| 改上级无成环检测 | **FAIL** — 不满足 H3 |
| 用「经理」代替业务权限 | **拒绝** |
| 安全审查不通过 | 修好 → 从 4.2 再审 |

## 手工验收

```text
1. 系统管理员 → 设置 → 组织 → 用户：建号并勾选「价格库写入」
2. 主侧栏：没有「组织用户」
3. 该员工 → 价格库可发布；去掉权限后 → 写接口拒绝
4. 无权限员工 → 写入被拒
5. 乱传未知权限字符串 → 保存拒绝
6. 把上级设成自己或下级 → 拒绝
7. 设置 → 组织 → 架构：只读树与直属上级一致
```

---

**下一步：** 回复「执行第四阶段」开始 4.1。  
硬条件未写入实现则不得勾选 4.2 完成。
