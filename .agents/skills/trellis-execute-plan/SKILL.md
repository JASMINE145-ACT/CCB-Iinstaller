---
name: trellis-execute-plan
description: "Execute an approved Trellis execution-plan.md phase-by-phase. Use when the user says execute task, implement, continue from execution-plan.md, resume an approved plan, or asks Codex to run the next active phase of a Trellis task."
---

# Trellis Execute Plan

Execute the durable plan, not chat memory.

## Required Inputs

1. Locate the task:
   - If the user named one, use `.trellis/tasks/<task-dir>/`.
   - Otherwise run `python ./.trellis/scripts/task.py current --source`.
2. Read, in order:
   - `.trellis/tasks/<task-dir>/execution-plan.md`
   - `.trellis/tasks/<task-dir>/prd.md`
   - any latest `p*-*-done.md` or Progress snapshot referenced by the plan.
3. Refuse to implement if `execution-plan.md` is missing or `Status` is not `approved` or `in_progress`.

## Execution Rules

- Set `Status: in_progress` before code changes if it is still `approved`.
- Execute only the `Active phase` or the next unchecked phase.
- Follow each workstream row exactly: `touches`, `Risk`, `Files`, `Required output`, `Profile`.
- Apply the Superpowers executing-plans discipline:
  - Review the plan critically before starting.
  - Follow listed steps in order.
  - Run the specified GREEN command and refactor guard.
  - Stop on unclear instructions, missing dependencies, or repeated verification failure.
- Do not commit unless the user explicitly asks.

## Progress Evidence

After each phase:

1. Update `execution-plan.md` Progress snapshot with:
   - phase id
   - files changed
   - RED/GREEN evidence
   - verification commands and result
   - remaining risks
2. If the phase produced a durable note, save it as `.trellis/tasks/<task-dir>/p<phase>-<slug>-done.md`.
3. If behavior or contract changed, route to `trellis-contract-verify` before claiming the phase is done.

## Stop Conditions

Stop and ask for approval when:

- The implementation would change PRD scope or acceptance criteria.
- A contract ID is wrong, missing, or no longer describes the behavior.
- The RED test cannot be produced and the plan did not justify `N/A`.
- Two attempts fail for the same symptom; route to `trellis-debug-route`.
- Parallel streams need to edit the same canonical file; route to `trellis-parallel-route`.
