# Eval case: 直接50 + 三通50 price and stock

## Goal

Create a locked Agent Eval Plugin Case for the business request: query B-level price and inventory for both 直接50 and 三通50 in one turn, with evidence-bearing table grading.

## Requirements (draft — pending user confirm of Case)

* Prompt: 查询直接50和三通50的B级价格并查库存，请用表格列出结果。
* Agent: quotation-agent / ccb-acp
* Ideal process (aligned with L1 多品价+库存): knowledge.read → match_quotation_batch (normalized as quotation.match) → get_inventory_by_code_batch (normalized as inventory.query) → assistant.table (≥2 rows, fixed nine columns)
* Hard: no Agent delegate; no search_inventory; B customer_level; inventory codes ⊆ match candidates; table codes ↔ inventory codes; exact nine columns; min 2 rows
* Soft: discourage get_product_price_tiers; judge rubrics for requirement / selection (直通 vs 三通) / clarity

## Open Questions

* Confirm customer level B (recommended)
* Confirm Case text / graders before lock (agent-eval confirm gate)

## Out of Scope

* Migrating all 84 legacy jsonl cases
* Soft-passing auth failures

## Technical Notes

* Template sibling: `.agent-eval/cases/quotation-direct50-price-stock.json`
* Normalizer today lacks `match_quotation_batch` / `get_inventory_by_code_batch` aliases — needed before live run
* Optional: `min_rows` on structured_output grader
