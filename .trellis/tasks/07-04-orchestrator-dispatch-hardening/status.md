# Status — `07-04-orchestrator-dispatch-hardening`

| Field | Value |
|-------|--------|
| **State** | in_progress |
| **Updated** | 2026-07-04 |
| **Active WS** | A baseline done; C implemented pending gate; D done; B/E pending |

## Done this session

- [`delivery-smoke-matrix.md`](./delivery-smoke-matrix.md) — CLI baseline (cases 1,3 FAIL; 2,4,5,6 manual pending)
- [`eval/scenarios/orchestrator-delegation-vs-direct-20260704.md`](../../../eval/scenarios/orchestrator-delegation-vs-direct-20260704.md)
- WS C code: `filterDelegatableCustomAgents` orchestrator bypass + unit tests (overlay)

## Blocked / next

1. **code-reviewer** on WS C diff → fix if needed
2. **bun test** `agentSessionProfile.test.ts` (needs `D:\claude-code-B` or full overlay deps)
3. Manual AionUI smoke matrix (authoritative for AC3/AC4)
4. WS E spec/backlog after gate pass

## Findings (P0)

- Specialist CLI smoke (quotation-agent handoff): profile binds but model did not call `match_quotation`; L0 orchestrator rule bleed suspected
- Default orchestrator CLI: 120s timeout without `Agent()` completion on `minimax-m3`
- **User main entry 2026-07-04:** 查价 hit `mcp__price-library__*` on `wande-orchestrator` — **fixed:** `filterMcpConfigsForOrchestratorSession` + guard prefix; deployed to `D:\CCB-Wanding\dist`

## Done this session (2026-07-04 cont.)

- **WS F / debug:** price-library MCP leak on default router — CCB overlay + tests + deploy
- `wande-orchestrator.md` — forbid price-library on lookup path
