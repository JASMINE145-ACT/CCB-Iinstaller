# Dashboard Data Contract — Manager `/tasks` UI

> **Task:** `07-11-work-tasks-platform-v2`  
> **Status:** P3 locked; **P6 drill-down contract locked 2026-07-11** (system-review harden)  
> **Contracts:** `WANd.TASKS.MANAGER_DASHBOARD.001` · `WANd.TASKS.DASHBOARD_DRILLDOWN.001`

---

## Visibility

| Role | Dashboard block | Drill-down URL filters |
|------|-----------------|------------------------|
| `work_task_role === manager` | Show | Honor `assignee` / `status` / `overdue` |
| employee | **Hidden** (no empty shell) | **Strip** params; never call `/query`; no filter chrome |
| Backend | Employee `GET /query` remains **403** | UI strip is defense-in-depth, not the only gate |

---

## Data source (P3 overview — unchanged)

```text
useWorkTaskQuery(isManager)  →  GET /api/work-tasks/query   (no filter params)
       │
       ▼
query.summary  →  KPI cards
query.items    →  groupByAssignee(cap 200) + overdueList(top 10)
```

- **No new backend endpoint** for P3/P6 MVP.
- Overview grouping remains **client-side** on capped `query.items`.

## Cap / scale (MVP hard limits)

| Limit | Value | Rationale |
|-------|-------|-----------|
| Items used for grouping | `min(items.length, 200)` | Avoid UI freeze if list_all grows |
| Overdue list display | top **10** | Usable without pagination |
| Per-assignee rows | all groups from capped items | Truncation banner if needed |

**P4+ / productization:** server pagination / limit metadata on `/query`.

---

## Contract: WANd.TASKS.DASHBOARD_DRILLDOWN.001

**Product label:** Manager **employee-filtered task list** on `/tasks` (Plan A).  
Not a separate “employee profile page” (that is Plan C / P7).

### Canonical URL schema

Path: `/tasks` only (no `/tasks/dashboard`, no `/tasks/people/:id` in P6).

| URL key | Allowed values | Maps to API | Notes |
|---------|----------------|-------------|-------|
| `assignee` | non-empty user id **or** literal `unassigned` | see mapping below | Single value; take **first** if repeated |
| `status` | one of `pending_accept` \| `accepted` \| `completed` \| `incomplete` \| `deferred` | `status=` | Single value; take first |
| `overdue` | `1` only | **Client-side only** (never sent to `/query`) | Absence = not overdue-filtered; `0` / other → treat as absent. Live AionCore rejects `overdue` on `/query` (2026-07-11). |

**Non-canonical (strip on normalize):**

- `name`, `assignee_name`, unknown keys that affect filters — **do not** use display name in URL for filtering (stale names). Display name comes from selected group / members cache.
- Empty `assignee=` / empty `status=` → strip key.
- Invalid `status` (not in enum) → strip `status`.
- `overdue` ≠ `1` → strip `overdue`.

### Filter → `/query` mapping (authoritative)

| URL state | `GET /api/work-tasks/query` params | List region SoT |
|-----------|-----------------------------------|-----------------|
| no filter keys | *(overview query only; list uses existing `listTasks` + scope/status)* | **Unfiltered mode:** `listTasks` as today |
| `assignee=<id>` | `assignee_id=<id>` (+ optional status) | **Filtered mode:** `/query` items; if URL also has `overdue=1`, apply **client** overdue filter on those items |
| `assignee=unassigned` | **No** `/query` | Client filter overview items where `assignee_id` null (+ optional status/overdue); if overview truncated → show **partial** warning |
| `status=…` only | `status=…` | Filtered mode via `/query`; optional client overdue |
| `overdue=1` only | **No** `/query` overdue param | Client filter of overview items (`overview_client`) |
| combinations | assignee/status → `/query`; overdue always client | See modes in `workTaskFilterState.resolveWorkTasksListMode` |

**Hard rule:** When filtered mode is active for a **server-supported** filter (`assignee=<id>`, `status`), the task list **MUST** use a dedicated `/query` refetch with those params. **`overdue` MUST NOT** be sent to `/query` (type + IPC allowlist forbid it).  
**Forbidden as happy path:** client-filter of the overview’s capped 200 items for known `assignee_id` (status/assignee still go through `/query`).

**Degraded only:** if filtered `/query` fails after overview succeeded, show Alert + optional last-good; do **not** silently substitute capped client-filter without labeling「部分结果 / 请求失败」.

### IPC prerequisite (implementation gate)

Current bridge:

```ts
queryTasks: orgHttpGet<WorkTaskQueryResponse, Record<string, never>>(...)
```

P6 **must** widen params to e.g.:

```ts
type WorkTaskQueryParams = {
  status?: WorkTaskStatus;
  assignee_id?: string;
  // overdue intentionally omitted — client filter only
};
```

before wiring filtered list. Overview keeps `invoke({})`.

### Single source of truth for controls

One pure helper module (suggested path):  
`aionui-src/.../workTasks/filterState.ts` (name flexible)

| Concern | Owner |
|---------|--------|
| Parse URL → `WorkTasksFilterState` | helper |
| Serialize state → `URLSearchParams` | helper |
| Map state → `WorkTaskQueryParams` \| `null` (null = unfiltered list mode) | helper |
| Status `<Select>` | reads/writes `state.status` via helper only |
| Scope Tabs | **Unfiltered mode only.** In filtered mode: disabled or ignored; clearing filters restores tabs |
| Dashboard clicks / chips | push new state via helper |
| Employee strip | `normalizeEmployeeUrl` → empty filter state |

### History: push vs replace

| Event | History |
|-------|---------|
| Manager clicks assignee row / KPI / chip clear / chip remove one facet | **`push`** (back restores previous filter) |
| Load-time invalid param normalization | **`replace`** (bad URL not in history stack) |
| Employee detects filter params | **`replace`** strip all filter keys (no flash of chips: prefer sync strip before paint / `useLayoutEffect`) |

**Resolve prior contradiction:** “返回清除过滤” is **wrong**.  
**Canonical:** AC-D3 — browser **Back** restores previous URL/filter state; **Chip 清除** pushes cleared state.

### Count / parity rules

| Surface | Count source |
|---------|--------------|
| Overview KPI (no list filter / overview query) | `overview.summary.*` |
| Filtered list header / chip | Filtered `/query` → prefer `summary.total`, else `items.length` |
| Workload bars | Always from **overview** capped items (team context), with selected row highlight |

**Do not** require filtered list count === unfiltered KPI.  
**Do** require: every rendered list card satisfies active filter predicates; show the count source in UI (e.g.「共 N 项」from filtered summary).

### Employee deep-link (AC-D5 hardened)

1. `isManager === false` → `useWorkTaskQuery(false)` — **no** `/query` network call (existing).  
2. On `/tasks?assignee=…` (any filter key): **`replace`** strip filter keys.  
3. First paint: no filter Chip, no dashboard.  
4. Manual smoke: employee open deep link — Network has no `/api/work-tasks/query`.

### Unassigned (AC-D6)

| Step | Behavior |
|------|----------|
| Click 未分配 row | `push` `?assignee=unassigned` |
| List data | Filter overview `items` (pre-cap or capped — document: use **pre-cap if available**, else capped) where assignee null |
| If overview `truncated` | Banner: 未分配列表可能不完整（概览已截断） |
| Server null-assignee query | **Out of P6** unless proven in AionCore; do not invent `assignee_id=` magic without smoke |

### Empty / error (filtered)

| State | UI |
|-------|-----|
| filtered query loading | List skeleton/spin; keep chips |
| filtered query 403/error | Alert; do not show wrong assignee’s tasks |
| zero matches | Empty:「{name} 暂无匹配任务」 |
| partial unassigned | Empty or list + truncation warning |

### Interaction map (P6 Phase 1 — in)

| Surface | Result |
|---------|--------|
| 执行人行 | `push` `assignee=<id>`; highlight row; scroll to list |
| 未分配行 | `push` `assignee=unassigned` |
| KPI 待接受 / 进行中 / 已完成 | toggle/set `status=` (push) |
| KPI 逾期 | set `overdue=1` (push) |
| KPI 全部 | clear status+overdue, keep assignee (push) |
| Chip 清除全部 | push empty filter |
| 逾期列表项 | navigate `/tasks/:id` (unchanged) |

### Out of P6 Phase 1 (stretch / P7)

- Row「派单」prefill (D10)
- Drawer (B) / People page (C)
- Workload bar segment click (D6)
- Density collapse of KPI (D17)
- Esc / keyboard (D18)

### Tests (P6)

| Test | Assert |
|------|--------|
| Unit: parse | valid / invalid status; overdue≠1; multi-value first; strip empties |
| Unit: serialize | round-trip stable key order optional; no `name` key |
| Unit: toQueryParams | assignee id → `assignee_id`; unassigned → `null` (client mode); combinations |
| Unit: employee normalize | any filter → empty state |
| Manual AC-D1–D7 | see PRD |
| Manual AC-D5 network | employee + `?assignee=` → no `/query` |

### Grouping helper contract (P3 — unchanged)

```typescript
type AssigneeGroup = {
  assignee_id: string | null;
  username: string;
  total: number;
  pending_accept: number;
  accepted: number;
  overdue_count: number;
};

function groupWorkTasksByAssignee(items: WorkTask[]): AssigneeGroup[];
function listOverdueWorkTasks(items: WorkTask[], limit: number): WorkTask[];
```

### Empty / error states (overview)

| State | UI |
|-------|-----|
| query loading | Skeleton in dashboard |
| query null / error | Keep list tabs; dashboard Alert |
| zero tasks | Empty text, no fake groups |
| employee | Dashboard not mounted |

---

## Non-goals

| Phase | Non-goal |
|-------|----------|
| P3 | `/tasks/dashboard` route; dept columns; WS regroup |
| P6 | People page; Drawer; quick-assign on row; server unassigned query without proof; client-filter happy path for known assignee |
