# Workspace auto-open root cause (Phase 0a)

**Date:** 2026-07-16  
**Task:** `07-16-workspace-todo-observability`

## Trace chain

| Step | Component | Finding |
|------|-----------|---------|
| 1 Producer | `useWorkspaceTree.ts:136` | Sole caller of `dispatchWorkspaceHasFilesEvent` |
| 2 `hasFiles` heuristic | `useWorkspaceTree.ts:125` | **Bug:** `(res[0]?.children?.length ?? 0) > 0` misses root-level **files** (no `children`) |
| 3 `isInitial` | `wasFirstLoad` from `isFirstLoadRef` | Correct on refresh; remount resets to initial (documented limitation) |
| 4 Consumer | `useWorkspaceCollapse.ts:131-135` | **`userPreference === 'collapsed'`** forces collapsed — **no toast**, silent fail |
| 5 Refresh | `useWorkspaceEvents.ts:122-151` | Parent `conversation_id` filter — child-agent writes may not refresh **parent** tree if IDs differ |
| 6 Empty guard | `useWorkspaceTree.ts:89-92` | Stale empty refresh skips dispatch (intentional anti-flicker) |

## Verdict

Primary fixes for Phase 1:

1. **Producer:** `workspaceTreeHasVisibleContent()` — any root file or non-empty folder counts as hasFiles.
2. **Consumer:** mid-session (`!isInitial`) + collapsed preference → **toast** with expand CTA (does not overwrite localStorage pref until user opens panel).
3. **Follow-up (if smoke fails):** verify delegated Write triggers parent workspace refresh (conversation_id chain).

## Hook design was sound

`allowAutoExpand = isUserPicked || isMidSession` — no change needed once producer emits correct events.
