# Closeout — Stabilize quotation agent output contract

Date: 2026-07-18

## Delivered

- Canonical `quotation-agent.md` now enforces the single-item price+inventory sequence:
  session-first knowledge Read → `match_quotation` + supplier hybrid → selected-code inventory query.
- Single B-level request forbids `get_product_price_tiers`.
- Exact ordered result table:
  `编码 | 中文名称 | 英文/印尼名 | 规格 | 单价(B级) | 在仓库存 | 可用库存 | 单位 | 备注`.
- Business semantics:
  - `qty_warehouse` → `在仓库存` and is the stock judgment basis.
  - `qty_available` → `可用库存` and remains independently displayed.
  - `备注` is selection reasoning/tool anomaly, not a replacement for supplier-directory explanation.
- Agent Eval normalizer, locked Case, fixture, evidence links, and exact-column grader align with this contract.
- Live L1 deployed via `deploy-seed-agents.ps1 -ForceMd`.

## Gate evidence

### Code review

Superpowers `code-reviewer`:

- Initial verdict: FAIL — table-only wording could suppress supplier dual synthesis.
- Fix: scope exclusivity to the table and preserve table-external supplier explanation.
- Final verdict: **PASS**.
- Layer A: PASS.
- Layer B: N/A.
- Runtime Crash Checklist: no crash-level risks.

Agent: `0c03cbc0-24a0-4bfd-a753-4c6bb6e3c0ee`.

### Test Agent

Command-execution Test Agent: **PASS**.

- `npm test --prefix agent-eval-plugin` → 69/69 PASS.
- Prompt contract test → 1/1 PASS.
- `node eval/run-agent-eval.mjs --suite smoke` → schema OK, 16 smoke cases selected.
- Live markdown deployment checks → PASS.

Agent: `5c50c656-7823-4493-9c8c-249a9d5727d8`.

## Live Eval

Run: `.agent-eval/runs/quotation-live-20260718-stabilized-3trial/`

- Final verdict: **PASS**
- Judgment: complete
- Trials: 3/3 PASS
- Every hard grader PASS in every trial.
- `discouraged_actions`: PASS in every trial (`get_product_price_tiers` absent).
- `pass_at_1=1`, `pass_at_3=1`, `pass_power_3=1`, `flaky_rate=0`
- `latency_p50_ms=27288`, `latency_p95_ms=43156`, `tool_calls_mean=4`
- `soft_score_mean=95.75`
- All trials returned code `8020020755`, price `1219`, warehouse `1344`, available `1228`, unit `PCS`, in the exact nine-column order.

Known external issue: supplier hybrid returned HTTP 401 in all three trials. It did not affect the confirmed price+inventory Case outcome; credential remediation is outside this task.

## Case lock

`sha256:6a39adbe0445cc82a7a6532fe13fdf47b431453ddda0aae908d93ff8f64778c8`
