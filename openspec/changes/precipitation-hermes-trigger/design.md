## Context

Parent contract: `openspec/changes/memory-experience-clarity/hermes-trigger-port.md` v3.  
Hermes lock: `1600008ab00e…` (`research/hermes-source-lock.md` in sibling change).

Shipped today: renderer `useSessionPrecipitationSchedule` (30s idle + cancel on send) → `ccbPrecipitation.schedule` → detached worker → pending inbox.

## Goals / Non-Goals

**Goals:**
- TurnHarvest mainline in main process
- Checkpoint every completed turn; FullReview on nudge N=5 (configurable) or force/fallback
- Watermark freeze `reviewThroughTurnId`; re-queue if latest advanced
- Lease prevents double detached workers after restart
- Per-run outcome file drives state machine
- Promote org rules only when applied verified

**Non-Goals:**
- mem0 / MemoryProvider
- Auto-write `memory/business/*`
- Every-turn LLM (12k transcript)
- ≥50 labelled eval set (follow-up task; smoke + unit first)

## Decisions

### D1 — Scheduler lives in Electron main (`ccbPrecipitation.ts` / new module)
Renderer only emits turnCompleted / force; no business obligation ownership.

### D2 — Defaults
| Param | Value |
|-------|-------|
| checkpoint coalesce | 1s |
| nudge N | 5 |
| idle fallback | 10min (legacy path retained as fallback) |
| lease TTL | 15min |

### D3 — Outcome path
`learning/precipitation_runs/<runId>.outcome.json` (temp + rename).

### D4 — Idle
Keep armed/cancel events for fallback; TurnHarvest does not cancel obligations on user-send.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| aionui outside openspec root | implement anyway; change docs live in claude-code-best |
| Orphan workers | lease + ignore stale |
| Cost of more reviews | N=5; no every-turn LLM |

## Migration Plan

1. Ship outcome writer (backward compatible)
2. Ship scheduler behind flag `ccb_turn_harvest=1` default **on** in dev, then default on
3. Idle remains as session-end/long-idle fallback
4. Rollback: env/localStorage disable harvest → legacy idle only
