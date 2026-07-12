# Execution Plan — `07-12-work-tasks-rbac-closed-loop`

| Field | Value |
|-------|--------|
| **Status** | **completed** — archived 2026-07-12; VPS deploy optional follow-up |
| **Active phase** | done |
| **Scenario** | **A** (clear PRD); security-tagged → **H** overlay |
| **Plan depth** | **Standard** |
| **Verification profile** | **Security** → UI |
| **Repos** | AionCore `aionui-work-tasks` + aionui-src WorkTasks + org VPS |
| **Baseline** | `07-09-agent-work-tasks-collaboration-system`, `07-12-work-tasks-accept-acl` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD doctrine; Scenario E→A after locks |
| skill-selection.md | Read: | Brainstorm; Security mandatory on RBAC |
| trellis-before-dev | Read: | integration `aioncore-work-tasks.md` |
| trellis-brainstorm | Read: | Q1=B, Q2=A locked; prd ready |
| Research persist | Write: | `research/rbac-matrix-as-is-to-be.md` |
| Product lock | User: | Q1=B, Q2=A |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | research AS-IS/TO-BE |
| Phase 0 | **done** | Q1=B, Q2=A locked |
| P2 Backend | **done** | any-manager rbac; cargo 14+11; `other_manager_can_team_ops_but_not_accept` |
| P3 UI | **done** | helpers + dialog/detail/list; vitest 19; code-reviewer PASS |
| P1 Spec | **done** | `aioncore-work-tasks.md` RBAC_MATRIX.001 |
| P4 MCP | skipped | no tool surface change; backend ACL covers edit |
| P5 VPS | **pending** | org API still needs deploy for Forbidden on VPS |
| Implement | verifying | await user smoke + optional VPS |

## Phase -1 capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Backend rbac unit + integration | available | extend table-driven tests |
| UI gating helpers | available | pattern from `canAcceptWorkTask` |
| MCP mirror | available | 07-09 tools; must not widen |
| VPS deploy | available | `deploy-org-aioncore-vps.ps1` — needed for API truth |
| Department / EIL admin | N/A | out of scope |

**Plan depth:** Standard

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|-------------------|--------------|----------------------|------|
| `WANd.TASKS.RBAC_MATRIX.001` *(provisional)* | Role×relation×action closed loop | `rbac.rs`, `service.rs`, WorkTasks UI helpers | table-driven cargo + vitest + admin/yjc smoke | security |
| `WANd.TASKS.ACCEPT_ACTOR.001` | Accept assignee-only | `can_apply_status_transition`, `canAcceptWorkTask` | existing cargo/vitest | security |
| `WANd.TASKS.MANAGER_READ.001` *(provisional)* | Any manager Read for query drill-down | `can_access_task(Read)`, detail page | integration get_task as mgr | ux/security |
| `WANd.TASKS.AGENT_RBAC.001` | MCP ≤ human matrix | work-tasks MCP tools | acceptance / MCP smoke | security |

### Contract: WANd.TASKS.RBAC_MATRIX.001

**Behavior protected:** Every human/MCP work-task action is allowed or denied by an explicit role×relation cell; no UI-only ACL.  
**Primary code:** `AionCore/.../rbac.rs`, `service.rs`, `workTaskTypes.ts`, WorkTasks pages  
**Tests:** `cargo test -p aionui-work-tasks`; `vitest workTaskTypes.test.ts` (+ new matrix cases)  
**Eval / smoke:** admin↔yjc assign/accept/defer/complete/query; manager detail open from dashboard  
**Risk if broken:** wrong accountability; privilege escalation via agent/UI

### Contract: WANd.TASKS.MANAGER_READ.001

**Behavior protected:** Managers who can see a row in `/query` can open detail (Read), without gaining Accept.  
**Primary code:** `can_access_task(..., Read)`  
**Tests:** integration: non-creator manager GET `:id` → 200  
**Eval / smoke:** dashboard click → detail  
**Risk if broken:** broken manager UX or silent over-grant if bundled with UpdateStatus

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| P0 | P0 | Lock Q1 (+ optional Q2) | docs-only | — | brainstorm | open-questions, prd | A/B/C chosen | Fast |
| P1 | P0 | Spec matrix into `aioncore-work-tasks.md` | RBAC_MATRIX | docs | trellis-update-spec | spec | documented table | Fast |
| P2 | P0 | Backend matrix gaps (Read / ManageOps per Q1) | RBAC_MATRIX, MANAGER_READ | security | TDD | `rbac.rs`, `service.rs`, integration | RED→GREEN | Security |
| P3 | P0 | UI helpers parity | RBAC_MATRIX | ui | TDD | `workTaskTypes.ts`, Detail/List | CTAs match matrix | UI |
| P4 | P1 | MCP regression (no widen) | AGENT_RBAC | security | check | MCP tools / acceptance | employee still 403 query | Security |
| P5 | P0 | VPS deploy + smoke | RBAC_MATRIX | release | deploy script | org VPS | API Forbidden/allow match | Security |

**Stop rule:** Do not start P2 until user says **执行** (Q1/Q2 already locked).

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P2 Read | MANAGER_READ | non-creator mgr GET detail → Forbidden (today) | same test → 200 after change | `cargo test -p aionui-work-tasks` |
| P2 Ops | RBAC_MATRIX | per Q1: other-mgr reassign/defer cases | table-driven rbac tests green | same |
| P3 UI | RBAC_MATRIX | CTA visible wrongly for non-assignee accept (already green) | vitest + smoke-renderer | vitest |
| P4 MCP | AGENT_RBAC | N/A if no tool change; smoke employee query 403 | existing acceptance / manual | — |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| ACCEPT_ACTOR.001 | cargo + UI smoke admin no Accept | prior task verifying | verifying |
| RBAC_MATRIX.001 | full matrix tests + admin/yjc script | pending P0 | pending |
| MANAGER_READ.001 | integration + dashboard→detail | pending P0 | pending |
| AGENT_RBAC.001 | MCP employee query denied | pending | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-12-work-tasks-rbac-closed-loop/execution-plan.md` | run after write | pending |

## Parallel / merge

* P1 (docs) may parallel P0 only as draft; **do not** publish matrix as final until Q1 locked.
* P2 backend before P3 UI (UI mirrors backend).
* P5 VPS after P2 green (org is API truth).

## Conditional recovery

* If Q1=B introduces `ManageOps`, treat as Security profile — code-reviewer + security checklist before VPS.
* If Accept regresses, stop and re-run ACCEPT_ACTOR tests before continuing.

## Manual smoke (after 执行)

1. admin → assign yjc → pending  
2. admin detail: no Accept; can defer/reassign per locked Q1  
3. other manager (if Q1=B): ops allowed; still no Accept  
4. yjc: Accept → complete  
5. dashboard → open detail (MANAGER_READ)  
6. employee MCP/query still denied  

## Approval gate

**Product locks done (Q1=B, Q2=A).** Wait for user「执行」before P1–P5 code.
