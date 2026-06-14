# CCB Assistant Profile Runtime Authority Cleanup

## Problem

AionUI currently passes `ccb_assistant_profile_id` / `acp_meta.ccbAssistantProfileId`, but it also copies CCB profile `claude_md` into `preset_context` and `preset_rules`. This preserves legacy behavior, but it means the shell can still inject prompt/runtime settings into CCB sessions.

The target architecture is stricter: AionUI is the shell, CCB-Wanding / claude-code-B is the runtime authority.

## Goal

For CCB-authority sessions, AionUI should only identify the selected assistant profile. CCB must resolve all runtime behavior from the CCB assistant profile:

- system prompt
- CLAUDE.md / user context
- allowed MCP servers
- allowed skills / slash commands
- default model
- default permission mode

## Non-Goals

- Do not remove legacy AionUI assistant support for non-CCB backends.
- Do not rewrite the Assistant Settings catalog in this task; that is covered by `06-14-ccb-assistant-catalog-authority`.
- Do not change MCP/skills storage unless needed to preserve CCB profile filtering.

## Requirements

1. CCB preset assistant session creation must pass a stable profile id to CCB.
2. CCB-authority paths must not send `preset_context` / `preset_rules` as the runtime source of truth.
3. CCB-authority paths must not send AionUI-owned `skill_ids`, `mcp_ids`, or `selected_mcp_server_ids` as runtime authority.
4. CCB must continue to support `_meta.ccbAssistantProfileId`, `_meta.ccb_assistant_profile_id`, `_meta.preset_assistant_id`, nested `_meta.acp_meta`, and the `.aionui-next-assistant-profile.json` handoff fallback.
5. If profile id handoff fails, the failure should be observable in logs or diagnostics rather than silently reverting to shell-owned prompt for CCB sessions.
6. Existing non-CCB assistant behavior should remain compatible.

## Implementation Notes

- Primary AionUI files:
  - `ccbPresetConversationExtra.ts`
  - `buildAgentConversationParams.ts`
  - `createConversationParams.ts`
  - `warmupConversation.ts`
  - `useGuidSend.ts`
- Primary CCB files:
  - `services/acp/agent.ts`
  - `services/acp/assistantProfiles.ts`

## Acceptance Criteria

1. Selecting a CCB assistant starts a CCB session where CCB receives or consumes the assistant profile id.
2. Runtime prompt and CLAUDE.md are applied from `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\<id>.json`.
3. Changing the CCB profile file changes runtime behavior without editing AionUI assistant data.
4. Network/create payload and persisted conversation extra for CCB sessions no longer use `preset_context` / `preset_rules` as runtime authority.
5. CCB profile MCP allowlist and command/skill allowlist affect available tools/commands in the session.
6. Tests cover profile id handoff, legacy fallback behavior, and CCB path stripping.

## Validation Plan

- Run focused AionUI unit tests for conversation param construction and warmup handoff.
- Run focused CCB tests for assistant profile resolution and session application.
- Manual smoke:
  - Select a preset assistant.
  - Start a new CCB session.
  - Confirm CCB logs show the assistant profile id and applied profile.
  - Confirm `/mcp`, `/skills`, and available commands reflect profile constraints.

## References

- `.trellis/tasks/06-13-aionui-shell-ccb-core/remaining-adaptation-gaps-2026-06-14.md`
- `.trellis/spec/integration/aionui-config-inventory.md`
- `.trellis/spec/integration/aionui-ccb-boundary.md`
- `.trellis/spec/backend/index.md`
- `.trellis/spec/frontend/index.md`

## Implementation Notes — 2026-06-14 (Phase 1: handoff + profile runtime)

- CCB `assistantProfiles.ts` + `agent.ts`: meta/handoff resolution, MCP/command allowlist, profile-owned prompt/model/permission.
- AionUI seed migration + `warmupConversation` handoff file + preset → `claude` routing.
- **Interim bridge (superseded in Phase 2):** `ccbPresetConversationExtra` copied `claude_md` → `preset_context` when aioncore did not forward `_meta`.

## Implementation Notes — 2026-06-14 (Phase 2: strict runtime authority)

### Changes

| Layer | File | Change |
|-------|------|--------|
| AionUI | `ccbPresetConversationExtra.ts` | Profile id + `acp_meta` only; **no** `preset_context` / `preset_rules` |
| AionUI | `ccbConfigMigrationShared.ts` | `stripCcbConversationExtra` also strips prompt fields |
| AionUI | `createConversationParams.ts` / `useGuidSend.ts` | Strip CCB extra; omit `session_mode` for CCB preset (profile owns permission) |
| AionUI | `warmupConversation.ts` | Warn when conversation extra has no profile id |
| CCB | `agent.ts` | Log profile id source; warn if file missing; **suppress** `preset_context` when profile id present |

### Verification

- AionUI: `ccbPresetConversationExtra.test.ts` 3 pass + `ccbConfigMigration` 11 pass + `buildAgentConversationParams` 6 pass
- CCB: `assistantProfiles.test.ts` 11 pass; `agent.test.ts` 73 pass (incl. missing-profile suppresses preset_context)
- code-review PASS (2026-06-14)

### Remaining — DONE (2026-06-14)

1. ✅ Manual smoke: **new** Word/Excel preset session → 「你可以做什么」→ preset 人设（非 WanD 报价助手）— **VERIFIED 2026-06-14**
2. Entry-point audit: team / cron / AgentSetupCard switch-agent paths — deferred to future task
3. ✅ CCB dist deploy + AionUI dev restart after Phase 2

