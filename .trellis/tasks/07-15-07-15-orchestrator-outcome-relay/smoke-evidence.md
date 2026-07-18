# Smoke evidence — Outcome Relay

| Field | Value |
|-------|--------|
| Date | 2026-07-16 |
| Strategy | A (nudge×1 → force-forward) |
| Scope | fill artifact + query price relay + WAKEUP_RELAY |
| Deploy | `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` |
| Unit | `test_outcome_relay_gate.py` **11/11 PASS** |
| Schema | `node eval/run-agent-eval.mjs` **84 ok** |

## Result

**PASS / 验收收口** — 用户 2026-07-16 确认「修改好了，可以收口」。

## Scenarios covered

1. **出单**：父气泡须含 `Wanding-Quotation_*.xlsx`（或 path）+ 成功项数；非「已填好」空壳。
2. **查价**：父气泡须含物料编码 + 价格线索；非「admin，我在的…」待机话术。
3. **空唤醒**：空触发回合应转述上一轮 Agent 未交付结果（`WAKEUP_RELAY.001`）。

## Notes

- 门禁在 `wande-orchestrator` Stop → `outcome-relay` validator。
- 查价/出单均走父泡断言；eval case：`orchestrator-query-outcome-relay`、`orchestrator-fill-outcome-relay`。
