# Execution Plan — `07-13-org-admin-user-management`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | A (标准功能) + security cross-cut |
| **Plan depth** | Standard |
| **Verification profile** | Security + UI |
| **Active phase** | MVP Phase 3 **done**; Phase 4 大部分 **done**；**Phase 5 planning**（删除与生命周期 — `product-delta-phase5.md`） |
| **Approved** | MVP: 2026-07-13. Phase 4: 有条件批准. **Phase 5: pending** |
| **Parent** | `07-14-employee-intelligence-layer` |
| **Product delta** | `product-delta-phase4.md` · `product-delta-phase5.md` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` |
| skill-selection | Read: | `skill-selection.md` §二 |
| trellis-before-dev | Read: | packages → backend/frontend/integration |
| Spec: EIL | Read: | `employee-intelligence-layer.md`, `07-14/research/eil-contract.md` Q1 |
| System-review absorb | Read: | user-pasted Main Business Flow + Top Risks (2026-07-13) |
| Code baseline | Read: | migrations **022–024 exist** → next **025**; `CurrentUser` has no `is_admin`; `list_org_users` ignores `_actor`; create is manager-only |
| UI baseline | Read: | `D:\Projects\aionui-src` — `orgHttpBridge`, `ipcBridge.workTasks.listMembers` → `GET /api/users`, Router `/org-knowledge` pattern |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | Capability matrix |
| Phase 0 | **done** | `admin-rbac-contract.md` + task.json sync + migration=025 + Phase 4 split |
| Phase 1 | **done** | See `p1-aioncore-admin-gate-done.md` — GREEN cargo + code-reviewer PASS |
| Phase 2 | **done** | See `p2-aionui-org-users-done.md` — UI + Layer A/B PASS |
| Phase 3 | **done** | `vps-smoke-log.md` ALL PASS |
| Phase 4+ | **mostly done** | Settings / capability / org chart Tab — chart fidelity → Phase 5.11 |
| Phase 5 | **5.1–5.5 plan locked** | `phase5-delete-state-contract.md` + `execution-plan-phase5.md`; code pending user go |
| Product deferred | deferred | Dept table / LDAP / Excel / audit — `deferred-phase2.md` |
| Contract Verification | MVP PASS | Phase 4 contracts pending approval |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec / RBAC contract | Read: admin-rbac-contract.md | **available** | — |
| TDD | Skill: superpowers:test-driven-development | available | Manual RED/GREEN |
| Backend | Agent: trellis-implement | available | Inline |
| Frontend | Agent: trellis-implement | available | `D:\Projects\aionui-src` |
| Security review | Agent: security-reviewer | available | Mandatory after Phase 1 |
| code-reviewer | Agent: code-reviewer | available | Layer A/B |
| VPS | deploy checklist | available | Manual |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ORG.USER_ADMIN.001` | Only `is_admin` may list/create/update **org-users** with identity fields; roster `GET /api/users` stays manager+ PublicUser | see `admin-rbac-contract.md` | employee/manager 403 on `/api/org-users`; admin 200/201; create→context dept | security |
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | Create/update identity visible via `GET /api/users/me/context` | `aionui-auth` me_context | route/service auto-test after create | cross-repo |
| `WANd.EMPLOYEE.SETTINGS_MERGE.001` | MVP: Settings org fields read-only for employee | aionui-src EmployeeProfile settings | Manual smoke | ui |

Product Phase 2 contracts (`DEPT_TREE` / `PASSWORD_UI` / `LDAP_SYNC`): placeholders only — see `deferred-phase2.md`.

## Main business flow (MVP)

```text
admin login
  → auth middleware loads CurrentUser.is_admin from DB
  → sidebar shows #/org-users iff is_admin
  → admin UI create/update
  → POST/PUT /api/org-users (admin gate)
  → users table (+ identity columns)
  → GET /api/users/me/context (employee)
  → Settings read-only + chat org block
```

### Breakpoints → plan fixes

| Flow node | Fix in this plan |
|-----------|------------------|
| Admin gate | `025_is_admin.sql` + `CurrentUser.is_admin` + `/api/org-users` ACL (`admin-rbac-contract.md`) |
| Create user | `OrgUserCreateRequest` with dept/title/manager/status — **not** 3-field `CreateOrgUserRequest` |
| Update identity | **New** `PUT /api/org-users/{id}` — do not reuse `…/work-task-role` |
| Context readback | Service/route test: create → me/context department |
| List users | Split: roster vs admin — do **not** make `GET /api/users` admin-only |

## Workstreams (MVP only)

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0.1 | P0 | Absorb system-review | docs-only/no-runtime-contract | — | — | `admin-rbac-contract.md`, `deferred-phase2.md`, `task.json` | ✅ done this session | Fast |
| 1.1 | P0 | Migration `025_is_admin.sql` | `WANd.ORG.USER_ADMIN.001` | migration | TDD → trellis-implement | `AionCore/.../migrations/025_is_admin.sql`, `models/user.rs` | column + seed admin | Security |
| 1.2 | P0 | Propagate `is_admin` | `WANd.ORG.USER_ADMIN.001` | security | trellis-implement | `IUserRepository`, `CurrentUser`, `/api/auth/user` response | middleware loads DB flag | Security |
| 1.3 | P0 | Org user DTOs + repo | `WANd.ORG.USER_ADMIN.001` | security | TDD → trellis-implement | `OrgUser*` types, `update_org_identity` | separate from work-task DTO | Security |
| 1.4 | P0 | Routes `/api/org-users` | `WANd.ORG.USER_ADMIN.001` | security | TDD → trellis-implement | `work-tasks/routes.rs`, `service.rs` | list/create/update admin-only; fix roster `_actor` check on `GET /api/users` | Security |
| 1.5 | P0 | Test matrix + security-review | `WANd.ORG.USER_ADMIN.001` | security | security-reviewer | tests | GREEN matrix in contract §5 | Security |
| 2.1 | P0 | Bridge `orgUsers.*` | `WANd.ORG.USER_ADMIN.001` | cross-repo | trellis-implement | see UI inventory | ipcBridge → org VPS `/api/org-users` | UI |
| 2.2 | P0 | Page + nav gate | `WANd.ORG.USER_ADMIN.001` | ui | trellis-implement | see UI inventory | `#/org-users` + sidebar if is_admin | UI |
| 2.3 | P0 | code-reviewer | all | ui | Agent: code-reviewer | AionCore + renderer | Layer A/B PASS | UI |
| 3.1 | P0 | VPS deploy + smoke | `WANd.ORG.USER_ADMIN.001` | external-api | checklist | `vps-smoke-log.md` | admin 201 / manager 403 / context JSON | **PASS** |
| 3.2 | P1 | Ops docs | docs-only/no-runtime-contract | — | trellis-update-spec | runbook §13 | 「日常用 admin UI」 | Fast |

### Phase 0 UI file inventory (`D:\Projects\aionui-src`)

| Concern | Path |
|---------|------|
| Org HTTP bridge | `packages/desktop/src/common/adapter/orgHttpBridge.ts` |
| Existing users roster | `ipcBridge.ts` → `workTasks.listMembers` → `GET /api/users` (**keep**) |
| Add admin APIs | `ipcBridge.ts` → new `orgUsers.list/create/update` → `/api/org-users` |
| Router pattern | `renderer/components/layout/Router.tsx` (mirror `/org-knowledge`) |
| Sidebar entry | `renderer/components/layout/Sider/index.tsx` + new `SiderOrgUsersEntry.tsx` (mirror `SiderSuppliersEntry.tsx`) |
| Org context read | `common/config/fetchEmployeeOrgContext.ts` |
| Settings read-only confirm | Employee profile settings page under `renderer/pages/` (locate at implement) |
| i18n | `renderer/services/i18n/locales/{zh-CN,en-US}/` |
| Auth / is_admin source | org `/api/auth/user` via existing org auth context (extend with `is_admin`) |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1.4 admin POST | `WANd.ORG.USER_ADMIN.001` | manager `POST /api/org-users` → Forbidden | `cargo test -p aionui-work-tasks admin_only_` | Same |
| 1.4 admin list | `WANd.ORG.USER_ADMIN.001` | employee `GET /api/org-users` → Forbidden | same package | Same |
| 1.4 roster | `WANd.ORG.USER_ADMIN.001` | employee `GET /api/users` → Forbidden; manager → 200 | `cargo test … list_org_users` | Same |
| 1.3 create+context | `WANd.EMPLOYEE.ORG_CONTEXT.001` | create with dept → context missing | `cargo test -p aionui-auth` + work-tasks create→context | Same |
| 1.4 update | `WANd.ORG.USER_ADMIN.001` | no `PUT /api/org-users/{id}` | `cargo test … update_org_user` | Same |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.ORG.USER_ADMIN.001` | Targeted cargo tests (admin_only_*, create/update/list) | PASS | pending |
| `WANd.ORG.USER_ADMIN.001` | JWT smoke: admin 201, manager 403, employee 403 | `vps-smoke-log.md` or local org aioncore log | pending |
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | create → `GET /api/users/me/context` department | JSON snippet in smoke log | pending |
| Security | Agent: security-reviewer | PASS | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-13-07-13-org-admin-user-management/execution-plan.md` | PASS | pending |

## Parallel / merge

MVP serial: Phase 1 → security-review → Phase 2 → code-review → Phase 3.  
Product Phase 2: only after MVP; see `deferred-phase2.md`.

## Conditional recovery

| Trigger | Action |
|---------|--------|
| Migration number taken | Re-read migrations dir; never overwrite 022–024 |
| Making `GET /api/users` admin-only | **Reject** — breaks assignee roster; use `/api/org-users` |
| security-reviewer FAIL | Fix → re-review from Phase 1 |
| VPS migration fail | Restore SQLite backup; document in smoke log |

## Manual smoke (MVP)

1. admin login → `#/org-users` visible  
2. create `tester1` / 采购部  
3. manager login → no `#/org-users`; `POST /api/org-users` 403  
4. `tester1` login → Settings shows 采购部 read-only; context handoff OK  

## System-review disposition

| Risk | Disposition |
|------|-------------|
| migration 022 wrong | ✅ → **025** |
| no is_admin model | ✅ → contract + Phase 1.1–1.2 |
| list_users no ACL | ✅ → roster manager+; admin list on `/api/org-users` |
| create manager-only | ✅ → admin-only on `/api/org-users` |
| DTO mismatch | ✅ → `OrgUser*` types |
| task.json P2 / no parent | ✅ → P1 + parent EIL |
| UI paths vague | ✅ → inventory table |
| coarse cargo verify | ✅ → JWT smoke matrix + targeted tests |
| Phase 4 in MVP table | ✅ → `deferred-phase2.md` |
| spec “Next 016” stale | Note: **migrations directory is source of truth**; update `aioncore-work-tasks.md` at Phase 3 docs gate |

---

**Next:** Phase 3 VPS — see `vps-deploy-handoff.md` (local tarball + smoke scripts ready; **you upload/build on VPS**).  
After smoke: paste output into `vps-smoke-log.md`.
