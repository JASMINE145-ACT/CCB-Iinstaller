# View Steps 首次工具调用名称为空

## Goal

When an ACP tool actually runs, **View Steps** must always show a human-readable tool name on the first (and subsequent) step — never a blank row with only a status dot.

## Symptom (2026-07-04)

- User: price-library edit —「把物料 8010012697 的 supplier 改成 HENG XIN」
- UI: **View Steps · 1** — step row **name empty**, status green (completed)
- Agent text confirms tool logic ran（「draft 是空的，需要先从 active 查询…」）

## Hypothesis (explore)

| Layer | Finding |
|-------|---------|
| **Renderer** | `MessageToolGroupSummary` renders `displayItem.name` only (`normalizeToolCall.ts` line 174: `name: update.title`) |
| **Contrast** | `MessageAcpToolCall.tsx` has fallback: `title \|\| getKindDisplayName(kind)` — View Steps path does not |
| **aioncore** | Test `session_tool_call_update_omits_missing_fields_for_frontend_merge` — `tool_call_update` **intentionally omits** `title`; expects frontend merge to keep first `tool_call` title |
| **Merge** | `mergeAcpToolCallContent` shallow-spreads `update`; empty `title: ""` could wipe prior title |

**Likely root cause:** First persisted/merged `acp_tool_call` has no `title` (only completion update, or CCB emitted empty title on first event). Normalizer does not fall back to `description` / `kind` / `_meta.claudeCode.toolName`.

## Scope

### In scope

- Repro capture (F12 / DB message JSON for `acp_tool_call` sequence)
- Fix `normalizeAcpToolCall` display name resolution + optional safer merge
- Unit tests mirroring aioncore omit-title update contract
- `chat-acp-flow.md` § View Steps / tool_call merge note
- Manual UI smoke on dev (price-library + quotation tool)

### Out of scope

- Changing orchestrator / MCP business logic
- 1.1.6 NSIS packaging (unless user expands)

## Acceptance criteria

- [x] **AC1** Repro doc: waived — user screenshot + code trace sufficient; JSON capture optional
- [x] **AC2** `normalizeToolCall.test.ts`: title-less `tool_call_update` after titled `tool_call` → non-empty `name`
- [x] **AC3** `normalizeToolCall.test.ts`: title-less-only event → fallback from `kind` / param summary / `_meta`
- [x] **AC4** `mergeAcpToolCallContent` does not replace non-empty title with empty string
- [x] **AC5** Manual UI: View Steps shows tool name on first step (user confirmed 2026-07-04)
- [x] **AC6** `chat-acp-flow.md` updated with merge/fallback contract
