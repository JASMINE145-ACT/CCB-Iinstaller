# Smoke evidence — Outcome Relay

| Field | Value |
|-------|--------|
| Date | 2026-07-16 |
| Strategy | A (nudge×1 → force-forward) |
| Deploy | `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` ? fresh 2026-07-16; key source/live SHA-256 match |
| Unit | `test_outcome_relay_gate.py` **7/7 PASS** |
| Schema | `node eval/run-agent-eval.mjs` ok |

## Manual Guid (user)

1. **新开**默认会话（主入口）。
2. 查直接50 → 锁定 → 生成报价单草稿。
3. **PASS:** 父气泡含 `Wanding-Quotation_*.xlsx`（或完整路径）**且**成功项数；不是仅「已填好」。
4. 可选：再说「谢谢」→ 不应再被 OUTCOME-RELAY 拦住。

| Result | Notes |
|--------|-------|
| pending | 等用户粘贴父气泡 |

Paste below:
```
```

## Automated runtime evidence (2026-07-16)

| Probe | Expected | Observed |
|-------|----------|----------|
| colon-scoped mode | `block` | PASS |
| hollow parent Stop hook | exit 2 | exit 2 |
| parent path + exact count | exit 0 | exit 0 |
| response assertion unit | 3/3 | 3/3 PASS |
| eval schema | valid | 83/83 loaded, schema ok |
| live deployed gate | hollow=2, complete=0 | hollow=2, complete=0 |
| full historical gate suite | baseline comparison | 13 PASS / 9 FAIL (unchanged baseline; not a completion signal) |

Manual Guid result remains `pending` until a new live conversation shows the parent bubble with both fields.
