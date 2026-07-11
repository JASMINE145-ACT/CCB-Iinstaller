# Optimize wande-orchestrator Chinese routing prompt

## Goal

Refactor the low-risk WanD agent prompts into shorter Chinese-first contract prompts for MiniMax, while preserving existing routing/execution/RBAC/confirmation contracts. Scope: `wande-orchestrator.md`, `work-tasks-agent.md`, and `price-library-agent.md`.

## Contract map

| Contract | Behavior protected | Verification |
|---|---|---|
| `WANd.ROUTING.ASSIGNMENT.001` | Orchestrator delegates business/office/research intent via `Agent(subagent_type)` and never calls business MCP at top level. | `node eval/run-agent-eval.mjs`; targeted routing eval cases when live run is available |
| `WANd.RUN.EXECUTION.001` | Delegated agent returns full output same turn and orchestrator forwards it. | prompt contract + existing eval cases |
| `WANd.RUN.ADMISSION.001` | No background agent / no `TaskOutput`; sync wait only. | prompt contract + ACP unit coverage in CCB source |`n| `WANd.TASKS.AGENT_RBAC.001` | Work task tools respect JWT-derived actor and backend RBAC. | prompt contract + work-tasks MCP/backend RBAC |`n| `WANd.TASKS.NO_IMPERSONATION.001` | Agent must not spoof actor/session identity in tool payload. | prompt contract |`n| `WANd.PRICE_LIBRARY.CONFIRMATION.001` | Price-library writes require preview then explicit confirmation. | prompt contract + MCP confirm hooks |`n| `WANd.PRICE_LIBRARY.REVISION.001` | Publish/revert respect revision/version and stop on conflicts. | prompt contract |

## Requirements

- Keep changed seed files Chinese-first because MiniMax is the runtime model.
- Reduce duplicate playbook text and incident-history prose.
- Keep routing table and hard boundaries explicit.
- Keep thinking-model override rule.
- Keep memory rule minimal and on-demand.`n- Contractize `work-tasks-agent.md` around RBAC, no impersonation, and audit.`n- Contractize `price-library-agent.md` around org authority, two-phase confirmation, revision safety, and data.Md read gate.
- Do not move specialist MCP details into the orchestrator.

## Acceptance Criteria

- [x] `wande-orchestrator.md` is readable Chinese-first markdown with valid YAML frontmatter.
- [x] The prompt clearly says orchestrator routes via `Agent`, does not call business MCP, waits synchronously, and forwards subagent output in the same turn.
- [x] Pricing, Accurate, work-tasks, office, and research intents map to the correct subagents.
- [x] Existing eval schema still passes (`node eval/run-agent-eval.mjs`).

## Out of Scope

- Runtime guard code changes.
- Specialist prompt changes.
- Live ACP eval unless environment credentials are already available.