# Orchestrator 委派路径加固与 eval 基线

## Goal

Make **wande-orchestrator → specialist `Agent()`** dispatch **measurable, regressable, and production-trustworthy**, while preserving **Guid direct specialist** as the recommended fast path for quotation/accurate.

After this task:

1. A documented **smoke matrix** covers default-session delegation vs Guid direct (≥6 scenarios).
2. **Idle resume** on specialist cards does not re-bind `wande-orchestrator` (regression tied to Issue 3 / packaging 1.1.6).
3. **CCB runtime** allows orchestrator to delegate office presets without `delegatable:false` footguns (source fix if still needed).
4. An **eval scenario** exists to compare orchestrator delegation vs direct specialist on the same prompts.
5. **Spec + packaging backlog** Issue 3 checklist updated with evidence links.

## Background (2026-07-04 explore)

Architecture is **intentionally dual-path**:

| Path | When | Mechanism |
|------|------|-----------|
| **Guid direct** | User picks 万鼎报价/账务专家 card | `isSpecialistDirectSession` → direct MCP, `agents=[]` |
| **Default orchestrator** | Mixed intent, office, research, no card | `Agent(subagent_type=…)` sync delegation |

Runtime guards (`evaluateOrchestratorToolGuard`, `sanitizeOrchestratorAgentInput`, `wanDEnvBootstrap`) are **substantially implemented**. Gaps are **operational proof** and **known edge cases**, not missing orchestrator concept.

**Explore verdict:** Guid direct **OK**; orchestrator delegation **basically OK but erratic** vs direct; no agent-level eval quantifying the gap.

Source: chat explore 2026-07-04; [`ccb-installer/packaging-backlog-1.1.6.md`](../../../ccb-installer/packaging-backlog-1.1.6.md) Issue 3.

## Problem statement

| # | Symptom | Layer |
|---|---------|-------|
| P1 | Default session「查价」works but slower / more turns than Guid | orchestrator + delegation |
| P2 | Resumed specialist chat → `wande-orchestrator 不得直接调用业务 MCP` | profile drift on idle (overlap 06-29) |
| P3 | `Agent(quotation-agent)` delegated subagent ignores SOP / erratic | historical GBK body; subagent context asymmetry |
| P4 | `Agent(word-creator)` rejected when office `delegatable:false` experiment | `filterDelegatableCustomAgents` global |
| P5 | No eval to prove delegation path quality | missing harness |

## Scope

### In scope

| WS | Deliverable |
|----|-------------|
| **A** | Smoke matrix doc + manual run log (`delivery-smoke-matrix.md`) |
| **B** | Confirm/fix idle resume on specialist Guid; log `[ACP] agent session profile applied: <id>` |
| **C** | CCB: `filterDelegatableCustomAgents` bypass when `isWandeOrchestratorSession` + `CCB_ROUTER_DELEGATABLE_AGENT_IDS`; unit test |
| **D** | Eval scenario `eval/scenarios/orchestrator-delegation-vs-direct-20260704.md` (+ optional script stub) |
| **E** | Update `agents-unified-model.md` § dispatch health; playbook § orchestrator; packaging-backlog Issue 3 checkboxes |

### Out of scope

- Replacing orchestrator with single-agent-only architecture
- Changing orchestrator guard rules (still must not call `mcp__quotation__*` directly)
- 1.1.6 NSIS / exe packaging (separate release; this task feeds its checklist)
- `price-library-agent` routing from default session (document as Guid-only unless product asks)

## Acceptance criteria

- [ ] **AC1** Smoke matrix: 6 cases documented with PASS/FAIL + session profile log snippet
- [ ] **AC2** Guid quotation + accurate: direct MCP, no `Agent()` card on specialist session
- [ ] **AC3** Default session: `Agent(quotation-agent)` / `Agent(accurate-agent)` returns table/price **same turn** (no TaskOutput / no「请稍候」placeholder)
- [ ] **AC4** Idle resume specialist: profile remains specialist (regression after 5min idle or forced warmup)
- [ ] **AC5** If CCB change shipped: `bun test` agentSessionProfile tests pass; orchestrator can `Agent(word-creator)` when delegatable sidecar true
- [ ] **AC6** Eval scenario file committed with ≥3 prompt pairs (default vs Guid)
- [ ] **AC7** Spec/backlog updated; `execution-plan.md` status `completed` with evidence rows

## Canonical references

- [`.trellis/spec/integration/agents-unified-model.md`](../../spec/integration/agents-unified-model.md) — specialist direct, orchestrator guards, erratic delegation note
- [`ccb-installer/claude-code-b-src/src/services/acp/agentSessionProfile.ts`](../../../ccb-installer/claude-code-b-src/src/services/acp/agentSessionProfile.ts)
- [`docs/ccb-wanding-agent-engineering-maturity.md`](../../../docs/ccb-wanding-agent-engineering-maturity.md) §4.2

## Related tasks

| Task | Relationship |
|------|----------------|
| `06-29-specialist-session-resume-profile-drift` | Subset: idle profile drift (B may close or verify remaining gap) |
| `06-19-fix-eval-cases-agent-eval` | Eval harness patterns for WS D |
| `06-30-full-system-review` | System-level orchestrator mention |
