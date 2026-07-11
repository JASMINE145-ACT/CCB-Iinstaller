# Work task detail → open agent to **understand** (not execute)

| Field | Value |
|-------|--------|
| **Status** | ready_for_acceptance |
| **Repos** | aionui-src (UI + IPC handoff) + claude-code-best (spec / optional prompt note) |
| **Parent context** | `07-09-agent-work-tasks-collaboration-system`, `aioncore-work-tasks.md` |
| **Created** | 2026-07-11 |
| **UI smoke** | PASS 2026-07-11（用户确认：了解任务 + 权限全自动） |

## Problem

任务详情页今天只有人侧 CRUD（接受 / 改状态 / 编辑 / 删除 / 本机附件）。  
Agent 已能经 MCP **创建/编辑任务**，但人无法从任务卡片 **反向** 把上下文带进对话。

用户痛点：看到任务后，想让主 agent **先认识这件事**，而不是立刻「执行 / 改状态 / 开干」。

## Locked decisions (2026-07-11 explore)

| # | Decision | Lock |
|---|----------|------|
| 1 | 打开 ≠ 执行；语义是 **让 agent 了解任务** | CTA 文案禁止「执行」 |
| 2 | Agent **先介绍**：复述理解、类型判断、建议下一步；默认不改状态 | 首条 prompt 合同 |
| 3 | **不带附件** | v1 不传 `files` |
| 4 | **始终新建**会话 | 不复用、不 resume |
| 5 | 成功后把 **简要路径** 写入任务 **说明（description）** | 见 § Write-back |

Default agent = **主入口** `wande-orchestrator`；可选其他 CCB agent。

## Product naming (diverge → converge)

| Candidate | Pros | Cons |
|-----------|------|------|
| ~~打开 agent 执行~~ | — | **Banned** — 暗示立刻干活 |
| 打开 agent 了解 | 直白 | 略长 |
| 介绍给 agent | 强调「先介绍」 | 「介绍给」像单向投喂 |
| 带入对话 | 中性 | 未点明「了解」 |
| **了解任务（Agent）** ✔ | 名词化、与执行对立 | 需副文案解释可选 agent |

**MVP CTA：** `了解任务`（主按钮）+ 旁侧 agent 下拉（默认「主入口」）。  
**Tooltip / 空态副文案：** 「新建对话，让 agent 先了解本任务（不会自动改状态）」。

## Desired UX

```
任务详情
  ├─ [主入口 ▾] [了解任务]
  │
  ▼ 新建 ACP 会话（selected agent）
  ▼ 自动发出「了解 + 先介绍」首条消息（无附件）
  ▼ 跳转 /conversation/:id
  ▼ 写回 description：简要路径块（见下）
```

未接受（`pending_accept`）也允许打开——了解与接受解耦。

## First message contract（「先介绍」）

首条用户消息由前端模板生成，至少包含：

1. **任务快照**：`id` / `title` / `description` / `status` / 执行人 / 指派人 / `due_at`（有则）
2. **行为指令（硬约束）**：
   - 先用简体中文 **介绍**：你对本任务的理解（1 小段）
   - 判断任务类型（工作台待办 vs 需委派业务）与是否建议委派谁
   - **建议** 执行人下一步（含是否该接受），但 **默认不要** 调用 `work_tasks_edit` 改状态 / 改标题
   - 不主动查价、不做 Office、不擅自加码；用户未要求则只做了解与介绍
3. **禁止**：假装已执行、伪造完成、自动改状态

## Write-back：简要路径 → task 说明

### Meaning of「简要路径」

写入 `description` 末尾的一小段 **可追溯痕迹**，不是长摘要，也不是执行日志。

建议格式（可 i18n）：

```text
---
[Agent 了解] 2026-07-11 17:30 · 主入口 · 会话 <conversation_id 短码>
```

可选第二行（v1 可省略）：会话标题或固定文案「已新建了解会话」。

### Who writes（MVP 裁定）

| Option | Writer | When | Reliability |
|--------|--------|------|-------------|
| **A ✔ UI 追加** | 详情页 / handoff util | `conversation.create` + `stageAcpInitialMessage` **成功之后**、navigate 之前或紧随 | 高；不依赖 agent MCP |
| B Agent MCP | `work_tasks_edit` | 介绍完成后 | 低；可能忘记 / ACL / 延迟 |
| C 双写 | UI 路径 + agent 补摘要 | — | 复杂；v1 不做 |

**MVP = A。** Agent 仍可被 prompt 告知「路径已由系统写入说明，无需重复写路径」；**禁止** v1 要求 agent 负责写路径。

### Append semantics

- `description_new = (description_old ?? '') + '\n' + pathBlock`（去重：若已含同一 `conversation_id` 则跳过）
- 经现有 `ipcBridge.workTask.updateTask`（与编辑任务同源 ACL）
- 写回失败：Toast 警告，**不**回滚已创建会话

## Agent selector

- 默认：`wande-orchestrator`（Guid key 与现网一致，`resolveCcbAgentGuidSelectionKey`）
- 可选：CCB 可见 specialist（含 `work-tasks-agent` 等），复用 Guid / catalog 列表
- 选择仅影响 **新会话绑定**；不改变任务 `assignee`

## Out of scope (v1)

- 附件进对话
- Resume / 绑定已有会话 / `metadata.conversation_id` 正式字段（路径仅在 description 文本）
- Agent 自动改状态、maker-checker、审计 UI
- 列表页批量「了解」
- Guid `prefilledInput` 死字段修复（本任务走 create+stage，不依赖 Guid 预填）

## Divergence（后续可演进，不进 v1）

| Idea | Why later |
|------|-----------|
| `metadata.open_agent_sessions[]` 结构化 | description 文本脆弱；要 schema |
| 介绍完成后 UI 再追写「理解摘要」 | 需订阅 turn-complete + 解析回复 |
| 「继续上次了解」 | 与「始终新建」冲突；另立产品开关 |
| 未接受强制先介绍再显示接受 | 流程耦合；用户已要求解耦 |

## Acceptance criteria

- [x] 详情页有 **了解任务** CTA + agent 下拉（默认主入口）；无「执行」文案
- [x] 点击后 **新建** 会话并自动发出含任务快照 +「先介绍 / 默认不改状态」指令的首条消息；**无附件**
- [x] 跳转到新会话页，agent 开始回复
- [x] 成功后任务 `description` 末尾追加简要路径（含会话标识）；刷新详情可见
- [x] 写回失败不阻断会话；重复同会话 id 不重复追加
- [x] 单元测试覆盖：prompt 构建、路径块格式、append/dedupe
- [x] UI smoke：未接受任务也可打开；默认主入口；切换 agent 后会话绑定正确
- [x] UI smoke 补充：打开会话权限为「全自动」（`bypassPermissions`）

## Canonical files (expected)

**aionui-src**

- `WorkTaskDetailPage.tsx` — CTA
- `pages/workTasks/` util — `buildWorkTaskUnderstandPrompt` / `appendAgentBriefPath`
- Reuse: `stageAcpInitialMessage`, conversation create（对齐 `useGuidSend`）
- `ccbAgentCatalog.ts` / Guid selection helpers
- i18n `workTasks.json`
- tests under `tests/unit/...`

**claude-code-best**

- `.trellis/spec/integration/aioncore-work-tasks.md` — UI map + handoff 一节
- 本 task `execution-plan.md` / research 如需

## Risks

| Risk | Mitigation |
|------|------------|
| 文案仍像「执行」→ 用户期望改状态 | CTA + prompt 硬约束 + smoke 检查文案 |
| description 被路径块污染过长 | 单行块；dedupe；后续迁 metadata |
| 跨 repo agent 列表不一致 | 只复用现有 catalog API |
| Layer A：agent picker 身份 | code-reviewer Layer A 对照 |
