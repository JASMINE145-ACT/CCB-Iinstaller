# Eval Case fix: accept live quotation table header + forbid price tiers

## Background

Live run `quotation-live-20260718` of case `quotation-direct50-price-stock` returned FAIL:

- `quotation_table` FAIL `STRUCTURED_OUTPUT_MISSING_COLUMNS` — agent header was
  `编码 | 中文名称 | 英文/印尼名 | 规格 | 单价(B级) | 在仓库存 | 可用库存 | 单位`,
  the ccb-acp normalizer only aliases `产品/规格/物料编码/B级价格/库存`.
- `evidence_provenance` FAIL `EVIDENCE_LINK_MISMATCH` — cell decorations
  (`**8020020755** ⭐推荐`, `**¥1,219**`, thousand separators) broke value equality
  against tool evidence.

User verdicts (2026-07-18):
1. The live header above is acceptable business output — eval must accept it.
2. Calling `mcp__quotation__get_product_price_tiers` is "不太对" — flag it, but per
   earlier guidance ("process deviation with correct result must not be a blind
   complete FAIL") it should not hard-gate.
3. The failed `mcp__supplier-directory__suppliers_hybrid_match` call is acceptable — no change.

## Requirements

1. `agent-eval-plugin/adapters/ccb-acp/event-normalizer.mjs`
   - Column alias extension: `编码`→material_code, `中文名称`→product,
     `单价(B级)`→price, `可用库存`/`可用库存(qty_available)`→inventory.
   - Cell cleanup: strip markdown emphasis before value extraction; material_code
     takes the leading code token (drops `⭐推荐`-style suffixes); numeric parsing
     keeps handling `¥`/thousand separators.
2. `.agent-eval/cases/quotation-direct50-price-stock.json`
   - Add soft-severity `tool_forbidden` grader for
     `tool.mcp__quotation__get_product_price_tiers` (recorded, not gating).
   - Required canonical columns stay `产品/规格/物料编码/B级价格/库存` (aliases map
     the live header onto them).
   - Re-confirm the case (new `case_hash`).
3. Regression test in `agent-eval-plugin/test/ccb-acp-normalizer.test.mjs` using the
   live header + decorated cells.
4. Rerun live eval (1 trial) and report the new verdict honestly.

## Out of scope

- Fixing the agent prompt/CLAUDE so it stops calling `get_product_price_tiers`.
- Multi-trial statistics; baseline promotion.
