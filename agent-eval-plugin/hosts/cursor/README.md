# Cursor host wrapper

Cursor exposes the shared `agent-eval` Skill and delegates deterministic operations to `scripts/agent-eval.mjs`. Users interact through the Cursor conversation, not a new Agent CLI. A target Agent must run in an isolated session; the current Cursor conversation may judge only the filtered anonymous Packet.

Use the same `create`, `confirm`, `run`, `review`, `report`, and explicit `baseline` operations as the other hosts. Do not copy Case-specific business rules into Cursor rules or commands, and never allow a soft Judgment to override a hard failure.

Automated tests verify the shared manifest and wrapper contract. A conversational Cursor smoke must be recorded by a human host session and must not be claimed from automation alone.
