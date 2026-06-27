# Dev Parity Wiring — 2026-06-26 (uncommitted)

> **Task:** `06-26-aionui-source-level-recovery`  
> **Repos:** `D:\Projects\aionui-src` (branch `ccb-wanding-1.1.2-recovered`, base `109aa15`) + `ccb-installer` (`start-dev-full.ps1`)  
> **Status:** Wired in working tree; **not committed** to `aionui-src` remote as of this record.

## Goal

Restore **Mixing 1.1.2 shell parity** in `bun run dev`: org SSO login, sidebar 任务/知识库, user chip, `/tasks` routes — without relying on packaged `D:\CCB-Wanding\app.asar` alone.

## Layer 1 — Delivered (shell / auth)

| Area | Files | Behavior |
|------|-------|----------|
| Desktop auth flags | `common/auth/desktopAuthFlags.ts` | `__bypassAuth`, `__forceRelogin`, `isDesktopRuntime` |
| Preload | `preload/main.ts` | `__orgServerUrl`, `__ssoMode`, `__bypassAuth`, `__forceRelogin`, **`electronAPI.invokeIpc`** |
| Main IPC | `process/bridge/orgServerBridge.ts` | `get-bypass-auth`, `get-force-relogin`, org token write |
| Auth context | `renderer/hooks/context/AuthContext.tsx` | Desktop: SSO `performOrgLogin` / local JWT; bypass / force-relogin; Bearer `fetchCurrentUser` |
| Session invalidation | `common/auth/authInvalidation.ts` | Clear org MCP token file on invalidate/logout |
| Org provider | `renderer/main.tsx` | `OrgAuthProvider` mounted |
| i18n | `locales/*/login.json`, `orgKnowledge.json` | Brand **Mixing**; 知识库 title |
| Brand | `common/config/constants.ts`, `Layout.tsx`, `Titlebar` | `APP_BRAND_NAME = 'Mixing'` |

## Layer 1 — Delivered (navigation)

| Area | Files | Behavior |
|------|-------|----------|
| Work tasks sider | `Sider/index.tsx`, `SiderNav/index.ts`, `SiderWorkTasksEntry.tsx` | Sidebar **任务** entry |
| Work tasks routes | `Router.tsx` | `/tasks`, `/tasks/:task_id` |
| Team members | `Router.tsx`, `SettingsSider.tsx` | `/settings/team-members` (manager only) |
| User chip + logout | `Sider/index.tsx`, `SiderFooter.tsx` | `yjc (员工)` + 退出登录 on desktop when not bypass |

## Layer 1 — Delivered (launcher)

| File | Change |
|------|--------|
| `ccb-installer/scripts/start-dev-full.ps1` | Load `scripts/org-phase0/env.local` or `%LOCALAPPDATA%\CCB-Wanding\config\sso.env` → **`AIONUI_SSO_MODE=org-idp` + `JWT_SECRET`** before `bun run dev` |

**Bug fixed:** Without SSO env, dev login posted to **local** `POST /login` (401) instead of org VPS — user saw「用户名或密码错误」with correct `yjc` / `Yjc@2026`. Org VPS login verified: `POST http://67.216.206.3:13401/login` → success.

## Verification (2026-06-26)

| Check | Result |
|-------|--------|
| Code-review agent | PASS (2 rounds; `invokeIpc` + logout org token clear) |
| `orgAuthLogin.test.ts` | 4/4 pass |
| `start-dev-full.ps1` preflight | pass |
| Dev window + Mixing login page | user confirmed login UI |
| Org SSO after launcher fix | `JWT_SECRET len=64`, `org-idp` in launcher log |

## Layer 2 — Delivered (Settings product UI + migrations, 2026-06-26 evening)

| Area | Files | Behavior |
|------|-------|----------|
| **Settings → 模型** | `CcbModelSettingsPanel.tsx`, `ModelModalContent.tsx` | `useCcbAuthorityActive` + `useCcbModelInfo` → read-only MiniMax cards via `enrichCcbModelCatalogEntries` |
| **Settings → 助手** | `common/assistants/fetchAssistantsCatalog.ts`, `useAssistantList.ts`, `useCustomAgentsLoader.ts` | Shared `ASSISTANTS_LIST_SWR_KEY`; CCB path → `ccbAgentsService.listAgents` + `filterGuidCatalogAgents` |
| **Settings → Agents** | `CcbWandingAgentsPanel.tsx`, `LocalAgents.tsx` | CCB active → WanD agent grid; hides upstream Aion CLI / Claude Code |
| **Startup migrations** | `process/utils/runBackendMigrations.ts` | `CCB_MIGRATION_STEPS` chain (11 steps): runtime export → unified → Guid repair → **prune** → MCP/office/L1/BOM repairs |
| **i18n** | `locales/{zh-CN,en-US}/settings.json` | `ccbModelAuthorityNote`, `ccbModelMinimaxM3*`, `ccbWandingAgentsDescription` |
| **Tests** | `tests/unit/common-assistants/fetchAssistantsCatalog.test.ts` | 3 cases + existing catalog/prune tests |

### Layer 2 verification (2026-06-26)

| Check | Result |
|-------|--------|
| `vitest` fetchAssistantsCatalog + ccbModelCatalogDisplay + prune | **7/7 pass** |
| `bunx tsc --noEmit` | **0 errors** (after `CcbWandingAgentsPanel` `available: true`) |
| Dev restart | `start-dev-full.ps1` — kill electron/aioncore + relaunch (user-requested) |
| Runtime smoke | **Pending user confirm** after full restart (Settings 三页 vs packaged 1.1.2) |

### Layer 2 — remaining / caveats

| Item | Notes |
|------|-------|
| **Uncommitted** | All Layer 1 + Layer 2 still in `aionui-src` working tree @ `109aa15`+ |
| **Prune effect** | Runs once per dev profile when `migration.ccbWandingPrunePresets_v1` unset — requires **full app restart** (not Ctrl+R) |
| **Agents → 开始对话** | CCB panel maps agents to `backend: claude` metadata; specialist preset selection still via Guid/助手 pills |
| **code-review agent** | Not run (quota); manual review only |

## Layer 3 — Delivered (能力扩展 Skills + Tools, 2026-06-27)

| Area | Files | Behavior |
|------|-------|----------|
| **Settings → 技能** | `common/skills/fetchSkillsCatalog.ts`, `SkillsHubSettings.tsx` | CCB authority → `ccbSkillsService.listSkills/getPaths` + sync; **CCB-Wanding** tag; hides upstream auto-inject section |
| **Settings → 工具** | `ToolsModalContent.tsx`, `CcbMcpHealthPanel.tsx` | CCB authority → **only** MCP health panel (22/22 probe UI); hides chrome-devtools + image gen |
| **i18n** | `locales/{zh-CN,en-US}/settings.json` | `ccbMcpHealth*` (35 keys), `skillsHub.ccbWanding` |
| **Tests** | `tests/unit/common-skills/fetchSkillsCatalog.test.ts` | 2 cases: upstream vs CCB branch |

### Layer 3 verification (2026-06-27)

| Check | Result |
|-------|--------|
| code-review agent | **PASS** (delete button visibility noted as non-blocking) |
| `vitest` fetchSkillsCatalog + ccbMcpHealth | **3/3 pass** |
| `bunx tsc --noEmit` | **0 errors** |
| Runtime smoke | **Pending user confirm** — 技能 2×CCB-Wanding + 工具 MCP 健康检查 vs `D:\CCB-Wanding` |

## Layer 4 — Delivered (Guid handoff + capabilities catalog, 2026-06-27)

| Area | Files | Behavior |
|------|-------|----------|
| **Profile handoff** | `ccbPresetConversationExtra.ts`, `warmupConversation.ts`, `useGuidSend.ts`, `useAcpInitialMessage.ts` | Create merges `ccb_assistant_profile_id` + `acp_meta`; stages `.aionui-next-assistant-profile.json` after create + before every warmup; initial Guid send awaits warmup |
| **Guid skills/MCP menu** | `guidCapabilitiesCatalog.ts`, `GuidPage.tsx` | `loadGuidCapabilitiesCatalog()` → CCB `ccbSkillsService` + `ccbMcpService.listServers` when authority active |
| **Tests** | `ccbPresetConversationExtra.test.ts`, `warmupConversation.test.ts` | staging + handoff + warmup order |

### Layer 4 verification (2026-06-27)

| Check | Result |
|-------|--------|
| code-review agent | **PASS** |
| `vitest` handoff + warmup + guid catalog + fetchSkillsCatalog | **19/19 pass** |
| `bunx tsc --noEmit` | **0 errors** |
| Runtime smoke | **Pending** — new preset conversation「你可以做什么」应匹配专家 preset（非 WanD 报价 persona） |

## Layer 2 — Oracle correction (Wave 1–2, 2026-06-27)

Earlier Layer 2 doc incorrectly listed `CcbWandingAgentsPanel` as target. Packaged oracle (`asar` `index-DA53d_yj.js`) uses **single Claude Code card** on Settings → Agents; WanD presets render on **Guid** `AssistantSelectionArea`.

Full matrix: [`parity-matrix-1.1.2.md`](./parity-matrix-1.1.2.md)

| Area | `aionui-src` files |
|------|-------------------|
| Settings Agents | `LocalAgents.tsx` → `CcbLocalAgents`; `agentSelectionUtils.ts` `findCcbClaudeAgent` |
| Guid pill bar | `AgentPillBar.tsx` + `filterPillBarAgents` |
| Guid model | `GuidModelSelector.tsx` + `useCcbModelInfo` |
| Guid action row | `GuidActionRow.tsx` session CCB menu; `GuidPage.tsx` session props |
| Preset agent type | `usePresetAssistantResolver.ts` → `resolveCcbPresetAgentType` |

---

## Reference oracle

Packaged 1.1.2: `D:\CCB-Wanding\ccb-launch-aionui.cmd` or `recover-aionui-new-ui.ps1`.

## Related spec updates

- `.trellis/spec/frontend/dev-test-ship.md` — launcher matrix
- `.trellis/spec/integration/unified-org-sso-rollout.md` — `start-dev-full.ps1`
- `.trellis/spec/integration/aioncore-work-tasks.md` — shell wiring + routes
- `.trellis/spec/frontend/file-map.md` — wiring status column
- `.trellis/tasks/06-26-aionui-source-level-recovery/parity-matrix-1.1.2.md` — oracle checklist + Wave 1–2 status
- `.trellis/spec/integration/agents-unified-model.md` — `runBackendMigrations` CCB chain
