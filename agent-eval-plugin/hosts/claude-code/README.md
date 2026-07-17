# Claude Code host wrapper

From the repository root, load the plugin for the current process:

```powershell
claude --plugin-dir .\agent-eval-plugin
```

Invoke `/agent-eval-plugin:agent-eval` or ask Claude naturally to create or run
an Agent eval. Claude loads the canonical `skills/agent-eval/SKILL.md`; the host
wrapper must not copy Case-specific grading logic.

The active conversation creates and confirms the Case, invokes
`scripts/agent-eval.mjs` for deterministic work, and supplies its real
host/model/version fingerprint when it will judge. After all isolated target
trials finish, it reviews one filtered batch Judge Packet and submits all
`eval.judgment/v1` records together. It must not call a second judge API or
override a failed hard gate.

Supported operations are `create`, `confirm`, `run`, `review`, `report`, and
`baseline`. Raw run state remains under the ignored `.agent-eval/runs/`
directory.
