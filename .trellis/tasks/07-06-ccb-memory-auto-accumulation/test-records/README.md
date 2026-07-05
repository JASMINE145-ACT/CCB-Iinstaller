# Test records — `07-06-ccb-memory-auto-accumulation`

**Purpose:** Durable evidence for implement / check gates. Do not rely on chat history.

## Layout

| File | When |
|------|------|
| `unit-YYYYMMDD.md` | After `python -m unittest …` (hook, store, JSON parse, spawn-no-wait) |
| `integration-YYYYMMDD.md` | Worker + mock thinking response → `workflow.md` append |
| `ui-smoke-YYYYMMDD.md` | Manual: banner shows/hides; next chat not blocked |
| `p4-heuristic-baseline.md` | P4 already-run baseline (9/9 unit + ensure smoke) |

## Template (copy per run)

```markdown
# <kind> — YYYY-MM-DD

| Field | Value |
|-------|--------|
| Phase | P5b / P5c / … |
| Command | … |
| Result | PASS / FAIL |
| Duration | … |
| Operator | … |

## Output summary
(paste key lines)

## Notes
```

## Gate mapping

| Gate | Record |
|------|--------|
| code-review | `check.jsonl` + agent summary |
| unit tests | `unit-*.md` |
| integration | `integration-*.md` |
| UI manual | `ui-smoke-*.md` |
| ensure/deploy smoke | `check.jsonl` ensure-smoke row |

## P4 baseline (already executed)

See `p4-heuristic-baseline.md` — heuristic Stop hook 9/9 + ensure memory seed.
