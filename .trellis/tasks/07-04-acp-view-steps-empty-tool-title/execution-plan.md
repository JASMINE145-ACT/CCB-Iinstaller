# Execution Plan — `07-04-acp-view-steps-empty-tool-title`

| Field | Value |
|-------|--------|
| **Status** | `completed` |
| **Active phase** | — |

**PRD:** [`prd.md`](./prd.md)

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| Explore | **done** | 2026-07-04 screenshot + code trace |
| Plan | **done** | approved 2026-07-04 |
| P0 A repro capture | waived | user screenshot + manual confirm |
| P1 B fix normalize + merge | **done** | `aionui-src` normalizeToolCall + chatLib |
| P1 C unit tests | **done** | vitest 5/5 |
| P2 D spec | **done** | `chat-acp-flow.md` §3.4b |
| Gate | **done** | code-review PASS; user UI OK |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | `trellis-before-dev` → frontend | available | `chat-acp-flow.md` |
| Repro / debug | systematic-debugging | available | F12 + DB `getConversationMessage` |
| Implement | inline `aionui-src` | available | trellis-implement |
| Review | `code-reviewer` | available | `trellis-check` |
| UI smoke | manual dev | available | `start-dev-full.ps1` |

---

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| Activate | `task.py start 07-04-acp-view-steps-empty-tool-title` | `in_progress` |
| Read spec | `trellis-before-dev` → `chat-acp-flow.md` §3.3–3.4 | contract noted |
| Read aioncore test | `events/mod.rs` `session_tool_call_update_omits_missing_fields_for_frontend_merge` | merge contract confirmed |

---

## Phase 1…N — Workstreams

| Phase | P | WS | Risk | Tool | Files | Required output | Profile |
|-------|---|-----|------|------|-------|-----------------|---------|
| 1 | P0 | A — repro & event trace | ui | debug | `research/repro-*.md` | JSON: first `tool_call` vs `tool_call_update` for same `tool_call_id` | UI |
| 1 | P1 | B — display name resolver | ui | TDD → implement | `normalizeToolCall.ts`, optional `chatLib.ts` | `resolveAcpToolDisplayName()` with fallbacks | Standard |
| 1 | P1 | C — merge hardening | concurrency | TDD | `chatLib.ts` `mergeAcpToolCallContent` | empty title must not clobber | Standard |
| 2 | P2 | D — spec + checklist | docs | trellis-update-spec | `chat-acp-flow.md` | View Steps fallback documented | Fast |

### Proposed fix (B — for approval)

```text
resolveAcpToolDisplayName(update, meta?):
  1. update.title (trim, non-empty)
  2. meta?.claudeCode?.toolName (CCB completed_tools path)
  3. buildParamSummary(kind, rawInput)
  4. kind label (reuse MessageAcpToolCall getKindDisplayName)
  5. "Tool" last resort

MessageToolGroupSummary ToolItemDetail:
  displayName = name || description || kind || "Tool"
```

### TDD contract

| WS | Test level | RED | GREEN | Regression |
|----|------------|-----|-------|------------|
| B | unit | `title` missing on completed-only update | `vitest normalizeToolCall.test.ts` | existing titled tool_call test |
| C | unit | merge incoming `{ title: '' }` | merge preserves prior title | aioncore omit-field contract |
| A | manual | N/A | repro md + screenshot | price-library edit path |

---

## Verification profile and gate

**Selected:** UI

1. code-reviewer PASS (`aionui-src` diff)
2. `cd aionui-src && bunx vitest run tests/unit/common/normalizeToolCall.test.ts` (+ merge test if added)
3. Manual: repeat user scenario → View Steps row shows name
4. `trellis-update-spec` → `chat-acp-flow.md`
5. `implement.jsonl` + `check.jsonl` + prd AC `[x]`

---

## Manual steps (human)

- [ ] Dev running: `start-dev-full.ps1 -SkipBootstrap`
- [ ] Reproduce: price-library supplier edit OR quotation `match_quotation`
- [ ] F12: filter `acp_tool_call` / `[toolCallGrouping]`; save first event JSON
- [ ] Confirm View Steps name visible after fix

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Root cause is CCB never sends title on initial `tool_call` | Add WS E: CCB `bridge` title audit | yes |
| Fix requires aioncore to always echo title on updates | WS E aioncore translate | yes |
| Only historical DB rows broken | Document + forward-fix only | no |

---

## Defer / out of scope

- Redesign View Steps UI (icons, MCP server badges)
- i18n tool name templates (future)
