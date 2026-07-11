# EIL baseline — existing assets inventory

> **Task:** `07-14-employee-intelligence-layer`  
> **Date:** 2026-07-09  
> **Type:** planning research (pre-P0 contract)

## Summary

Employee Intelligence Layer is a **composition task** — most building blocks exist in fragment form. v1 work is **unification + authority upgrade**, not greenfield HR.

## Existing assets

| Capability | Task / spec | Status | EIL reuse |
|------------|-------------|--------|-----------|
| Client employee profile → prompt | `07-06-employee-profile-settings-prompt` | completed | Upgrade to org-enriched; client becomes supplemental |
| Profile at session/new + runAgent | `agent-team-architecture.md` § Profile | shipped | Extend merge payload |
| work_task_role RBAC | `07-03`, migration 014 | shipped | Map to system role layer |
| Work tasks CRUD + query API | `aioncore-work-tasks.md` | shipped | Task linkage plane |
| work-tasks-agent MCP | `07-09` | in_progress | First EIL tool surface; finish audit AC4 |
| Personal memory | `07-06-ccb-memory-auto-accumulation` | partial | Bound to actor_user_id; dedup vs profile |
| Org JWT auth | org VPS | shipped | Actor identity source |

## Gaps (v1 must build)

1. **Org identity fields** on user record (dept, manager, status) — not in DB today
2. **Data scope resolver** (self / direct_reports / department / company)
3. **Unified audit table** for agent + API actions
4. **Lifecycle gate** (terminated → deny mutating)
5. **Server-sourced context API** (replace client-only authority for org fields)
6. **Business role tags** (static v1)

## Recommended v1 slice (MVP)

**P0 + P1 + P2 core only:**

- Identity API + migration
- Audit writer
- Org context injection (ACP + subagent)
- work-tasks-agent audit + scope completion
- Manager/employee smoke scenarios (AC4)

**Defer:** AI work profile store, cockpit UI, approval designer, audit replay UI.

## Open questions (see prd.md)

Track decisions in `research/eil-contract.md` after user approval.

## References

- `.trellis/tasks/07-06-employee-profile-settings-prompt/prd.md`
- `.trellis/tasks/07-09-agent-work-tasks-collaboration-system/prd.md`
- `.trellis/tasks/07-09-agent-work-tasks-collaboration-system/research/agent-work-tasks-baseline.md`
