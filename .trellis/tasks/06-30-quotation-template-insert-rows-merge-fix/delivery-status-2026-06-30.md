# Delivery status — 06-30 quotation template insert-rows + Excel formulas

**Date:** 2026-06-30  
**Task:** [`prd.md`](./prd.md)  
**Spec:** [`../../spec/backend/mcp-business.md`](../../spec/backend/mcp-business.md) § VANTSING fill insert-rows + formulas · [`../../spec/integration/agents-unified-model.md`](../../spec/integration/agents-unified-model.md) § VANTSING sheet capacity & formulas

## Summary

| Phase | Status | Deliverable |
|-------|--------|-------------|
| P0–P2 | Done | >10 行插行 merge 修复 |
| P3 | Done | VANTSING 行/footer Excel 公式 |
| Deploy | Operator | `sync-dev-wanding-vendor.ps1` + hot zip |

## Code changes

| File | Change |
|------|--------|
| `python/quotation/quote_tools.py` | `_insert_data_rows_before_total` merge 修复；`_row_line_total_formula` / `_apply_footer_total_formulas`；VANTSING 公式填表 |
| `python/tests/test_quote_tools_insert_rows.py` | 5 tests（含公式断言 + remark O 列） |
| `python/tests/test_quote_tools_formulas.py` | 3 tests（10 行公式、无货、fill 回归） |
| `ccb-installer/config/agents/quotation-agent.md` | >10 行插行 + 金额公式 SOP |

## Verified

```text
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest \
  python/tests/test_quote_tools_insert_rows.py \
  python/tests/test_quote_tools_formulas.py \
  python/tests/test_fill_row_guard.py \
  python/tests/test_inquiry_backfill.py -v
→ 24/24 pass
```

| Review | Result |
|--------|--------|
| P0–P2 code-review | PASS (`7bc5fb9d-73b5-4b20-98e3-704352ea598d`) |
| P3 code-review | PASS (`abcdff19-d665-4226-bdd4-14cfb45ef5cd`) |

## Deploy (operator)

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
# fleet: hot zip vendor/wanding/python
```

## Smoke

1. Path C 出 **12 品**报价单 → 第 11–12 行有完整边框与 F/G/I/N。
2. Excel 打开 → 改 K 列数量 → N 行总价与 footer SUM/PPN/含税自动变。
3. Total 行在 12 品时为 row 20，footer `=SUM(N8:N19)`。
