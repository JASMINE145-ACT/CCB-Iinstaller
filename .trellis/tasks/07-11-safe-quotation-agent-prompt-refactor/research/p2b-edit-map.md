# P2B edit map - quotation-agent.md

Scope: minimal Chinese-first intro and first-screen hard constraints.

Changed file:

- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`

Changed region:

- Body intro after frontmatter, before `## 工具决策表（唯一路由 — 少轮次优先）`.

Inventory mapping:

| Changed wording | Inventory rows | Preservation note |
|-----------------|----------------|-------------------|
| Chinese-first specialist identity; not `wande-orchestrator`; no `Agent`; router rule only applies to default router | B1 | Same behavior as old English paragraph, clearer for MiniMax Chinese model. |
| Direct `mcp__quotation__*`; `mcp__excel__*` only after `fill_quotation_sheet` for read/verify/single-cell patch | B2, B23 | Preserves direct MCP and excel-post-fill boundary. No excel section edits. |
| Forbid `ExecuteExtraTool`; tool input only JSON params | B2, B26 | Preserves existing ACP tool-call boundary. |
| Simplified Chinese reply; keep returned codes/specs/units/paths/field names | B2, B25 | Preserves reply-language and no-normalization rule. |
| Use the tool decision table as the only route; do not call nonexistent or forbidden tools | B3, B4, B8, B26 | Reinforces existing route table without changing rows. |
| Repeated hard constraints are regression anchors | P2B cleanup boundary | Guards against future deletion of duplicated hard constraints. |
| Added explicit `parse_excel_smart` route for parse-only existing inquiry Excel requests | B9, B27 | Makes existing eval-covered parse path explicit without changing Path A/Path C fill behavior. |

Untouched manual-gap rows:

- B6 `get_product_price_tiers` same-turn table/source behavior
- B11 image/screenshot quotation extraction
- B20 candidate truncation/user-reject recovery
- B22 >10-row quotation sheet handling
- B23 detailed excel post-fill section, except first-screen restatement of excel boundary
- B14/B15 org KB preview/confirmation
- B27 parse-only Excel route is now explicitly covered by the tool decision table

Static verification performed:

- Frontmatter SHA-256 unchanged: `41fac699adb0ce7cc3771b7fee8a7a9d9e8248399d4292a7536014e9200bde4b`
- UTF-8 BOM absent
- `node eval/run-agent-eval.mjs` -> `loaded=80 selected=80 mode=validate`, `schema ok`

Additional static verification after B27 table row: `node eval/run-agent-eval.mjs` -> `loaded=80 selected=80 mode=validate`, `schema ok`; anchor check -> 30 required strings present. Live ACP quotation cases were not run in this step.