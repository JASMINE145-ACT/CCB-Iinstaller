# PRD — Plan-lint hardening: cross-file consistency lint + Lite RED exemption

## Background

2026-07-12 design review of the trellis-plan-execution skill family identified two structural
risks, both confirmed live in-session:

1. **Silent cross-file drift.** Rules span 5 files (`.cursor/commands/trellis-plan-execution.md`,
   `.cursor/skills/trellis-task-execution/{SKILL.md,skill-selection.md,examples.md}`,
   `docs/ai-tools-reference.md`) linked by prose anchors (`§二`, `§Step 1`). Nothing validates
   them. Real drift instance: Step 1 grew to Scenarios A–L while two templates still said
   `A | B | C | D` (fixed in task 07-12-fix-skill-scenario-field-a-l). Note `.cursor/` is
   gitignored — these files have no git history, so a lint is the only drift protection.
2. **Lite depth is not lite.** `lint_execution_plan.py` unconditionally requires RED and GREEN
   markers. Docs-only tasks are forced to write "RED: N/A + reason" — ritual compliance that
   dilutes the gate.

User approved both improvements ("好的" following the review's two recommendations).

## Deliverables

### D1 — New script `.trellis/scripts/lint_skill_consistency.py`

Checks (all read from disk, repo-root-relative; exit 0 PASS / 1 FAIL, same style as
`lint_execution_plan.py`):

1. **Referenced files exist** — every `.cursor/skills/...` and `docs/...` path named in
   `.cursor/commands/trellis-plan-execution.md` §Load-the-skill block resolves on disk.
   Implementation: hardcode the canonical reference list in the script (source of truth),
   verify each exists.
2. **Section anchors exist** — required headings present:
   - `SKILL.md`: `Operating doctrine`, `Contract map (lite)`, `Step 1`, `Step 3b`, `Step 5`, `Step 6`
   - `skill-selection.md`: `一、`, `二、`, `三、`, `四、`
   - `docs/ai-tools-reference.md`: `五、` (协作场景), `八、` (验证)
3. **Scenario enumeration consistent** — `SKILL.md` Step 1 table defines rows `**A**`..`**L**`
   (all 12 present); stale pattern `A | B | C | D` (plain or table-escaped `A \| B \| C \| D`)
   absent from all 5 files.

### D2 — Lite RED exemption in `lint_execution_plan.py`

- If the plan text contains `docs-only/no-runtime-contract`, the RED-marker check is skipped
  (GREEN still required). All other checks unchanged.
- Update the SKILL.md §Operating doctrine lite section with one line documenting the exemption.

## Constraints

- Python 3, stdlib only, PEP 8, type annotations — match `lint_execution_plan.py` style.
- No behavior change to existing PASS cases: a current Standard/Full plan that passes today
  must still pass.
- Windows-safe: UTF-8 explicit encoding on all file reads.

## Acceptance criteria

1. `python ./.trellis/scripts/lint_skill_consistency.py` → `PASS` on the current tree.
2. Negative test: temporarily inject `A | B | C | D` into a checked file → script FAILs, then restore.
3. `python ./.trellis/scripts/lint_execution_plan.py` on a Lite docs-only fixture **without** RED → PASS;
   same fixture as non-docs-only → FAIL (RED still enforced).
4. Existing plan fixtures / real task plans keep their current PASS/FAIL results.

## Verification profile

Fast. GREEN commands = the two script invocations above with fixture evidence.
touches: docs-only/no-runtime-contract (lint tooling only, no runtime contract).
