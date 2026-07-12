# P6 Done — Dashboard Drill-down (Plan A)

> **Task:** `07-11-work-tasks-platform-v2`  
> **Date:** 2026-07-11  
> **Contract:** `WANd.TASKS.DASHBOARD_DRILLDOWN.001`  
> **Closure:** completed 2026-07-11 (user confirmed smoke OK)

## Delivered

- `workTaskFilterState.ts` — parse/serialize/list-mode/employee strip/unassigned + client overdue helpers
- `queryTasks` IPC accepts **only** `assignee_id` / `status` (overdue never on wire — AionCore rejects it)
- Manager click assignee/KPI → URL `push` → list via `/query` (known assignee/status) or client modes (`overdueClient` / `overview_client` / `unassigned_client`)
- Filter chips + clear; Back restores prior URL; employee `replace` strip
- Soft UI Evolution compact mode when `filterActive`
- Compact overdue empty; selected row/KPI highlight; scroll to list

## Verification

| Gate | Result |
|------|--------|
| `bun test workTaskFilterState.test.ts` | 17 PASS |
| `bun test workTaskDashboard.test.ts` | 5 PASS |
| smoke-renderer-imports | PASS |
| code-reviewer ×2 | PASS — Layer A N/A · Layer B PASS |
| Manual AC6–8 / AC-D* | **PASS** (user confirmed 2026-07-11) |

## Deferred

- AC9 / P4 `is_admin` company scope → `07-14-employee-intelligence-layer`
- P7 Drawer / People page
