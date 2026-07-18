# Phase 0–3 delivery — handoff brief + decomp plan

| Field | Value |
|-------|--------|
| **Date** | 2026-07-14 |
| **Product lock** | **Hard confirm** (user「执行」+ plan recommendation) |

## Delivered

### Phase 0
- `research/brief-schema.md` — Markdown Brief + marker; sanitize wrap
- `research/plan-ux-acp.md` — hard confirm; B1 optional

### Phase 1 (EXECUTION.003)
- `ccb-installer/claude-code-b-src/src/services/acp/handoffBrief.ts`
- Wired in `sanitizeOrchestratorAgentInput`
- Mirrored to `ccb-installer/src` + `D:\claude-code-B`
- Sync script includes `handoffBrief.ts` + test
- L1: `wande-orchestrator.md` EXECUTION.003 + ASSIGNMENT.004 + FIDELITY→Brief

### Phase 2
- Eval: `orchestrator-decomp-single-still-one-agent`, `orchestrator-decomp-multi-intent-plan-gate` in `eval/agent_eval_cases.jsonl` (live run pending / not required for unit GREEN)

### Phase 3 (ASSIGNMENT.004 / OBSERVE.002 slim)
- `aionui-src/.../decompositionPlan.ts` — plan model, hard confirm, link↔DelegationRun, markdown formatter
- B1 CCB `_meta` **deferred** — B0 parentToolUseId link sufficient for MVP

## GREEN evidence

```text
D:\claude-code-B: bun test handoffBrief + agentSessionProfile → 21 pass
aionui-src: npm run test -- tests/unit/common-chat/decompositionPlan.test.ts → 4 pass
```

## Remaining
- code-reviewer + Layer B if renderer touched (common only — N/A Layer B)
- Spec/registry promote provisional IDs
- Manual UI smoke (complex plan confirm)
- Live eval decomp cases (optional cloud)
