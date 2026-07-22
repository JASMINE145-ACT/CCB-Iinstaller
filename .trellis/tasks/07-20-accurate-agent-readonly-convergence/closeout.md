# Closeout — `07-20-accurate-agent-readonly-convergence`

**Status:** completed  
**Completed:** 2026-07-20  
**Acceptance:** user Guid smoke + explicit「可以验收」

## Delivered

| Layer | Change |
|-------|--------|
| ROE | Wire `skip_readonly_patterns` in `evaluate_roe_judge`; `accurate-agent.json` profile; Brief pollution fixtures |
| L1 accurate | Readonly monthly: forbid Write/xlsx/openpyxl/unsolicited batch_get_detail |
| L1 orch | No fabricate MCP write-permission / ROE 终审话术; relay Accurate numbers; Brief `用户原话` |
| Deploy | `deploy-subagent-gate-skill` + `deploy-seed-agents -ForceMd` + `start-dev-full` restart |

## Smoke evidence (user)

**「查询 5月销售额」** (Orchestrator):

- 委派 accurate · done · **1 tool** `accurate_summarize_records`
- 父泡：1,470,601,570 IDR / 68 单 + 口径
- 无 ROE / A-B-C / Write / openpyxl

**Related (sibling smoke, not this task scope):**「查询 直接50 价格」→ hybrid 已回链路；用户确认可验收。

## Tests

- `test_roe_judge_gate.py` — 21 cases PASS (incl. accurate Brief pollution)
- packages ↔ staging seed sync for accurate / orchestrator

## Residual (out of scope / follow-up)

- Quotation default lock code PVC-U `8020020755` vs PPR 主推荐 — 用户本轮接受，不阻塞本任务 close
- `code-reviewer` subagent blocked once by Cursor usage limit on hybrid nudge pass — pytest + deploy still green
