# Settings 个人信息 → AI System Prompt

## Goal

在 **设置** 中增加 **个人信息** 页，让用户填写员工姓名、部门、职位等基础资料；这些信息在每次 ACP 会话创建时注入 AI 的 **system / user context**，使助手知道「当前是谁在使用」。

## User story

- 作为 WanD 用户，我在 **设置 → 个人信息** 填写姓名、部门、职位、工号（可选）、备注（可选）。
- 保存后，**新开对话** 时 AI 能自然称呼我、理解我的组织角色（例如「采购部报价专员」）。
- 信息不出现在聊天输入框里，也不污染可见的用户消息历史。

## Non-goals (v1)

- 不做 HR 系统对接 / LDAP 自动同步（可后续从 auth 预填 username）
- 不做多用户共享机器上的 per-login 隔离（v1 用本机 client settings；WebUI 同 API）
- 不做加密字段级权限（用户自行勿填密码/密钥）
- 不强制打包进 1.1.6（可与 backlog 并行，独立发版）
- **不**替代 `memory/personal/` 自动沉淀（见 [`07-06-ccb-memory-auto-accumulation`](../07-06-ccb-memory-auto-accumulation/prd.md)）

## Personal 两层边界（与 memory 1.1.7 互链）

| 层 | 载体 | 谁写 | 何时生效 | 内容 |
|----|------|------|----------|------|
| **档案（本 task）** | `.claude/employee-profile.json` | 用户在 **设置 → 个人信息** | **新会话** `session/new` 注入 `userContextOverride` | 姓名、部门、职位、工号等 **结构化** 字段 |
| **习得偏好（memory task）** | `.claude/memory/personal/workflow.md` | **Stop hook** 自动 append | 下次对话按需 Read | 「我习惯先查库存」等 **工作流习惯** |

规则：

- `employee-profile.json` 的 `notes` = 用户主动填的补充说明，**不是**对话自动沉淀区。
- Stop hook **不得**把与 `employee-profile.json` 已相同的字段重复写入 `memory/personal/*`（implement 时 dedup）。
- `memory/personal/profile.md`（1.1.7）仅作模板/兜底；**主身份源**以 Settings 档案为准。


| Field | Key | Required | Notes |
|-------|-----|----------|-------|
| 姓名 | `displayName` | 推荐 | 主称呼 |
| 部门 | `department` | 可选 | |
| 职位 | `jobTitle` | 可选 | |
| 工号 | `employeeId` | 可选 | |
| 邮箱 | `email` | 可选 | |
| 电话 | `phone` | 可选 | |
| 补充说明 | `notes` | 可选 | 自由文本，限长 |

## Architecture (recommended)

```text
Settings UI (renderer)
  → configService.set('user.employeeProfile', …)
  → PUT /api/settings/client

On save + on conversation warmup:
  → main process sync to %LOCALAPPDATA%\CCB-Wanding\.claude\employee-profile.json
     (mirror .aionui-next-assistant-profile.json handoff pattern)

CCB AcpAgent.createSession()
  → resolveEmployeeProfileContext() merges into userContextOverride.claudeMd
  → QueryEngine → <project-instructions> meta user message
```

**Do not** prepend profile text in `sendMessage.input` — that exposes PII in chat history and bypasses prompt stack.

## Merge precedence

1. Assistant profile / specialist `claudeMd` (existing)
2. **Employee profile section** appended (new)
3. `currentDate` (existing)

Existing sessions: **no retroactive update** until new `session/new` (document in UI).

## Acceptance criteria

- [x] **AC1** 设置侧栏出现「个人信息」入口（desktop + WebUI 路由一致）
- [x] **AC2** 表单可编辑、保存、重开应用后持久化
- [x] **AC3** 新开 ACP 对话后，模型回复能体现姓名/部门/职位 — **PASS** 2026-07-05 dev smoke（见 `p5-dev-smoke-done.md`）
- [x] **AC4** 个人信息 **不** 出现在用户消息气泡中（设计：注入 userContextOverride，非 sendMessage）
- [x] **AC5** 与 preset assistant / specialist 会话并存，不覆盖 agent system_prompt（append merge）
- [x] **AC6** 单元测试：profile → markdown 渲染；backend merge 不 clobber assistant claudeMd
- [x] **AC7** spec 更新：`frontend/file-map.md` + `backend/acp-session-flow.md` 各一段
- [x] **AC8** 日常对话**主动**以登记姓名/称呼与用户沟通（如「好的嘉诚，还有什么事吗」），非仅在被问「我是谁」时列字段 — **PASS** 2026-07-05 user smoke
- [x] **AC9** 主 agent **委派**的 subagent（Agent tool：`quotation-agent` / `accurate-agent` 等）也能读到同一份 employee profile（称呼/身份），不依赖主 agent 在 prompt 里复述 — **PASS** 2026-07-05 user smoke

## v1 vs P8 / P9 边界

| 能力 | v1 (P1–P5) | P8 增强 | P9 增强 |
|------|------------|---------|---------|
| 被问「我是谁」时准确回答 | ✅ 主 agent | 保持 | 委派 subagent 亦可 |
| 日常回复中使用姓名称呼 | ❌ 弱提示 only | ✅ 行为契约 + 可选「日常称呼」字段 | subagent 同契约 |
| 全 profile 表格输出 | 仅在 explicit 询问时 | 避免在普通 turn 重复 dump | 同左 |
| Agent tool 委派子 agent | ❌ 无 profile | ❌ | ✅ `runAgent` 合并 |

## Canonical files (expected touch)

| Layer | Path |
|-------|------|
| Settings nav | `aionui-src/.../SettingsSider.tsx`, `SettingsPageWrapper.tsx`, `Router.tsx` |
| Settings UI | `aionui-src/.../EmployeeProfileSettings/` + `EmployeeProfileModalContent.tsx` |
| Storage | `aionui-src/.../common/config/configKeys.ts`, `configService.ts` |
| Sync handoff | `aionui-src/.../common/config/ccbEmployeeProfileSession.ts` (new) |
| Warmup hook | `aionui-src/.../warmupConversation.ts`, `ccbAssistantProfileSession.ts` (pattern) |
| Backend merge | `claude-code-B/src/services/acp/agentSessionProfile.ts`, `agent.ts` |
| Handoff read | `claude-code-B/src/services/acp/employeeProfile.ts` (session/new + **P9** `runAgent`) |
| Subagent merge (P9) | `packages/builtin-tools/src/tools/AgentTool/runAgent.ts` — after `resolvedUserContext` |
| i18n | `locales/{zh-CN,en-US}/settings.json` |
| Spec | `.trellis/spec/frontend/file-map.md`, `.trellis/spec/backend/acp-session-flow.md` |

## Risks

| Risk | Mitigation |
|------|------------|
| `userContextOverride` replaces default context | **Merge** employee block into existing override, never full replace |
| aioncore omits `_meta` | Use CCB config dir handoff file (proven pattern) |
| PII sent to model provider | UI disclaimer; optional omit-empty fields |
| Profile edit mid-session | UI note: 仅对新对话生效 |
| route-b deploy lag | Document rebuild + sync after backend change |
| Overlap with memory Stop hook | See memory task §Personal 两层边界; notes ≠ workflow auto-append |

## Related tasks

- [`07-06-ccb-memory-auto-accumulation`](../07-06-ccb-memory-auto-accumulation/prd.md) — Stop hook → `memory/personal/workflow.md` (1.1.7)

## Open questions (approve before implement)

1. Tab id: `profile` vs `employee` vs `personal-info`?
2. 是否从 `auth.username` 预填姓名？
3. v1 是否进下一版安装包（1.1.6）还是仅 dev/route-b？
