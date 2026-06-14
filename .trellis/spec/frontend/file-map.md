# Feature → File Map

> **First lookup** for "I want to change X — which file?". If your feature is here, follow the link. If not, fall back to [`electron-architecture.md`](./electron-architecture.md) with `rg`.

---

## 1. Chat core

| Want to change | File | Anchor / line (verify with `rg`) |
|---|---|---|
| Message list / dedup / merge | `packages/desktop/src/common/chat/chatLib.ts` (`composeMessage` exported, base impl) + `packages/desktop/src/renderer/pages/conversation/Messages/hooks.ts` (`composeMessageWithIndex` local, O(1)-indexed) | Entry: `hooks.ts#useAddOrUpdateMessage`; `rg "^export const composeMessage" chatLib.ts` |
| Thinking block (collapse/expand) | `packages/desktop/src/renderer/pages/conversation/Messages/components/MessageThinking.tsx` | `useState(false)` default collapsed; user toggles via header |
| AskUserQuestion permission UI | `packages/desktop/src/renderer/pages/conversation/Messages/acp/MessageAcpPermission.tsx` | Orchestrates single vs AskUserQuestion; see `chat-acp-flow.md` §3.5b |
| AskUserQuestion card (table, multiSelect) | `…/acp/MessageAskUserQuestionCard.tsx` | Table layout, price column, awaiting-next / cancelled / success states |
| AskUserQuestion nav (1/3 progress) | `…/acp/AskUserQuestionNavBar.tsx` | Multi-question chips + progress counter |
| AskUserQuestion option id encode | `…/acp/askUserQuestionIds.ts` | `auq:` / `auqm:` — must match `permissions.ts` |
| AskUserQuestion option parsing | `…/acp/askUserQuestionFormat.ts` | Code/price column parsing for quotation tables |
| Slash capability merge | `packages/desktop/src/common/chat/slash/merge.ts` + `types.ts` | CCB authoritative; shell `aionui-shell` fills gaps |
| Slash command load (ACP) | `platforms/acp/useAcpMessage.ts` + `hooks/chat/useSlashCommands.ts` | warmup → `getSlashCommands`; stream `available_commands` |
| Tool-call result UI | `packages/desktop/src/renderer/pages/conversation/Messages/acp/MessageAcpToolCall.tsx` | Tool result rendering, file changes display |
| ACP platform state mgmt | `packages/desktop/src/renderer/pages/conversation/platforms/acp/useAcpMessage.ts` + `useAcpInitialMessage.ts` | The main state machine for CCB / ACP sessions (greeting, streaming, history) |
| Other platform variants | `packages/desktop/src/renderer/pages/conversation/platforms/{aionrs,gemini,legacy}/` | One folder per platform integration |
| ACP event TypeScript types | `packages/desktop/src/common/types/platform/acpTypes.ts` | |
| Whole conversation page | `packages/desktop/src/renderer/pages/conversation/` | |

For a deep-dive on the chat event flow and ACP event shapes, see [`chat-acp-flow.md`](./chat-acp-flow.md).

---

## 2. UI / theme

| Want to change | File |
|---|---|
| Theme / color tokens | `uno.config.ts` (monorepo root) + `packages/desktop/src/renderer/theme/` |
| i18n strings | `packages/desktop/src/process/services/i18n/` + `packages/desktop/src/renderer/` i18n consumers |
| Splash / loading screen | `packages/desktop/src/renderer/index.html` + `packages/desktop/src/process/index.ts` |
| Hotkey / shortcut (UI side) | `packages/desktop/src/renderer/hooks/` |
| Hotkey / shortcut (system side, e.g. global) | `packages/desktop/src/preload/` + `packages/desktop/src/process/bridge/` |

---

## 3. Process / IPC

| Want to change | Files |
|---|---|
| Add new IPC channel | `packages/desktop/src/preload/main.ts` (expose `window.api.x`) + `packages/desktop/src/process/bridge/<name>Bridge.ts` (handle in main) + register in `packages/desktop/src/common/adapter/ipcBridge.ts` |
| Window controls (min/max/close) | `packages/desktop/src/process/bridge/windowControlsBridge.ts` |
| Tray / app menu | `packages/desktop/src/process/index.ts` |
| Auto-update flow | `packages/desktop/src/process/services/autoUpdaterService.ts` + `autoUpdateDiagnostics.ts` |
| Database schema / queries | `packages/desktop/src/process/services/database/` |
| System settings (theme, locale) | `packages/desktop/src/process/bridge/systemSettingsBridge.ts` + `themeBridge.ts` |
| Native dialogs (file picker, alert) | `packages/desktop/src/process/bridge/dialogBridge.ts` |
| Notifications | `packages/desktop/src/process/bridge/notificationBridge.ts` |
| Feedback dialog (UI) | `packages/desktop/src/process/bridge/feedbackBridge.ts` | Note: `process/feedback/` directory contains only `logs.ts` (not the dialog itself) |
| Update / version check | `packages/desktop/src/process/bridge/updateBridge.ts` + `packages/desktop/src/common/update/` |

---

## 4. MCP

| Want to change | File |
|---|---|
| Generic AionUI MCP server (image gen, etc.) | `packages/desktop/src/process/resources/builtinMcp/` — see `electron-architecture.md` § builtinMcp decision rule |
| MCP manifest / registration | `packages/desktop/src/process/resources/builtinMcp/constants.ts` |
| Business-specific MCP server (quotation, accurate) | `D:\claude-code-B\src/.../mcp/` — **NOT in this doc**, see `../integration/aionui-ccb-boundary.md` |

---

## 5. Backend (cross-layer, integration-time only)

| Want to change | File | See |
|---|---|---|
| ACP event emission / greeting content | `D:\claude-code-B\src/` | `../integration/aionui-ccb-boundary.md` |
| route-b patch (CCB-Wanding launcher) | `D:\Projects\claude-code-best\ccb-installer/patches/aionui-ccb-route-b/index.js` | `../integration/route-b-sync.md` |
| Backend env / spawn args | `D:\Projects\claude-code-best\ccb-installer/` | `../integration/aionui-ccb-boundary.md` |
