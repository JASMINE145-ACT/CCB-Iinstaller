# Execution Plan — `07-03-p5-manufacturing-scheduling-pilot`

| Field | Value |
|-------|-------|
| **Status** | completed |
| **Approved** | 2026-07-03 (user instructed continuous phase execution) |
| **Scenario** | A |
| **Plan depth** | Standard |
| **Verification profile** | Standard |
| **Active phase** | complete |

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| Design | completed | independent design review PASS after one correction cycle |
| RED | completed | connector missing-server failure; full chain 1/5 PASS |
| GREEN | completed | connector 3/3; P5 integration 5/5 |
| Review | completed | independent implementation review PASS after five findings fixed |
| Gate | completed | regression 12/12 PASS; exact evidence in `p5-manufacturing-scheduling-done.md` |

## Capability matrix

| Capability | Route | Status | Fallback |
|------------|-------|--------|----------|
| Task execution | `trellis-task-execution` | available | main-session artifacts |
| Scheduling design | `production-scheduling` | unavailable | deterministic fixture contract in ADR and tests |
| TDD | `test-driven-development` | unavailable | explicit RED/GREEN commands recorded manually |
| Review | independent agent | available | inline diff/spec audit |
| Completion proof | `verification-before-completion` | unavailable | exact commands and outputs in check evidence |

## Workstreams

| Phase | Workstream | Risk | Files | Required output |
|-------|------------|------|-------|-----------------|
| 1 | ADR and package contract | packaging | task research/PRD | approved design |
| 2 | Package and MCP | packaging | package-owned directory | failing test, then implementation |
| 3 | Full-chain acceptance | packaging | dedicated P5 test | registry/compiler/control/lifecycle evidence |
| 4 | Review and closure | — | spec/task artifacts | independent PASS, done record, commit |

## TDD contract

| Workstream | Level | RED evidence | GREEN command | Regression target |
|------------|-------|--------------|---------------|-------------------|
| Connector | unit/contract | package test cannot import missing server | `node --test .../connector.test.mjs` | deterministic feasible scheduling and errors |
| Full chain | integration | P5 test cannot find new package | `node --test ccb-installer/scripts/__tests__/p5-manufacturing-pilot.test.mjs` | discovery, compile, coexistence, lifecycle, control-plane |

Connector RED covers initialization, tool schemas and all calls, protocol error
codes, process continuity, stable repeated output, capacity-window containment,
non-overlap, precedence, and infeasible input.

Full-chain RED covers source/artifact completeness, unique IDs, WanD-only
versus dual-package differential, real-package temporary upgrade/rollback,
coexistence, exact observed revisions with zero drift, and a P5 changed-path
allowlist rooted at baseline `16cff83f4305a102103459bfb2a671c5fd456353`.

## Gate

1. Independent design review before implementation.
2. RED tests fail for missing behavior.
3. Implement only package-owned code and tests.
4. Independent implementation/spec review.
5. Run targeted tests plus existing registry/compiler/lifecycle/control-plane
   regression suites.
   The integration test compares WanD-only and dual-package projections and
   asserts manufacturing values are purely additive.
6. Update integration spec, JSONL evidence, PRD acceptance, done record, parent
   progress, and manual checklist.
7. Commit P5 separately.

## Recovery

| Trigger | Return to | Rule |
|---------|-----------|------|
| Platform core edit appears necessary | design | core implementation remains untouched |
| Same failure repeats twice | diagnosis | persist root cause before another change |
| Connector schedule violates capacity/precedence | RED | add minimal counterexample first |
| Manual production/UI action needed | closure | add unchecked item; do not claim it ran |
