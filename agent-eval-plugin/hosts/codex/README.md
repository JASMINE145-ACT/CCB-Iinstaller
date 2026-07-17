# Codex host wrapper

In this repository, Codex discovers `.agents/skills/agent-eval/SKILL.md` when a
new thread starts. That project loader delegates to the canonical plugin Skill
and script; it contains no evaluation business logic. Mention `$agent-eval` or
ask Codex naturally to create or run an Agent eval.

The active Codex conversation creates and explicitly confirms Cases, invokes
`scripts/agent-eval.mjs` for deterministic operations, reads the anonymous batch
Judge Packet, and submits all Judgments together without a second model API.

Use the same `create`, `confirm`, `run`, `review`, `report`, and explicit
`baseline` operations as Claude Code. Case, Event, Trace, Judgment, and Report
contracts remain host-neutral.

`.codex-plugin/plugin.json` is distribution metadata for plugin packaging. The
project loader is the working repository entry and should be reloaded in a new
Codex thread after it changes.
