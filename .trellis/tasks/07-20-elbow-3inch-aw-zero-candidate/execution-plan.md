# Execution Plan — `07-20-elbow-3inch-aw-zero-candidate`

| Field | Value |
|-------|--------|
| **Status** | **completed** — Approach B parser fix + pytest PASS |
| **Active phase** | closeout |
| **Parent** | `07-20-learn-by-data-select-first` |
| **Scenario** | **C** (matcher bug — field-rule parse) |
| **Plan depth** | **Lite** |
| **Verification profile** | **Standard** (pytest) + optional UI learn-by-data |
| **Risk tags** | — (python matcher; no UI picker) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 bootstrap | Shell: | `task.py current` → learn-by-data-select-first (completed); packages → backend/integration; git dirty ahead 34 |
| trellis-before-dev | Read: | `.trellis/spec/backend/quotation-matching-engine.md` + integration agents-unified learn-by-data |
| trellis-debug-route | Read: | Scenario C → diagnose first |
| systematic-debugging | Read: | Iron law → `research/root-cause-elbow3-zero-candidate.md` |
| skill-selection | Read: | Scenario C; Lite depth (single parser+test) |

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| Spec inject | trellis-before-dev | available | inline |
| Debug | systematic-debugging | available | research scripts done |
| TDD | pytest | available | repro scripts |
| Review | code-reviewer | available | Layer A/B N/A |

**Plan depth rationale:** Single root cause + one parser fix + regression tests → **Lite**.

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix |
| Phase 0 | done | root-cause repro + plan lint |
| Phase 1 | **done** | `_parse_field_matching_sources` + tests; Approach B |
| Phase 2 | **PASS** | pytest + code-reviewer PASS; Guid AC4 optional |

## Contract map (lite)

- **touches:** `WANd.MATCH.FIELD_RULE_PARSE.001` · `WANd.MATCH.ELBOW_PLAIN.001`
- **Behavior protected:** `/`-separated field-matching sources are phrases; plain `Elbow 3" AW` recalls `8010024354`; drat path unchanged
- **GREEN:** `pytest python/tests/test_elbow_plain_3inch_aw.py python/tests/test_drat_elbow_aw.py python/test_knowledge_field_matching_parse.py -q` (exact paths finalized at implement)
- **Manual smoke:** optional Guid learn-by-data Jinse row14

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 1 | P0 | Fix field-rule source parse (`/` → phrases) | `WANd.MATCH.FIELD_RULE_PARSE.001` | — | TDD → implement | `wanding_fuzzy_matcher.py` `_parse_field_matching_rules_from_content` | plain Elbow ≠ 丝扣 expand | Standard |
| 1b | P0 | Regression: Elbow 3" includes 8010024354; drat still PASS | `WANd.MATCH.ELBOW_PLAIN.001` | — | TDD | new/extend pytest | RED→GREEN | Standard |
| 2 | P1 | (optional) Defense: thread filter uses pre-expansion cues | `WANd.MATCH.ELBOW_PLAIN.001` | — | only if 1 insufficient | same module | documented | Fast |
| 3 | — | Optional Guid smoke row14 | both | — | manual | — | candidates contain actual or not Section B for 0-cand | UI |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Parser + Elbow 3" | both | live `match_quotation_union('Elbow 3" AW 3"')` count=0; expand adds 丝扣 | pytest commands above PASS | `test_drat_elbow_aw` PASS; half-bend/other rules still parse |

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| `WANd.MATCH.FIELD_RULE_PARSE.001` | unit: parsed sources for `elbow drat / drat` == `["elbow drat","drat"]` (no bare `elbow`) | pytest | **PASS** |
| `WANd.MATCH.ELBOW_PLAIN.001` | `8010024354 in codes` for plain Elbow 3" AW | pytest / repro | **PASS** |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-20-elbow-3inch-aw-zero-candidate/execution-plan.md` | PASS | **PASS** |

## Parallel split

None.

## Conditional recovery

| Trigger | Action |
|---------|--------|
| Fix breaks `elbow 弯 → 弯头` OR semantics | Keep space-OR when no `/`; only change `/` branches |
| Org knowledge API returns different §7 text | Parser fix still required; sync shadow `data/wanding_business_knowledge.md` if fleet rule line differs |
| After parser fix still 0 cand | Escalate defense (P1) — re-approve if larger |

## Manual steps (optional)

1. New quotation Guid → learn-by-data on PT. Jinse7.1
2. Row14 Elbow 3": expect candidates include `8010024354` (or match classification, not 0-cand Section B)

## Explicit non-goals

- learn-by-data skill / select-first
- Section A rule append
- Broad rewrite of all space-OR English multiword rules (`half bend`) unless same bug bites

## Approval gate

说 **「批准，执行」** 后再改 `wanding_fuzzy_matcher.py` / tests。
