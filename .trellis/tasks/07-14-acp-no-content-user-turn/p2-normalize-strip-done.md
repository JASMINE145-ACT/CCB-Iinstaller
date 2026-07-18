# Phase 2 done — USER_TURN.001 normalize strip (2026-07-14)

## SoT edits (`D:\claude-code-B`)

| File | Change |
|------|--------|
| `src/utils/messages.ts` | `isNoContentOnlyUserMessage`; skip in `normalizeMessagesForAPI` (user + system→user); `ensureToolResultPairing` skip orphan repair when `toolUseIds.length === 0`; no literal `(no content)` placeholder on empty orphan strip |
| `src/utils/__tests__/messages.test.ts` | USER_TURN.001 suite + updated pairing assertion |

## Gates

| Gate | Result | Evidence |
|------|--------|----------|
| code-reviewer | **PASS** | agent `2b0e84a0-29af-4989-9d89-0cbc79b32daf` |
| unit Case D | **PASS** | `bun test src/utils/__tests__/messages.test.ts` → 69 pass |
| empty ACP prompt | **PASS** | `bun test …/agent.test.ts -t "empty prompt\|whitespace-only"` → 2 pass |
| Live Case A / C | **pending** | build+deploy+route-b sync **done** 2026-07-14；待 Guid 手工 |

## Deploy

```text
bun run build @ D:\claude-code-B          # OK
deploy-claude-code-b-to-wanding.ps1 -Backup  # OK → D:\CCB-Wanding\dist
sync-aionui-ccb-route-b.ps1 -InstallDir D:\CCB-Wanding -RestartAionUiWeb  # OK
Symbol in live: D:\CCB-Wanding\dist\chunk-n5a8sm7y.js → isNoContentOnlyUserMessage
```
