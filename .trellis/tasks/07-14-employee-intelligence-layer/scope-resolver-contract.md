# Scope resolver contract (v1)

> Authority: `business-closure-contract.md` §4.

## Inputs

- `actor_user_id`, `actor.work_task_role`, `actor.is_admin`
- Requested query filters (assignee, department, …) — **never trusted as scope**

## Outputs

| Scope | Visible user ids |
|-------|------------------|
| `self` | `{ actor }` |
| `direct_reports` | users where `manager_user_id = actor` |
| `company` | all real users — **`is_admin` only** |
| `department` | **deferred** |

## Edges

- Manager requesting company → **deny** (unless product explicitly re-opens; not MVP).
- Employee requesting another assignee → **deny**.
- MCP `WORK_TASKS_AGENT_ROLE` must not widen scope beyond DB role.
