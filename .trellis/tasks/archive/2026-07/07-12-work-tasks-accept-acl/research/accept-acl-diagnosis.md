# Research — Accept ACL diagnosis (2026-07-12)

## Related tasks

| Task | Relation |
|------|----------|
| `07-09-agent-work-tasks-collaboration-system` | **RBAC baseline** `WANd.TASKS.AGENT_RBAC.001` — UpdateStatus rule landed here |
| `07-11-work-tasks-platform-v2` | Manager dashboard / list Accept CTA; did not revisit accept actor |
| `07-14-employee-intelligence-layer` | Future `is_admin`; **not** required to fix this UX |

## Backend (authoritative)

```57:57:AionCore/crates/aionui-work-tasks/src/rbac.rs
        TaskAccess::UpdateStatus => is_assignee || (is_creator && actor.is_manager()),
```

Integration tests (`service_integration.rs`) cover employee accept path and employee forbidden on others; **manager-creator force-accept is allowed by this rule** and is not treated as a regression today.

## Frontend

- Detail: show Accept if `pending_accept` + transition graph — **no** `user.id === assignee_id`
- List quick Accept: same
- Status Select: uses `allowedStatuses` from transition graph for current status — available to whoever can call update

## Spec gap

`aioncore-work-tasks.md` documents manager create → `pending_accept` and employee accept flow, but **does not say** whether creator-manager may self-transition that accept edge.

## Contract provisional

`WANd.TASKS.ACCEPT_ACTOR.001` — who may execute `pending_accept → accepted`.
