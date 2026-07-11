# P6 Done — Dashboard Drill-down (Plan A)

> **Task:** `07-11-work-tasks-platform-v2`  
> **Date:** 2026-07-11  
> **Contract:** `WANd.TASKS.DASHBOARD_DRILLDOWN.001`

## Delivered

- `workTaskFilterState.ts` — parse/serialize/list-mode/employee strip/unassigned + client overdue helpers
- `queryTasks` IPC accepts **only** `assignee_id` / `status` (overdue never on wire — AionCore rejects it)
- Manager click assignee/KPI → URL `push` → list via `/query` (known assignee/status) or client modes (`overdueClient` / `overview_client` / `unassigned_client`)
- Filter chips + clear; Back restores prior URL; employee `replace` strip
- Soft UI Evolution compact mode when `filterActive` (denser KPI/workload, chip bar surface, soft card shadow)
- Compact overdue empty; selected row/KPI highlight; scroll to list

## Verification

| Gate | Result |
|------|--------|
| `bun test workTaskFilterState.test.ts` | 17 PASS |
| `bun test workTaskDashboard.test.ts` | 5 PASS |
| smoke-renderer-imports (WorkTasksPage + Dashboard) | PASS |
| code-reviewer (overdue client + Soft UI) | PASS — Layer A N/A · Layer B PASS |
| code-reviewer (IPC overdue removal) | PASS — Layer A N/A · Layer B PASS |

## Manual re-smoke (after overdue fix)

| Check | Expect |
|-------|--------|
| Click yjc | chip「正在查看：yjc」+ filtered list |
| + 未接受 | 共 2 项, Accept buttons |
| + 仅逾期 (yjc, 0 overdue) | empty list / 「暂无匹配」, **no**「筛选查询失败」 |
| 清除筛选 | restore full list |

## Manual pending

AC-D1–D7 live smoke after hot-reload / rebuild of aionui-src.
