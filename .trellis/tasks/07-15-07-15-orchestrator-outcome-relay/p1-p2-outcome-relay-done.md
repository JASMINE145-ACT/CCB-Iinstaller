# Phase 1–2 done — Outcome Relay gate + L1 + eval

Date: 2026-07-16  
Strategy: **A** (nudge×1 → deterministic forward REJECT)

## Delivered

| Item | Evidence |
|------|----------|
| `parse_transcript_outcome_relay.py` | Agent artifact → parent min fields |
| `outcome-relay.sh` + `subagent-gate.sh` wire | `wande-orchestrator:outcome-relay: block` |
| L1 `wande-orchestrator.md` | Stop → subagent-gate; OUTCOME_RELAY.001 section |
| Unit tests | `test_outcome_relay_gate.py` **7/7 PASS**（含 later-thanks sticky 关闭） |
| Eval case | `orchestrator-fill-outcome-relay` schema ok |
| Registry / specs | `WANd.ORCH.OUTCOME_RELAY.001` registered |
| Deploy | `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` |

## GREEN

```text
python ccb-installer/config/skills/ccb-subagent-gate/tests/test_outcome_relay_gate.py
→ 6/6 passed

node eval/run-agent-eval.mjs
→ schema ok (loaded=83)
```

## Manual smoke (user)

New default session after deploy: 查价 → 出单 → **父气泡** must include `.xlsx`/path + count.
