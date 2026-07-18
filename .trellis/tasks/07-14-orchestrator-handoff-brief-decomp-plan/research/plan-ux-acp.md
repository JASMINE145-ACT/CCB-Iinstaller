# Research — Plan UX / ACP

| Field | Value |
|-------|--------|
| **Task** | `07-14-orchestrator-handoff-brief-decomp-plan` |
| **Contract** | `WANd.ROUTING.ASSIGNMENT.004` + `WANd.OBSERVE.DELEGATION.002` |
| **Date** | 2026-07-14 |

## Product lock (approved by「执行」+ prior recommendation)

**Hard confirm** for multi-intent / `effort=high` plans: no `Agent()` until user confirms. Soft auto-continue is out of MVP.

## ACP shape (MVP)

Prefer **L1 + AskUserQuestion / chat confirm message** over new aioncore SSE:

1. Orchestrator emits a visible DecompositionPlan markdown (and optional AskUserQuestion).
2. On confirm, serial `Agent()` with Brief per step (`plan_step_id` in Inputs).
3. UI links steps → `DelegationRun` via B0 `parentToolUseId`; B1 `_meta.delegationRun` only if live dumps lack parent links.

## Anti-patterns

- Do not invent a second reducer next to `buildDelegationRuns`.
- Guid-direct: no fake plan/Agent frames.
