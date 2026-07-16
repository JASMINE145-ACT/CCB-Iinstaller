# Codex host wrapper

Codex loads the shared `agent-eval` Skill from this plugin and invokes `scripts/agent-eval.mjs` only for deterministic operations. The active Codex conversation creates and confirms Cases, reads the anonymous batch Judge Packet, and submits all Judgments together without a second model API.

Use the same `create`, `confirm`, `run`, `review`, `report`, and explicit `baseline` operations as Claude Code. Case, Event, Trace, Judgment, and Report contracts must remain host-neutral; do not add Codex-only business grading logic.

The 2026-07-16 project smoke used the current Codex conversation to submit three fixture Judgments and produced a validated passing report. This does not replace a live target-Agent result.
