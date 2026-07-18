# Execution Plan — `07-14-orchestrator-handoff-brief-decomp-plan`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Approved** | 2026-07-14（用户：执行；plan gate = **hard confirm**） |
| **Scenario** | **A** (clear MVP from architecture recommendation) + **D-lite** (ccb-installer ↔ aionui-src serial merge) |
| **Plan depth** | Full |
| **Verification profile** | **UI** + Cross-repo |
| **Active phase** | Phase 4b — manual smoke (optional); MessageList plan bind follow-up |
| **Repos** | both (ccb-installer Agent/L1/eval + aionui-src Plan/Run UI) |
| **Parent maps** | `agent-team-architecture.md` · `work-routing-execution-contracts.md` · `WANd.OBSERVE.DELEGATION.002` deferred |
| **MVP** | Items **1 + 2** only (Brief + visible Decomposition Plan / B1 landing reason) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verify; Full depth; Scenario A + D-lite |
| skill-selection | Read: | Plan winner = this skill; Review = code-reviewer; TDD = superpowers discipline |
| trellis-before-dev | Read: | `.trellis/spec/frontend/index.md`, `integration/index.md`, `guides/index.md`, `agent-team-architecture.md`, `work-routing-execution-contracts.md`, `chat-acp-flow.md` §3.4c, registry `OBSERVE.DELEGATION.002` |
| codebase probe | Read: | `sanitizeOrchestratorAgentInput` (admission only); B0 `delegationRun.ts` in `D:\Projects\aionui-src`; backlog note “structured handoff” in work-routing §6 |
| trellis-brainstorm | Read: | Task-first create + seeded `prd.md`; **one** open product lock (plan gate) left for user |
| `task.py create` | Shell: | `07-14-orchestrator-handoff-brief-decomp-plan` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | capability matrix + plan |
| Phase 0 | **done** | hard confirm lock; research/*.md |
| Phase 1 | **done** | handoffBrief + sanitize + L1; see `p0-p3-brief-decomp-done.md` |
| Phase 2 | **done** | eval decomp cases added (live optional) |
| Phase 3 | **done** | decompositionPlan.ts + 4 vitest; B1 meta deferred |
| Phase 4 | **done** | code-reviewer PASS; registry + work-routing + chat-acp-flow updated |
| Phase 4b auto | **done** | tests 22+6; sync -Build -Deploy; derive plan wired; see `verification-auto-2026-07-14.md` |
| Phase 4b human | pending | restart UI + A/B/C smoke |
| plan lint | **PASS** | `lint_execution_plan.py` exit 0 |

## Verdict

Close the architecture gap past “intent → single free-text `Agent()`” by shipping **structured Brief** (Execution) + **visible plan-then-serial steps** (Routing) + **Plan↔DelegationRun timeline** (Observability / B1). Keep Cognition-aligned **serial + explicit handoff**; do not parallelize write chains. Defer artifact pipeline, retry UX, work-tasks level-2, precipitation routing correction.

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm | available | seeded prd + one lock question |
| Research | trellis-research (Agent) / main-session | available | `research/brief-schema.md` + `research/plan-ux.md` |
| TDD | superpowers:test-driven-development discipline | available | vitest / bun test / eval |
| Implement | trellis-implement / inline | available | — |
| Parallel | D-lite merge rules | available | Brief/L1 first → UI consumes schema |
| Review | Agent: code-reviewer | available | Layer A (routing identity) + Layer B (renderer) |
| Spec check | Agent: trellis-check | available | after implementation |
| Verify | §Step 5 UI profile | available | + Guid/orchestrator manual smoke |

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Approve plan + lock plan gate | user | Status→approved; PRD open lock closed |
| Start task | `python ./.trellis/scripts/task.py start 07-14-orchestrator-handoff-brief-decomp-plan` | in_progress |
| Persist research | main / trellis-research | `research/brief-schema.md`, `research/plan-ux-acp.md` |
| Re-read specs | trellis-before-dev | agent-team · work-routing · chat-acp-flow §3.4c · agents-unified-model (sync Agent) |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.RUN.EXECUTION.003` *(provisional)* | Handoff to specialist uses Brief (`goal` / `inputs` / `expected_output` / `prohibitions` / `effort`); not vague free text only | L1 playbook; Agent prompt assembly / normalize helper; optional extend `sanitizeOrchestratorAgentInput` peers | unit: normalize + required fields; eval transcript markers | cross-repo |
| `WANd.ROUTING.ASSIGNMENT.004` *(provisional)* | Effort scaling: answer \| one Agent \| plan-then-serial; multi-intent produces DecompositionPlan before Agents | `wande-orchestrator.md`; delegation index copy | `eval/agent_eval_cases.jsonl` decomp category | — |
| `WANd.OBSERVE.DELEGATION.002` | Plan step id ↔ `DelegationRun`; optional CCB `_meta.delegationRun` enrich when B0 insufficient | aionui Plan UI + `delegationRun.ts`; CCB meta emit if needed | unit Plan↔Run; UI smoke complex turn | ui + cross-repo |
| `WANd.ROUTING.ASSIGNMENT.001` *(regress)* | Orchestrator still no top-level business MCP | guards + L1 | existing guard tests + quote-delegates | security |
| `WANd.RUN.ADMISSION.001` *(regress)* | Still sync-only; strip `run_in_background` | `sanitizeOrchestratorAgentInput` | existing unit | — |
| `WANd.OBSERVE.DELEGATION.001` *(regress)* | B0 nested View Steps / Guid-direct no fake frame | `delegationRun.ts` | existing vitest | ui |

### Contract cards

### Contract: WANd.RUN.EXECUTION.003

**Behavior protected:** Subagent spawn prompt is a structured Brief so specialists and `:roe-judge` share stable goal/IO/prohibitions/effort.
**Primary code:** `ccb-installer/.../wande-orchestrator.md`, AgentTool / prompt assembly under `claude-code-b-src` + mirrored `ccb-installer/src` as applicable, optional brief normalize module.
**Tests:** unit normalize/validate; eval delegate cases require Brief sections or JSON fields.
**Eval / smoke:** single-intent quote still one Agent + Brief.
**Risk if broken:** redundant work, hallucinated scope, unstable ROE.

### Contract: WANd.ROUTING.ASSIGNMENT.004

**Behavior protected:** Complex/multi-intent messages get a visible ordered plan; execution is serial step Agents — not one mega-prompt or silent over-decomp of simple Qs.
**Primary code:** L1 orchestrator playbook; optional small planner helper; eval tags.
**Tests:** eval multi-intent → N ordered `subagent_type`s.
**Eval / smoke:** 「查直接50」→ 1 Agent (no plan UI required).
**Risk if broken:** wrong specialist order; user cannot see/control decomposition.

### Contract: WANd.OBSERVE.DELEGATION.002

**Behavior protected:** User sees Plan → Steps → Runs as one timeline; B1 meta enrich lands only if needed for stable step↔run link.
**Primary code:** `D:\Projects\aionui-src\packages\desktop\src\common\chat\delegationRun.ts` (+ Plan component); optional CCB `_meta` emit.
**Tests:** unit link fixtures; Layer B import smoke when renderer touched.
**Eval / smoke:** complex turn manual — plan visible, then nested runs per step.
**Risk if broken:** B0-only orphan steps; plan UX without execution truth.

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | Product lock + research Brief/plan ACP shape | docs-only | — | research | `research/*.md`, prd lock | schema + UX decision recorded | Fast |
| 1a | P0 | Brief schema + normalize/validate (TDD) | `EXECUTION.003` | cross-repo | TDD → implement | ccb-installer helper + tests | RED/GREEN unit | Standard |
| 1b | P0 | L1 Brief emission + effort scaling copy | `ASSIGNMENT.004` + `EXECUTION.003` | — | implement | `wande-orchestrator.md` (+ catalog injection if needed) | playbook diffs | Fast |
| 1c | P0 | Wire Brief into Agent prompt path (preserve EXECUTION.001 sync) | `EXECUTION.003` | cross-repo | implement | AgentTool / runAgent / profile sanitize peers | spawn still sync; Brief in prompt | Standard |
| 2 | P0 | Eval `decomp` cases + single-intent regression | `ASSIGNMENT.004` | — | TDD eval | `eval/agent_eval_cases.jsonl` (+ runner if tags needed) | multi-intent N Agents ordered | Standard |
| 3a | P0 | DecompositionPlan model + confirm UX | `ASSIGNMENT.004` + `DELEGATION.002` | ui | TDD → implement | aionui-src Plan UI / chat flow | hard/soft gate per lock | UI |
| 3b | P0 | Step ↔ `DelegationRun` timeline; B1 `_meta` **only if** B0 link fails research | `DELEGATION.002` | ui + cross-repo | implement | `delegationRun.ts` + optional CCB meta | Plan step shows matching run | UI |
| 4 | P0 | Gate: code-reviewer → Contract Verify → specs/registry → smoke | all | ui | agents | registry + agent-team + work-routing | PASS + evidence | UI |
| 5 | P2 | Deferred stubs only (artifact / retry / work-tasks / precip correction) | docs-only | — | — | prd Defer section | no code | Fast |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1a Brief normalize | EXECUTION.003 | missing schema tests / free-text accepted without wrap | exact unit path under ccb-installer (pin after research) | same |
| 1c Spawn path | EXECUTION.001 + .003 | Brief missing from prompt fixture | unit/integration spawn fixture | same + admission tests |
| 2 Eval decomp | ASSIGNMENT.004 | no multi-intent case | `node eval/run-agent-eval.mjs --case <decomp-id>` (or project eval cmd) | single-intent still passes |
| 3a Plan UI | ASSIGNMENT.004 / OBSERVE.002 | no plan component tests | `bun test` / vitest plan + link fixtures in aionui-src | same |
| 3b Run link | DELEGATION.001 + .002 | step id orphan | existing `delegationRun.test.ts` + new link cases | Guid-direct still no fake parent |
| Regress guards | ASSIGNMENT.001 / ADMISSION.001 | — | `bun test` agentSessionProfile tests | same |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.RUN.EXECUTION.003` | Brief unit + sanitize wrap | 22 pass (handoffBrief+profile) | **PASS** |
| `WANd.ROUTING.ASSIGNMENT.004` | L1 + eval decomp cases (UTF-8); live eval optional | cases present; hard confirm = L1 policy | **PASS** (unit/L1; live pending) |
| `WANd.OBSERVE.DELEGATION.002` | vitest plan sync + timeline consumer; Layer B smoke | 5 vitest; smoke PASS | **PASS** (slim; MessageList auto-feed follow-up) |
| `WANd.ROUTING.ASSIGNMENT.001` | guard tests + quote still delegates | profile tests | **PASS** |
| `WANd.RUN.ADMISSION.001` | sanitize strips background | profile tests | **PASS** |
| `WANd.OBSERVE.DELEGATION.001` | existing delegationRun path unchanged | B0 still used by syncTurnPlanWithTools | **PASS** |
| plan structure | lint | PASS | **PASS** |
| code-reviewer | Layer A/B | PASS (re-review after A6 fix) | **PASS** |

## Verification profile and gate

**Selected:** UI (+ Cross-repo serial merge)

1. **Contract Verification** — each touched contract row above  
2. **code-reviewer** primary (Layer A if routing identity/copy in picker surfaces; **Layer B** if `renderer/**`: `node scripts/review/smoke-renderer-imports.mjs`)  
3. Optional `trellis-check` for spec/jsonl compliance after review PASS  
4. Per-repo tests → serial: **Brief/L1/eval (ccb) first** → aionui Plan UI consumes stable schema  
5. Manual UI smoke (below)  
6. `trellis-update-spec` → agent-team · work-routing · chat-acp-flow §3.4c · promote provisional IDs in `agent-runtime-registry.yml`  
7. `implement.jsonl` + `check.jsonl` + prd AC `[x]`  
8. `git commit` only if user asks → `/trellis:finish-work`

## Parallelization (Scenario D-lite)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A — Brief / L1 / eval | ccb-installer (+ claude-code-b-src Agent path) | Lands schema + playbook **first** |
| B — Plan UI / Run link | aionui-src | Starts after schema freeze; must not invent alternate Brief fields |
| Conflict | Same file / dual schema | **Forbidden** — one owner for Brief type def |

Do **not** parallelize B1 CCB meta emit with B Plan UI unless Agent A publishes meta field names first.

## Manual steps (human)

- [ ] Default orchestrator: 「查直接50价格」→ 1 Brief + 1 nested `DelegationRun`; no forced plan UI  
- [ ] Multi-intent: plan visible → confirm (per lock) → steps execute serial → each step’s Run visible  
- [ ] Guid报价专家直连: no fake Agent/plan frame  
- [ ] Cancel / deny plan does not spawn Agents  
- [ ] Background Agent still blocked (`ADMISSION.001`)

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| Brief schema incompatible with Agent tool input | Phase 0 research | pivot Markdown-only Brief; update research + PRD | yes if AC change |
| Plan confirm needs new ACP event | Phase 0 `research/plan-ux-acp.md` | defensive UI vs backend event; Rule 0 | yes if protocol change |
| B0 alone links Plan↔Run | drop B1 from MVP | mark DELEGATION.002 slim (UI-only link) | no if AC still met |
| Eval cloud/API unavailable | keep offline fixtures + unit | note in Verification | no |
| Same failure twice | systematic-debugging + research note | — | no if AC fixed |
| User wants §3–7 in MVP | update PRD + this plan | — | **yes** |

## Defer / out of scope

- §3 Artifact-as-interface pipeline  
- §5 Retry / switch-specialist failed-step UX  
- §6 work-tasks two-level decomposition  
- §7 Routing correction → precipitation personal lane (`07-14-precipitation-effectiveness`)  
- Parallel specialist writes; LLM prompt loosening for precipitation  
- Replacing B0 reducer; aioncore new SSE types  

## Notes for implementers

- Domain ownership (07-09): do not put Brief validation inside renderer, or Plan routing policy inside `delegationRun.ts`.  
- Serial + shared workspace files later (§3) — MVP may pass artifact paths as Brief `inputs` strings without a formal pipeline.  
- Reference comps: Anthropic task briefs; Claude Code plan mode; Bedrock supervisor vs routing; OpenAI handoff-as-tool-params.
