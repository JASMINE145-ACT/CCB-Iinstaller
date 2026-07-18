# Closeout — eval case header fix (2026-07-18)

## Changes

1. `agent-eval-plugin/adapters/ccb-acp/event-normalizer.mjs`
   - Aliases: `编码`→material_code, `中文名称`→product, `单价(b级)`/`单价（b级）`→price,
     `可用库存`/`可用库存(qty_available)`→inventory.
   - `cleanCell` strips markdown emphasis; `codeToken` columns keep the leading code token
     (`**8020020755** ⭐推荐` → `8020020755`); `**¥1,219**` → 1219.
2. `.agent-eval/cases/quotation-direct50-price-stock.json`
   - New soft `tool_forbidden` grader `discouraged_actions` for
     `tool.mcp__quotation__get_product_price_tiers` (records, never hard-fails — user ruling).
   - Re-locked: `case_hash sha256:d45b7239cbe28dda03f761b24e4c130730eb9eb604027829130aa5ecad0b9ecf`.
3. Tests updated + added (`ccb-acp-normalizer`, `case-store`, `ccb-golden-case`, `graders`):
   live 8-column header regression; soft-FAIL-cannot-trip-hard-gate decision regression.

## Gate evidence

- Code-review agent (Superpowers code-reviewer): **PASS** twice
  (initial + follow-up after applying its suggestions 2/3). Layer A: N/A, Layer B: N/A,
  Runtime Crash Checklist: no crash-level risks.
- Tests: `npm test` in `agent-eval-plugin/` → **66/66 pass** (was 62/65 before fix).

## Live reruns (honest results)

| Run | Verdict | Header produced | Root cause |
|-----|---------|-----------------|------------|
| r2  | FAIL | `物料编码/产品/英文/单位/B 档单价（IDR）/备注` | agent skipped `inventory.query` entirely; no stock column |
| r3  | FAIL | `…/B 档单价/在仓数量` | showed warehouse qty 1344 instead of qty_available 1228 |
| r4  | FAIL | `…/B档单价 (IDR)/库存（qty_warehouse）` | sequence broken (knowledge.read after match) + warehouse qty again |

Conclusion: the originally waived header (run 1) now normalizes and would pass those two
graders (unit-verified). The remaining FAILs are real quotation-agent instability:
non-deterministic table format, occasional skipped stock check, and warehouse-vs-available
qty confusion. Fix belongs in the quotation-agent prompt (standardize table contract) —
out of scope here (see prd.md).

Runs: `.agent-eval/runs/quotation-live-20260718-r2|r3|r4/`
