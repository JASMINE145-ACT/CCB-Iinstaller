# Status — `07-06-delegation-nested-view-steps`

| Field | Value |
|-------|--------|
| **Status** | in_progress — Path A UI smoke **PASS** (2026-07-07); Guid/accurate optional |
| **Last updated** | 2026-07-07 |

## Done

- [x] F — `delegationRun.ts` B0 reducer + `findDelegationRunForParent`
- [x] A — nested View Steps in `MessageToolGroupSummary`
- [x] B — header `委派 → {label} · {status} · {n} tools`
- [x] G — running delegation chip (collapsed View Steps)
- [x] C — SubagentDrawer wired from View Steps「查看执行」+ `turnToolMessages`
- [x] H — `delegationSpawnContext.ts` B0.1 spawn observability (stable/dynamic/ephemeral tiers + 6 tests)
- [x] Operator labels — `operatorToolLabels.ts` (Read 业务知识库 / 查价 MCP)
- [x] D — spec §3.4c + agent-team-architecture § UI observability
- [x] Unit tests — 38/38 PASS (delegationRun + spawnContext + operatorLabels + DOM drawer)
- [x] Code-review — **PASS** (drawer wiring follow-up 2026-07-08)

## Pending

- [x] Manual UI smoke — **Path A orchestrator 查价** (2026-07-07): nested `委派 → 万鼎报价专家 · done · 2 tools`, agentId + Read/MCP 子步缩进，报价表正常返回
- [ ] Manual UI smoke — Guid direct（无假委派框）
- [ ] Manual UI smoke — accurate-agent 委派（可选）
- [ ] Manual UI smoke — Drawer「查看执行」与 View Steps 树一致（#4）
- [ ] Manual UI smoke — running chip 折叠后可见（#1 进行中场景）

## Deferred (explicit)

- B1 CCB bridge `_meta.delegationRun` enrich
