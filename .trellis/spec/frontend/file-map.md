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
| i18n strings | `packages/desktop/src/renderer/services/i18n/locales/{zh-CN,en-US}/` — CCB model descriptions: flat keys `ccbModelMinimaxM3Description` etc. See [`ccb-model-settings-ui.md`](./ccb-model-settings-ui.md) |
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
| WanD internal manifest / CCB dual-track update | `packages/desktop/src/process/bridge/internalUpdateManifest.ts` + `ccbUpdateBridge.ts` (**new**, `ccbUpdate.*`) — spec `integration/internal-update.md` §3.7 |

---

## 4. MCP

| Want to change | File |
|---|---|
| Generic AionUI MCP server (image gen, etc.) | `packages/desktop/src/process/resources/builtinMcp/` — see `electron-architecture.md` § builtinMcp decision rule |
| MCP manifest / registration | `packages/desktop/src/process/resources/builtinMcp/constants.ts` |
| Business-specific MCP server (quotation, accurate) | `D:\claude-code-B\src/.../mcp/` — **NOT in this doc**, see `../integration/aionui-ccb-boundary.md` |
| CCB MCP health UI (Settings → 工具) | [`../integration/mcp-health.md`](../integration/mcp-health.md) · `ToolsSettings/CcbMcpHealthPanel.tsx` · `ccbMcpHealth.ts` |

---

## 5. Backend (cross-layer, integration-time only)

| Want to change | File | See |
|---|---|---|
| ACP event emission / greeting content | `D:\claude-code-B\src/` | `../integration/aionui-ccb-boundary.md` |
| route-b patch (CCB-Wanding launcher) | `D:\Projects\claude-code-best\ccb-installer/patches/aionui-ccb-route-b/index.js` | `../integration/route-b-sync.md` |
| Backend env / spawn args | `D:\Projects\claude-code-best\ccb-installer/` | `../integration/aionui-ccb-boundary.md` |

---

## 6. Work tasks (`/tasks`)

> Backend: aioncore `/api/work-tasks/*` + `/api/users` — **not** CCB. Phase 2–3 (2026-06-15): RBAC, scope lists, manager query. See [`../integration/aioncore-work-tasks.md`](../integration/aioncore-work-tasks.md).

| Want to change | File |
|---|---|
| Domain types + status machine + scope/overdue helpers | `packages/desktop/src/common/types/workTasks/workTaskTypes.ts` |
| HTTP / WS IPC (`listTasks` scope, `listMembers`, `queryTasks`) | `packages/desktop/src/common/adapter/ipcBridge.ts` → `workTask.*` |
| List page (scope tabs, status filter, cards, manager overview) | `packages/desktop/src/renderer/pages/workTasks/WorkTasksPage/index.tsx` |
| Detail (accept CTA, assignee/creator/due, attachments) | `…/WorkTasksPage/WorkTaskDetailPage.tsx` |
| Attachment open / download | `WorkTaskDetailPage.tsx` — click name → `shell.openFile` (desktop) or `downloadFileFromPath` (web); desktop download icon |
| Create / edit (assignee picker, due date) | `…/components/CreateWorkTaskDialog.tsx` |
| Status tag | `…/components/WorkTaskStatusTag.tsx` |
| SWR hooks (scope, members, query, pending badge) | `…/useWorkTasks.ts` |
| Sidebar entry + pending badge | `packages/desktop/src/renderer/components/layout/Sider/SiderNav/SiderWorkTasksEntry.tsx` |
| **Wiring status (2026-06-26)** | Routes + sider entry + `AuthContext` desktop SSO **wired** (uncommitted). API needs self-built aioncore (`/api/work-tasks` 404 on bundled 0.1.27). |
| Auth user `work_task_role` + session token | `packages/desktop/src/common/auth/authSession.ts`, `packages/desktop/src/renderer/hooks/context/AuthContext.tsx` |
| HTTP credentials policy | `packages/desktop/src/common/adapter/httpBridge.ts` — `backendFetchCredentials()` (`omit` desktop, `include` WebUI) |
| Team members admin (manager) | `packages/desktop/src/renderer/pages/settings/TeamMembersPage.tsx`, route `#/settings/team-members` |
| Auth IPC (`listUsers`, `createUser`, `updateWorkTaskRole`) | `packages/desktop/src/common/adapter/ipcBridge.ts` → `auth.*` |
| Settings builtin tab ids (keep Sider + Wrapper in sync) | `SettingsSider.tsx` `BUILTIN_TAB_IDS` + `SettingsPageWrapper.tsx` `getBuiltinSettingsNavItems` — see [`coding-rules.md`](./coding-rules.md) §7 |
| Routes | `packages/desktop/src/renderer/components/layout/Router.tsx` — `/tasks`, `/tasks/:task_id`, `#/settings/team-members` |
| i18n strings | `packages/desktop/src/renderer/services/i18n/locales/{zh-CN,en-US}/workTasks.json` |
| File upload (attachments) | `packages/desktop/src/renderer/services/FileService.ts` → `uploadFileViaHttp` |
| Attachment download helper | `packages/desktop/src/renderer/utils/file/download.ts` → `downloadFileFromPath` |
| Shell open file | `packages/desktop/src/common/adapter/ipcBridge.ts` → `shell.openFile` |
| E2E route map | `tests/e2e/helpers/bridge/routes.ts` |
| Unit tests | `tests/unit/common-utils/workTaskTypes.test.ts` |
| Rust service + RBAC + routes | `AionCore/crates/aionui-work-tasks/` (`rbac.rs`, `service.rs`, `routes.rs`) |
| Rust auth (users API, role on login) | `AionCore/crates/aionui-auth/` |
| DB migrations | `013_work_tasks.sql`, `014_work_task_roles.sql` |
| Optional read-only MCP | `mcp_servers/work-tasks-query-server/index.mjs` |

---

## 7. CCB model settings (Settings → 模型)

> Handbook: [`ccb-model-settings-ui.md`](./ccb-model-settings-ui.md). Runtime switch authority: [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md).

| Want to change | File |
|---|---|
| Model catalog (ids, labels, description i18n keys) | `packages/desktop/src/common/config/ccbModelSettingsShared.ts` — `CCB_MINIMAX_M3_CATALOG` |
| Read `settings.json` model for IPC | `packages/desktop/src/common/config/ccbModelSettings.ts` (main only) |
| IPC bridge | `packages/desktop/src/process/bridge/ccbModelBridge.ts` |
| Settings page cards + descriptions | `packages/desktop/src/renderer/components/settings/SettingsModal/contents/CcbModelSettingsPanel.tsx` (CCB branch); `ModelModalContent.tsx` delegates when `useCcbAuthorityActive` |
| Shared assistant catalog (Guid + Settings) | `packages/desktop/src/common/assistants/fetchAssistantsCatalog.ts` — `ASSISTANTS_LIST_SWR_KEY` |
| Settings → Agents (CCB) | Oracle: single Claude Code card — `LocalAgents.tsx` → `CcbLocalAgents`; `findCcbClaudeAgent` in `agentSelectionUtils.ts`. WanD presets on **Guid** `AssistantSelectionArea`, not Settings. See `parity-matrix-1.1.2.md`. |
| Guid pill bar (CCB) | `filterPillBarAgents` in `agentSelectionUtils.ts`; `AgentPillBar.tsx` `ccbAuthorityActive` |
| Guid action row (CCB session menu) | `GuidActionRow.tsx` `capabilitiesSource` / `sessionSkillNames` / `sessionMcpServerIds`; `GuidPage.tsx` |
| CCB startup migrations (incl. prune) | `packages/desktop/src/process/utils/runBackendMigrations.ts` — `CCB_MIGRATION_STEPS` |
| Description resolve / IPC enrich | `packages/desktop/src/renderer/utils/ccbModelCatalogDisplay.ts` |
| Guid / conversation model dropdown merge | `packages/desktop/src/common/config/ccbAcpModelInfo.ts` |
| Guid input-bar model menu (CCB vs aionrs path) | `packages/desktop/src/renderer/pages/guid/components/GuidModelSelector.tsx` |
| Guid agent restore + `aionrs`→`claude` under CCB | `packages/desktop/src/renderer/pages/guid/hooks/useGuidAgentSelection.ts` |
| `isGeminiMode` gate (`aionrs` only) | `packages/desktop/src/renderer/pages/guid/GuidPage.tsx` — `PROVIDER_BASED_AGENTS` |
| zh-CN / en-US description strings | `packages/desktop/src/renderer/services/i18n/locales/{zh-CN,en-US}/settings.json` |
| Unit tests | `tests/unit/common-config/ccbModelSettings.test.ts`, `ccbAcpModelInfo.test.ts`, `tests/unit/renderer/ccbModelCatalogDisplay.test.ts`, `tests/unit/common-assistants/fetchAssistantsCatalog.test.ts` |
