# Current Flow Inventory

This is the starting inventory for `06-13-ccb-assistant-templates`. It is intentionally not an implementation record yet.

## AionUI Assistant Surface

Primary UI:

- `D:\Projects\aionui-src\packages\desktop\src\renderer\pages\settings\AssistantSettings`
- `D:\Projects\aionui-src\packages\desktop\src\renderer\hooks\assistant\useAssistantList.ts`
- `D:\Projects\aionui-src\packages\desktop\src\renderer\hooks\assistant\useAssistantEditor.ts`
- `D:\Projects\aionui-src\packages\desktop\src\common\types\agent\assistantTypes.ts`

Observed current responsibilities:

- list assistants through `ipcBridge.assistants.list`
- load details through `ipcBridge.assistants.get`
- create/update/delete/toggle/reorder through `ipcBridge.assistants.*`
- edit identity, recommended prompts, rules, default model, permission mode, default skills, and default MCP
- persist rules via assistant rule IPC (`fs.writeAssistantRule`, `fs.deleteAssistantRule`)

## AionUI Legacy Migration

Primary file:

- `D:\Projects\aionui-src\packages\desktop\src\process\utils\migrateAssistants.ts`

Observed current responsibilities:

- import legacy `ConfigStorage.get('assistants')` rows into the AionUI backend assistant store
- replay built-in assistant state/agent overrides
- upload legacy assistant rule markdown files into backend-owned assistant-rules storage
- keep a local migration flag so removed assistants are not re-imported repeatedly

For the CCB authority task, this is not enough. A second migration path is needed from AionUI assistant data into CCB-Wanding assistant profiles.

## CCB Session Surface

Primary files:

- `D:\claude-code-B\src\services\acp\agent.ts`
- `D:\claude-code-B\src\services\acp\skillsManifest.ts`
- `D:\claude-code-B\src\services\acp\mcpManifest.ts`
- `D:\claude-code-B\src\services\acp\__tests__`

Observed current responsibilities:

- `newSession` receives ACP params including `cwd`, `mcpServers`, and `_meta`
- CCB merges user MCP settings with ACP-provided MCP servers
- CCB resolves permission mode from `_meta.permissionMode` and CCB settings
- CCB exposes skills/MCP manifests for AionUI to display CCB-owned capabilities

The assistant profile task should add a CCB-owned profile id to this session boundary, then resolve the actual profile inside CCB-Wanding.

## Authority Rule

For CCB-Wanding agents:

- AionUI may display, edit, and select an assistant profile.
- AionUI should not be the authority for the profile's runtime skills/MCP/system instructions.
- AionUI should pass a stable `ccbAssistantProfileId` to CCB session creation.
- CCB-Wanding should load, validate, and apply the profile during session creation.
- Assistant rules should become the effective instruction context for that selected session only. They must not overwrite the global CCB `CLAUDE.md` file.
- Assistant MCP/skill settings should act as a profile-specific allowlist unless the profile explicitly opts into all/default CCB capabilities.

## First Implementation Target

Use a "finance-analysis" profile as the smoke target:

- profile contains finance-specific instructions
- profile references at least one CCB skill if available
- profile references CCB MCP servers such as `quotation` or `excel-mcp` if available
- starting a CCB conversation with the profile demonstrates the profile is applied only to that session
