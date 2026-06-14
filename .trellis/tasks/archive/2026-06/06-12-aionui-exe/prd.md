# AionUI exe 三个渲染问题修复

## Goal

修复 AionUI exe 版本中三个已知渲染 bug，源码位于 `D:\Projects\aionui-src`。开发阶段用 `bun run dev` 热更验证；UI 确认 OK 后再 `dist:win` 打包部署。

## Requirements

### Issue 1 — 重复输出（greeting 出现两次）

**现象**：CCB-Wanding 的 greeting（"你好！我是 CCB-Wanding 报价与业务数据助手..."）在 UI 中渲染两次，内容完全一致。

**根因**：
- `chatLib.ts:840` 的 `addOrUpdateMessage`：当新消息 `msg_id` 与上一条不同时，无条件 `pushMessage`（新增），不会合并
- CCB-Wanding ACP 模式下，session/new 响应阶段 + 流式 content 事件阶段各发一次 greeting，两次的 `msg_id` 不同
- CCB-Wanding 不发 `replace:true`（已确认），无法靠 replace 合并

**修复方案**：在 `addOrUpdateMessage` 里，当新 text 消息内容与上一条 text 消息内容完全相同时，跳过 push（去重）。

文件：`packages/desktop/src/common/chat/chatLib.ts`

```typescript
// 在 line 840 之前插入去重逻辑
if (
  last.type === 'text' &&
  message.type === 'text' &&
  last.msg_id !== message.msg_id &&
  last.content?.content === message.content?.content &&
  message.content?.content?.length > 0
) {
  return list; // 相同内容，跳过重复 push
}
```

### Issue 2 — Thinking 默认应折叠

**现象**：thinking 块默认展开（`useState(!isDone)` 在 streaming 时为 `true`），占用聊天区空间；完成后还曾因 auto-collapse effect 强制收起，与用户手动展开冲突。

**根因**：
- `MessageThinking.tsx` 曾用 `useState(!isDone)` — streaming 中默认展开
- 另有 `useEffect` 在 `isDone` 时 `setExpanded(false)` 强制收起

**修复方案**：
1. 删除 `isDone` 时的 auto-collapse `useEffect`
2. 初始状态改为 `useState(false)` — **始终默认折叠**；用户点击 header 可展开/收起，状态由用户控制

文件：`packages/desktop/src/renderer/pages/conversation/Messages/components/MessageThinking.tsx`

### Issue 3 — AskUserQuestion 无选择 UI（返回 null）

**现象**：Claude Code 的 `AskUserQuestion` 工具发出 permission request，UI 不显示**候选选项**（报价多匹配时应选 DN50 等），只显示工具名 +「响应已成功发送」。

**根因（两层）**：
1. **后端** `permissions.ts` 对 AskUserQuestion 走通用 Allow/Reject，未把 `questions[].options` 映射为 permission options，也未把用户选择写回 `updatedInput.answers`
2. **前端** `MessageAcpPermission.tsx` 只渲染 permission `options`（Allow/Reject），未读取 `tool_call.raw_input.questions` 展示候选

**修复方案（2026-06-12 完整）**：
- **Backend** `permissions.ts` `handleAskUserQuestion()`：候选 optionId = `auq:{qIdx}:{encodeURIComponent(label)}` + Cancel
- **Backend** `bridge.ts`：AskUserQuestion title = 第一个 question 文本
- **Frontend** `MessageAcpPermission.tsx`：检测 `raw_input.questions`，展示 question + label/description 单选，confirm_key 传 `auq:*`

文件：
- `D:\claude-code-B\src\services\acp\permissions.ts`
- `D:\claude-code-B\src\services\acp\bridge.ts`
- `packages/desktop/src/renderer/pages/conversation/Messages/acp/MessageAcpPermission.tsx`

## Acceptance Criteria

- [x] CCB-Wanding greeting 只出现一次（Issue 1）— `chatLib.ts` + `hooks.ts` defensive dedup
- [x] Thinking 默认折叠，可手动展开（Issue 2）— `useState(false)` + removed auto-collapse `useEffect`
- [x] AskUserQuestion 弹出选项 UI，用户可选择并确认（Issue 3）— removed `tool_call` null guard
- [ ] **dev 模式**下三个场景验证通过（见下方「验证」章节）— `bun run dev`
- [ ] UI 确认 OK 后，exe 构建成功 — `bun run dist:win` in `D:\Projects\aionui-src`
- [ ] 新 exe 同步到 AionUI 运行槽（`AppData\Roaming\AionUi\...`）— 上线前收尾，人工部署后勾选

## Definition of Done

- [x] 四个文件修改完成（2026-06-12）
- [ ] dev 模式下三个场景人工测试通过（`bun run dev`）
- [ ] TypeScript 编译无报错 — `cd D:\Projects\aionui-src && bun install && bun run package`
- [ ] exe 构建成功 — `bun run dist:win`（UI 确认 OK 后执行）
- [ ] 新 exe 覆盖 Roaming 槽并复测三个场景（上线前收尾）

## Verification

**原则：开发阶段用 `bun run dev` 验三个场景；`dist:win` + 覆盖 Roaming 留到确认 UI OK 后做一次收尾。**

三处修改均在 `packages/desktop` 的 `renderer` / `common` 里，`electron-vite dev` 会对 renderer 做热更新，比每次 `dist:win` 快得多。

### 一次性准备

```powershell
cd D:\Projects\aionui-src
bun install
```

### 日常开发（改 UI → 保存 → 看效果）

```powershell
cd D:\Projects\aionui-src
bun run dev
```

`electron-vite dev` 热更新 renderer。改 `chatLib.ts`、`hooks.ts`、`MessageThinking.tsx`、`MessageAcpPermission.tsx` 后，多数情况保存即刷新，不必打包。

### 后端（CCB / Route B）— 另开终端

UI 热更只覆盖 AionUI 前端；ACP 对话仍要 CCB 后端：

```powershell
# 若测 registry / --ccb-acp
cd D:\Projects\claude-code-best\ccb-installer
.\scripts\sync-aionui-ccb-route-b.ps1
# 重启 dev 里拉起的 aioncore，或整 app 重启一次
```

### 开发模式 vs 打包 exe

| | `bun run dev` | `bun run dist:win` |
|---|---|---|
| 用途 | 迭代 UI 修复 | 最终部署到 `AppData\Roaming\AionUi\` |
| 热更新 | ✅ 有 | ❌ 每次全量构建 |
| 数据目录 | 开发用（如 `~/.aionui-dev`） | 正式 Roaming 槽 |
| 三场景验证 | ✅ 足够 | 上线前再跑一遍 |

### dev 下验三场景

1. **Greeting 不重复** — 新建 CCB-Wanding 会话，首条 assistant 只出现一次
2. **Thinking 默认折叠** — 新建/进行中 thinking 块默认收起；点击 header 可展开；结束后不自动改变用户已选状态
3. **AskUserQuestion** — 触发 permission 时能看到选项 + 确认按钮（不再空白）

### 注意

- 用 **`bun run dev`（Electron）**，不要混用 `bun run webui`：webui 走另一套 web-host，和 desktop 聊天组件路径不完全相同。
- dev 与正式 exe 的**数据目录不同**，会话 / agent 配置可能不一致，属正常。
- 若改了 main 进程或 native 依赖，有时需重启 dev（Ctrl+C 再 `bun run dev`）；纯 renderer 改动一般不用。

## Technical Approach

仅修改 `D:\Projects\aionui-src` 的四个源文件（见 Technical Notes），不改架构。开发阶段用 `bun run dev` 热更验证三个场景；UI 确认 OK 后再用 `bun run dist:win` 生成 exe，覆盖 `AppData\Roaming\AionUi\` 运行槽。

## Out of Scope

- 不修改 CCB-Wanding backend（ACP 事件发送逻辑）
- 不修改 web 版本专有代码
- 不重构 chatLib 整体逻辑

## Technical Notes

**源码路径**：`D:\Projects\aionui-src`

**目标文件**（Issue 1 需 **chatLib + hooks** 双路径，见 `frontend/coding-rules.md` §3）：
1. `packages/desktop/src/common/chat/chatLib.ts` — Issue 1
2. `packages/desktop/src/renderer/pages/conversation/Messages/hooks.ts` — Issue 1（ACP 实际 merge 路径）
3. `packages/desktop/src/renderer/pages/conversation/Messages/components/MessageThinking.tsx` — Issue 2
4. `packages/desktop/src/renderer/pages/conversation/Messages/acp/MessageAcpPermission.tsx` — Issue 3

**ACP 相关类型**：`packages/desktop/src/common/types/platform/acpTypes.ts`
- `AcpPermissionRequest.tool_call` 理论上 required 但实际 AskUserQuestion 场景下为 null

**msg_id 合并逻辑**：`chatLib.ts:840` — 只有 msg_id 相同才合并，否则 push 新消息

**思考折叠状态**：`MessageThinking.tsx:41` — `useState(!isDone)` 初始值；`useEffect:50-54` 完成后自动折叠

**构建调研**：需要查看 `D:\Projects\aionui-src\package.json` 和 `packages/desktop/package.json` 确认 exe 构建命令
