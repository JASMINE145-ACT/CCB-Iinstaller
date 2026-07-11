# P0 Done — orchestrator employee primary entry

> **Task:** `07-11-orchestrator-employee-primary-entry`  
> **Date:** 2026-07-11

## Summary

Unlocked `wande-orchestrator` identity from router-only to **employee primary entry / 工作助手**. Routing remains a tool; business MCP forbidden contract preserved and extended to `work-tasks-agent`.

## Verification evidence

| Gate | Result |
|------|--------|
| code-reviewer | PASS (Layer A PASS, Layer B N/A) ×2 |
| `bun test agentSessionProfile` @ `D:\claude-code-B` | 15 pass / 0 fail |
| Manual UI smoke (AC6) | **PASS** — user confirmed 2026-07-11 |

## User smoke (AC6)

- 「你是谁」→ 工作助手 / 主入口，不是纯转接台 — **PASS**
- 业务查价仍委派 specialist — **PASS** (user: 效果很好)

## Key files

- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.aionui.json`
- `ccb-installer/src/services/acp/agentSessionProfile.ts` (+ claude-code-B mirror)
- `.trellis/spec/integration/contracts/agent-runtime-registry.yml` (WANd.ENTRY.*)
- `.trellis/spec/integration/agent-team-architecture.md` (glossary)

## Deferred (extension slots)

- P1 skills (intake / intent-split)
- P2 thin employee MCP
- P3 EIL role-biased routing

See `research/extension-slots.md`.
