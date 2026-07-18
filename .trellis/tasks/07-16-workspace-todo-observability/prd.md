# PRD — Workspace auto-open + Todo list placement + plan UI

| Field | Value |
|-------|--------|
| **Task** | `07-16-workspace-todo-observability` |
| **Created** | 2026-07-16 |
| **Status** | approved (plan) |
| **Trigger** | Live session: research-agent 保存 `research/*.md` 后用户看不到「项目」侧栏；Todo list 层级与样式不清晰 |
| **Repos** | `aionui-src` (renderer workspace + MessagePlan)；spec 更新在 `claude-code-best/.trellis` |
| **Related** | `WANd.OBSERVE.DELEGATION.002`；`07-15-07-15-orchestrator-outcome-relay`（父泡转述，不改 renderer） |

## Problem

1. **项目侧栏未自动弹出**：research-agent 写入 workspace 文件（如 `research/2026-07-16-anthropic-latest-news.md`）后，右侧「项目」面板仍折叠，用户不知道 artifact 已落盘。
2. **Todo list 层级未定**：主会话 vs 子 agent 的 `TodoWrite`/`plan` 消息该展示在哪一层，产品语义未锁定。
3. **Todo UI 过时**：`MessagePlan.tsx` 仅 Arco Badge + 空心圆/绿勾，缺少「1 of N Done」、进行中箭头、完成删除线，与目标参考稿差距大。

## Goal

1. Agent **mid-session 写文件**时，桌面端 workspace 面板**可靠自动展开**（在用户未显式「永久折叠」的前提下）。
2. 锁定 **Todo 展示契约**：父会话可见计划；子 agent Todo **不进主聊**，但在 **SubagentDrawer** 有只读展示。
3. `MessagePlan` 视觉升级为参考稿（父聊 + drawer 复用同一组件）：进度摘要 + 三态图标 + 卡片容器。

## Non-goals

- 改 orchestrator Outcome Relay 后端门禁（`07-15-orchestrator-outcome-relay` 已 done）
- SubagentDrawer 内 Todo **编辑**（只读）
- WebUI mobile workspace 行为大改（仅保证 desktop 不回归）

## Acceptance criteria

- [ ] research/quotation 类 mid-session 写文件后，desktop workspace **自动展开**（临时 workspace 亦适用）
- [ ] 文档锁定 Todo 层级：父 `plan` 主聊；子 `plan` drawer 只读；DecompositionPlan 与 TodoWrite 分工清晰
- [ ] `MessagePlan` 含 `X of Y Done`、in_progress 箭头态、completed 删除线、pending 虚线圆（主聊 + drawer 共用）
- [ ] SubagentDrawer 打开委派 run 时，若有子 agent `plan` 消息，显示 Todo 卡片
- [ ] vitest DOM/contract tests + Layer B smoke
- [ ] Manual smoke：查资料 → 保存 md → 侧栏展开且可见文件树
- [ ] code-reviewer PASS（Layer A N/A · Layer B PASS · 0 P0 findings）
- [ ] `smoke-evidence.md` 含 workspace + drawer-todo 截图/日志
- [ ] Phase 0a 根因：producer / refresh / preference / conversation_id 四选一或组合已锁定

## Manual smoke

1. 新开 Guid 默认主入口（或 research-agent 路径）。
2. 触发「查 Anthropic 最新消息」类任务，等待 agent 写 `research/*.md`。
3. **Expect**：右侧「项目」自动展开；Files 树可见 `research/`；可选 preview 打开 md。
4. 主会话 TodoWrite（若有）显示新样式；委派后子 agent Todo **不在**主气泡，但在 SubagentDrawer **可见**。
