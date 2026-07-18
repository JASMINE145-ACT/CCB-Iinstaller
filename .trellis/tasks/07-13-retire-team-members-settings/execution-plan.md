# Execution Plan — `07-13-retire-team-members-settings`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Approved** | 2026-07-13（用户：执行） |
| **Completed** | 2026-07-14（用户：手工 smoke 没问题） |
| **Scenario** | G（重构 / 死代码清理）+ UI；安全面：去掉平行建号入口 |
| **Plan depth** | Standard |
| **Verification profile** | UI |
| **Active phase** | — |
| **Repos** | aionui-src（主）+ 契约文档（claude-code-best Trellis） |
| **Related** | `07-13-org-admin-user-management` / `admin-rbac-contract.md` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` §Operating doctrine |
| skill-selection | Read: | Scenario G playbook — characterization → refactor |
| trellis-before-dev | Read: | packages → frontend/integration; `.trellis/spec/frontend/index.md` Rule 0 |
| superpowers:test-driven-development | Read: | characterization safety net before delete |
| superpowers:brainstorming | Read: | intent: retire redundant UI after org feature |
| Code baseline | Read: | `TeamMembersPage.tsx` → `auth.createUser` → `/api/auth/internal/users`；`OrgUsersPage` → `/api/org-users`；`auth.updateWorkTaskRole` = stub；RBAC：manager ≠ admin |
| Product evidence | Read: | user screenshot「团队成员」+ org-admin PRD/Phase4「设置→组织」 |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | Capability matrix + 结论：可删 UI，保留 roster |
| Phase 0 | **done** | task start + 用户「执行」批准 |
| Phase 1 | **done** | `teamMembersRetired.test.ts` + `settingsNavContract.ts` |
| Phase 2 | **done** | sider + Router redirect；见 `p2-retire-ui-done.md` |
| Phase 3 | **done** | 删 `TeamMembersPage`；清 `auth.createUser/listUsers` |
| Phase 4 | **done** | code-reviewer PASS + bun test PASS；用户 2026-07-14：「没问题」 |
| plan lint | **PASS** | `lint_execution_plan.py` exit 0 |

## Verdict (planning)

**可以删「团队成员」设置页。** 组织功能已承接建号 + 角色 + 部门/上级；团队成员页是旧平行入口，且写的是本地 internal auth，不是 org VPS。

**不可一并删除：**

| 保留 | 原因 |
|------|------|
| `GET /api/users` / `workTask.listMembers` | 工作任务指派人 roster（`WANd.ORG.USER_ADMIN.001` 明确禁止改成 admin-only） |
| `/api/auth/internal/users/system*` | 安装/WebUI 种子账号，与本页无关 |
| `设置 → 组织` / `/api/org-users` | 唯一正式建号入口 |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec / RBAC | `admin-rbac-contract.md` | **available** | — |
| Characterization TDD | `superpowers:test-driven-development` | available | 主 session 写测试 |
| Implement | `Agent: trellis-implement` | available | 主 session 改 aionui-src |
| Review | `Agent: code-reviewer` | available | Layer A/B |
| trellis-check | `Agent: trellis-check` | available | 本任务主审用 code-reviewer |
| ECC refactor-clean | ecc:refactor-clean | **unavailable** (Cursor) | 手工 knip/引用搜索 |

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Activate | `python ./.trellis/scripts/task.py start 07-13-retire-team-members-settings` | in_progress |
| Spec | trellis-before-dev + `admin-rbac-contract.md` §2 | 确认 roster 不可删 |
| Approve | 用户说「执行」且本计划 Status→approved | 才改代码 |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ORG.TEAM_MEMBERS_RETIRE.001`（provisional） | 设置无「团队成员」；旧 URL 无建号表单；建号仅组织页 | `SettingsSider.tsx`, `Router.tsx`, `TeamMembersPage.tsx` | 路由/侧栏单测或组件测 + manual smoke | ui |
| `WANd.ORG.USER_ADMIN.001` | 仅 `is_admin` 可 `/api/org-users`；roster `GET /api/users` 仍可用 | org-users + workTask.listMembers | 既有 VPS smoke 不回归；任务指派仍可选人 | security |
| `WANd.ORG.SETTINGS_PLACEMENT.001` | 组织管理只在设置→组织 | `OrgSettingsPage` | smoke：侧栏仅「组织」 | ui |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|--------|
| 0 | P0 | 激活 + 批准 | docs-only/no-runtime-contract | — | — | prd / 本计划 | Status approved | Fast |
| 1 | P0 | Characterization：侧栏/路由「团队成员」存在 → 删除后不存在 | `WANd.ORG.TEAM_MEMBERS_RETIRE.001` | ui | TDD | `tests/` 新测或既有 settings 测 | RED 先绿锁现状再改期望 | UI |
| 2 | P0 | 移除侧栏插入 + 路由改 redirect | `WANd.ORG.TEAM_MEMBERS_RETIRE.001` | ui | trellis-implement | `SettingsSider.tsx`, `Router.tsx` | 无入口；旧 path redirect | UI |
| 3 | P0 | 删除 `TeamMembersPage`；清理 `auth.createUser`/`listUsers` 仅-page 用法 | `WANd.ORG.TEAM_MEMBERS_RETIRE.001` | ui | trellis-implement | page + ipcBridge + i18n 引用 | 无死路由；system* API 保留 | UI |
| 4 | P0 | code-reviewer → UI smoke → 回写 org-admin 契约一句 | 全部 | ui | code-reviewer | Layer B if renderer | PASS + smoke 勾选 | UI |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1 侧栏/路由 | `WANd.ORG.TEAM_MEMBERS_RETIRE.001` | 测试断言「无 team-members 入口」在删前失败；或先锁「有入口」再改断言 | `cd D:\Projects\aionui-src && bun test <settings/team-members test>`（实现时钉死命令） | 同 GREEN |
| 2–3 删除 | 同上 | 删后 RED 转绿 | 同上 + TypeScript 编译 | 同 GREEN |
| roster 不回归 | `WANd.ORG.USER_ADMIN.001` | N/A — 本任务不改 roster 代码；冒烟确认 | 手工：任务页成员下拉仍有人 | — |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.ORG.TEAM_MEMBERS_RETIRE.001` | 单测 GREEN + Manual smoke AC1–AC4 | `bun test` 3 pass；用户确认没问题 | **PASS** |
| `WANd.ORG.USER_ADMIN.001` | 任务指派仍可选人；admin 组织建号仍可用 | roster 未改；用户确认 | **PASS** |
| `WANd.ORG.SETTINGS_PLACEMENT.001` | 设置仅「组织」、无「团队成员」 | 用户确认 | **PASS** |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-13-retire-team-members-settings/execution-plan.md` | PASS | **PASS** |

## Verification profile and gate

**Selected:** UI

1. Contract Verification（上表）
2. **主审：** `Agent: code-reviewer`（Layer A N/A unless picker；Layer B if `renderer/**`）
3. `bun test` 目标文件 + 手工 smoke
4. `trellis-update-spec`：在 `admin-rbac-contract.md` 或 frontend file-map 加一句「Team Members settings retired」
5. `implement.jsonl` + `check.jsonl` + prd AC
6. `git commit` — 仅用户要求时
7. `/trellis:finish-work`

## Parallelization

不并行。单 repo、单页面删除，串行即可。

## Manual steps (human)

- [x] manager：设置无「团队成员」；工作任务仍可指派 — 用户 2026-07-14 确认
- [x] admin：设置 → 组织可建号 — 用户确认
- [x] 直开 `#/settings/team-members`：无建号表单 — 用户确认

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| 发现非 org 模式仍依赖 Team Members 建号 | Phase 0 | 更新 prd：是否保留 local-only 入口 | **yes** |
| 删 `auth.listUsers` 破坏 system bootstrap | Phase 3 | 只删 page 调用，保留 system* | no |
| roster 误改 admin-only | Phase 2 | 回滚；对照 `admin-rbac-contract.md` §2 | yes if 行为变 |

## Defer / out of scope

- 删除全部 `teamMembers.json` locale（可留一迭代）
- 后端废弃 `POST /api/auth/internal/users`（除 system）— 另开任务，需确认无其它客户端
- Phase 4 VPS 026 部署（属 org-admin）
