# Phase 4 closeout — Outcome Relay + Query/Wakeup (2026-07-16)

## User acceptance

用户确认：**修改好了，可以收口**（2026-07-16）。

## Delivered (MVP + Phase 1b)

| Layer | Contract | Deliverable |
|-------|----------|-------------|
| Runtime | `WANd.ORCH.OUTCOME_RELAY.001` | Stop gate: fill artifact + **query** delivery (`delivery_kind`); strategy A nudge → force-forward → escalate |
| Runtime | `WANd.ORCH.WAKEUP_RELAY.001` | 空触发回合 = 委派完成信号；禁止「我在的」空壳替代未转述结果 |
| L1 | `EXECUTION.001` / `ADMISSION.001` | `wande-orchestrator.md` Stop → subagent-gate；显式 `run_in_background: false` |
| Eval | H4 | `orchestrator-fill-outcome-relay` + `orchestrator-query-outcome-relay` |
| Registry | — | `OUTCOME_RELAY.001` + `WAKEUP_RELAY.001` in `agent-runtime-registry.yml` |

## Verification evidence

| Gate | Command / signal | Result |
|------|------------------|--------|
| Unit | `python ccb-installer/.../test_outcome_relay_gate.py` | **11/11 PASS** |
| Eval schema | `node eval/run-agent-eval.mjs` | **84 cases schema ok** |
| Deploy | `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` | live CCB-Wanding |
| code-reviewer | Phase 1 + sticky fix + Phase 1b | **PASS** (prior sessions) |
| User smoke | 查价空壳 + 出单空壳路径 | **用户收口确认** |

## Follow-up (non-blocking)

- `deploy-subagent-gate-skill.ps1` 路径截断垃圾目录 `nfig\skills\...` — 清理脚本 bug，另 task
- Roaming conversation temp 落盘 → workspace follow-up（非本任务）

## Task status

**done** — 2026-07-16
