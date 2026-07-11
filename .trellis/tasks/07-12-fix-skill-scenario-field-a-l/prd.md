# PRD — Fix stale Scenario field (A|B|C|D → A–L) in trellis-task-execution SKILL.md

## Background

2026-07-12 audit of `.cursor/commands/trellis-plan-execution.md` confirmed the command and
`SKILL.md` §Step 1 both classify tasks into scenarios **A–L**, but two template snippets in
`SKILL.md` still offer only `A | B | C | D` for the Scenario field. A task classified F–L
(build failure / refactor / security / perf / release / docs / research) cannot fill the
template field truthfully by copying it.

User confirmed the fix in-session ("完善 瑕疵").

## Scope

Docs-only (Scenario K). Two lines in one file:

| Location | Current | Target |
|----------|---------|--------|
| `.cursor/skills/trellis-task-execution/SKILL.md:263` (Step 3 plan template) | `**Scenario:** A \| B \| C \| D` | Full A–L range, pointing at §Step 1 |
| `.cursor/skills/trellis-task-execution/SKILL.md:361` (Step 3b execution-plan.md header template) | `\| **Scenario** \| A \\\| B \\\| C \\\| D \|` | `A–L (see §Step 1)` |

## Non-goals

- No change to `.cursor/commands/trellis-plan-execution.md` (already A–L, verified).
- No change to `lint_execution_plan.py` (it only checks the term `Scenario` exists, not its value — verified 2026-07-12).
- No change to skill-selection.md / examples.md (grep found no other `A | B | C | D` occurrences under `.cursor/`).

## Acceptance criteria

1. Grep for `A \| B \| C \| D` (both plain and table-escaped variants) under `.cursor/` returns no matches.
2. Both template spots reference the full A–L range and point at §Step 1 as the source of truth.
3. No runtime contract touched — `touches: docs-only/no-runtime-contract`.

## Verification

- GREEN: grep for the stale pattern returns empty; visual read of the two edited regions.
- Profile: Fast (docs-only).
