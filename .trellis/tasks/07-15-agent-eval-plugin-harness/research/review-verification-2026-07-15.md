# Review verification — Agent Eval Plugin Harness

Date: 2026-07-15

## 1. Read-first production contract

The review reported that production CCB was match-first because several legacy cases still contain `read_knowledge_before_match`. Repository and live-runtime inspection show the current production contract is Read-first:

- Source profile: `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` requires one Read before the first `match_quotation` / batch call.
- Live profile: `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md` contains the same PreToolUse hook and Read-first rule.
- Gate implementation: `ccb-installer/config/skills/ccb-subagent-gate/scripts/lib/knowledge_effectiveness.py` denies a missing Read and instructs Read before match.
- Project spec: `.trellis/spec/integration/agents-unified-model.md` records the forced session-once PreToolUse Read gate.

Conclusion: keep the new golden path Read-first. Treat match-first assertions in `eval/agent_eval_cases.jsonl` as regression-asset drift. Phase 0 must update or retire conflicting assertions; no production-order flip is required.

## 2. ACP tool-result evidence

The current Eval parser only retains tool name, parent id, and `rawInput`. However, `ccb-installer/src/services/acp/bridge.ts` emits `tool_call_update.rawOutput` for `tool_result` and `mcp_tool_result`.

The native ACP smoke currently serializes updates to stdout and truncates each JSON record to 3000 characters. Therefore evidence output may exist but be truncated or ignored.

Conclusion: Phase 0 must capture untruncated structured update objects/JSONL and prove match and inventory payload availability with a fixed fixture. Patch the ACP bridge or add MCP/state snapshots only if the live dist is verified not to expose `rawOutput`.

## 3. Candidate-selection evidence

CCB has no stable raw `candidate.confirmed` event. Treating it as a required sequence node would create a circular derived event from the later inventory call.

Conclusion: the hard sequence is `Read -> match -> inventory -> table`. Candidate correctness is an `evidence_link`: `inventory.input.code` must be contained in `match.output.candidates[*].code`; table code, price, and inventory must link to the same evidence chain.

## 4. Host and judge constraints

- Claude Code is the first executable end-to-end wrapper because CCB runs through Claude Code/ACP.
- Codex and Cursor remain v1 targets, with automated package/schema/contract tests plus recorded human host smoke; do not claim fully automated conversational E2E where the host cannot be programmatically driven.
- Judgment must record host/model/version/rubric hash. Soft Baseline delta is comparable only when the Judge Fingerprint matches.
- Without a current AI, run deterministic hard graders and return `NEEDS_REVIEW` with `judgment_pending` when required soft rubrics remain.
- Three target trials are graded in one randomized batch. Report `independent_trials: false` for the shared parent judge context.
