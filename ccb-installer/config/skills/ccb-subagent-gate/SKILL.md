# CCB Subagent Gate

Runtime delivery gate for WanD keep-set specialist agents. It is invoked through agent frontmatter `hooks.Stop` on `Agent()` delegation (`SubagentStop`) and Guid direct sessions (`Stop`) when the agent has a hook.

## Behavior

- Office agents (`word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator`): hard block (`exit 2`) when produced files fail schema or content checks.
- `accurate-agent`: warn-only in v1. Logs to `.claude/logs/subagent-gate-warn.log`, does not block.
- `quotation-agent`: MCP evidence check **off**; knowledge Read gate **warn** on `quotation-agent:knowledge` (2026-06-19). PostToolUse `post-match-knowledge-nudge.py` when `candidate_count > 1`.
- `cowork` / `wande-orchestrator`: off/no-op.

## Agent Guidance

Do not bypass blocking gate failures. If a blocking hook error appears, fix the deliverable and retry. For `accurate-agent` warn lines, prefer calling the correct MCP tool before claiming results.

`quotation-agent` currently has no gate evidence check. Quotation regressions should be caught by:

- `test-mcp-health.ps1 -Probe -Session`
- route-b default orchestrator smoke: `Agent(quotation-agent)` returns `end_turn`
- direct Guid quotation smoke, including candidate selection UI

## Config

Per-agent mode lives in `config/modes.json`: `"block"` | `"warn"` | `"off"`.

Do not change `quotation-agent` from `off` without updating:

- this skill doc
- `ccb-installer/config/agents/README.md`
- `.trellis/spec/integration/agents-unified-model.md`
- delegated route-b smoke evidence
