# DelegationRun B0 — frontend-only contract (2026-07-06)

> **Tier:** B0 — derived at render time from existing ACP tool events. **No** CCB bridge enrich, **no** DB, **no** new SSE event type.

## Why B0 inside Plan A

Plan A alone = nested tree **after** grouping. B0 adds a **single reducer type** so View Steps, SubagentDrawer, and optional live chip share one model — without touching the 4-layer CCP chain.

## Type (aionui-src — proposed path)

`packages/desktop/src/common/chat/delegationRun.ts`

```typescript
export type DelegationRunStatus = 'running' | 'done' | 'blocked'

export type DelegationRun = {
  /** Agent tool_call_id — groups children via parentToolUseId */
  parentToolUseId: string
  subagentType: string
  displayLabel: string // 「万鼎报价专家」| fallback subagentType
  childAgentId?: string // from Agent output when completed (agentId field)
  childToolCount: number // len(children) or output tool_uses when done
  status: DelegationRunStatus
  children: NormalizedToolCall[]
  startedAt?: number
  completedAt?: number
}

export function buildDelegationRuns(
  tools: NormalizedToolCall[],
  options?: { resolveDisplayName?: (id: string) => string | undefined },
): DelegationRun[]
```

## Derivation rules

| Field | Source | Notes |
|-------|--------|-------|
| `parentToolUseId` | Agent row `toolCallId` | Must match child `_meta.claudeCode.parentToolUseId` |
| `subagentType` | Agent `rawInput.subagent_type` | Required for delegation rows |
| `displayLabel` | CCB catalog `display_name` → fallback `subagentType` | No network in reducer; inject resolver |
| `children` | `groupNormalizedToolCalls` output for this parent | Reuse existing grouper |
| `childToolCount` | `children.length`; when Agent `done`, prefer `output.tool_uses` if present | Live: count completed+running children |
| `childAgentId` | Parse Agent tool **output** JSON for `agentId` when status `done` | Not available mid-run — OK |
| `status` | `running` if Agent or any child running; `done` if Agent done and no child running; `blocked` if Agent denied/error | Map from tool status enums |
| timestamps | First child or Agent `startedAt`; `completedAt` when status → `done` | Optional P1 polish |

## UI surfaces (single consumer)

| Surface | Uses DelegationRun |
|---------|------------------|
| `MessageToolGroupSummary` | Nested tree + header `委派 → {displayLabel} · {status} · {childToolCount} tools` |
| `SubagentDrawer` | Same `buildDelegationRuns` for selected parent id |
| Optional live chip (P1) | Compact row above assistant reply while `status === 'running'` |

## Explicit non-goals (B1 deferred)

- CCB emitting `_meta.delegationRun` on spawn
- aioncore new event types
- Persisting runs to SQLite / conversation DB
- Changing orchestrator guards or `runAgent.ts`

## Follow-up task trigger

Open **B1 bridge enrich** only if Phase 0e proves `parentToolUseId` missing on >10% child tools in live dump **and** sequential fallback still confuses users.
