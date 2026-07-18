# Stabilize quotation agent output contract

## Goal

Stabilize the `quotation-agent` response for “single product B-level price + inventory” so it always follows the required MCP sequence and emits one deterministic evidence-bearing table that the Agent Eval case can grade.

## What I already know

- User approved the prior recommendation to harden `quotation-agent.md` and rerun 3 trials.
- Query under test: `查询直接50的B级价格并查库存，请用表格列出结果。`
- Canonical L1 source is `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`; the runtime body is deployed to `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md`.
- Current routing already says single-item price + stock must call `match_quotation` → select code → `get_inventory_by_code`.
- Live reruns r2–r4 showed three real drifts: skipped inventory lookup, `knowledge.read` after match, and inconsistent inventory columns.
- The final user-confirmed table shape is:
  `编码 | 中文名称 | 英文/印尼名 | 规格 | 单价(B级) | 在仓库存 | 可用库存 | 单位 | 备注`.
- User clarified the business rule on 2026-07-18: show both quantities, but **`在仓库存` (`qty_warehouse`) is the stock judgment/evidence basis**.

## Requirements (evolving)

- Strengthen the single-item price+inventory instruction in the canonical L1 prompt.
- Require the first session `Read` before `match_quotation`.
- Require `get_inventory_by_code` after selecting the material code; do not finish after price matching.
- Emit the fixed nine-column table in the exact order above.
- Use `备注` for one-line selection reasoning or a tool-reported inventory anomaly; it does not replace the table-external supplier-directory explanation.
- Map `qty_warehouse` only to `在仓库存` and `qty_available` only to `可用库存`; never substitute one for the other.
- Treat `qty_warehouse` / `在仓库存` as the authoritative stock judgment and hard evidence link; `qty_available` remains an additional displayed operational field.
- Align the Eval normalizer/case evidence assertion with this corrected business rule (the prior case incorrectly used `qty_available` as canonical `库存`).
- Do not call `get_product_price_tiers` for a single requested B-level price.
- Preserve the supplier-directory behavior already accepted by the user.
- Deploy the L1 seed with `deploy-seed-agents.ps1 -ForceMd`, then use a new session for each live trial.
- Run the Agent Eval case for 3 independent trials and report pass@1 / flaky rate honestly.

## Acceptance Criteria (evolving)

- [ ] Prompt/source contract explicitly encodes sequence, fixed columns, and warehouse-based inventory semantics.
- [ ] Eval evidence compares `qty_warehouse` to the table's `在仓库存`, while independently preserving `可用库存`.
- [ ] Regression checks cover the prompt contract and eval expectations.
- [ ] Code-reviewer PASS.
- [ ] Test agent / relevant automated tests PASS.
- [ ] Live deployment completed and verified from the live agent file.
- [ ] Three live trials completed; all artifacts retained and metrics reported.

## Definition of Done

- Tests added or updated and green.
- Code review and test gates pass in required order.
- Trellis closeout records commands, agent verdicts, run paths, and live outcomes.

## Out of Scope

- Changing quotation MCP implementation or inventory data.
- Relaxing the Eval case to accept missing inventory or warehouse-only answers (both columns remain required).
- Changing supplier-directory behavior.
- Baseline promotion.

## Technical Notes

- Authority: `.trellis/spec/integration/agents-unified-model.md` § L1 self-contained model, quotation multi-candidate reply, and price+stock routing.
- Prior eval closeout: `.trellis/tasks/07-18-eval-case-header-fix/closeout.md`.
- Existing lightweight regression cases: `eval/agent_eval_cases.jsonl` (`price-and-stock-single`, `session-open-price-and-stock`).
