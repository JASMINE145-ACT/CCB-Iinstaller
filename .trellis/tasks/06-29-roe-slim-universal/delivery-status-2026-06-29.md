# Delivery status — 06-29-roe-slim-universal

**Date:** 2026-06-29  
**Status:** completed  
**Spec:** `.trellis/spec/integration/agents-unified-model.md` § Universal ROE end_turn gate  
**Checklist:** `internal-update.md` §12.9 #19 (merged) + #22 (slim)

## What shipped

Single universal `generic-roe-judge` @ `end_turn` — merges **quotation-roe (#19)** and **Gate-J (#22)**:

| Layer | Behavior |
|-------|----------|
| Write-anchor | `extract_write_anchor_window` — semi-persistent; excludes hook REJECT lines |
| L2 gate | Write-anchor window only; **success** required (`is_error` + JSON `error` field) |
| Already done | Full transcript: `prior turns` + `this turn` (multi-continue accumulates) |
| Prior attempt | Latest failed L2 in window → error message + Retry ACTION |
| Retired | `quotation-agent:roe` **off**; `quotation-roe.sh` not called from `subagent-gate.sh` |
| N/K | warn log only |

## REJECT v4 shape

```
GAPS → User request → Already done (prior / this turn) → Prior attempt (failed) → ACTION
```

## Verification

| Check | Result |
|-------|--------|
| `test_roe_judge_gate.py` | 16 cases + n5 escalation PASS |
| `test_roe_judge_realistic.py` | 8/8 PASS |
| `test_roe_gate.py` | 7/7 PASS |
| `smoke-roe-judge-deploy.ps1` | 13/13 PASS |
| Deploy | `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\ccb-subagent-gate\` |

## Key fixtures

| Fixture | Scenario |
|---------|----------|
| `roe-lookup-and-fill-readonly` | Single message 查+填, read tools only |
| `roe-two-turn-lookup-then-fill` | Turn1 查价 → Turn2 填表 promise |
| `roe-real-fill-failed-missing-path` | Two-turn + fill `file_path` error |
| `roe-real-multi-continue-accumulate` | REJECT continue + read tools + fill fail |
| `roe-l2-retry-then-success` | L2 fail then success → pass |
| `roe-l2-payload-error-is-error-false` | JSON error despite is_error false → block |

## Live bugs addressed

1.「查+填」composite — model repeats lookup after block (no Already done)  
2. Two-turn「查价→填表」— Turn2 block lost Turn1 lookup (cross-turn prior done)  
3. Fill failed silently — model re-guesses (Prior attempt + error in REJECT)

## Manual smoke

Guid 万鼎报价专家:

1. `查询三通50价格` → pass  
2. `填到桌面` → block with prior turns match_quotation + Prior attempt if fill failed  
3. `查询直接50价格库存并填写完整报价单` → block with this-turn Already done + fill ACTION
