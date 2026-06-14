# CCB-Wanding Skills Authority In AionUI

## Goal

AionUI Skills should be a shell over CCB-Wanding skills. Opening the Skills page in AionUI must show the skills that CCB-Wanding can actually load, and AionUI must not maintain a separate runtime-authoritative skills configuration for CCB sessions.

## Requirements

- CCB-Wanding exposes or can generate a skills manifest:
  - skill id/name
  - description
  - source: bundled / user / plugin / project / extension
  - location
  - enabled/status
  - load error reason when available
  - checksum or updated timestamp when available
- AionUI Skills reads from CCB-Wanding authority, not AionUI local runtime state.
- AionUI import/delete operations write back to the CCB-Wanding skills directory.
- AionUI legacy skills config can only be migration input or read-only legacy state.
- Conversation runtime skills for CCB sessions must come from CCB-Wanding config/session state.

## Acceptance Criteria

- [x] CCB-Wanding has a testable skills manifest generator.
- [x] AionUI Skills page displays CCB-Wanding skills.
- [x] AionUI import skill writes into the CCB-Wanding skills directory.
- [x] AionUI delete skill removes it from CCB-Wanding user skills, so new CCB sessions will not load it.
- [x] AionUI no longer treats local Skills Hub data as runtime authority for CCB sessions.
- [x] Legacy AionUI skills are handled as migration/read-only input, not as CCB runtime state.

## Implementation Notes

- Backend: `D:\claude-code-B\src\services\acp\skillsManifest.ts` builds a manifest from the existing `getSkillToolCommands(cwd)` loader.
- Backend tests: `D:\claude-code-B\src\services\acp\__tests__\skillsManifest.test.ts`.
- Frontend: `D:\Projects\aionui-src\packages\desktop\src\common\config\ccbSkills.ts` is the CCB-backed Skills adapter.
- Frontend UI: `SkillsHubSettings.tsx` now lists, imports, and deletes skills under `%LOCALAPPDATA%\CCB-Wanding\.claude\skills`.
- Import sanitizes destination folder names before copying into CCB-Wanding.
- Delete removes the corresponding CCB-Wanding skill directory.
- The UI badge marks these entries as `CCB-Wanding`.

## Verification

- `bun test src/services/acp/__tests__/skillsManifest.test.ts src/services/acp/__tests__/capabilities.test.ts` in `D:\claude-code-B`: 6 tests passed.
- `D:\Projects\aionui-src\node_modules\.bin\vitest.exe run tests/unit/common-config/ccbSkills.test.ts --reporter=dot`: 1 test passed.
- `bunx tsc --noEmit --pretty false` in `D:\Projects\aionui-src`: passed.
- `bunx tsc --noEmit --pretty false` in `D:\claude-code-B`: currently blocked by sibling MCP authority work in `src/cli/handlers/ccbMcpManifest.ts`.

## Remaining Boundary

This task implements file-backed CCB user skills in AionUI and adds the backend manifest generator. It does not yet wire a dedicated ACP/HTTP manifest endpoint for every bundled/plugin/project/MCP skill source. That endpoint can be added later when the broader command/capability manifest is unified.

## Out of Scope

- Rewriting CCB-Wanding's core skill loader semantics.
- Treating the AionUI skills market as authority. It can be an install entry only; the install target is CCB-Wanding.
