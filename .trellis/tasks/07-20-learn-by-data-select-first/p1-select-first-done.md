# Phase 1–5 done — learn-by-data select-first

**Date:** 2026-07-20

## Delivered

| Item | Evidence |
|------|----------|
| Skill select-first + KB path | `quotation-learn-by-data/SKILL.md` — dual doctrine removed |
| L1 `/learn-by-data` row | `quotation-agent.md` — select + full `results`; BAD batch 前 Read / Bash |
| Contract tests | `quotation-agent-output-contract.test.mjs` — 7/7 PASS |
| code-reviewer | Overall **PASS**; Layer A/B N/A ([Review](82645ce9-8912-4546-9529-5084cb4291f7)) |
| Deploy | `deploy-quotation-learn-by-data-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` |
| Spec | `agents-unified-model.md` learn-by-data § updated |

## GREEN command

```text
node --test ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs
→ 7 pass, 0 fail
```

## Remaining (manual)

**AC4 Guid smoke** (new conversation after deploy):

1. Quotation Guid + VANTSING filled xlsx +「按数据学习」
2. View Steps: parse → batch → **1× select**(full results) → table
3. 0 Bash; 0 Read under `.claude\vendor`
