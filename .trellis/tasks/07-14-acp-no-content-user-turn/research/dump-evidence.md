# Dump evidence — Phase 1 (2026-07-14)

## Live Guid jsonl

本次会话未在 `%USERPROFILE%\.claude` / CCB-Wanding 侧抓到含业务 `001754` 的 transcript。  
**以代码路径 + 既有单测叙述作为 model-facing 污染的充分证据**（审查允许「dump 或书面假说经证据支持」）。

## Code-path dump（model-facing）

| Step | Evidence |
|------|----------|
| 1 Write | `D:\claude-code-B\src\utils\messages.ts:509` — `content: content \|\| NO_CONTENT_MESSAGE` |
| 2 Constant | `src/constants/messages.ts` — `'(no content)'` |
| 3 Merge | `normalizeMessagesForAPI` case `user`：连续 user **无条件** `mergeUserMessages` — 哨兵会并入上一轮 `tool_result` user |
| 4 SDK vs API | `isNotEmptyMessage` / `queryHelpers` **跳过** 哨兵输出到 SDK；**normalizeMessagesForAPI 不跳过** → UI/SDK 看不见，模型看得到 |
| 5 Pairing | `ensureToolResultPairing` L5861–5865：空内容时仍 `createUserMessage({ content: NO_CONTENT_MESSAGE, isMeta: true })` 送 API |
| 6 Precedent test | `__tests__/messages.test.ts` CC-1215 注释明确：空 content → `NO_CONTENT_MESSAGE`，连续 user 会 400 |

## Verdict → Phase 2

假说1 **成立**：哨兵进入 model-facing history（经 merge 和/或 pairing placeholder）。  
修复方向：normalize **跳过** sentinel-only user；pairing **不再**插入字面 `(no content)` 文本占位。
