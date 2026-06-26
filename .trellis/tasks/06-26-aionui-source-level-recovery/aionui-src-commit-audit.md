# aionui-src Commit Audit (CCB-Wanding / Mixing)

Date: 2026-06-26  
Base: `f77c697` on `main` (upstream `iOfficeAI/AionUi`)  
Delta: **16 modified** + **127 untracked** = **143 paths**

## Verdict

| Category | Action |
|----------|--------|
| All `packages/desktop/src/**` CCB + org + workTasks + ACP fixes | **COMMIT** |
| All `tests/unit/**` and `tests/e2e/**` added for CCB | **COMMIT** |
| `packages/desktop/resources/app.ico`, `app.png` | **COMMIT** (Mixing branding assets) |
| `packages/desktop/resources/bundled-aioncore/` | **IGNORE** (already in `.gitignore`) |
| `packages/desktop/resources/bundled-bun/`, `hub/` | **IGNORE** (already in `.gitignore`) |
| `out/`, `node_modules/`, `.env` | **IGNORE** (already in `.gitignore`) |
| `packages/desktop/out/` | **IGNORE** (build output) |

## Modified (16) — commit all

```
packages/desktop/src/common/adapter/httpBridge.ts
packages/desktop/src/common/adapter/ipcBridge.ts
packages/desktop/src/common/chat/chatLib.ts
packages/desktop/src/common/chat/normalizeToolCall.ts
packages/desktop/src/common/config/constants.ts
packages/desktop/src/common/config/storage.ts
packages/desktop/src/common/types/platform/acpTypes.ts
packages/desktop/src/common/update/updateTypes.ts
packages/desktop/src/process/bridge/index.ts
packages/desktop/src/renderer/components/chat/ThoughtDisplay.tsx
packages/desktop/src/renderer/hooks/context/AuthContext.tsx
packages/desktop/src/renderer/hooks/context/ConversationContext.tsx
packages/desktop/src/renderer/pages/conversation/Messages/MessageList.tsx
packages/desktop/src/renderer/pages/conversation/platforms/acp/useAcpInitialMessage.ts
packages/desktop/src/renderer/pages/conversation/utils/warmupConversation.ts
packages/desktop/src/renderer/pages/guid/hooks/useCustomAgentsLoader.ts
```

## Untracked — commit (source + tests)

### IPC / auth / org

- `packages/desktop/src/common/adapter/ccbIpcBridge.ts`
- `packages/desktop/src/common/adapter/orgHttpBridge.ts`
- `packages/desktop/src/common/adapter/acpConfigOptionsAdapter.ts`
- `packages/desktop/src/common/adapter/acpRuntimeGuard.ts`
- `packages/desktop/src/common/auth/**`
- `packages/desktop/src/process/bridge/ccb*Bridge.ts`, `orgServerBridge.ts`, `internalUpdateManifest.ts`, `silentNsisInstall.ts`
- `packages/desktop/src/process/utils/orgServerConfig.ts`, `orgKnowledgeShadowSync.ts`, `wandingBusinessKnowledgePath.ts`
- `packages/desktop/src/renderer/hooks/context/OrgAuthContext.tsx`
- `packages/desktop/src/renderer/pages/orgKnowledge/**`

### CCB config / agents / MCP / model

- `packages/desktop/src/common/config/ccb*.ts` (all)
- `packages/desktop/src/common/config/ensureCcbSession*.ts`
- `packages/desktop/src/renderer/hooks/agent/useCcbModelInfo.ts`
- `packages/desktop/src/renderer/hooks/mcp/ccbMcpAuthority.ts`
- `packages/desktop/src/renderer/pages/settings/ToolsSettings/CcbMcpHealthPanel.tsx`
- `packages/desktop/src/renderer/utils/ccbModelCatalogDisplay.ts`

### Work tasks / team / UI chrome

- `packages/desktop/src/common/types/workTasks/**`
- `packages/desktop/src/common/types/orgKnowledge/**`
- `packages/desktop/src/renderer/pages/workTasks/**`
- `packages/desktop/src/renderer/pages/settings/TeamMembersPage.tsx`
- `packages/desktop/src/renderer/components/layout/SiderBrandTitle.tsx`
- `packages/desktop/src/renderer/components/layout/Sider/SiderNav/SiderWorkTasksEntry.tsx`
- `packages/desktop/src/renderer/components/layout/Sider/SiderNav/SiderOrgKnowledgeEntry.tsx`
- i18n: `orgKnowledge.json`, `workTasks.json`, `teamMembers.json` (en-US + zh-CN)

### ACP / conversation runtime

- `packages/desktop/src/common/chat/agentToolCallUtils.ts`, `groupNormalizedToolCalls.ts`, `slash/merge.ts`
- `packages/desktop/src/renderer/pages/conversation/Messages/acp/**`
- `packages/desktop/src/renderer/pages/conversation/runtime/**`
- `packages/desktop/src/renderer/pages/conversation/utils/sendAcceptedUserMessage.ts`
- `packages/desktop/src/renderer/pages/conversation/Workspace/hooks/useWorkspaceWatchLifecycle.ts`
- `packages/desktop/src/renderer/pages/guid/utils/**`
- `packages/desktop/src/renderer/utils/debugSessionLog.ts`, `workspace/watchPaths.ts`

### Tests (all untracked under tests/)

Commit entire `tests/unit/common-config/ccb*.test.ts`, `tests/unit/common-auth/`, `tests/unit/process/`, etc.

### Branding assets

- `packages/desktop/resources/app.ico`
- `packages/desktop/resources/app.png`

## Remote strategy

- **Do not push** to `origin` (`iOfficeAI/AionUi`) — upstream only.
- Add fork remote, e.g. `wanding` → `https://github.com/JASMINE145-ACT/AionUi.git` (fork first on GitHub).
- Branch: `ccb-wanding-1.1.2-recovered`

## Post-commit

Pin submodule in [Mixing](https://github.com/JASMINE145-ACT/Mixing) at this commit SHA.
