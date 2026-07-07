# Delegation spawn observability contract — B0.1 (2026-07-07)

> **Scope:** Frontend mirror of AGENT.INSTRUCTIONS.001 for the same task as B0 View Steps.  
> **Does not change** `runAgent.ts` or dev startup — tests + pure assess functions only.

## Why B0.1 in this task

View Steps B0 answers **「树长什么样」**. B0.1 answers **「spawn 后 UI 能否验证 stable/dynamic/ephemeral 信号齐全」** — aligned with `docs/asda` §2 without importing Rudder scene bundles.

## Tier mapping (WanD)

| Tier | CCB authoritative source | UI observability (ACP events) | Module field |
|------|--------------------------|-------------------------------|--------------|
| **Stable** | L1 `agents/<id>.md` body at spawn | `subagent_type` / `subagentLabel` on Agent row | `fields[].key = subagent_type` |
| **Dynamic** | `mergeEmployeeProfile`, spawn output JSON | `agentId`, `tool_uses`, nested child count | `childAgentId`, `childToolCount` |
| **Ephemeral** | Orchestrator handoff prompt | Agent `input` / user turn message | `delegation_prompt` presence |

## Child link modes

| Mode | Meaning |
|------|---------|
| `explicit-parent` | Child `_meta.claudeCode.parentToolUseId` matches Agent `tool_call_id` |
| `sequential-fallback` | Children nested via post-Agent sequential grouper (Path A smoke) |
| `orphan-mismatch` | Agent output `tool_uses > 0` but UI grouper shows zero children — **unhealthy** |
| `none` | No children yet (running) or Guid-direct |

## API (aionui-src)

`packages/desktop/src/common/chat/delegationSpawnContext.ts`

```typescript
assessDelegationSpawnObservability(run, allTools) → report
assessTurnDelegationSpawn(tools) → { runs, guidDirect, allHealthy }
isGuidDirectTurn(tools) → boolean
PATH_A_ORCHESTRATOR_SMOKE_TOOLS // frozen 2026-07-07 smoke fixture
```

## Tests

`tests/unit/common-chat/delegationSpawnContext.test.ts` — 6 cases:

1. Path A smoke healthy (agentId `a7bef2f70cb5d93da`, 2 tools)
2. Explicit `parentToolUseId`
3. Guid-direct (no fake delegation)
4. Orphan-mismatch unhealthy
5. Running delegation tolerates empty children
6. Stable/dynamic/ephemeral field tiers

## Out of scope (unchanged)

- CCB `runAgent.ts` merge order changes
- Runtime `console.warn` on dev startup (would risk noise; tests only)
- B1 bridge `_meta.delegationRun`

## Follow-up trigger

Open backend spawn contract task only if B0.1 reports `orphan-mismatch` on >10% live turns **and** sequential fallback still misleads operators.
