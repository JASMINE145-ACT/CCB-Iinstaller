# Remaining AionUI Shell vs CCB Core Adaptation Gaps

Date: 2026-06-14

Goal: AionUI is only the shell. CCB-Wanding / claude-code-B is the runtime and configuration authority.

## Current Finding

The MCP and skills direction is mostly aligned, but there are still several places where AionUI keeps a parallel configuration surface or injects runtime settings. These should be reduced until AionUI only displays/edits CCB-owned state.

## P0: Assistant Profile Handoff Is Not Yet Clean

Evidence:

- AionUI writes `ccb_assistant_profile_id` and `acp_meta.ccbAssistantProfileId`.
- AionUI also still copies profile `claude_md` into `preset_context` and `preset_rules`.
- CCB can resolve the profile id from ACP `_meta` or consume `.aionui-next-assistant-profile.json`.
- CCB applies assistant-owned prompt, model, permission, MCP allowlist, and command allowlist when the profile is present.

Risk:

- The shell still has a fallback prompt injection path. This makes it unclear whether CCB profile settings or AionUI conversation extra is the source of truth.
- If warmup/handoff fails, CCB may fall back to `preset_context`, which preserves old behavior but violates the final architecture.

Desired end state:

- AionUI sends only the profile id for CCB sessions.
- CCB resolves all assistant prompt / CLAUDE.md / skill / MCP / model / permission settings from `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\*.json`.
- `preset_context` / `preset_rules` are legacy-only and not used for CCB-authority sessions.

Validation:

- Select a preset assistant.
- Confirm the ACP session is created with a profile id available to CCB.
- Confirm CCB logs show profile applied.
- Confirm changing only the CCB profile file changes runtime behavior without editing AionUI assistant data.

## P0: Assistant Catalog Still Comes From AionUI

Evidence:

- `useAssistantList` and conversation assistant selectors load from `ipcBridge.assistants.list` / `/api/assistants`.
- Assistant settings create/update/delete first operate on AionUI assistants, then best-effort sync to CCB profiles.
- Builtin assistant seeding copies AionUI builtin assistants into CCB profiles, but the UI list is still AionUI-owned.

Risk:

- CCB profiles can drift from AionUI assistant rows.
- Enable/disable, sort order, builtin/user visibility, and descriptions are still effectively AionUI-owned.

Desired end state:

- For CCB-authority mode, assistant list/detail is read from CCB profiles.
- AionUI assistant APIs become a legacy import/export layer or a compatibility adapter.
- Save/reorder/toggle writes CCB first; AionUI legacy mirrors only if needed.

## P0: MiniMax-M3 Model Variants Need Runtime Smoke

Evidence:

- CCB has `minimax-m3` and `minimax-m3-thinking` visible ids.
- CCB maps both to upstream `MiniMax-M3`.
- `minimax-m3` maps to `thinking: { type: "disabled" }`.
- `minimax-m3-thinking` maps to `thinking: { type: "adaptive" }`.
- Claude API request construction has explicit MiniMax handling.

Risk:

- AionUI model/preferred-model state can still present model choices.
- Older effort/thinking controls must not override MiniMax variants.

Desired end state:

- AionUI displays CCB-provided model options.
- CCB request body owns the MiniMax thinking mapping.
- No low/high effort UI is presented for MiniMax-M3.

Validation:

- Select `minimax-m3`, send a prompt, inspect logged request body: `model: "MiniMax-M3"` and `thinking.type: "disabled"`.
- Select `minimax-m3-thinking`, send a prompt, inspect logged request body: `model: "MiniMax-M3"` and `thinking.type: "adaptive"`.

## P1: Model Provider Settings Are Still AionUI-Owned UI

Evidence:

- AionUI still has provider/model settings and persisted preferred model ids.
- Trellis currently marks this as shell/read-only legacy for CCB, but the UI can still look authoritative.

Risk:

- User edits AionUI provider settings and expects CCB runtime to change.
- CCB runtime actually reads `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` / env.

Desired end state:

- In CCB mode, provider/model configuration is clearly CCB-owned.
- AionUI either hides legacy provider settings for CCB or labels them as non-CCB.
- The editable source is CCB settings or a CCB-backed settings adapter.

## P1: Permission / Session Mode Is Still Split

Evidence:

- AionUI persists `session_mode` / preferred mode and passes it on conversation creation.
- CCB assistant profiles can define `defaults.permission_mode`.
- CCB session code respects explicit meta permission mode over assistant defaults.

Risk:

- AionUI preferred mode can override the assistant profile unintentionally.

Desired end state:

- Assistant default permission is CCB-owned.
- AionUI may show current mode and allow per-session override, but persistent defaults should be stored in CCB profiles/settings.

## P1: Conversation Entry Points Need Full CCB Audit

Entry points to audit:

- Guid page new session.
- Conversation tab new assistant/session dropdown.
- Team creation.
- Scheduled tasks.
- Skill rule generator / generated assistant creation.
- Resume/fork/warmup paths.

Desired end state:

- Every CCB session path uses the same CCB authority helper.
- No path sends AionUI-owned `skill_ids`, `mcp_ids`, `selected_mcp_server_ids`, or copied prompt as runtime authority.

## P2: Full CCB Capability Surface Is Not Fully Exposed

Known surfaced or partially surfaced:

- `/command` manifest.
- `/skills`.
- `/mcp`.
- CCB assistant profiles.
- CCB model display.

Likely missing or partial:

- CCB subagents / agents beyond AionUI assistant templates.
- Hooks.
- Memory.
- Output styles.
- Plugins.
- Statusline.
- CCB local/TUI-only slash commands that need shell mappings.

Desired end state:

- CCB exports a capability manifest.
- AionUI renders the manifest and marks unsupported local/TUI commands explicitly.
- New CCB capabilities appear in shell without inventing AionUI-specific settings.

## Recommended Next Task Order

1. Assistant authority cleanup: profile id only, remove CCB-path `preset_context` / `preset_rules`, verify handoff and logs.
2. Assistant catalog authority: switch Settings/Assistants list and editor to CCB profiles as primary source.
3. MiniMax-M3 runtime smoke: verify request body and hide invalid effort tiers for M3.
4. Conversation entry-point audit: ensure every new session path uses the CCB authority helper.
5. CCB capability manifest expansion: expose agents/hooks/memory/output-style/plugins/statusline as CCB-owned capabilities.
