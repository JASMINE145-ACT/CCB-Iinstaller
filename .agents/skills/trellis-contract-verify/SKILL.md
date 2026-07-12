---
name: trellis-contract-verify
description: "Run the Trellis Contract Verification gate for implementation work. Use before claiming a phase or task is complete, after code changes, after tests pass, when updating execution-plan.md evidence, or when checking contract IDs, specs, evals, smokes, and manual gates."
---

# Trellis Contract Verify

Verify behavior contracts, not just changed files.

## Inputs

Read:

1. `.trellis/tasks/<task-dir>/execution-plan.md`
2. `.trellis/tasks/<task-dir>/prd.md`
3. The applicable `.trellis/spec/**` index for every touched layer.

Use the plan's `Contract map`, `TDD contract`, `Contract Verification`, and selected verification profile as the source of truth.

Run the structural lint before the gate:

```bash
python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/<task-dir>/execution-plan.md
```

Fix lint failures before claiming the plan or phase is complete.

## Gate Chain

For each touched contract:

1. Confirm `touches` has a concrete contract ID or `docs-only/no-runtime-contract`.
2. Run the bound unit, contract, integration, eval, or smoke command.
3. For UI/runtime/agent behavior, run the required smoke or record the manual gate as pending.
4. Record command, result, and evidence path in `execution-plan.md`.
5. Decide whether `.trellis/spec/**` or a contract registry needs an update.

Then run one primary review path:

- `trellis-check` for spec compliance, or
- `code-reviewer` / language reviewer for diff quality.

Do not mix multiple review systems as substitutes for missing contract evidence.

## Profiles

- `Fast`: targeted command plus one primary review.
- `Standard`: lint/typecheck where applicable, tests, primary review.
- `UI`: Standard plus E2E or explicit manual UI smoke.
- `Release`: build, package/deploy, smoke, recovery check, manual acceptance.
- `Security`: Standard plus security review/tests for trust boundaries.
- `Cross-repo`: per-repo tests, serial sync/merge, integrated smoke.

## Output

Update `execution-plan.md`:

- Contract Verification table status.
- Progress snapshot row.
- Spec-update decision: `updated <path>` or `spec: no update`.

Only report complete when every required contract row has evidence or an explicit accepted `N/A`.
