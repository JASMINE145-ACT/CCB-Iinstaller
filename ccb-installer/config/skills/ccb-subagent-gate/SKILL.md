# CCB Subagent Gate

Runtime delivery gate for WanD keep-set specialist agents. It is invoked through agent frontmatter `hooks.Stop` on `Agent()` delegation (`SubagentStop`) and Guid direct sessions (`Stop`) when the agent has a hook.

## Behavior

- Office agents (`word-creator`, `ppt-creator`, `excel-creator`): hard block (`exit 2`) when produced files fail schema or content checks.
- `accurate-agent`: warn-only in v1. Logs to `.claude/logs/subagent-gate-warn.log`, does not block.
- `quotation-agent`: MCP evidence check **off**; knowledge Read gate **block** on `quotation-agent:knowledge` (2026-06-30). PreToolUse `pre-match-knowledge-gate.py` blocks `match_quotation` until session Read; PostToolUse `post-knowledge-read-mark.py` marks session after Read (covers subagent transcript + flush race); PostToolUse `post-match-knowledge-nudge.py` when `candidate_count > 1`; `post-price-tiers-nudge.py` when `get_product_price_tiers` returns tiers.
- `price-library-agent`: PreToolUse `pre-price-library-data-md-gate.py` blocks upsert/apply until session Read `data.Md`; PostToolUse `post-data-md-read-mark.py` marks session after Read (subagent transcript + flush race, 2026-07-05); PostToolUse `post-price-library-confirm-nudge.py` on `requires_confirmation`; Stop `price-library-unpublished.sh` warns when draft applied without publish (2026-07-03).
- `quotation-agent:roe`: **block** (2026-06-27 MVP) — Result-Oriented Execution Stop validator (`quotation-roe.sh`). Blocks text-only promises / write-intent without L2 tool success in intent window. Log: `.claude/logs/subagent-gate-roe.log`.
- **Universal `:roe-judge`** (2026-06-28) — In-process ROE self-check gate (`generic-roe-judge.sh` + `parse_transcript_roe_judge.py`). Stop hook runs **rule-based** incomplete detection; on block → `exit 2` + structured REJECT injected into **same CCB session** (`stop_hook_blocking` auto-continue). The **main in-process model** performs semantic self-check on the next turn — no external LLM/API call from the hook. Runs after agent-specific validators for any agent with `{agent}:roe-judge` in `modes.json`. Log: `.claude/logs/subagent-gate-roe-judge.log`. All Stop-hook agents: `:roe-judge: block`.
- `wande-orchestrator`: off/no-op (no Stop hook in seed).

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
