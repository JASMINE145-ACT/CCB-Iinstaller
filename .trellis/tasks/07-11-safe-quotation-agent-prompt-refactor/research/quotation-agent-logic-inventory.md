# quotation-agent logic inventory

Status: baseline draft before any `quotation-agent.md` implementation edits.

Source: `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`

## Frontmatter runtime wiring

| Area | Current logic to preserve | Contract / eval anchor |
|------|---------------------------|------------------------|
| Agent id | `name: quotation-agent` must remain stable for Guid card and `Agent(subagent_type=quotation-agent)` routing. | `direct-quotation-card-no-delegation`, `orchestrator-quote-delegates` |
| MCP servers | `quotation`, `excel`, `price-library` remain available to the specialist; router must not call business MCP directly. | `WANd.ROUTING.ASSIGNMENT.001`, `WANd.ROUTING.ASSIGNMENT.003` |
| Skill | `quotation-learn-by-data` remains wired for `/learn-by-data` and data-review flows. | `quote-smoke-learn-by-data-vantsing`, `quote-smoke-learn-by-data-section-d` |
| Model | `model: minimax-m3` remains pinned unless a separate model contract is approved. | agent format audit / direct specialist smoke |
| PreToolUse | `pre-match-knowledge-gate.py` gates `match_quotation` and `match_quotation_batch`. | `WANd.RUN.HOOK.001`, `quote-direct50-post-hook-golden` |
| PostToolUse Read | `post-knowledge-read-mark.py` marks knowledge Read. | `WANd.RUN.HOOK.001`, knowledge effectiveness offline cases |
| PostToolUse match | `post-match-knowledge-nudge.py` nudges after match. | `quote-direct50-post-hook-golden`, `quote-tee50-post-hook-golden` |
| PostToolUse tiers | `post-price-tiers-nudge.py` enforces same-turn markdown tiers response. | `quote-tool-all-prices-direct50` plus manual tiers smoke |
| PostToolUse org rule | `post-business-rule-knowledge-invalidate.py` invalidates after org rule append. | `knowledge-effectiveness-offline-append-rule` |
| Stop hooks | Personal memory hook runs before `subagent-gate.sh`; `subagent-gate.sh` remains 120s ROE/delivery gate. | `WANd.ROUTING.REVIEWER.001`, `agent-hooks-overview.md` |

## Body behavior inventory

| Row | Current logic to preserve | Risk if lost | Eval / check anchor |
|-----|---------------------------|--------------|---------------------|
| B1 | Specialist identity: quotation-agent is not orchestrator; direct Guid sessions call MCP directly and do not delegate via Agent. | Direct card gets stuck debating delegation or quotes L0 router rule. | `direct-quotation-card-no-delegation` |
| B2 | Use `mcp__quotation__*` and post-fill `mcp__excel__*`; forbid `ExecuteExtraTool`. | Tool-call failures in WanD ACP. | direct quotation evals, manual smoke |
| B3 | Price-only queries use `match_quotation`; do not call inventory tools. | Slow or wrong tool chain, false stock answers. | `quote-direct50-b`, `quote-multi-parallel-3` |
| B4 | Single price+stock path is `match_quotation` then selected `get_inventory_by_code`; never `match_price_and_get_inventory`. | Calls nonexistent tool. | `price-and-stock-single`, `price-and-stock-ambiguous` |
| B5 | Multi price+stock path uses batch match then one `get_inventory_by_code_batch`. | Repeated single inventory calls and slow turns. | `quote-locked-7codes-inventory-batch-only`, smoke |
| B6 | Multi-tier price path: match code, Read `data.Md`, call `get_product_price_tiers`, then same-turn markdown table and source explanation. | Empty reply or ungrounded tier explanation. | manual tiers smoke / post-price-tiers hook |
| B7 | Inventory-only with code uses `get_inventory_by_code`; description-only can search or match then inventory. | Price tool used for stock-only request. | `inventory-code`, `inventory-description-only` |
| B8 | Quotation sheet generation defaults to Path C with `fill_items` and `require_exact_codes=true`; do not pass generated `Wanding-Quotation_*.xlsx` as input `file_path`. | `FILE_NOT_FOUND` and broken quote sheet generation. | `quote-fill-output-requires-project-workspace`, `quote-fill-confirmed-requires-exact-codes` |
| B9 | Existing user-provided inquiry Excel uses Path A only when the file already exists and contains inquiry rows. | Treats blank/generated path as source input. | fill evals / manual sheet smoke |
| B10 | `/learn-by-data` routes to `Skill(quotation-learn-by-data)` with batch + `show_candidates=true`; no parallel single-match; no unconfirmed writes. | Data-review learning degrades or writes bad price-library data. | `quote-smoke-learn-by-data-vantsing`, `learn-by-data-section-d-offline` |
| B11 | Image/screenshot quotations should extract visible product rows directly with MiniMax multimodal ability, not refuse image reading. | User-facing capability loss for screenshot lists. | manual image smoke |
| B12 | First quotation match in session must Read `wanding_business_knowledge.md`; later routine matches should not repeatedly Read unless invalidated. | Either stale/ungrounded recommendations or repeated slow Reads. | `WANd.RUN.HOOK.001`, knowledge effectiveness offline cases |
| B13 | `get_product_price_tiers` requires `data.Md` Read and same-turn output; bundled/stale source is disclosed. | Hallucinated tier semantics or empty output. | post-price-tiers hook / manual |
| B14 | `append_business_rule` preview uses `confirmed=false`, displays full `rule_text`, asks confirmation; only after user consent may call `confirmed=true`. | Silent org knowledge writes or invisible preview. | `knowledge-effectiveness-offline-append-rule`, manual |
| B15 | Org knowledge writes use MCP append flow, not direct Edit of shadow md; personal/session-only corrections go to memory, not org KB. | Cross-employee rule pollution or local-only shadow edits. | org knowledge manual smoke |
| B16 | Customer level mapping preserves B default and QingShan/D, DaTang/E, A/B/C, tax/RUCIKA/PE/LOCAL handling. | Wrong price tier/customer level. | `quote-direct50-d-qingshan`, `quote-direct50-e-datang` |
| B17 | Clarification rules distinguish pre-match missing parameters from post-match multi-candidates. | Blocks user after data is already available. | `quote-ambiguous-short`, `quote-direct50-post-hook-golden` |
| B18 | Post-match multi-candidate reply must output one recommendation first, then short bullets for alternatives; no full dump unless requested. | User gets selection menu instead of answer. | `quote-direct50-post-hook-golden`, `quote-tee50-post-hook-golden` |
| B19 | `direct50` default should prefer PVC-U drainage coupling unless user intent says otherwise; tee50 must not select coupling. | Wrong SKU recommendation. | `quote-direct50-post-hook-golden`, `quote-tee50-post-hook-golden` |
| B20 | If candidates are truncated or user rejects result, rerun single keyword with `show_candidates:true`. | Cannot recover from insufficient candidate list. | manual / candidate eval |
| B21 | Filling quotation after prior match should inherit known price/level/default template/currency/date/qty defaults and not re-clarify. | Slow or blocked sheet generation. | `quote-smoke-fill-direct50-draft` |
| B22 | More than 10 quotation sheet rows are handled by `fill_quotation_sheet`, not structural excel MCP insertion. | Broken formulas/template structure. | manual large sheet smoke |
| B23 | Excel post-processing is only read/verify/single-cell patch; never replace `fill_quotation_sheet` or rewrite whole F-N/footer formulas. | Corrupts generated quote sheets. | manual sheet smoke |
| B24 | ROE write operations must not end turn with "will update" after user has asked to modify/fill sheet; execute tool chain or ask needed clarification. | Empty promise without artifact. | `quote-fill-correction-no-rematch`, ROE gate |
| B25 | Reply formats remain explicit for quote, tiers, org rule preview, price+stock, and fill outputs. | Tool succeeds but user sees unusable answer. | smoke + ROE gate |
| B26 | Hard forbids remain: no guessing price/stock, no inventory on price-only, no nonexistent MCP, no excel structural fill, no post-match A/B/C menu without recommendation. | Regression to known failure modes. | eval `must_not` rows |
| B27 | Existing inquiry Excel parsing uses `parse_excel_smart` when the user asks only to parse/list inquiry rows; do not treat blank templates or generated output paths as existing source files. | Wrong Path A input or premature fill. | `excel-parse-smart`, `excel-missing-file`, `session-open-parse-excel-first` |

## Baseline eval set

Minimum targeted cases before and after any implementation:

- `quote-direct50-post-hook-golden`
- `quote-tee50-post-hook-golden`
- `price-and-stock-single`
- `quote-fill-output-requires-project-workspace`
- `quote-fill-confirmed-requires-exact-codes`
- `quote-smoke-direct50-then-inventory`
- `quote-smoke-fill-direct50-draft`
- `quote-smoke-tee50-inventory-fill`
- `quote-smoke-learn-by-data-vantsing`
- `quote-smoke-learn-by-data-section-d`
- `learn-by-data-section-d-offline`
- `knowledge-effectiveness-offline-full`
- `knowledge-effectiveness-offline-append-rule`

## Preservation rule

During implementation, every changed paragraph must link back to one or more inventory rows above. If a row is removed, the implementation note must prove it is covered elsewhere or obtain user approval.
