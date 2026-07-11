# Work Tasks Platform v2 — Baseline & gaps

> **Task:** `07-11-work-tasks-platform-v2`  
> **Date:** 2026-07-11  
> **Superseded soft wording:** brief/scope details → `api-contract-matrix.md`

## Today (07-09 shipped)

| Layer | Has | Missing |
|-------|-----|---------|
| API | POST/PUT/GET list scopes, manager `/query` → list_all | username resolve; brief; is_admin scope |
| MCP | create, edit, query (manager) | list_mine, brief, get, resolve_assignee |
| UI | manager Collapse summary; tabs mine/assigned | Per-employee dashboard table |
| Roles | manager \| employee; admin username→manager | EIL `is_admin` company scope |

## Integrated delivery

```text
P0 contracts ✅ ──► P2 MCP v2 (RED acceptance first) ──► P2b agent md + deploy
                              │
                              └──► P3 UI dashboard (cap 200)
P1 AionCore optional (non-blocking)
P4 is_admin (when EIL P1 ready)
```

## Tool → REST (see api-contract-matrix.md)

| MCP tool | REST |
|----------|------|
| `work_tasks_list_mine` | GET `/api/work-tasks?scope=mine` |
| `work_tasks_brief` | compose **mine only** (never `/query`) |
| `work_tasks_get` | GET `/api/work-tasks/:id` |
| `work_tasks_resolve_assignee` | GET `/api/users` + username filter |

## UI dashboard

See `dashboard-data-contract.md`: client group `query.items`, cap 200, overdue top 10, employee hidden.
