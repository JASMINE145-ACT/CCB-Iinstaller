# PRD — Slim trellis-plan-execution command (222 → ~150 lines, keep base-model usability)

## Background

User asked (2026-07-13): "你觉得这个skill 有繁琐的地方么 可以相对来说瘦身么 我这个skill 相对较重
是为了让一些基础模型可以使用" and approved the proposed slim plan with "ok".

Design principle agreed: heavy-for-base-models is right, but distinguish two kinds of redundancy —
**useful redundancy** (copy-paste templates, tables, exact commands) stays; **harmful redundancy**
(the same prose rule written twice in slightly different words, drift-prone, no git history since
`.cursor/` is gitignored) goes. The recent `A|B|C|D` vs `A–L` drift is the proof case.

## Scope — edits to `.cursor/commands/trellis-plan-execution.md` only

### Cut 1 — §Operating doctrine template blocks (~45 lines)

Remove the three duplicated template code blocks (canonical copies live in SKILL.md §Operating
doctrine, which the command already forces "Read and follow in full"):

- `### Contract card (required in execution-plan.md)` block
- `### TDD row (required per workstream)` block
- `### Contract Verification gate (required before completion)` block

Replace all three with one pointer line, e.g.:
`Contract card / TDD row / Contract Verification gate templates: see SKILL.md §Operating doctrine (the only canonical copies).`

**Keep** in §Operating doctrine: the three-layer diagram, the 5 numbered questions, the full
`### Contract ID rules` subsection (including the `touches:` MUST sentence).

### Cut 2 — §System ownership table (~8 lines)

Replace the 4-row ownership table with the default-rule sentence ("Trellis is the spine; other
systems provide invoked capabilities whose evidence is written back to the Trellis task") plus a
pointer to `skill-selection.md` §一/§二 (the canonical ownership/verdict source).

### Cut 3 — in-file dedup

- Lint command full text currently appears 3×. Keep it in §Required output item 10 and inside the
  Minimum-shape template (template is untouched); the Quick-triggers row becomes
  `Run /trellis:lint-plan (command: see §Required output #10)`.

### Add 1 — Lite fan-out permission (1 line, §Load the skill)

Add after the examples.md bullet: `Lite depth (single-workstream Scenario A/K): you may skip examples.md.`

## Non-goals (MUST NOT change)

- §Minimum execution-plan.md shape — verbatim, byte-for-byte (lint_execution_plan.py contract).
- §Invoke skills by scenario A–L table.
- §Real invocation three-type table and the "names are not invocations" rule.
- Quick triggers table structure (only the lint-command cell is deduped).
- Frontmatter, §Input, §Required output list.
- No changes to SKILL.md / skill-selection.md / examples.md / docs/ai-tools-reference.md.

## Constraints

- If `lint_skill_consistency.py` references any removed heading of the command file, update the
  script's canonical list in the same change; otherwise leave the script untouched.
- `.cursor/` is gitignored — command-file edits are disk-only; only `.trellis/**` task records
  (and the lint script, if touched) are committable.

## Acceptance criteria

1. File length ≈150 lines (≤165); all Cut/Add items applied; all Non-goal sections byte-identical.
2. `python ./.trellis/scripts/lint_skill_consistency.py` → PASS on the resulting tree.
3. Every file/anchor the slimmed command still references resolves on disk (spot-check the
   SKILL.md §Operating doctrine pointer target exists).
4. `touches: docs-only/no-runtime-contract` — no runtime contract; profile Fast; Scenario K.

## Verification

- GREEN: consistency lint PASS + line count + diff review showing Non-goal sections unchanged.
- RED: N/A (docs-only exemption per lint_execution_plan.py).
