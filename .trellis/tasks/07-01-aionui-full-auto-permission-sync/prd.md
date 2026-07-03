# AionUI「全自动」权限模式 — 单一状态权威与发送前强校验

## Goal

用户在 AionUI 选择 **「权限 · 全自动」**（`bypassPermissions`）时，CCB ACP 会话必须在**首条消息起**就处于该模式，**所有工具调用（含 Read 临时图片、Bash、Edit 等）不再弹出 `MessageAcpPermission` 询问**。

> **产品定义（用户确认）：** 「全自动」= 基于所选权限模式 **全部自动放行**，不是仅 MCP 自动放行，也不是 UI 标签与后端 mode 不一致时的「假全自动」。

## Problem (2026-06-29 repro)

Guid **万鼎报价专家** 会话，输入框右下角显示 **「权限 · 全自动」**。用户发送截图询价后，Agent 调用 `Read` 读取：

`C:\Users\...\AppData\Local\Temp\aionui\...\image-1.png`

仍出现 `MessageAcpPermission` 卡片（Allow / Always Allow / Reject），用户需手动确认后才出现绿色 **「✓ 响应已成功发送」**。

**Interpretation：** UI 展示 `bypassPermissions`，CCB 会话实际 mode 仍为 `default`（或首条消息发送前未同步），区外 Read 触发 ask。

## Root causes (validated)

| # | Layer | Mechanism |
|---|-------|-----------|
| R1 | **AionUI 首条消息** | `useAcpInitialMessage.ts` 接收 `initialSessionMode` 但**未使用**；发送前**未**调用 `ensureCcbSessionPreferredMode` |
| R2 | **AionUI 后续消息** | `AcpSendBox.executeCommand` 用 `conversation.extra.session_mode`（创建时快照），**非** `AgentModeSelector` 实时 `current_mode`；会话内改模式可能被旧值覆盖 |
| R3 | **同步失败被吞掉** | `ensureCcbSessionPreferredMode` 捕获异常并返回 `status: failed`；调用方若不检查结果，仍会继续 `sendMessage` |
| R4 | **CCB default 行为** | `default` / `acceptEdits` 模式下，读取 **工作区外** 路径（含 AionUI Temp 图片）→ `behavior: ask` → ACP `requestPermission`；这是应保留的安全语义 |
| R5 | **UI 标签** | zh-CN `agentMode.bypassPermissions` = 「全自动」；与 CCB `bypassPermissions` 对应，但**不等于**后端已应用 |
| R6 | **aioncore 0.1.29 路由迁移** | `ensureCcbSessionPreferredMode/Model` 经 `ipcBridge` 调 legacy `/mode`、`/model` → **404 Route not found** → `assertCcbSessionPreferredModeApplied` 阻止发送（2026-07-02 incident） |

**Incident doc:** [`research/route-not-found-config-options-2026-07-02.md`](./research/route-not-found-config-options-2026-07-02.md)

## Scope

### In scope

| Track | Repo / path | Change |
|-------|-------------|--------|
| **P0 — 会话级 mode store** | `aionui-src`: 新增 `ccbSessionPreferredModeStore.ts` | 仿照 model store，以 `conversation_id` 为键维护当前用户选择；支持 seed / get / set / clear / persist |
| **P0 — 首条消息 mode 同步** | `aionui-src`: `useAcpInitialMessage.ts` | warmup 后、发送前读取会话 store 并执行 `ensureCcbSessionPreferredMode`；同步失败则阻止发送 |
| **P0 — 后续消息 mode 同步** | `aionui-src`: `AcpSendBox.tsx` | `executeCommand` 从会话 store 读取实时 mode，不再以 stale `session_mode` prop 为发送权威；同步失败则阻止发送 |
| **P0 — 模式切换持久化** | `aionui-src`: `AgentModeSelector.tsx`、移动端 sheet | `setMode` 成功后同步更新 store，并 merge 写入 `conversation.extra.session_mode` |
| **P1 — 测试** | `aionui-src` unit tests | 覆盖首发、切换、失败门禁、idle 重建、会话隔离和持久化 |
| **P1 — Spec** | `.trellis/spec/frontend/chat-acp-flow.md`, `integration/agents-unified-model.md` | 文档化「全自动」契约与 smoke |

### Out of scope

- 改变 CCB `default` 模式的全局语义（非全自动用户仍应被询问）
- 为报价或其他 specialist 增加 Temp `Read` 自动放行；这会绕过 `default` 模式，不能作为同步竞态的兜底
- 修改 `D:\claude-code-B\src\services\acp\permissions.ts`；CCB 已正确支持 `bypassPermissions`
- 将 Guid 默认模式从「全自动」改为 `default`（产品偏好另议；本 task 保证**选了全自动就真全自动**）
- aioncore 转发 `acp_meta.permissionMode`（Phase D 长期项；本 task 以 AionUI `ensureCcbSessionPreferredMode` + handoff 为主）

## Acceptance criteria

1. **首条带图询价（全自动）：** Guid 选全自动 → 新建万鼎报价专家 → 发截图 → **无** `MessageAcpPermission` for `Read` temp png → Agent 直接提取明细并继续查价。
2. **会话内切换：** 会话中从「默认」切到「全自动」→ 下一条消息 Read 区外文件 → **无** 权限弹窗。
3. **同步失败门禁：** 当用户选择「全自动」而 `getMode` / `setMode` 失败，当前消息不得发送；UI 显示可理解、可重试的模式同步错误。
4. **后端可验证：** 发送前断言 `ensureCcbSessionPreferredMode` 返回 `already_applied` 或 `applied`，且确认 mode 等于所选值；日志记录期望值、后端原值和确认值。
5. **非全自动回归：** 「默认」模式下 Read 区外文件 **仍** 询问（安全未破坏）。
6. **idle 恢复：** idle-killed runtime 经 force warmup 建立新 ACP session 后，发送前重新应用会话 store 中的当前 mode。
7. **会话隔离：** A 会话切换 mode 不得改变 B 会话的发送 mode。
8. **MCP 回归：** `mcp__quotation__*` 等仍 auto-allow（#18 行为保持）。
9. **测试：** AionUI 相关单测和 `bunx tsc --noEmit -p tsconfig.json` 必须通过；本任务不修改 CCB permission，因此不新增 CCB permission 单测。

## Implementation phases

### Phase A — 建立单一状态权威 (P0)

- 新增 `ccbSessionPreferredModeStore.ts`，接口与 model store 对齐：
  - `seedCcbSessionPreferredMode(conversationId, mode)`：仅在尚未 seed 时写入创建快照。
  - `setCcbSessionPreferredMode(conversationId, mode)`：用户切换成功后同步更新内存值。
  - `getCcbSessionPreferredMode(conversationId, fallback?)`：所有发送路径读取的唯一用户偏好来源。
  - `persistCcbSessionPreferredMode(conversationId, mode)`：使用 `conversation.update({ merge_extra: true })` 写入 `extra.session_mode`。
  - `clearCcbSessionPreferredMode(conversationId)`：会话销毁或明确清理时调用，避免长期泄漏。
- `session_mode` prop 只负责 seed/fallback，不再作为每次发送时的权威值。
- 桌面 `AgentModeSelector` 与移动端 sheet 在 `setMode` 成功后都调用同一个 set + persist 路径。
- 持久化失败不回滚已经由后端确认的当前会话 mode，但必须记录错误；下次发送仍以 store 为准。

### Phase B — 首条与后续发送前强校验 (P0)

- `useAcpInitialMessage`：
  1. CCB authority 下完成 startup readiness 与 warmup。
  2. 从 store 读取 mode；为空才使用 `initialSessionMode` fallback。
  3. 调用 `ensureCcbSessionPreferredMode`。
  4. 仅当结果为 `already_applied`，或 `applied` 且 `confirmed_mode === preferredMode` 时发送。
  5. `failed`、确认值不一致或不可用时抛出同步错误，进入现有 send failure UI，不调用 `sendMessage`。
- `AcpSendBox.executeCommand`：
  1. force warmup，确保 idle 重建后的 ACP session 可用。
  2. 从 store 读取实时 mode。
  3. 使用与首条消息相同的结果校验函数；失败时阻止发送。
  4. 校验成功后才执行 `sendMessage`。
- 将“结果是否足以继续发送”的判断提取为纯函数或让 helper 提供 strict 模式，避免两个调用点产生不同语义。
- 日志至少包含 `conversation_id`、`preferred_mode`、`status`、`backend_mode/confirmed_mode`；不得记录消息正文或敏感文件内容。

### Phase C — 回归测试 (P1)

- Store 单测：seed 不覆盖用户新值；set 后立即可读；会话间隔离；persist 使用 `merge_extra`；clear 生效。
- 首条消息单测：warmup → mode ensure → send 的顺序正确；ensure 失败时 `sendMessage` 未调用。
- 后续发送单测：Selector 切换后的值覆盖旧 `session_mode` prop；切回 `default` 后不会被旧 `bypassPermissions` 覆盖。
- idle 单测：force warmup 后对新 session 重新 ensure 当前 mode。
- 移动端与桌面端使用同一个 store/persist 行为。
- 运行现有 model/session/profile 相关测试，防止共享发送链回归。

### Phase D — Deploy + smoke

- 在 `D:\Projects\aionui-src` 完成 targeted unit tests、type-check、desktop build 和 dev smoke。
- 本任务不修改 CCB source/dist，不运行 CCB deploy 作为交付步骤。
- `sync-aionui-ccb-route-b` 只在 route-b patch 确有差异时运行；本任务的 AionUI renderer 变更必须进入正式 desktop/NSIS 构建，不能把 route-b sync 当作前端发布。
- **新 Guid 会话** smoke：截图询价全自动无 Read 弹窗。

## Smoke checklist

```text
[ ] Guid 万鼎报价专家 + 全自动 + 截图 → 无 Read 权限卡
[ ] 模拟 setMode 失败 → 消息未发送，UI 显示同步失败
[ ] 同会话切默认 → Read 区外 → 有权限卡
[ ] 切回全自动 → 无权限卡
[ ] idle 后再次发送 → 新 ACP session 在首个工具前恢复全自动
[ ] 两个会话选择不同 mode → 相互不串值
[ ] match_quotation / fill 流程不受影响
[ ] CCB log: session mode bypassPermissions at first tool use
```

## Priority

**P0** — 阻塞报价截图询价「全自动」体验；用户已明确产品预期。

## Related

- Explore 结论：agent transcript `610337d3-6613-484c-875d-bf5ed77177ab`
- 类似 task：`06-29-specialist-session-resume-profile-drift`（会话状态同步）
- Spec：`chat-acp-flow.md` §3.5 permission、`agents-unified-model.md` § MCP auto-allow

## Recorded incidents

**2026-07-02 — `Route not found.` blocks send (aioncore 0.1.29):** `ensureCcbSessionPreferredMode` used legacy `/mode`; fixed via `acpConfigOptionsAdapter`. See [`research/route-not-found-config-options-2026-07-02.md`](./research/route-not-found-config-options-2026-07-02.md).
