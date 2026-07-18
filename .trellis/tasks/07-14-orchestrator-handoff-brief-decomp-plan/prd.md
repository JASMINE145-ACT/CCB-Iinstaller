# Orchestrator structured handoff brief + visible decomposition plan

| Field | Value |
|-------|--------|
| **Task** | `07-14-orchestrator-handoff-brief-decomp-plan` |
| **Status** | in_progress (implementing; plan approved via 执行) |
| **Parent map** | `.trellis/spec/integration/agent-team-architecture.md` · `work-routing-execution-contracts.md` |
| **Domain split (07-09)** | Brief → `WANd.RUN.EXECUTION` · Plan/steps → `WANd.ROUTING.ASSIGNMENT` · UI timeline → `WANd.OBSERVE.DELEGATION` |
| **MVP scope** | **1 + 2 only** (structured Brief + visible decomposition plan). Items 3–7 deferred. |
| **Plan gate lock** | **hard confirm** (2026-07-14) |

## Problem

Routing + Observation are solid (Path A/B, B0 `DelegationRun` nested View Steps). The gap is **multi-step decomposition**:

```text
Today:  User intent → one Agent(prompt="free text") → verbatim forward
Missing: Intent → Plan (steps) → confirm? → serial Brief→Agent() per step → judge/aggregate
```

Vague free-text handoffs are the top cause of subagent failure (Anthropic multi-agent research). Complex multi-intent turns over/under-decompose without effort scaling.

## Goal (MVP)

1. **Structured handoff Brief** — `Agent()` input is schema-shaped (or L1-enforced Markdown brief blocks), not raw user paraphrase.
2. **Visible Decomposition Plan** — on complex/multi-intent turns, orchestrator surfaces an ordered step list (Claude Code plan-mode-like), then executes step-by-step; each step maps 1:1 to a `DelegationRun` (B0 today; B1 bridge as the landing reason for Plan→Steps→Runs).

## North-star UX

**Simple (unchanged):** 「查直接50价格」→ 1 Brief → 1 `Agent(quotation-agent)` → forward.

**Complex:** 「查三个价、做报价、发给客户」

```text
Plan (visible)
  1. 查价 ×3     → quotation-agent   [Brief…]
  2. 出报价单     → quotation / excel  [Brief + artifact inputs]
  3. 发客户       → office/word       [Brief + prior artifact]
User: 确认 / 改序 / 删步
Execute: step 1 DelegationRun → step 2 → step 3
```

## Contract IDs (provisional + promote)

| Contract | Domain | Behavior |
|----------|--------|----------|
| `WANd.RUN.EXECUTION.003` *(provisional)* | Execution | Agent handoff carries Brief: `goal`, `inputs`, `expected_output`, `prohibitions`, `effort` |
| `WANd.ROUTING.ASSIGNMENT.004` *(provisional)* | Routing | Effort scaling: answer \| 1-delegate \| plan-then-serial; multi-intent → DecompositionPlan before Agents |
| `WANd.OBSERVE.DELEGATION.002` | Observability | Activate deferred B1: `_meta.delegationRun` enrich + Plan step ↔ Run timeline |

Preserve: `ASSIGNMENT.001` (no top-level business MCP), `EXECUTION.001` (sync spawn), `ADMISSION.001` (no background), `DELEGATION.001` (B0 reducer).

## In scope (MVP)

### P0 — Brief schema + L1 + validation

- Define Brief schema (JSON and/or rigid Markdown sections — decide in Phase 0 research).
- Teach `wande-orchestrator.md` (+ delegation index copy) to emit Brief on every `Agent()`.
- Execution-side: accept/normalize Brief in Agent prompt assembly; unit tests that free-text-only is discouraged or wrapped.
- Eval: ≥2 cases that assert Brief fields present on delegate (or transcript markers).

### P0 — Effort scaling in L1 + eval category

- Rules: simple Q = answer; single query = 1 delegation; multi-intent/complex = plan then serial.
- Add `decomp` (or similarly tagged) cases to `eval/agent_eval_cases.jsonl`: multi-intent → expected N delegations + order.

### P1 — Visible plan + user confirm + step↔Run

- Orchestrator produces visible step list for complex intent.
- User can confirm / lightly edit (minimum: confirm or cancel; edit-order nice-to-have).
- UI: Plan → Steps → each step’s `DelegationRun` on one timeline (extends B0; B1 enrich when parentToolUseId/stable step id needs CCB).
- Serial only for write/side-effect chains (align Cognition + `sanitizeOrchestratorAgentInput`).

## Out of scope / deferred (from architecture note §3–7)

| # | Item | Follow-up |
|---|------|-----------|
| 3 | Cross-specialist artifact pipeline (`inputs` = prior artifact path) | After Brief exists |
| 4 | Effort rules already partially in MVP P0 — full handbook polish deferred if eval passes | — |
| 5 | Failed-step actionable UX (Retry / Switch specialist) | After Plan↔Run |
| 6 | Long tasks → `work-tasks` MCP two-level decomp | Separate task |
| 7 | Routing correction → precipitation personal lane | Tie to `07-14-precipitation-effectiveness` funnel |

Non-goals: parallel write-side agents; personal habit auto-write; rewriting B0 reducer from scratch; aioncore new SSE event types (prefer `_meta` enrich).

## Acceptance criteria

- [ ] Brief schema documented in registry + agent-team / work-routing specs.
- [ ] Unit tests: Brief normalize/validate; missing required fields → fail or auto-wrap with telemetry (product lock).
- [ ] L1: effort scaling + Brief emission instructions.
- [ ] Eval: ≥1 multi-intent case expects N>1 ordered delegations; ≥1 single-intent still 1 Agent.
- [ ] Complex turn UI: visible plan before execution; after run, each step links to a `DelegationRun` group.
- [ ] Guid-direct Path B unchanged (no fake plan/Agent frames).
- [ ] `ASSIGNMENT.001` / `ADMISSION.001` still hold (forbidden MCP, no background).
- [ ] code-reviewer PASS (Layer A if picker; Layer B if renderer) + Contract Verification evidence rows.
- [ ] Manual smoke: simple quote + multi-intent plan confirm + Guid-direct.

## Open product lock (ask before implement)

**Plan gate:** ~~soft vs hard~~ → **LOCKED: hard confirm** for multi-intent / effort=high（2026-07-14 执行）.

## Related

| Artifact | Path |
|----------|------|
| Architecture gap | screenshots → agent-team “distribution & decomposition” |
| B0 shipped | `07-06-delegation-nested-view-steps` |
| Domain contracts | `07-09-work-routing-execution-contracts` |
| Precipitation funnel (routing correction later) | `07-14-precipitation-effectiveness` |
| Learn-from | Anthropic multi-agent research; Cognition “Don’t Build Multi-Agents”; Claude Code plan mode; Bedrock supervisor/routing |
