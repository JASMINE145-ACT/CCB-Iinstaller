# P4 heuristic baseline — 2026-07-06

| Field | Value |
|-------|--------|
| Phase | P4 (heuristic Stop hook MVP) |
| Command | `python -m unittest discover -s ccb-installer/config/skills/ccb-personal-memory/tests -v` |
| Result | **PASS 9/9** |
| Ensure smoke | temp ConfigDir: `memory/personal/workflow.md` + `CLAUDE.md` `CCB-MEMORY-RULES` |
| Code-review | Conditional PASS → fixes applied (business-exclude, bootstrap `/记住`, fail-open) |

## Cases covered

- no-signal, workflow-signal, dedup, already-Write, SubagentStop
- concurrent append, employee-profile dedup, business-exclude

## Note

P4 remains **fallback** under P5 thinking-primary plan. Do not delete these tests.
