# Execution Plan �� `07-09-agent-work-tasks-collaboration-system`

| Field | Value |
|-------|--------|
| **Status** | `completed` |
| **Scenario** | A (clear feature PRD; bounded scope) |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo |
| **Active phase** | Done � wrap-up 2026-07-09 |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` loaded and applied |
| skill-selection verdict matrix | Read: | `.cursor/skills/trellis-task-execution/skill-selection.md` used for capability winners |
| openspec-explore | Read: | `.cursor/skills/openspec-explore/SKILL.md` + `openspec list --json` output |
| trellis-before-dev | Read: | `.agents/skills/trellis-before-dev/SKILL.md` + `get_context.py --mode packages` + spec indexes |
| trellis-research | Agent: | `research/agent-work-tasks-baseline.md` persisted |

---

## Phase -1 �� Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements clarification | `trellis-brainstorm` | available | refine in PRD comments |
| Architecture exploration | `openspec-explore` | available | direct spec+research synthesis |
| Baseline research | `trellis-research` | available | manual research note |
| Implementation | `trellis-implement` | available | inline implementation |
| Spec compliance review | `trellis-check` | available | code-reviewer + manual spec checklist |
| Quality review | `code-reviewer` | available | trellis-check primary |
| Verification loop | `verification-before-completion` + profile commands | available | explicit shell evidence |

Risk tags: `security` �� `cross-repo` �� `external-api`

---

## Phase 0 �� Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Create task shell | `task.py create` | `07-09-agent-work-tasks-collaboration-system/` |
| Context curation | `task.py add-context` | implement/check jsonl entries added |
| Read specs | `trellis-before-dev` flow | integration/frontend/backend indexes reviewed |
| Baseline research | `Agent: trellis-research` | `research/agent-work-tasks-baseline.md` |

---

## Phase 1��N �� Workstreams

| Phase | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 1 | P0 | Contract finalize: single `work-tasks-agent` + role-based MCP permissions | security | `trellis-brainstorm` + PRD update | `prd.md`, `research/*.md` | permission matrix (`create`,`edit`,`query`) | Cross-repo | freeze before coding |
| 2 | P0 | Backend tool/API adapter (reuse existing `/api/work-tasks*`) | security | `trellis-implement` | AionCore tool bridge + route integration | create/edit/query wiring + role guards | Cross-repo | no new route unless required |
| 3 | P0 | Audit & observability envelope | security | `trellis-implement` | backend logging/audit module | request/agent/actor trace fields | Cross-repo | immutable audit records |
| 4 | P1 | Agent runtime routing + admin-agent gating | external-api | `trellis-implement` | agent runtime config/contracts | orchestrator delegation + access policy | Cross-repo | follow unified-model contracts |
| 5 | P1 | AionUI affordance for agent-created tasks | ui | `trellis-implement` | `aionui-src` task UI | minimal source tag + manager clarity | UI | no attachment behavior change |
| 6 | P0 | Verification & spec sync | security | `trellis-check` + `trellis-update-spec` | `.trellis/spec/integration/*.md` | PASS evidence + spec updates | Cross-repo | gate to finish-work |

---

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| Tool ACL (employee create/edit constraints) | integration | employee assign/edit out-of-scope fails | `cargo test -p aionui-work-tasks` (new cases) | existing manager/employee flow |
| Query ACL (admin only) | integration/contract | employee query 403 | backend API/tool tests | `/api/work-tasks/query` semantics |
| Audit envelope | unit/integration | missing fields assertion fails | backend tests for log/audit writer | request_id/session_id/agent_id present |
| UI source tag | unit/component | missing badge/label | `bun vitest ...workTasks...` | existing `/tasks` rendering |

---

## Verification profile and gate

**Selected:** Cross-repo

1. Primary review: `trellis-check` (spec compliance)  
2. Quality review: `code-reviewer` (secondary, bug/regression focus)  
3. Tests:
   - `cargo test -p aionui-work-tasks --lib --test service_integration`
   - affected agent/runtime tests
   - `bun vitest` for touched work-tasks UI modules
4. `trellis-update-spec` for integration contracts and routing docs
5. update `implement.jsonl` + `check.jsonl` + PRD AC checkboxes
6. `git commit` only when user explicitly asks
7. `/trellis:finish-work`

---

## Parallelization (optional Scenario D slice)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A | backend tool contract + audit | lands first (API truth) |
| B | runtime routing/admin gating | rebase after A, no duplicate contract constants |
| C | frontend task labels | starts after backend response schema freezes |

Merge order: backend contract -> runtime gating -> frontend affordance.

---

## Manual steps (human)

- [ ] Manager-agent session: create task for employee, verify pending_accept path
- [ ] Employee-agent session: attempt assign-other and verify rejection
- [ ] Admin context query: filter by assignee/status and validate result counts
- [ ] AionUI manager view: confirm agent-created source marker and no UX regression

---

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| ACL ambiguity (manager vs admin agent) | Phase 1 | update PRD contract table + research note | yes |
| Backend requires new route beyond `/query` | Phase 1 | add design delta in PRD + execution plan | yes |
| Security review finds impersonation risk | Phase 2/3 | patch + new tests + threat note | yes |
| UI regression in `/tasks` | Phase 5 | rollback UX delta + focused tests | no (if contract unchanged) |

---

## Defer / out of scope

- Department-level query partitioning
- Autonomous task prioritization engine
- Attachment content sharing across devices (P5 local-only remains)
- team_tasks / cron fusion

---

## 2026-07-09 implementation evidence (this session)

- Implemented single-agent MCP contract in `mcp_servers/work-tasks-query-server/index.mjs`:
  - tools: `work_tasks_create`, `work_tasks_edit`, `work_tasks_query`
  - role gating: employee sees create/edit only; admin/manager additionally sees query
  - runtime guard: query calls enforce permission check
- Code-review gate:
  - first review verdict FAIL (query tool leaked in employee `ListTools`)
  - fix applied: role-filtered `ListTools`
  - second review verdict PASS (no blocking issues)
- Test-agent gate:
  - verdict PASS
  - evidence: `node --check` success and mocked role-gating/query smoke verification

## 2026-07-09 configuration evidence (this session)

- Updated `.mcp.json.example` with runnable profiles for the single `work-tasks-agent`:
  - `work-tasks-agent-employee` (`WORK_TASKS_AGENT_ROLE=employee`)
  - `work-tasks-agent-admin` (`WORK_TASKS_AGENT_ROLE=admin`)
  - `work-tasks-agent-manager` (`WORK_TASKS_AGENT_ROLE=manager`)
- Code-review gate:
  - first review verdict FAIL (explicit manager profile missing)
  - fix applied: added manager profile
  - second review verdict PASS
- Test-agent gate:
  - verdict PASS
  - evidence: JSON parse pass + required entries/role map checks pass

## 2026-07-09 acceptance hardening evidence (this session)

- Updated `mcp_servers/work-tasks-query-server/index.mjs`:
  - added CSRF bootstrap (`GET /api/auth/status`) for mutating requests
  - added `x-csrf-token` + `aionui-csrf-token` cookie pairing for create/edit calls
  - kept role gate contract unchanged (employee create/edit only; admin/manager add query)
- Code-review gate:
  - verdict PASS (no blocking issues)
- Test-agent gate:
  - verdict PASS
  - evidence:
    - syntax check pass
    - mocked CSRF bootstrap/header/cookie pairing pass
    - live smoke shows non-GET request transitions from CSRF invalid risk to normal API outcome (404 not found on fake id, not CSRF error)
    - role behavior regression check pass (employee query denied; admin/manager query allowed)
