# Work tasks: manager assignee roster (`list_assignees`)

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Repo** | claude-code-best |
| **Parent context** | `07-09-agent-work-tasks-collaboration-system`, org-phase0 `env.local` |
| **Created** | 2026-07-11 |

## Problem

`env.local` registers multiple employees (yjc, liankexin, zjz, qps) but acceptance scripts only used `EMPLOYEE_USERNAME` (yjc). Manager agent had `resolve_assignee` but no way to discover **who can be assigned** when the user asks「有哪些人可以派」.

Agent runtime must **not** read `env.local` (secrets); roster comes from Org VPS `/api/users`.

## Solution

1. MCP v2.3.0: `work_tasks_list_assignees` (manager-only, default employee-only filter).
2. Shared `fetchUserList()` for resolve + list.
3. `parse-env-employees.mjs` + V2-M2b/M2c acceptance — verify all `env.local` employees exist on VPS roster.
4. Sync `work-tasks-agent.md`, `wande-orchestrator.md`, `work-tasks-agent.aionui.json`, spec tool table.

## Contracts

| ID | Behavior |
|----|----------|
| `WANd.TASKS.ASSIGNEE_ROSTER.001` | Manager lists assignable employees from live Org directory |
| `WANd.TASKS.AGENT_RBAC.001` | Unchanged — JWT actor, no env.local injection |

## Acceptance

- `node --test scripts/org-phase0/parse-env-employees.test.mjs` → 2/2 PASS
- `node scripts/test-work-tasks-agent-acceptance.mjs` → ALL PASS (yjc/liankexin/zjz/qps on VPS)
- code-reviewer Layer A PASS

## Out of scope

- Per-machine SSO login for liankexin/zjz/qps (ops runbook)
- env.local → Agent runtime injection (by design forbidden)
