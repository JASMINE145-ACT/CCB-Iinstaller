# Section D smoke — 2026-07-06

## Offline Python smoke

| Run | Command | Result |
|-----|---------|--------|
| VANTSING fixture | `python python/scripts/smoke_learn_by_data_section_d.py` | **PASS** — 8 preview+apply, merge 8, recall 3/3 |
| 韩总7.1报价单 | `python python/scripts/smoke_learn_by_data_section_d.py "c:\Users\m1774\Desktop\测试报价\PO 韩总7.1报价单 .xlsx"` | **PASS** — 1 mismatch (波纹管 DN20), merge 1, recall 1/1 |

Artifact: `section-d-smoke.json` (fixture run)

## Agent eval

| Case | Suite |
|------|-------|
| `quote-smoke-learn-by-data-section-d` | `quotation-smoke` (7), `smoke` (16) |

Schema: `node eval/run-agent-eval.mjs --case quote-smoke-learn-by-data-section-d` → ok

Live ACP (optional):

```powershell
node eval/run-agent-eval.mjs --run --case quote-smoke-learn-by-data-section-d
```

Requires deployed SKILL + quotation MCP with `append_quotation_mapping_pending`.
