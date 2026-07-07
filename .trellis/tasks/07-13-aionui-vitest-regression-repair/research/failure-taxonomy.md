# Vitest failure taxonomy — 2026-07-06

**Command:** `cd aionui-src && npm run test`  
**Result:** 16 failed files | 24 failed tests | 220 passed  
**Branch:** `ccb-wanding-1.1.2-recovered`（大量未提交改动）

## Bucket A — `bun:test` under vitest（5 files, suite-level fail）

```
Error: Cannot find package 'bun:test' imported from .../workTaskTypes.test.ts
```

| File | Likely task |
|------|-------------|
| `tests/unit/common-utils/workTaskTypes.test.ts` | 07-03 work-tasks |
| `tests/unit/priceLibrary/filterProducts.test.ts` | 07-06 price library |
| `tests/unit/priceLibrary/priceLibraryColumns.test.ts` | 07-06 |
| `tests/unit/renderer/askUserQuestionFormat.test.ts` | askUserQuestion |
| `tests/unit/renderer/askUserQuestionIds.test.ts` | askUserQuestion |

**Fix:** Replace `bun:test` imports with `vitest` (mechanical).

## Bucket B — slash capability API drift (2 tests)

```
expect(mapped.capabilityStatus).toBe('needs_mapping') → Received: undefined
TypeError: isSlashCommandExecutable is not a function
```

- Test: `tests/unit/renderer/slashCommandsMerge.test.ts`
- Imports from `@/common/chat/slash/types` symbols **not exported**
- `acpMapping.ts` does not map `_meta.capability`

**Fix:** Restore implementation (B1) or update/remove tests (B2) — product decision.

## Bucket C — org httpBridge contract (4+ tests)

```
expected fetch with StringContaining "/api/test"
received "http://127.0.0.1:13400/api/test" + credentials: "omit"
```

- `tests/unit/common-adapter/httpBridge.test.ts`
- `tests/unit/common-adapter/httpBridge.ws.dom.test.ts`

**Fix:** Update test expectations to match orgHttpBridge base URL + fetch options (07-03).

## Bucket D — useAssistantList empty (8 tests)

```
expected assistants length 2 → got 0
expected vi.fn() to be called at least once
```

- `tests/unit/assistants/useAssistantList.dom.test.ts`
- Correlates with modified `fetchAssistantsCatalog.ts`

**Fix:** Align mocks with new catalog fetch path.

## Bucket E — ccb config (3+ tests)

- `ccbAgentMigration.test.ts`
- `ccbSkillsSync.test.ts`
- `internalUpdateManifest.test.ts`

**Fix:** Per-file assertion/fixture update after reading RED output.

## Bucket G — preview import timeout (5+ tests)

```
Error: Test timed out in 30000ms (PreviewPanel module import)
```

- `PreviewPanel.dom.test.tsx`
- `OfficeWatchViewer.dom.test.tsx`
- `usePreviewHistory.dom.test.ts`

**Fix:** Mock heavy deps or investigate import regression from Layout/Router changes.

## Prior incorrect claim

「24 failures unrelated to sidebar badge change」— **partially true for SiderWorkTasksEntry only**, but **false for the suite overall**. User's intuition that failures tie to recent tasks is **correct**.
