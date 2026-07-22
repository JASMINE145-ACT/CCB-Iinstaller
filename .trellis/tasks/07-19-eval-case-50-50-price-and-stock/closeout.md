# Closeout — Eval case: 直接50 + 三通50 price and stock

Date: 2026-07-19

## Delivered

- Locked Case: `.agent-eval/cases/quotation-direct50-tee50-price-stock.json`
  - `case_hash`: `sha256:0d5fea639dca574a483908ab5b2ebe0e39ec4d5185c608dcc086e297d9d95526`
  - Prompt: `查询直接50和三通50的B级价格并查库存，请用表格列出结果。`
- Normalizer maps `match_quotation_batch` / `get_inventory_by_code_batch` → `quotation.match` / `inventory.query`
- `structured_output` supports `min_rows` (`STRUCTURED_OUTPUT_TOO_FEW_ROWS`)
- Pack integrity test updated for ≥2 locked Cases
- First live run: `.agent-eval/runs/quotation-live-20260719-direct50-tee50/` → **FAIL 0/3**
  - All trials produced two-row nine-column output.
  - `evidence_provenance` failed because the agent split the request into multiple single `match_quotation` / inventory calls instead of the Case's batch path.
- Agent contract hardened:
  - 1 independent product → `match_quotation` + `get_inventory_by_code`.
  - ≥2 independent products → exactly one `match_quotation_batch`, then one successful `get_inventory_by_code_batch`.
  - Single inventory fallback is permitted only after batch timeout/error/`success:false`.
  - B-level output keeps the fixed nine columns; non-B changes only the price column label.
- L1 deployed with `deploy-seed-agents.ps1 -ForceMd`; source/live SHA256 match.

## Gate evidence

### Code review

- Initial: PASS with Important (pack test assumed one Case) — agent `59a78542-9996-47ac-a545-6ff31766086f`
- Follow-up after pack-test fix: **PASS** (same agent)

```text
Layer A: N/A
Layer B: N/A
Runtime Crash Checklist: No crash-level risks found in reviewed scope.
```

### Tests

- `npm test --prefix agent-eval-plugin` → **71/71 PASS**
- Final batch-contract review: **PASS**, no remaining findings — agent `c8bf8951-97fa-4fa5-9785-f40b6c7cbdca`
  - Layer A: PASS
  - Layer B: N/A
  - Runtime Crash Checklist: no crash-level risks
- Test Agent: **PASS** — agent `095812aa-9412-48b7-9e2e-217d75ab0df7`
  - Prompt contract: **2/2 PASS**
  - Agent Eval plugin: **71/71 PASS**
  - Source/live SHA256: `EF4776A48F75CC3A1FD2AE3A3DEA39EF6ED0AFBC742C8A6086A82D67328ACF19`

## Next (optional)

- Re-run the locked Case in three fresh sessions to verify batch-route compliance.
- Investigate tee selection instability separately; intentionally out of scope for the batch-routing fix.
