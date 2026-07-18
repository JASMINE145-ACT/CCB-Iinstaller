# Execution Plan — Business Closure MVP (纵向闭环)

| Field | Value |
|-------|--------|
| **Status** | **DONE** (MVP Phases 0–3) — VPS 2026-07-14 + Mixing 验收 PASS 2026-07-15 |
| **Contract** | `business-closure-contract.md` (**LOCKED** definition) |
| **Parent epic** | `07-14-employee-intelligence-layer` |
| **Scenario** | **B** (phased vertical slice) |
| **Plan depth** | **Full** |
| **Verification profile** | **Security** + **UI** (closure smoke matrix) |
| **Active phase** | — (MVP closed; optional Phase 4) |
| **Supersedes** | Prior Wave A/B/C/D horizontal ordering in this filename |
| **VPS evidence** | `vps-deploy-p2-p3-done.md` — `GET /api/org-users` → **401** |
| **Mixing evidence** | `mixing-acceptance-done.md` — user PASS |

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| system-review + brainstorm (user) | Read: | Vertical chain + audit-first critique accepted with refinements |
| Independent review | Read: | `price-library` `can_write` already uses is_admin\|cap\|**env**; `WORK_TASKS_AGENT_ROLE` still in query MCP |
| trellis-task-execution | Read: | rewrite plan only — no app code |
| Closure contract | Write: | `business-closure-contract.md` |

---

## Independent accept / adjust log

| Reviewer claim | Decision |
|----------------|----------|
| Horizontal waves ≠ closed loop | **Accept** — reorder to vertical Phases 0–4 |
| Audit cannot wait until “Wave D” | **Accept** — minimal ledger in Phase 1 |
| Freeze `capabilities[]`; park `business_roles` | **Accept** |
| v1 scope = `direct_reports` only | **Accept** — department/company later |
| UI polish after gates | **Accept** as Phase 4 |
| Price write needs end-to-end gate | **Accept with nuance:** REST already gates on cap/is_admin but **env `PRICE_ADMIN_USERNAMES` is a hole**; MCP parity + env policy are the real closure work |
| Kill legacy MCP role env / username==admin | **Accept** — tracked in Phase 0/3 |
| Reset password = target-only invalidation | **Accept** — hard requirement in Phase 1 |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase 0 | **DONE** | `p0-scaffolding-done.md` — contract + matrices + `legacy-gates.md` + EIL Deferred |
| Phase 1 | **DONE** | `p1-audit-admin-lifecycle-done.md` — audit 027, reset/is_admin, MCP lifecycle + ledger deny |
| Phase 2 | **DONE** | `p2-price-cap-gate-done.md` — REST/MCP price write = is_admin\|cap; env break-glass only |
| Phase 3 | **DONE** | `p3-scope-role-done.md` — direct_reports scope + `WORK_TASKS_AGENT_ROLE` default-off |
| VPS P2+P3 | **DONE** | `vps-deploy-p2-p3-done.md` — aionorg :13401; org-users **401** |
| Mixing 验收 | **PASS** | `mixing-acceptance-done.md` — 2026-07-15 |
| Phase 4 | deferred | UI polish / supplier widen (optional backlog) |

**Code-review (Phase 3):** PASS — Layer A PASS; Layer B N/A  
**Security-review (Phase 3):** PASS  
**Tests (Phase 3):** `aionui-work-tasks` scope 5 + service_integration 29 ok  
**Deploy smoke:** `curl …/api/org-users` → 401 on `hot-snap-1`  
**Mixing acceptance:** PASS (user)

---

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| Security review | Agent: security-reviewer | available | Mandatory Phases 1–2 |
| TDD | Skill: superpowers:test-driven-development | available | cargo + MCP smoke |
| Implement | Agent: trellis-implement | available | After before-dev |
| Quality | Agent: code-reviewer | available | sqlite txn Critical + Layer A |
| Spec refresh | trellis-update-spec | available | Phase 0 / Phase 4 |
| Verify | trellis-contract-verify | available | `closure-smoke-matrix.md` |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ORG.CLOSURE.001` *(provisional → this contract)* | Vertical chain definition | `business-closure-contract.md` | closure-smoke-matrix | security |
| `WANd.ORG.USER_ADMIN.001` | Admin reset / is_admin / delete guards | org-users routes + UI | cargo + UI | security |
| `WANd.ORG.CAPABILITY.001` / `WANd.ORG.CAP_GATE.001` | price write deny/allow | price-library rbac + MCP | unit + MCP smoke | security |
| `WANd.EMPLOYEE.SCOPE.001` | direct_reports only in v1 | work-tasks query + MCP | integration | security |
| `WANd.EMPLOYEE.AUDIT.001` | mutate actions leave rows | employee_audit_log | insert asserts | security |
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | lifecycle login + MCP | auth + MCP | login + tool 403 | security |
| docs-only | EIL spec Deferred refresh | employee-intelligence-layer.md | review | — |

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0.1 | P0 | Freeze closure contract | WANd.ORG.CLOSURE.001 | — | docs | `business-closure-contract.md` | **DONE** locked | Fast |
| 0.2 | P0 | Cap / scope / audit / smoke matrices | WANd.ORG.CLOSURE.001 | — | docs | `cap-gate-matrix.md` etc. | four companion docs | Fast |
| 0.3 | P0 | Inventory legacy gates | CAP_GATE / TASKS | security | research | MCP env ROLE; PRICE_ADMIN_USERNAMES; username==admin | `research/legacy-gates.md` | Fast |
| 0.4 | P0 | Refresh EIL integration Deferred | docs-only | — | trellis-update-spec | `employee-intelligence-layer.md` | is_admin/caps marked shipped | Fast |
| 1.1 | P0 | Minimal `employee_audit_log` + writer | AUDIT.001 | security | TDD→implement→security-reviewer | aionui-db migration + service | schema + unit insert | Security |
| 1.2 | P0 | Admin reset password + target-only invalidate | USER_ADMIN | security | TDD→implement→security-reviewer | auth + org-users + UI | POST reset; other sessions keep working | Security |
| 1.3 | P0 | Admin set `is_admin` API + UI | USER_ADMIN | security | TDD→implement | org-users + OrgUsersPage | last-admin guard | Security |
| 1.4 | P0 | Suspended/terminated MCP mutating gate | ORG_CONTEXT | security | TDD→implement | work-tasks / price MCP wrappers | tool 403 when suspended | Security |
| 1.5 | P0 | Audit hooks for admin + MCP deny/allow | AUDIT.001 | security | TDD | writers at routes/MCP | rows for Phase-1 actions | Security |
| 2.1 | P0 | Price write: one shared gate (REST) | CAP_GATE.001 | security | TDD | `rbac.rs` policy for env | closure smoke without env bypass for non-admin | Security |
| 2.2 | P0 | Price write: MCP same gate | CAP_GATE.001 | security | TDD + MCP smoke | price-library-server | upsert without cap → 403 | Security |
| 2.3 | P0 | Audit price write ok/denied | AUDIT.001 | security | TDD | audit writer | queryable rows | Security |
| 3.1 | P0 | Scope resolver `self` + `direct_reports` | SCOPE.001 | security | TDD | work-tasks service + MCP query | unit matrix | Security |
| 3.2 | P0 | Deprecate `WORK_TASKS_AGENT_ROLE` override | TASKS.RBAC | security | implement | work-tasks-query-server | JWT/DB role wins | Security |
| 3.3 | P1 | AI smoke: manager NL reports; employee self | CLOSURE + TASKS | ui | manual | orchestrator + agent | closure-smoke-matrix rows | UI |
| 4.1 | P1 | Admin UI: manager name, search, cap chips | USER_ADMIN | ui | implement | OrgUsersPage | operable list | UI |
| 4.2 | P2 | Encoding + org-chart fidelity | USER_ADMIN | ui | implement | org chart | smoke fixture | UI |
| 4.3 | P2 | Widen `supplier_directory.write` gate | CAP_GATE | security | TDD | supplier routes/MCP | optional after price closed | Security |

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1.1 audit table | AUDIT | migration missing | `cargo test -p aionui-db … audit` | same |
| 1.2 reset pwd | USER_ADMIN | no route / global rotate | cargo + two-session smoke | same |
| 1.4 MCP lifecycle | ORG_CONTEXT | suspended tool still 200 | MCP smoke script | same |
| 2.1–2.2 price gate | CAP_GATE | non-admin no-cap write ok via env/MCP | cargo rbac + MCP | same |
| 3.1 scope | SCOPE | manager sees non-report | cargo + query smoke | same |

---

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| CLOSURE.001 | Full `closure-smoke-matrix.md` | all rows green | pending |
| USER_ADMIN | reset + is_admin + delete guards | UI + cargo | pending |
| CAP_GATE | price REST+MCP | no-cap 403 / cap 200 + audit | **Phase 2 DONE** (`p2-price-cap-gate-done.md`) |
| SCOPE | direct_reports only | manager/employee matrix | **Phase 3 DONE** (`p3-scope-role-done.md`) |
| AUDIT | SQL/API sample | Phase-1+2 actions present | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-14-employee-intelligence-layer/execution-plan-business-closure.md` | PASS | pending |

---

## Parallel / merge

| Parallel OK | Must stay serial |
|-------------|------------------|
| 0.2 matrices ∥ 0.3 legacy inventory | 1.1 schema before 1.5 writers |
| 4.x UI polish after 2.x gate green | 2.x before claiming「业务闭环」 |
| — | 3.x after 1.4 lifecycle MCP gate |

---

## Conditional recovery

- Env username required for emergency price write → document as **break-glass**, never as closure PASS.
- Manager company visibility product conflict → either explicit admin-only company or update product decision in research note before Phase 3 GREEN.
- Reset password mishap → revert binary; audit proves which target changed.

---

## Manual steps (closure MVP)

See `closure-smoke-matrix.md` (Phase 0.2). Minimum story:

1. Admin creates user → grants `price_library.write` → audit row.  
2. User without cap: REST+MCP price write **denied** + audit deny.  
3. User with cap: write **ok** + audit ok.  
4. Suspend user → login fail + MCP mutate fail.  
5. Manager NL lists **only** direct reports’ tasks.  
6. Admin resets password → target re-login with new pwd; admin session still valid.

---

## Approval

Reply:

- `执行 Phase 0` — fill matrices + legacy inventory + EIL spec refresh  
- `执行 Phase 1` — audit + reset/is_admin + MCP lifecycle (code)  
- `批准闭环合同` — contract only freeze (already written; confirms no further churn)
