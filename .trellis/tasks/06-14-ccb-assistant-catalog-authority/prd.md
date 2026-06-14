# CCB Assistant Catalog Authority

## Problem

AionUI Assistant Settings and conversation assistant selectors still load from AionUI `/api/assistants`. Saves first update AionUI assistant records and then best-effort sync CCB profiles.

That leaves two sources of truth:

- AionUI assistant catalog: list, enabled state, order, detail, prompts, skills.
- CCB profiles: runtime authority used by CCB sessions.

For the intended architecture, CCB profiles should be the source of truth for CCB assistants, and AionUI should be a shell/editor over those profiles.

## Goal

When CCB authority is active, Assistant Settings and assistant selection should read and write CCB assistant profiles as the primary catalog.

## Non-Goals

- Do not remove AionUI `/api/assistants` support for non-CCB or legacy mode.
- Do not solve runtime handoff cleanup here; that is covered by `06-14-ccb-assistant-profile-runtime-authority`.
- Do not redesign the visual Assistant Settings page beyond changes needed for source-of-truth correctness.

## Requirements

1. In CCB-authority mode, Assistant Settings list/detail should come from CCB profiles.
2. Create/update/delete/toggle/reorder should write CCB profiles first.
3. AionUI legacy assistant records may be mirrored only as compatibility data, not as authority.
4. Conversation assistant selectors should use the same CCB-backed assistant catalog in CCB-authority mode.
5. Builtin seeded assistants should not drift from CCB profile files after first migration.
6. The UI should make CCB authority clear enough that users do not think AionUI provider/assistant settings are independently controlling CCB.

## Implementation Notes

- Primary AionUI files:
  - `hooks/assistant/useAssistantList.ts`
  - `hooks/assistant/useAssistantEditor.ts`
  - `pages/settings/AssistantSettings`
  - `pages/conversation/hooks/useConversationAgents.ts`
  - `common/config/ccbAssistantProfiles.ts`
  - `common/config/ccbAssistantProfileMigration.ts`
  - `process/bridge/ccbAssistantProfilesBridge.ts`
- Primary CCB files:
  - `services/acp/assistantProfiles.ts`

## Acceptance Criteria

1. With CCB installed/authority active, Assistant Settings displays CCB profiles from `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants`.
2. Editing an assistant writes the corresponding CCB profile file.
3. Disabling/reordering an assistant persists in the CCB profile/catalog representation or an explicit CCB-owned companion file.
4. Conversation assistant dropdown reflects the CCB profile catalog.
5. AionUI legacy assistant API failures do not prevent CCB profile edits from succeeding.
6. Legacy/non-CCB mode still uses existing AionUI assistant APIs.
7. Tests cover CCB-authority list/detail/save/toggle paths and legacy fallback.

## Validation Plan

- Start with seeded builtin CCB profiles.
- Edit a profile from Assistant Settings and confirm the JSON file changes.
- Restart AionUI and confirm the same CCB profile state is shown.
- Start a CCB assistant session and confirm it uses the edited CCB profile.
- Disable/reorder assistants, restart, and confirm state is stable.

## Implementation Progress

2026-06-14:

- Added a pure CCB profile catalog adapter that maps CCB profiles into AionUI `Assistant` / `AssistantDetail` UI shapes.
- `Settings / Assistants` list now reads CCB profiles when CCB authority is active, and legacy `/api/assistants` only when CCB authority is inactive.
- Assistant reorder persists `sort_order` into CCB profiles under CCB authority.
- Assistant editor detail loading reads CCB profiles under CCB authority.
- Assistant create/update/delete/toggle now writes CCB profiles first under CCB authority; legacy assistant API mirroring is best-effort and no longer blocks CCB profile edits.
- Conversation assistant dropdown now reads the same CCB profile catalog under CCB authority.
- Added type fields needed by the existing CCB integration work so full TypeScript checking passes.

Verified:

- `D:\Projects\aionui-src`: `.\node_modules\.bin\tsc.exe --noEmit -p tsconfig.json`
- `D:\Projects\aionui-src`: `.\node_modules\.bin\vitest.exe run tests/unit/common-config/ccbAssistantProfiles.test.ts tests/unit/assistants/useAssistantList.dom.test.ts tests/unit/assistants/useAssistantEditor.dom.test.ts --reporter=dot`
- Focused tests: 3 files passed, 25 tests passed.

Remaining manual checks:

- Open AionUI dev with CCB installed and confirm Assistant Settings displays files from `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants`.
- Edit an assistant, restart AionUI, and confirm the edited CCB profile state remains.
- Start a CCB preset assistant conversation and confirm runtime uses the edited profile.
- Disable/reorder assistants and confirm the CCB profile `enabled` / `sort_order` state persists.

## References

- `.trellis/tasks/06-13-aionui-shell-ccb-core/remaining-adaptation-gaps-2026-06-14.md`
- `.trellis/tasks/06-14-ccb-assistant-profile-runtime-authority/prd.md`
- `.trellis/spec/integration/aionui-config-inventory.md`
- `.trellis/spec/integration/aionui-ccb-boundary.md`
- `.trellis/spec/backend/index.md`
- `.trellis/spec/frontend/index.md`
