# Execution Plan — `07-11-work-tasks-platform-v2`

| Field | Value |
|-------|--------|
| **Status** | in_progress (P6 contract locked — awaiting **批准计划 A**) |
| **Scenario** | A (+ cross-repo UI) |
| **Plan depth** | Standard → treat as **Full merge discipline** (serial gates) |
| **Verification profile** | Cross-repo → **UI** for P6 |
| **Active phase** | P6 impl done — manual AC-D* pending |
| **Repos** | claude-code-best (AionCore + MCP + scripts) + aionui-src (UI) |
| **Contract docs** | `research/api-contract-matrix.md`, `research/dashboard-data-contract.md` (P6 locked), `research/dashboard-drilldown-design.md`, `p6-contract-harden.md` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` — Scenario A, Standard+, UI |
| trellis-before-dev | Read: | `get_context.py --mode packages` → frontend/index.md + aioncore-work-tasks.md |
| trellis-brainstorm | Read: | diverge→converge; one blocking Q on nav model |
| superpowers:brainstorming | Read: | HARD-GATE — design before code |
| ui-ux-pro-max | Shell: | Soft UI dense dashboard + ux nav guidelines |
| Baseline routes | Grep: | `/tasks`, `/tasks/:id` only; MemoryPage URL pattern exists |
| Baseline API | Spec: | `/query?assignee_id=&status=&overdue=` already supported |
| Live UI | User screenshot: | KPI + workload + empty overdue; rows not clickable |
| System review | Chat: | Plan A OK; harden URL/SoT/employee/parity before code |
| P6 contract harden | Write: | `dashboard-data-contract.md` DASHBOARD_DRILLDOWN.001; `p6-contract-harden.md` |

## P1–P3 scope contract (locked)

| Actor | P1–P3 behavior | P4 (EIL) |
|-------|----------------|----------|
| employee | only own via `scope=mine` / `list_mine` / `brief` | same |
| manager | **retain** existing `/query` → `list_all` | narrow to reports/dept |
| `is_admin` / company | **blocked** — do not implement | AC9 |

**`work_tasks_brief`:** compose **only** from `scope=mine`. **Never** call `/query`. Manager org overview uses `work_tasks_query`.

Full matrix: `research/api-contract-matrix.md`. Dashboard caps: `research/dashboard-data-contract.md`.  
Drill-down design: `research/dashboard-drilldown-design.md`.

## Acceptance matrix (extend before/with P2)

| Case | Actor | Expect |
|------|-------|--------|
| V2-E1 | employee mine list | 200; own only |
| V2-E2 | employee `/query` | 403 |
| V2-E3 | employee brief | no foreign assignees; not via `/query` |
| V2-M1 | manager `/query` | 200 + summary |
| V2-M2 | manager resolve `yjc` | user_id |
| V2-M3 | manager assign create | `pending_accept` |
| V2-G1/G2 | get own / other | 200 / 403–404 |

Script: `scripts/test-work-tasks-agent-acceptance.mjs` — add cases as RED then GREEN.

## Task: 07-11-work-tasks-platform-v2 — Work Tasks Platform v2

**Scenario:** A (clear PRD; phased P0–P6 in one task)  
**Spec entry:** `.trellis/spec/integration/aioncore-work-tasks.md`

---

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm / PRD | available | Done this session |
| Implementation | trellis-implement / inline | available | After approve |
| TDD | superpowers:test-driven-development | available | AionCore + vitest + acceptance mjs |
| Review | code-reviewer | available | Layer B for renderer |
| Security | security-reviewer | available | P2+ RBAC scope changes |
| Parallel | superpowers:dispatching-parallel-agents | available | Serial at API contract boundary |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.TASKS.MCP_V2.001` | New read tools: list_mine, brief, get, resolve_assignee | `work-tasks-query-server/index.mjs` | `test-work-tasks-agent-acceptance.mjs` | security |
| `WANd.TASKS.MANAGER_DASHBOARD.001` | Manager-only per-assignee + overdue UI on `/tasks` | `WorkTaskManagerDashboard.tsx` | Manual UI + vitest | ui |
| `WANd.TASKS.DASHBOARD_DRILLDOWN.001` | Manager click assignee/KPI → URL-synced filtered employee task view | `WorkTasksPage` + URL helpers | vitest URL helpers + manual AC-D* | ui |
| `WANd.TASKS.AGENT_RBAC.001` | Existing — extended, not weakened | MCP + AionCore rbac | existing + new acceptance rows | security |
| `WANd.TASKS.QUERY_SCOPE.001` | Manager vs admin query scope (EIL-aligned) | AionCore work-tasks service | cargo test + JWT smoke | security |

### Contract: WANd.TASKS.DASHBOARD_DRILLDOWN.001

**Behavior protected:** Manager opens employee-**filtered** task list on `/tasks` via URL-synced filters; filtered list SoT is `/query`; employee strips params and never calls `/query`.  
**Primary code:** `filterState.ts`, `WorkTaskManagerDashboard.tsx`, `WorkTasksPage/index.tsx`, `ipcBridge.queryTasks` params  
**Tests:** vitest filterState; manual AC-D1–D10  
**Eval / smoke:** admin click yjc → `/query?assignee_id=`; Back restores; employee deep link no `/query`  
**Risk if broken:** Wrong/incomplete list under 200-cap; filter chrome leak; back-button trap  
**Canonical doc:** `research/dashboard-data-contract.md` (hardened 2026-07-11)

### Contract: WANd.TASKS.MCP_V2.001

**Behavior protected:** Agents can list/brief own tasks; managers can resolve assignee and get by id.  
**Primary code:** `mcp_servers/work-tasks-query-server/index.mjs`  
**Tests:** `node scripts/test-work-tasks-agent-acceptance.mjs`  
**Risk if broken:** Employee data leak; wrong assignee

### Contract: WANd.TASKS.MANAGER_DASHBOARD.001

**Behavior protected:** Manager sees per-employee task breakdown; employee does not.  
**Primary code:** `WorkTaskManagerDashboard.tsx`  
**Tests:** vitest grouping helpers  
**Risk if broken:** Role leak in UI

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| P0 | P0 | Contracts + jsonl | docs | — | done | api-contract-matrix, dashboard-data-contract | Locked | Fast |
| P1 | P0 | AionCore (optional) | QUERY_SCOPE | security | TDD | `aionui-work-tasks/` | Non-blocking | Security |
| P2 | P0 | MCP v2 tools | MCP_V2 | security | TDD | `work-tasks-query-server/index.mjs` | list_mine/brief/get/resolve | Cross-repo |
| P2b | P0 | Agent md + deploy | MCP_V2 | packaging | implement | work-tasks-agent.md + vendor | Tool table | Release |
| P3 | P1 | Manager dashboard UI | MANAGER_DASHBOARD | ui | TDD | WorkTasksPage + dashboard | Per-assignee + overdue | UI |
| P4 | P2 | EIL `is_admin` | QUERY_SCOPE | cross-repo | after 07-14 | AionCore + MCP | AC9 | Security |
| P5 | — | Spec + smoke | all | — | trellis-update-spec | aioncore-work-tasks.md | AC10 | Cross-repo |
| **P6** | **P1** | **Dashboard drill-down** | **DASHBOARD_DRILLDOWN** | **ui** | **TDD filterState → IPC → UI** | filterState + Dashboard + Page + ipcBridge | Employee-filtered list | **UI** |
| P7 | P2 | People page / drawer | DASHBOARD_DRILLDOWN | ui | after P6 feedback | new route or Drawer | Only if A insufficient | UI |

### P6 — Dashboard drill-down (Plan A; contract hardened)

**Design:** `research/dashboard-drilldown-design.md`  
**Canonical contract:** `research/dashboard-data-contract.md` § `WANd.TASKS.DASHBOARD_DRILLDOWN.001`  
**Harden evidence:** `p6-contract-harden.md`

| Step | Work | RED | GREEN |
|------|------|-----|-------|
| P6-0 | Contract harden (done) | N/A docs | `p6-contract-harden.md` |
| P6a | `filterState` parse/serialize/toQueryParams/employee normalize | unit RED | `bun test` filter helpers |
| P6b | Widen `queryTasks` IPC (`Record<string, never>` → params) | type/compile | AC-D10 |
| P6c | Filtered list SWR via `/query`; overview unfiltered; no cap client-filter happy path | unit mapping | AC-D1/D9 |
| P6d | Row/KPI clickable + chips + push/replace | N/A UI | AC-D2/D3/D4 |
| P6e | Employee strip + no `/query` | N/A | AC-D5 network |
| P6f | Unassigned + compact overdue + legend | N/A | AC-D6/D7 |
| P6g | Spec sync | N/A | trellis-update-spec |

**Out of Phase 1:** row 派单 (D10), Drawer/People page, segment click.

### Serial merge gates

```text
1–7. P2–P5 (as before)
8. P6-0 contract harden (done 2026-07-11)
9. P6a filterState GREEN
10. P6b IPC params
11. P6c–f UI + Layer B smoke
12. Manual AC-D1–D10
13. Spec update
```

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P2 MCP | MCP_V2 | V2 cases before tools | `node scripts/test-work-tasks-agent-acceptance.mjs` | same |
| P3 UI | MANAGER_DASHBOARD | grouping helper | aionui vitest | same |
| **P6 drill** | **DASHBOARD_DRILLDOWN** | **filterState unit fails first** | **`bun test` filterState + dashboard helpers** | **same + AC-D*** |
| P4 EIL | QUERY_SCOPE | defer | EIL smoke | same |

---

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| WANd.TASKS.MCP_V2.001 | acceptance script | ALL PASS 2026-07-11 | PASS |
| WANd.TASKS.MANAGER_DASHBOARD.001 | vitest + manual | vitest PASS; AC6 pending | partial |
| WANd.TASKS.DASHBOARD_DRILLDOWN.001 | filterState + AC-D* | unit PASS; code-review PASS; manual pending | **impl done** |
| WANd.TASKS.AGENT_RBAC.001 | V2-E2 | PASS | PASS |
| WANd.TASKS.QUERY_SCOPE.001 | documented | P4 pending | PASS (P1–P3) |

---

## Verification profile and gate

**Selected:** Cross-repo (historical) → **UI** for P6

1. code-reviewer (Layer B for renderer)
2. Contract Verification rows
3. acceptance script regression
4. Manual AC6–AC8 + AC-D1–D10
5. trellis-update-spec
6. Commit only if user asks

### Manual steps

- [ ] admin: dashboard groups + overdue
- [ ] yjc: no dashboard
- [ ] agent assign / brief smokes
- [ ] **P6:** click yjc → `/query` filtered list; chip clear push; Back restores; KPI; employee strip + no `/query`; unassigned warning if truncated

---

## Parallelization

| Stream | Rule |
|--------|------|
| P6 | aionui-src only after P6-0; IPC widen before filtered SWR |
| P4 | blocked on EIL |

---

## Recovery

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Managers reject filter-in-place | revisit A/B/C | **yes** |
| Filtered `/query` unsupported for assignee_id | spike AionCore; update contract | **yes** |
| Employee `/query` call observed | P6e | no |
| Cap client-filter used for known assignee | P6c — defect | no |

---

## Defer

- Bulk assign / delete / draft workflow
- P7 People page / Drawer
- Row quick-assign (D10)
- Workload bar segment click (D6)
- Agent clipboard deep-link (D15)
- EIL department tree
- Server-native unassigned query (until proven)

---

## Progress snapshot

| Phase | State | Evidence |
|-------|--------|----------|
| Contract harden (P0) | done | api-contract-matrix, dashboard-data-contract |
| P2 MCP | done | v2.2.0; acceptance ALL PASS |
| P2b / P5 partial | done | agent md + spec tool table |
| P3 UI | done | WorkTaskManagerDashboard; vitest |
| P6 design | done | dashboard-drilldown-design.md |
| **P6-0 contract harden** | **done** | `p6-contract-harden.md`; DASHBOARD_DRILLDOWN.001 locked |
| **P6 impl** | **done** | `p6-done.md`; filterState 13 PASS; code-reviewer PASS |
| Manual AC6–8 / AC-D* | pending | user smoke |
| P4 EIL | deferred | AC9 |

---

## Approval gate

P6 contract is **hardened**. Default remains **A** (employee-filtered list on `/tasks`).

Reply **批准计划 A** then **执行 task** to implement P6a→P6g.

(B/C require re-approval of contract deltas.)
