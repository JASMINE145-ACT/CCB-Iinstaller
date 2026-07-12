# Dashboard Drill-down Design — Manager Work Tasks

> **Task:** `07-11-work-tasks-platform-v2`  
> **Phase:** P6 — dashboard interaction depth  
> **Status:** design + **contract hardened** 2026-07-11 (system review)  
> **Canonical contract:** [`dashboard-data-contract.md`](./dashboard-data-contract.md) § `WANd.TASKS.DASHBOARD_DRILLDOWN.001`  
> **Product label:** employee-**filtered** task list on `/tasks` (Plan A) — not a separate employee page (Plan C / P7)

If this file conflicts with `dashboard-data-contract.md`, **the contract wins**.

---

## Problem

当前「团队概览」是 **只读摘要**：

- KPI / 工作量条 / 逾期列表 **不可下钻**
- 点员工行无反馈 → 经理无法「只看 yjc 的任务」
- 列表区与概览数据源分裂（`list` vs `/query`），经理感知「共 6 项」但列表首屏可能对不齐

经理真实工作流：

```text
扫一眼团队 → 谁待接受/逾期多？ → 点进该员工 → 逐条催办/改状态
```

---

## Design principles

1. **Same surface first** — Plan A filter-in-place on `/tasks`  
2. **URL is state** — shareable; Back restores previous filter (`push` on user actions)  
3. **Manager-only** — employee strips params + never calls `/query`  
4. **Filtered list SoT = `/query`** for server-supported filters — **no** capped client-filter happy path  
5. **One filter helper** owns URL ↔ state ↔ query params ↔ Select  
6. **Progressive disclosure** — compact overdue empty; highlight selected assignee row  

---

## Divergent map (summary)

| In P6 Phase 1 | Stretch / Later |
|---------------|-----------------|
| D1–D5, D12–D14 click + URL + chip + KPI + compact overdue + query SoT | D6 segment click, D7 Drawer, D8 People page |
| D13 unassigned with partial warning if capped | D10 row 派单, D15 agent clipboard, D16 EIL, D17–D18 |

---

## Plan A (locked default)

```text
/tasks?assignee=<userId>[&status=pending_accept][&overdue=1]
```

- Click 执行人 → **`push`** URL → list refetch `/query?assignee_id=`  
- Chip「正在查看：yjc」+ 清除（`push` 清空）  
- **Back** restores previous filter (not “always clear”)  
- Overview KPI/workload stays on unfiltered overview query; selected row highlighted  
- Employee: `replace` strip; no chips; no `/query`

Plans B/C deferred to P7 unless user overrides.

Full schema, push/replace, unassigned, IPC widen, parity rules → **dashboard-data-contract.md**.

---

## Interaction map (Phase 1)

| Surface | Result |
|---------|--------|
| 执行人行 | `push` `assignee=<id>` |
| 未分配 | `push` `assignee=unassigned` (client filter + truncation warning) |
| KPI 状态 / 逾期 / 全部 | `push` status/overdue changes |
| Chip 清除 | `push` clear filters |
| 逾期项 | `/tasks/:id` |
| 行内派单 | **Out of Phase 1** |

Scope Tabs: active only in **unfiltered** mode; ignored/disabled while dashboard filters on.  
Status Select: bound to URL `status` via the same helper.

---

## Implementation prerequisites (before UI)

1. Lock contract (done in `dashboard-data-contract.md`)  
2. Widen `queryTasks` IPC params (`Record<string, never>` → query params type)  
3. Add `filterState` parse/serialize/toQueryParams + unit tests (RED→GREEN)  
4. Wire dashboard clicks + filtered list SWR key  
5. Layout polish (compact overdue, legend color)  
6. Manual AC-D*  

---

## Acceptance (see PRD AC-D*)

Contract-level extras beyond original sketch:

- Filtered cards all match predicates; chip count from filtered `summary.total` / `items.length`  
- Employee deep link: no filter chrome on first paint; no `/query` in network  
- Invalid URL params: `replace` normalize  
- Known-assignee list never silently uses overview cap-200 client filter  

---

## Open decision

Nav model default **A**. Reply **批准计划 A** then **执行 task** to implement.
