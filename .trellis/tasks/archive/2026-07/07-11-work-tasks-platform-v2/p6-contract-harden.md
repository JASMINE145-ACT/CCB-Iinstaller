# P6 Contract Harden — Dashboard Drill-down

> **Date:** 2026-07-11  
> **Trigger:** System Review on Plan A (filter-in-place)  
> **Action:** Phase 1 immediate fixes — **docs/contracts only** (no UI code)

## Locked decisions

| Topic | Decision |
|-------|----------|
| Nav model | Plan A — employee-**filtered** list on `/tasks` |
| Filtered SoT | `/query` with params for known assignee / status / overdue |
| Cap-200 client-filter | **Forbidden** as happy path for known `assignee_id` |
| Unassigned | Client filter + truncation warning; no invented server null API |
| History | User actions `push`; normalize/employee strip `replace`; Back restores prior filter |
| Controls | Single `filterState` helper; Tabs only in unfiltered mode |
| IPC | Must widen `queryTasks` beyond `Record<string, never>` |
| D10 派单 | Out of Phase 1 |
| Count parity | Match predicates + show filtered count; ≠ unfiltered KPI |

## Artifacts updated

- `research/dashboard-data-contract.md` — full `WANd.TASKS.DASHBOARD_DRILLDOWN.001`
- `research/dashboard-drilldown-design.md` — aligned; contract wins on conflict
- `prd.md` — AC-D* hardened
- `execution-plan.md` — P6 steps gated on contract + IPC

## Next

User: **批准计划 A** → **执行 task** (P6a filterState TDD → IPC → UI).
