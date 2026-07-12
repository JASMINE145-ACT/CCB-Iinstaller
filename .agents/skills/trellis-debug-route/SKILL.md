---
name: trellis-debug-route
description: "Route Trellis bug fixes and build failures through root-cause-first debugging. Use for Scenario C bugs, Scenario F build failures, repeated failed fixes, failing tests without a known cause, or when execution-plan.md recovery rules say to debug before editing."
---

# Trellis Debug Route

Find the cause before fixing the code.

## Classify

- Scenario C: runtime behavior regression, production symptom, test failure with unknown root cause.
- Scenario F: pure build, compile, typecheck, packaging, or dependency failure.

## Required Process

1. Read the task `prd.md`, `execution-plan.md`, and relevant spec index.
2. Capture the symptom:
   - failing command
   - expected behavior
   - actual behavior
   - first known bad phase or commit if known
3. Produce a minimal repro:
   - failing test, eval, smoke, or exact command
   - if no RED is possible, write the reason into the TDD contract
4. Root-cause route:
   - Scenario C: invoke or follow `superpowers:systematic-debugging` before any fix.
   - Scenario F: use the relevant build resolver if available; after two failed rounds, escalate to systematic debugging.
5. Persist evidence under `.trellis/tasks/<task-dir>/research/` when the diagnosis is non-trivial.
6. Update `execution-plan.md` recovery/progress rows with the root cause and next GREEN command.

## Fix Boundary

Only implement after the root-cause hypothesis explains the repro. Keep the fix minimal and tied to the touched contract.

## Completion

Route to `trellis-contract-verify` after the fix. If the bug reveals a missing rule, update `.trellis/spec/**` or record why no spec update is needed.
