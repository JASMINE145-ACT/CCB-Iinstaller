# Audit event schema (v1)

> Authority: `business-closure-contract.md` §2.

## Table (conceptual)

`employee_audit_log(id, at, actor_user_id, target_user_id, action, source, resource, result, detail_json)`

## Action enum (minimum)

| action | When |
|--------|------|
| `org_user.create` / `.update` / `.delete` | Admin org APIs |
| `org_user.reset_password` | Admin reset |
| `org_user.set_is_admin` | Promote/demote |
| `price_library.write` | Mutating price REST/MCP |
| `access.denied` | Gate denial (lifecycle/cap/scope) — optional collapse into `result=denied` |

## Retention

Default 90 days (`EMPLOYEE_AUDIT_RETENTION_DAYS`) — align EIL Q5 when implementing purge.
