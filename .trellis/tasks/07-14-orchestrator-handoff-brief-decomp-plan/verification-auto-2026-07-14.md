# Verification evidence — auto-ran 2026-07-14 evening

## Automated (agent-ran)

| Check | Result |
|-------|--------|
| `bun test` handoffBrief + agentSessionProfile (`D:\claude-code-B`) | **22 pass** |
| vitest `decompositionPlan.test.ts` | **6 pass** (incl. derive multi-run) |
| Eval schema validate decomp cases | **schema ok** (82 loaded; both case ids selected) |
| `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` | **done** → `D:\CCB-Wanding\dist` |
| Live overlay has `handoffBrief` + sanitize wrap | **yes** (`D:\claude-code-B\src\services\acp\`) |
| MessageToolGroupSummary auto-derive plan for ≥2 DelegationRuns | **wired** (no MessageList prop needed) |
| Layer B smoke (this run) | **flake FAIL** (`spawnSync bun ETIMEDOUT` resolving icon-park); prior session PASS icons-only |
| Native ACP smoke `查询直接50价格` | **TIMEOUT** (~109s); did apply `wande-orchestrator`, saw Agent/tool_calls; Brief content not fully captured before timeout |

## Not agent-doable

- Restart AionUI / aioncore after deploy
- Open Guid, run A/B/C manual chat smoke
- Expand View Steps → confirm Brief marker in Agent input
- Live eval `--run` with model quota (optional)

## How to finish human side

See chat reply checklist.

## Distill → durable specs (2026-07-14 Integrate)

| Rule | Placement |
|------|-----------|
| A6: helpers+tests without UI consumer FAIL | `.trellis/spec/code-review-layer-a.md` A6; `.cursor/agents/code-reviewer.md` A6 + triggers; `.cursor/skills/review-code/SKILL.md` |
| Catalog「未挂载」≠ Brief; ForceMd + new session | `.trellis/spec/integration/agents-unified-model.md` § Agent catalog smoke; code-reviewer rule 7 |
| Eval UTF-8 write discipline | `eval/README.md` § Writing / editing cases |
