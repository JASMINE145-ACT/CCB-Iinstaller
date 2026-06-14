# CCB-Wanding Assistant Profiles Backing AionUI Assistant UI

## Status

Planning.

This task is the next authority-boundary step after CCB commands, skills, MCP, and legacy config migration. The target shape is:

`AionUI Assistant UI -> CCB-Wanding assistant profile -> CCB ACP session runtime`

AionUI keeps the useful editor/browser experience. CCB-Wanding owns persistence, validation, and the actual runtime application of assistant settings.

## Problem

AionUI already has its own assistant template system:

- profile fields: name, description, avatar, enabled/order
- rule prompt files
- recommended prompts
- default model, permission mode, skills, and MCP choices
- IPC/API calls such as `assistants.list/get/create/update/delete/import`
- legacy migration from local AionUI config into the AionUI backend assistant store

That is useful UI, but it is not the correct runtime authority for CCB-Wanding. For CCB agents, an assistant such as "finance analysis" should mean:

- CCB-Wanding resolves the assistant profile.
- CCB-Wanding validates referenced skills and MCP against its own manifests/settings.
- CCB-Wanding applies the assistant's system instructions/rules to the new session.
- AionUI only selects or edits a CCB-owned profile.

If AionUI sends raw `skill_ids`, `mcp_ids`, or prompt fragments as the source of truth, AionUI is again occupying CCB's runtime surface.

## Goal

Create a CCB-Wanding assistant profile layer that can back the existing AionUI assistant template UI.

The first implementation should make one clear smoke case work end to end:

1. Create or edit a "finance analysis" assistant in AionUI.
2. The saved profile is stored in CCB-Wanding config, not only AionUI local/backend config.
3. Starting a CCB-Wanding conversation with that assistant passes only a CCB profile reference through AionUI.
4. CCB-Wanding applies the profile's rules/system context, skill references, MCP references, model, and permission mode during session creation.

## Non-Goals

- Do not remove the AionUI assistant settings UI.
- Do not make AionUI the authority for CCB skills/MCP.
- Do not write every assistant into the global `%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md`.
- Do not break non-CCB AionUI assistants.
- Do not solve macOS packaging in this task.

## Proposed CCB Profile Model

Preferred storage:

`%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\<assistant-id>.json`

Profile shape:

```json
{
  "schema_version": 1,
  "id": "finance-analysis",
  "name": "Finance Analysis",
  "description": "Financial analysis assistant",
  "avatar": "chart",
  "enabled": true,
  "source": "user",
  "created_at": "2026-06-13T00:00:00.000Z",
  "updated_at": "2026-06-13T00:00:00.000Z",
  "instructions": {
    "system_prompt": "You are a finance analysis assistant...",
    "claude_md": "Project/business rules in Markdown."
  },
  "recommended_prompts": [
    "Analyze this month's sales variance"
  ],
  "defaults": {
    "model": null,
    "permission_mode": "default",
    "skills": {
      "enabled": ["quote-helper"],
      "disabled": []
    },
    "mcp": {
      "enabled": ["quotation", "excel-mcp"],
      "disabled": []
    }
  }
}
```

The exact field names can change during implementation, but the ownership rule cannot: CCB-Wanding stores and validates this profile.

## Runtime Contract

AionUI should send a CCB profile reference when creating a CCB session, for example:

```json
{
  "_meta": {
    "ccbAssistantProfileId": "finance-analysis"
  }
}
```

CCB-Wanding session creation then:

1. Loads the profile by id.
2. Validates `defaults.skills` against the CCB skills manifest.
3. Validates `defaults.mcp` against CCB MCP settings/manifest.
4. Applies model and permission mode through CCB's existing session config path.
5. Applies instructions through a session-scoped mechanism.

The session-scoped instruction mechanism must avoid global profile bleed. Acceptable approaches:

- Generate a temporary/session-specific instructions file and include it for only this session.
- Add the profile instructions into the CCB session initialization/system context if that is already supported.

The task should explicitly reject mutating global CCB `CLAUDE.md` per assistant selection.

## Key Design Decision: Assistant Instructions Replace the Session View, Not the Global File

For a CCB assistant such as a report assistant or quotation assistant, the assistant's prompt/rules should act as the effective `CLAUDE.md` for that selected session.

The important distinction:

- It should not overwrite the global `%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md` file.
- It should replace or overlay the CCB instruction context for the current session only.
- It should be selected by CCB-Wanding after AionUI passes `ccbAssistantProfileId`.
- It should be removed automatically when another session starts without that assistant.

This means the practical runtime model is:

```text
base CCB runtime
+ selected assistant instructions as session-scoped CLAUDE.md/system context
+ selected assistant skill allowlist
+ selected assistant MCP allowlist
= effective CCB session
```

For example:

- "Report assistant" gets report-writing instructions, report skills, and only the MCP servers needed for report work.
- "Quotation assistant" gets quotation instructions, quotation-related skills, and only quotation/excel/accurate MCP if configured.

The selected assistant should not inherit every CCB MCP/skill by default unless the profile explicitly says so. The default should be least-surprise and least-authority: enable only the profile's configured MCP/skills plus any CCB baseline required for the session to function.

## AionUI Integration Requirements

For CCB-Wanding agents only:

- `AssistantSettings` list/detail should read CCB assistant profiles.
- create/update/delete/toggle/reorder should call a CCB-backed adapter, not the legacy AionUI assistant authority.
- default skills selector should use CCB skills manifest.
- default MCP selector should use CCB MCP manifest.
- starting a conversation should pass `ccbAssistantProfileId`, not raw AionUI `skill_ids` or selected MCP ids.

For non-CCB agents:

- Preserve existing AionUI behavior unless a later task intentionally changes it.

## Migration Requirements

A one-time migration should import user-authored AionUI assistants into CCB profiles when CCB-Wanding is installed.

Migration rules:

- Preserve legacy AionUI data before writing.
- Write a report under `%LOCALAPPDATA%\CCB-Wanding\.claude\`.
- Do not overwrite an existing CCB profile with the same id unless the migration can prove it created that profile earlier.
- Built-in AionUI assistants can be imported as bundled/read-only CCB profiles only if the user selected them for CCB-Wanding; otherwise leave them in AionUI.
- After migration, AionUI local assistant config can remain as downgrade/cache data, but not as runtime authority for CCB sessions.

## Implementation Slices

### Slice 1: Current-flow inventory

- Document current AionUI assistant list/detail/create/update/delete paths.
- Document how assistant rules are stored/read today.
- Document where conversation creation currently carries assistant defaults.
- Document current CCB session creation extension points.

### Slice 2: CCB assistant profile service

- Add profile schema, loader, writer, delete/toggle/reorder helpers.
- Add manifest/list/detail output suitable for AionUI.
- Add tests for valid profiles, invalid JSON, duplicate ids, missing skills/MCP references, and non-overwrite migration behavior.

### Slice 3: CCB runtime apply

- Extend ACP `session/new` handling to accept `ccbAssistantProfileId`.
- Resolve and validate the profile inside CCB-Wanding.
- Apply instructions, model, permission mode, skills, and MCP to the session.
- Add tests proving profile instructions do not leak to later sessions.

### Slice 4: AionUI adapter

- Add a CCB assistant config adapter in AionUI common/renderer code.
- Route `AssistantSettings` to the CCB adapter when editing CCB-Wanding assistants.
- Route CCB conversation creation to send only the profile id.
- Keep existing AionUI assistant path for non-CCB agents.

### Slice 5: Migration and smoke

- Migrate existing user-authored AionUI assistants into CCB profiles.
- Add rollback/report docs.
- Smoke test a finance analysis assistant with CCB skills and MCP.

## Acceptance Criteria

- [ ] Trellis inventory exists for current AionUI assistant flow and CCB session extension points.
- [ ] CCB-Wanding has an assistant profile schema and storage path under its config directory.
- [ ] CCB-Wanding exposes list/detail/create/update/delete/toggle for assistant profiles.
- [ ] AionUI `AssistantSettings` can display CCB profiles for CCB-Wanding agents.
- [ ] AionUI create/edit/delete writes CCB profiles for CCB-Wanding agents.
- [ ] CCB new session accepts a profile id and resolves it inside CCB-Wanding.
- [ ] Starting a CCB session with a profile does not send raw AionUI `skill_ids`, `mcp_ids`, or selected MCP ids as authority.
- [ ] Profile skills come from CCB skills manifest.
- [ ] Profile MCP servers come from CCB MCP manifest/settings.
- [ ] Profile instructions apply only to the selected session and do not mutate global `CLAUDE.md`.
- [ ] A finance-analysis smoke conversation demonstrates profile-specific instructions and expected CCB MCP/skills.
- [ ] Legacy AionUI assistant migration has backup/report/rollback notes.
- [ ] Non-CCB AionUI assistants still use their existing path.

## Verification Plan

Backend:

- `bunx tsc --noEmit --pretty false`
- focused CCB tests for assistant profile schema/service/runtime apply
- existing ACP manifest tests for commands/skills/MCP still pass

AionUI:

- `bunx tsc --noEmit --pretty false`
- focused unit tests for CCB assistant adapter
- existing config tests for CCB skills/MCP still pass

Manual smoke:

1. Start AionUI dev with CCB-Wanding installed.
2. Create/edit a finance-analysis assistant.
3. Confirm profile JSON appears under CCB-Wanding config.
4. Start a new CCB conversation with that assistant.
5. Confirm create/session payload carries `ccbAssistantProfileId`.
6. Confirm the session sees finance instructions and CCB-owned MCP/skills.
7. Start a different CCB conversation without that assistant and confirm no instruction bleed.

## Open Questions

- Should CCB profile instructions live as JSON fields only, or as an assistant directory containing `profile.json` plus `CLAUDE.md`?
- Should bundled AionUI assistants be duplicated into CCB as read-only profiles, or only user-created assistants?
- Should profile model/mode be optional fallback fields, or always explicit?
- What is the best CCB session-scoped instruction injection point: temp file, system context, or launch option?
- Should a missing referenced skill/MCP block session creation, warn and continue, or auto-disable that reference?

## Implementation Notes - 2026-06-13

First implementation pass completed:

- CCB-Wanding now has `src/services/acp/assistantProfiles.ts` for assistant profile schema, storage, manifest, validation, MCP allowlist filtering, and skill command allowlist filtering.
- CCB-Wanding ACP `session/new` reads `_meta.ccbAssistantProfileId`.
- CCB-Wanding applies profile `instructions.system_prompt` as `customSystemPrompt`.
- CCB-Wanding applies profile `instructions.claude_md` as a QueryEngine `userContextOverride`, so it replaces the session's `claudeMd` context without writing global `%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md`.
- CCB-Wanding applies profile model and permission mode when explicit `_meta.permissionMode` does not override it.
- CCB-Wanding filters settings MCP to the profile MCP allowlist.
- CCB-Wanding filters command/skill list to the profile skill allowlist.
- CCB-Wanding exposes `--ccb-assistant-profiles` CLI manifest/detail/save/delete entry.
- AionUI main process now has CCB assistant profile config I/O and IPC.
- AionUI AssistantSettings save/delete best-effort syncs user-authored assistants into CCB profile JSON.
- AionUI CCB conversation creation now carries `ccb_assistant_profile_id` and `extra.acp_meta.ccbAssistantProfileId`.

Known remaining integration risk:

- Need runtime smoke to confirm aioncore / route-b forwards `extra.acp_meta.ccbAssistantProfileId` into ACP `session/new` `_meta`. If not, the next fix belongs in the Layer 3 route-b mapping, not in AssistantSettings.

## Deploy / Smoke Notes - 2026-06-13 23:23

External deploy run reported:

- `claude-code-B` build succeeded with `BUN_JSC_forceRAMSize=3500000000`.
- `D:\CCB-Wanding\dist` deployed with backup `dist.backup-20260613-232346`.
- route-b sync completed for 5 targets.
- AionUI dev restarted via `start-aionui-dev.ps1`; Electron launched.
- Live dist contains the AskUserQuestion patch (`safeDecodeURIComponent`, `auqm:`, `toolCall.rawInput = { ... }`).
- Native ACP smoke initialized successfully and resolved session model as `minimax-m3`.
- Native ACP smoke reached `mcp__quotation__match_quotation` tool call.
- Smoke script exited by 90s timeout on a slow prompt; this was not treated as a deploy failure.

Still not verified by that deploy:

- Whether AionUI `extra.acp_meta.ccbAssistantProfileId` reaches CCB ACP `session/new` as `_meta.ccbAssistantProfileId`.

Next smoke should create a CCB assistant profile, start a CCB preset assistant conversation, and inspect CCB ACP logs or temporary instrumentation for `_meta.ccbAssistantProfileId`.
- **2026-06-13 deploy session:** AskUserQuestion partial-answers patch deployed to live dist (`toolCall.rawInput` + `auqm:` verified in `D:\CCB-Wanding\dist\chunk-*.js`). `ccbAssistantProfileId` passthrough **still unverified** — grep shows no `acp_meta` in aioncore bundle; track in journal § build/deploy 重试.

## Implementation Notes - 2026-06-14 (Preset cards → CCB profiles)

**Problem:** Guid preset cards (Word/Excel 等) unusable on CCB — routed to `aionrs` without model; no `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\` profiles.

**AionUI (`D:\Projects\aionui-src`):**

- `resolveCcbPresetAgentType` — CCB 权威下 preset 强制 `claude` backend
- `useCcbAuthorityActive` + `usePresetAssistantResolver` / `useGuidAgentSelection` / `useGuidSend` / `createConversationParams`
- `ccbAssistantProfileMigration.ts` — 首次启动 seed builtin → `assistants/*.json` (`source: bundled`, 不覆盖已有)
- `buildAgentConversationParams` — `acp_meta` 同时写 `ccbAssistantProfileId` + `preset_assistant_id`

**CCB (`D:\claude-code-B`):**

- `resolveAssistantProfileIdFromMeta` — 多形状 `_meta` fallback（含 `preset_assistant_id`, `acp_meta` 嵌套）
- `getAssistantProfile` — `builtin-` 前缀 / normalize id 别名查找

**验证：** code-review PASS；AionUI 12 + CCB 9 unit tests pass。

**2026-06-14 seed migration fix:** 首次 seed 全部 `profiles_skipped_empty` 且错误置 completion flag — 根因：`GET /api/assistants/:id` 返回 405（aioncore 不支持 detail GET）；修复：`readAssistantRule` + list-row fallback；仅 success 时置 flag；空 seed 自动 retry。重启 dev 后 **created=21**，`assistants/*.json` 已落盘（含 `word-creator.json` claude_md + officecli-docx）。

**2026-06-14 Layer 3 profile handoff（仍用 WanD CLAUDE.md 问题）:**

- **Symptom:** 选 Word/Excel preset 开聊，助手仍自我介绍为「CCB-Wanding 报价、库存与 Accurate 助手」— 默认 WanD `CLAUDE.md` 未被 profile 替换。
- **Root cause:** aioncore `AcpBuildExtra` 含 `preset_assistant_id` / `preset_context`，但**不**转发 `acp_meta.ccbAssistantProfileId` 到 CCP `session/new` `_meta`（二进制无 `acp_meta` 字符串）。DB 实测：`preset_assistant_id` 有值，`ccb_assistant_profile_id` / `preset_context` 常为 null。
- **Fix (AionUI `D:\Projects\aionui-src`):**
  - `buildCcbPresetConversationExtra` — 从 CCB profile 加载 `claude_md` → `extra.preset_context` + `ccb_assistant_profile_id`
  - `ccbAssistantProfileSession.ts` + `stageNextSessionProfile` IPC — warmup 前写 `%LOCALAPPDATA%\CCB-Wanding\.claude\.aionui-next-assistant-profile.json`
  - `warmupConversation.ts` — `/warmup` 前按 conversation extra staging
  - `useGuidSend` / `createConversationParams` — `ccbAuthorityActive` 驱动 preset CCB 路由（不只 `useCcbRuntime`）
- **Fix (CCB `D:\claude-code-B`):**
  - `consumeNextAssistantProfileId()` — session/new 消费 handoff 文件（60s TTL，一次性）
  - `resolvePresetContextFromMeta()` + `agent.ts` `userContextOverride` — profile 或 `preset_context` 替换默认 CLAUDE.md
- **Deploy:** CCB build + `deploy-claude-code-b-to-wanding.ps1` 2026-06-14；AionUI 需 `start-aionui-dev.ps1` 重启加载 handoff 逻辑。
- **Verify:** code-review PASS；AionUI 13 + CCB 11 unit tests pass。smoke：**新建** preset 会话问「你可以做什么」应得 Word/Excel 人设，非 WanD 报价。

**待做：** 用户 smoke 确认；可选长期：aioncore 原生转发 `acp_meta` 后移除 handoff 文件。
