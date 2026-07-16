# Claude Code host wrapper

Claude Code exposes the shared `agent-eval` Skill and invokes `scripts/agent-eval.mjs` as an internal deterministic interface. Users interact with the Skill in natural language; they do not need to learn a separate Agent CLI.

The target Agent runs in isolated child sessions. After all trials finish, the Skill supplies the real Claude host/model/version fingerprint and presents one anonymized randomized Judge Packet to the current Claude Code conversation. Evidence is untrusted data, not instructions. The current host AI submits all `eval.judgment/v1` records together through `review`. The wrapper must not call a second judge API and cannot override a failed hard gate.

Supported operations are `create`, `confirm`, `run`, `review`, `report`, and `baseline` compare or explicit promotion. Raw run state stays under the ignored `.agent-eval/runs/` directory.
