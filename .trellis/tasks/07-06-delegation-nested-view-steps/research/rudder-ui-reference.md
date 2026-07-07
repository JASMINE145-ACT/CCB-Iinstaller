# Rudder UI reference — delegation / transcript (2026-07-06)

> **Purpose:** Capture borrowable patterns for `07-06-delegation-nested-view-steps`. Study-only; do not vendor Rudder code.

## What to borrow

| Rudder | WanD mapping |
|--------|----------------|
| `RunTranscriptView` single renderer across run detail + live widget + dashboard | One `normalizeTranscript`/`groupNormalizedToolCalls` pipeline for View Steps + SubagentDrawer |
| `spawn_agent` → `Spawned {type} agent: {task}` (`RunTranscriptView.semantic.tsx`) | `Agent(subagent_type)` → `委派 → 万鼎报价专家` |
| `DESIGN.md` §3.4.1 operator transcript language | Hide shell wrappers; show business-meaningful Read/MCP labels |
| `LiveRunWidget` + `ActiveAgentsPanel` agent identity + live preview | Future: in-chat「quotation-agent 运行中 · 2 tools」— **P2+ optional**, not P0 |
| `parentToolUseId` grouping (implicit in transcript blocks) | Wire existing AionUI `groupNormalizedToolCalls.ts` to UI tree |

## What not to borrow

- Issue/board run records, Postgres heartbeat, multi-runtime adapters
- Full raw/nice mode toggle — optional P2; P0 nested group is enough

## Key files (Rudder reference tree)

```text
docs/reference/rudder/ui/src/components/transcript/
  RunTranscriptView.tsx          # unified entry
  RunTranscriptView.semantic.tsx # spawn_agent, tool summaries
  RunTranscriptView.normalize.tsx

docs/reference/rudder/doc/engineering/DESIGN.md  # §3.4.1 Transcript Rendering
```

## WanD files (implementation targets — aionui-src)

```text
packages/desktop/src/common/chat/
  normalizeToolCall.ts           # parentToolUseId extract (exists)
  groupNormalizedToolCalls.ts    # grouping (exists, 6/6 tests)
packages/desktop/src/renderer/pages/conversation/Messages/components/
  MessageToolGroupSummary.tsx    # View Steps — wire nested render
  SubagentDrawer.tsx             # P1 nested timeline
```

## WanD approach (this task)

**A + B0** — not full Rudder Run DB:

| Rudder | This task (B0) |
|--------|----------------|
| Server-persisted run records | `buildDelegationRuns()` in memory from ACP events |
| `spawn_agent` semantic in bridge | Same semantics in `delegationRun.ts` + View Steps header |
| LiveRunWidget 3s poll | Optional P1 chip while `status === 'running'` |

B1 (CCB `_meta.delegationRun`) **deferred** — see `research/delegation-run-b0-contract.md`.
