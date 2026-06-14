# AionUI Config Inventory — CCB-Wanding Migration

> Ownership map for task `06-13-aionui-legacy-config-migration`.  
> **Rule:** runtime-authoritative capabilities live in CCB-Wanding; AionUI keeps shell UX only.

---

## Legend

| Migration action | Meaning |
|---|---|
| **migrate** | One-shot export to CCB-Wanding path (with backup) |
| **keep-shell** | Stays in AionUI; does not drive CCB runtime |
| **read-only legacy** | Kept on disk for downgrade; ignored for new CCB sessions |
| **delete** | Cleared from active runtime path after migration (not user data) |

---

## Runtime-authoritative → CCB-Wanding

| AionUI key / path | Current owner | Target owner | Action | CCB target |
|---|---|---|---|---|
| `mcp.config` (local + `/api/settings/client`) | AionUI backend DB | CCB-Wanding | migrate | `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` → `mcpServers` |
| `/api/mcp/*` user servers | AionUI backend | CCB-Wanding | migrate | same as above (non-reserved names only) |
| User skills hub (`/api/skills`, `{cache}/skills`) | AionUI backend | CCB-Wanding | migrate | `%LOCALAPPDATA%\CCB-Wanding\.claude\skills/<name>/` |
| Slash commands / capabilities | CCB-Wanding ACP | CCB-Wanding | keep (Phase 2) | `available_commands_update` manifest |
| MCP at session create (`selected_mcp_server_ids`, `guide_mcp`) | AionUI → ACP params | CCB-Wanding | delete from CCB sessions | `settings.json` + route-b merge |
| Assistant skill/MCP defaults (`conversation_overrides`) | AionUI assistant | CCB-Wanding for CCB agent | strip on CCB create | skills/MCP in CCB config dirs |
| `assistants` legacy file | AionUI local | AionUI backend DB | read-only legacy | Already migrated via `migrateAssistantsToBackend` |
| `model.config` providers | AionUI local | AionUI backend DB | read-only legacy | Already migrated via `migrateProviders`; not CCB runtime |

**CCB reserved MCP names (never overwritten):** `quotation`, `accurate`, `excel-mcp`, `guide_mcp`, `aionui-image-generation`.

---

## Shell-only → AionUI

| Key | Owner | Action |
|---|---|---|
| `theme.*`, `ui.zoomFactor`, `ui.fontSize.*` | AionUI | keep-shell |
| `language` | AionUI | keep-shell |
| `window.bounds` | AionUI | keep-shell |
| `system.notificationEnabled`, `system.closeToTray`, `pet.*` | AionUI | keep-shell |
| `workspace.pasteConfirm`, `upload.saveToWorkspace` | AionUI | keep-shell |
| `acp.config.*.preferredMode`, `preferredModelId` | AionUI UI defaults | keep-shell (session hint only) |
| `acp.cachedInitializeResult`, `acp.cachedModes` | AionUI cache | keep-shell (rebuilt from backend) |
| `guid.lastSelectedAgent` | AionUI | keep-shell |

---

## Migration implementation (2026-06-13)

| Piece | Path |
|---|---|
| CCB agent detection (browser-safe) | `packages/desktop/src/common/config/ccbWandingRuntime.ts` |
| CCB agent detection (main, fs) | `packages/desktop/src/common/config/ccbWandingRuntimeNode.ts` |
| Session param strip helpers (browser-safe) | `packages/desktop/src/common/config/ccbConfigMigrationShared.ts` |
| One-shot export + backup (main only) | `packages/desktop/src/common/config/ccbConfigMigration.ts` |
| MCP settings read/write + CLI probe (main only) | `packages/desktop/src/common/config/ccbMcpSettings.ts` → `process/bridge/ccbMcpBridge.ts` |
| MCP authority check from renderer | `renderer/hooks/mcp/ccbMcpAuthority.ts` → IPC `ccbMcpService.isAuthorityActive` |
| Bootstrap hook | `packages/desktop/src/process/utils/runBackendMigrations.ts` → `migrateAionUiRuntimeConfigToCcb` |
| CCB session create (no legacy MCP/skills) | `packages/desktop/src/renderer/pages/guid/hooks/useGuidSend.ts` |
| Completion flag | `migration.ccbRuntimeConfigMigrated_v1` in local config file |
| Backup | `settings.json.aionui-migration-backup-<timestamp>` |
| Report | `%LOCALAPPDATA%\CCB-Wanding\.claude\aionui-migration-report.json` |

### Patch notes (2026-06-13)

- MCP migration compares reserved and existing server names case-insensitively. This prevents AionUI entries such as `Quotation` or `EXCEL-MCP` from being imported beside CCB-owned `quotation` / `excel-mcp`.
- Skill copy targets use a sanitized directory name. Invalid Windows filename characters and path separators are replaced before copying into `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\`.
- Agent switching now resolves full agent metadata before deciding whether the target is CCB-Wanding. This covers cases where the card only has `backend/name` but the reliable CCB signal is `cli_path`.
- Preset assistant conversation creation also strips AionUI-local `skill_ids` / `disabled_builtin_skill_ids` for CCB-Wanding agents. This closes the non-Guid creation path.
- `exportAionUiRuntimeConfigToCcb()` is covered with a temp-directory test for settings backup, report writing, reserved MCP protection, imported MCP merge, and sanitized skill copy.

---

## Rollback

1. Restore `settings.json` from `settings.json.aionui-migration-backup-*`.
2. Delete or rename copied skill folders under `.claude/skills/` if needed.
3. Clear `migration.ccbRuntimeConfigMigrated_v1` in AionUI local config to re-run export (merge-only; does not delete CCB keys).

---

## Manual / non-automatic

| Item | Reason | Export path |
|---|---|---|
| Skills with missing `source_path` | Cannot copy without disk path | Listed in `aionui-migration-report.json` → `skills_manual` |
| OAuth MCP requiring re-auth | Tokens not portable | Re-add in CCB settings or AionUI tools UI |
| Preset assistant rules (Coword/Word/PPT) | Product choice: use CCB agent directly | `%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md` (CCB-owned) |

---

## Skills authority implementation (2026-06-13)

- CCB-Wanding owns runtime skills. AionUI Skills Hub is a shell over `%LOCALAPPDATA%\CCB-Wanding\.claude\skills`.
- Backend source added `D:\claude-code-B\src\services\acp\skillsManifest.ts`, which builds a testable manifest from `getSkillToolCommands(cwd)`.
- AionUI added `packages/desktop/src/common/config/ccbSkills.ts` for listing, importing, and deleting CCB-Wanding user skills.
- `SkillsHubSettings.tsx` now displays CCB-Wanding skills with a `CCB-Wanding` badge and writes import/delete actions back to the CCB skills directory.
- Legacy AionUI skills remain migration/read-only input. They are not runtime authority for CCB sessions.
- Current boundary: file-backed CCB user skills are wired in the AionUI UI. A dedicated ACP/HTTP endpoint for all bundled/plugin/project skills remains future work.

---

## Verification

- Unit: `tests/unit/common-config/ccbConfigMigration.test.ts` (10 tests)
- Unit: `tests/unit/common-config/ccbSkills.test.ts` (CCB skills import/list/delete adapter)
- Backend unit: `src/services/acp/__tests__/skillsManifest.test.ts` (CCB manifest generator)
- Unit: `tests/unit/common-config/ccbMcpSettings.test.ts` — settings → `IMcpServer` mapping, authority flag
- After migration: new CCB conversation should **not** send `selected_mcp_server_ids` / assistant `skill_ids`
- CCB session MCP comes from `settings.json` via `agent.ts` `resolveSessionMcpConfigs()` (respects `disabledMcpjsonServers`)
- MCP settings page (CCB install present): list/load from `ccbMcpService` IPC, not `/api/mcp/servers`
- CLI manifest smoke: `node D:\CCB-Wanding\dist\cli.js --ccb-mcp-manifest --test` → JSON with `servers[].tools` when connected
