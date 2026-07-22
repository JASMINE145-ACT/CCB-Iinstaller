# Closeout — `07-20-inventory-batch-multi-code`

**Status:** completed  
**Completed:** 2026-07-20  
**Acceptance:** user Guid smoke

## Delivered

| Layer | Change |
|-------|--------|
| L1 | `quotation-agent.md` — 仅查库存 ≥2 码 → 1× `get_inventory_by_code_batch`；`WANd.INV.BATCH.MULTI_CODE.001` |
| Seed | packages ↔ staging sync；`deploy-seed-agents -ForceMd` |
| Unit | `quotation-agent-output-contract.test.mjs` 5/5（含 multi-code 断言） |
| Eval | draft `.agent-eval/cases/quotation-multi-code-inventory-only.json`（soft batch；normalizer 限制） |
| Spec | `agents-unified-model.md` inventory-only ≥2 row |

## Smoke evidence (user)

Prompt: 三码表 +「查询库存」→ Orchestrator → quotation

- View Steps：**1 tool** `mcp__quotation__get_inventory_by_code_batch`
- 三行库存表：8020020755 / 8010024812 / 102496（含 qty_warehouse / qty_available）
- **无** 3× `get_inventory_by_code`

## Residual

- ACP normalizer maps single + batch → `inventory.query`；hard eval cannot forbid N× single until action split
- code-reviewer skipped once (API limit); unit + Guid smoke green
