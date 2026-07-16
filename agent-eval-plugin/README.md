# Agent Eval Plugin

An embedded, evidence-based evaluation harness for Claude Code, Codex, and Cursor. It turns real business scenarios into locked Cases, runs target Agents through Runtime Adapters, enforces deterministic hard gates, and lets the current host AI judge open rubrics without another model API call.

## Workflow

1. Use the `agent-eval` Skill to create a Case from a real business request and ideal process.
2. Review and explicitly confirm the normalized Case before it can run.
3. Run isolated target-Agent trials through the selected Adapter.
4. Inspect hard-gate evidence. `FAIL`, `ERROR`, and `BLOCKED` remain distinct.
5. When required, let the current host AI submit one anonymized batch Judgment; hard failures cannot be overridden.
6. Render JSON/Markdown reports and explicitly promote compatible passing results to Baseline.

The script under `scripts/` is a host-internal protocol, not a replacement Agent CLI. Raw traces and private reports belong under ignored `.agent-eval/` runtime directories.

## Installation and host use

Register this directory with the host's local plugin mechanism. Claude Code uses `.claude-plugin/plugin.json`; Codex and Cursor use their corresponding manifests. All three manifests expose the same `skills/agent-eval/SKILL.md` contract and the same Core.

Ask the host naturally to create or run an Agent eval. The host should show a draft for explicit confirmation, run the locked Case, then present any pending Judge Packet to the current conversation. In CI or another no-AI context, required soft rubrics remain `NEEDS_REVIEW` instead of receiving fabricated scores.

## Privacy and troubleshooting

- Keep `.agent-eval/runs/`, raw ACP logs, and private reports out of Git.
- `FAIL` means the Agent violated Case evidence; `ERROR` means execution failed; `BLOCKED` means the required runtime, permission, or data was unavailable.
- A Route B CCB run requires a runtime root containing `dist/cli.js` and bundled Bun plus the matching CCB config directory.
- If a Case reports `judgment_pending`, use the current host AI to review the generated batch Packet; do not call another judge model.
- Baselines require an explicit promotion of a passing report. Soft deltas are comparable only when Judge and Rubric fingerprints match.
