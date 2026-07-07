# Execution Plan — `07-06-learn-by-data-step1-extract`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Approved** | 2026-07-06 |
| **Scenario** | A |
| **Plan depth** | **Lite** |
| **Verification profile** | Fast |
| **Active phase** | P1 SKILL |
| **Repos** | claude-code-best only |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | backend layers |
| openspec-explore | Read: | token wall + 规范优先结论 |
| parse_excel_smart probe | Shell: | fixture max_rows=30 → ~4323 chars |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 plan Lite | done | user approved |
| P1 SKILL | done | hard rule 11 + Step 1 parse algorithm |
| P2 eval | done | schema ok; parse-only pass branches |
| P3 deploy | done | quotation-learn-by-data deployed |
| Gate | done | code-reviewer PASS (5758ffc5) |

---

## Lite phases

| Phase | Workstream | Files | Output |
|-------|------------|-------|--------|
| P1 | SKILL Step 1 + tools line + hard rule | `quotation-learn-by-data/SKILL.md` | parse_excel_smart 主路径；禁止 excel MCP |
| P2 | eval cases | `eval/agent_eval_cases.jsonl` | forbidden excel read; parse→batch branch |
| P3 | deploy | `deploy-ccb-skills.ps1` | local skill sync |

## Verification (Fast)

1. code-reviewer → PASS
2. `node eval/run-agent-eval.mjs --suite smoke` (schema)
3. trellis prd AC `[x]`
4. Manual: learn-by-data Step 1 无 excel spill

## Deferred

- `learn_by_data_parse.py` + `extract_learn_by_data_rows` MCP
