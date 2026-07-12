# Execution Plan — `07-12-work-tasks-accept-acl`

| Field | Value |
|-------|--------|
| **Status** | **verifying** — Option A implemented; await user smoke |
| **Active phase** | P1–P3 done → manual smoke |
| **Scenario** | **A/C** (RBAC + UI fix; Option A) |
| **Plan depth** | Standard (security + UI) |
| **Verification profile** | Security → UI |
| **Repos** | AionCore `aionui-work-tasks` + aionui-src WorkTasks pages |
| **Baseline task** | `07-09-agent-work-tasks-collaboration-system` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Scenario E stop; Contract→TDD doctrine |
| trellis-before-dev | Read: | packages → integration `aioncore-work-tasks.md` |
| trellis-brainstorm | Read: | one blocking Q; diverge A/B/C |
| Code diagnosis | Grep/Read: | `rbac.rs:57` UpdateStatus; `WorkTaskDetailPage` Accept ungated |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | Root cause locked in `research/accept-acl-diagnosis.md` |
| Explore Q1 | **done** | Option **A** locked 2026-07-12 |
| P1 RBAC | **done** | `can_apply_status_transition`; cargo unit+integration green |
| P2 UI | **done** | `canAcceptWorkTask` / `filterWorkTaskStatusOptions`; list+detail |
| P3 Spec | **done** | `aioncore-work-tasks.md` ACCEPT_ACTOR.001; code-reviewer PASS |
| Smoke | **pending** | admin → yjc pending: no Accept; yjc can Accept |

## Phase -1 capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Backend rbac unit tests | available | extend `rbac.rs` / `service_integration.rs` |
| UI gating | available | Detail + list Accept |
| Acceptance script | available | add manager-creator accept case |
| EIL is_admin | N/A | out of scope |

**Plan depth:** Standard

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|-------------------|--------------|---------------|------|
| `WANd.TASKS.ACCEPT_ACTOR.001` *(provisional)* | Only allowed actors may `pending_accept→accepted` | `rbac.rs`, `WorkTaskDetailPage.tsx`, list Accept | cargo rbac + vitest/UI smoke | security |
| `WANd.TASKS.AGENT_RBAC.001` | Existing UpdateStatus / edit matrix not silently widened | `rbac.rs`, MCP edit | acceptance mjs | security |

### Contract: WANd.TASKS.ACCEPT_ACTOR.001

**Behavior protected:** The 「接受」 action and the accept edge of the status machine are only available to actors defined by product (default proposal: assignee-only).  
**Primary code:** `AionCore/.../rbac.rs`, `WorkTaskDetailPage.tsx`, `WorkTasksPage/index.tsx`  
**Tests:** `cargo test -p aionui-work-tasks`; optional UI unit for `canShowAccept`  
**Eval / smoke:** admin opens yjc pending task → no misleading Accept (per option A)  
**Risk if broken:** wrong accountability; manager “accepts” employee work

---

## Divergent options (locked only after Q1)

See `open-questions.md`. Implementation workstreams below assume **Option A** until user overrides.

## Workstreams (post-approval only)

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| P0 | P0 | Product lock Q1 | docs-only | — | brainstorm | open-questions | A/B/C chosen | Fast |
| P1 | P0 | RBAC + tests | ACCEPT_ACTOR | security | TDD | `rbac.rs`, integration | RED then GREEN | Security |
| P2 | P0 | UI gate Accept / copy | ACCEPT_ACTOR | ui | TDD | Detail + list | assignee-only Accept | UI |
| P3 | P1 | Spec + acceptance row | AGENT_RBAC | docs | trellis-update-spec | aioncore-work-tasks.md | documented | Fast |

## TDD contract (Option A sketch)

| Workstream | RED | GREEN | Refactor guard |
|------------|-----|-------|----------------|
| P1 | manager-creator `pending→accepted` still succeeds | fails / Forbidden | same cargo test |
| P2 | Accept visible for non-assignee manager | hidden | smoke-renderer + manual |

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| ACCEPT_ACTOR | cargo + manual admin/yjc | pending product | blocked |
| plan structure | lint when sections complete | pending | pending |

## Manual smoke (after impl)

1. admin 派单给 yjc → pending  
2. admin 打开详情 → **无「接受」**（Option A）或见「代接受」（Option C）  
3. yjc 登录 → 可见「接受」→ 成功  
4. admin 「更改状态」行为符合选型  

## Parallel / merge

Single-threaded Security→UI. No parallel.

## Recovery

If Option B chosen: close task as **wontfix** with UX copy-only tweak (rename?); document intentional manager force-accept.

## Approval gate

**Stop.** Await Q1 answer in chat or `open-questions.md`. Then user says **执行** for P1+.
