# Cursor host wrapper

Open this repository in Cursor and start a new Agent conversation. Cursor
discovers `.agents/skills/agent-eval/SKILL.md`, whose only job is to delegate to
the canonical plugin Skill and deterministic script. Invoke `/agent-eval` or
describe the evaluation in natural language.

The target Agent runs in an isolated session. The active Cursor conversation
may judge only the filtered anonymous Packet, must submit the batch together,
and cannot override a hard failure.

Use the shared `create`, `confirm`, `run`, `review`, `report`, and explicit
`baseline` operations. Do not copy Case-specific rules into Cursor rules,
commands, or the project loader.

`.cursor-plugin/plugin.json` is distribution metadata. Automated tests verify
the manifest and loader contracts; a conversational Cursor GUI smoke must be
recorded from a real human host session and cannot be claimed from automation
alone.
