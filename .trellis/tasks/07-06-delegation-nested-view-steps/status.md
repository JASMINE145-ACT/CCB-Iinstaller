# Status — `07-06-delegation-nested-view-steps`

| Field | Value |
|-------|--------|
| **Status** | **done** — UI acceptance 2026-07-09 (MCP timeout out of scope) |
| **Last updated** | 2026-07-09 |

## Done

- [x] F — `delegationRun.ts` B0 reducer + `findDelegationRunForParent`
- [x] A — nested View Steps in `MessageToolGroupSummary`
- [x] B — header `委派 → {label} · {status} · {n} tools`
- [x] G — running state in View Steps header (no duplicate chip)
- [x] C — SubagentDrawer wired from View Steps「查看执行」+ `turnToolMessages`
- [x] H — `delegationSpawnContext.ts` B0.1 spawn observability
- [x] Operator labels — `operatorToolLabels.ts` (Read 业务知识库 / 查价 MCP)
- [x] D — spec §3.4c + agent-team-architecture § UI observability
- [x] Unit tests — vitest PASS (delegationRun + spawnContext + operatorLabels + DOM drawer)
- [x] Code-review — **PASS**
- [x] Pushed — aionui-src `e49d74a` (wanding), claude-code-best `d478a5c9` (main)

## Manual smoke (accepted)

- [x] **Path A orchestrator** — nested `委派 → 万鼎报价专家 · blocked · 3 tools`, agentId, 查看执行, Read + 查价 MCP 子步缩进 (2026-07-09 screenshot; MCP fail → blocked 符合预期)
- [x] **Guid direct** — flat View Steps，无假委派框 (2026-07-09 screenshot)
- [~] accurate-agent — optional, skipped
- [~] MCP 查价成功 / 报价表返回 — **out of scope** (dev cold-start timeout, separate track)

## Deferred (explicit)

- B1 CCB bridge `_meta.delegationRun` enrich
