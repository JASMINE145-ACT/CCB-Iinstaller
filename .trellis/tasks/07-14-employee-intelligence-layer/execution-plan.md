# Execution Plan — `07-14-employee-intelligence-layer`

| Field | Value |
|-------|--------|
| **Status** | approved |
| **Scenario** | B (large spec; phased P0–P4) |
| **Plan depth** | Full |
| **Verification profile** | Security |
| **Active phase** | P0 complete (decisions locked) → **blocked on 07-09 completion** before P2 |
| **Approved** | 2026-07-09 |
| **Boundary** | Internal AI collaboration + task management first — **not** full HR |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` — Scenario B, Step 3 template |
| skill-selection | Read: | `skill-selection.md` §二 — research→trellis-research; security→security-reviewer; TDD→superpowers:TDD |
| trellis-before-dev | Read: | `get_context.py --mode packages` → integration spec index paths |
| PRD baseline | Read: | `07-06-employee-profile-settings-prompt/prd.md` (completed) |
| PRD baseline | Read: | `07-09-agent-work-tasks-collaboration-system/prd.md` (in_progress) |
| Spec baseline | Read: | `aioncore-work-tasks.md`, `agent-team-architecture.md` § employee profile |

## Task: 07-14-employee-intelligence-layer — Employee Intelligence Layer / 员工智能层

**Scenario:** B (large multi-phase spec; first delivery slices as A/D sub-phases)

**Repos:** claude-code-best (AionCore + MCP + specs) + aionui-src (prompt/context) + claude-code-B (ACP session merge)

**Spec entry:** `.trellis/spec/integration/index.md` → new `employee-intelligence-layer.md`

---

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements / PRD | trellis-brainstorm | available | Main-session PRD (done this session) |
| Research | Agent: trellis-research | available | Inline research → `{task}/research/*.md` |
| Design artifacts | Read: openspec-explore | available | P0 design doc in `research/eil-contract.md` |
| Implementation | Agent: trellis-implement | available | Inline after trellis-before-dev |
| Review (spec) | Agent: trellis-check | available | Inline spec checklist |
| Review (quality) | Agent: code-reviewer | available | Inline + Runtime Crash Checklist |
| Security | Agent: security-reviewer | available | Mandatory on P1+ (auth/RBAC/audit) |
| TDD | Skill: superpowers:test-driven-development | available | RED/GREEN in AionCore + aionui unit tests |
| Parallel (cross-repo) | Skill: superpowers:dispatching-parallel-agents | available | Serial merge at identity contract boundary |
| Verify finish | trellis-update-spec + finish-work | available | §Step 5 gate |

---

### Phase 0 — Activate & contract design (P0)

| Step | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 0.1 | P0 | Activate task | — | `task.py start 07-14-employee-intelligence-layer` | `task.json` | status `planning` → `in_progress` when approved | Fast | After user says 执行 |
| 0.2 | P0 | Read specs | cross-repo | Read: trellis-before-dev | integration + backend + frontend indexes | Spec paths in implement.jsonl | Fast | Mandatory before code |
| 0.3 | P0 | EIL contract doc | security | Agent: trellis-research | `research/eil-contract.md` | Identity/Role/Scope/Audit tables + API sketch | Fast | **DONE** — Q1–Q6 locked |
| 0.4 | P0 | Sibling task alignment | — | Read + update notes | `07-09` task.json notes | 07-09 finishes standalone; EIL P2 absorbs audit table | Fast | **DONE** |
| 0.5 | P0 | Open questions resolution | — | Engineering defaults | `prd.md` §Decisions | Q1–Q6 recorded | Fast | **DONE** 2026-07-09 |

**P0 exit criteria:** ✅ `research/eil-contract.md` locked. **Next gate:** complete `07-09` before EIL P2.

---

### Phase 1 — AionCore identity + audit foundation (P1 backend)

| Step | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 1.1 | P0 | DB migration | migration | Agent: trellis-implement | `AionCore/crates/aionui-db/migrations/019_*.sql` | users extended + `employee_audit_log` table | Security | Append-only migration |
| 1.2 | P0 | User context API | security | TDD → trellis-implement | `aionui-work-tasks` or new `aionui-org-identity` crate | `GET /api/users/:id/context` | Security | Returns identity+role+scope |
| 1.3 | P0 | Lifecycle middleware | security | TDD | auth middleware | terminated/suspended deny mutating | Security | JWT may still exist; gate on route |
| 1.4 | P0 | Audit writer | security | TDD | audit service module | write + query by actor/task | Security | Used by work-tasks + MCP |
| 1.5 | P1 | Scope helpers | security | unit tests | scope resolver | `self/direct_reports/dept/company` | Standard | Pure functions first |

**P1 exit criteria:** `cargo test` PASS for new crate/tests; API smoke with admin/manager/employee JWT.

---

### Phase 2 — AI context + MCP integration (P1 cross-repo)

| Step | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 2.1 | P0 | Org context fetch | cross-repo | trellis-implement | `aionui-src` warmup + handoff | Server context replaces client-only fields | UI | Pattern: `ccbEmployeeProfileSession.ts` |
| 2.2 | P0 | ACP session merge | cross-repo | trellis-implement | `claude-code-B/.../employeeProfile.ts`, `agentSessionProfile.ts` | Org block in userContextOverride | UI | Extend 07-06 merge |
| 2.3 | P0 | Subagent inheritance | cross-repo | trellis-implement | `runAgent.ts` | Delegated agents get same block | UI | 07-06 P9 pattern |
| 2.4 | P0 | work-tasks-agent audit hook | security | **Deferred to EIL P2** | `mcp_servers/...` | Unified `employee_audit_log` | Security | 07-09 uses structured app log only |
| 2.5 | P1 | Tool permission matrix | security | trellis-implement | MCP + backend | `is_admin` + scope resolver | Security | Extends 07-09 matrix |

**P2 exit criteria:** New session shows org context; MCP create/edit/query write audit; employee query still 403.

---

### Phase 3 — Manager / employee AI scenarios (P2 acceptance)

| Step | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 3.1 | P1 | Manager query prompts | ui | Manual + MCP smoke | work-tasks-agent Guid card | 「张三本周任务」scoped result | UI | Real conversation smoke |
| 3.2 | P1 | Department overdue query | external-api | trellis-implement | query filters | dept scope filter when dept exists | UI | May need seed dept data |
| 3.3 | P1 | Employee self-create | ui | Manual smoke | work-tasks-agent | 「明天下午跟进报价」task created | UI | Self-scope only |
| 3.4 | P1 | Settings UI read-only org fields | ui | trellis-implement | EmployeeProfileSettings | Org fields display; client notes editable | UI | Per open Q4 decision |

**P3 exit criteria:** AC4 scenarios PASS in dev (`start-dev-full.ps1`); CDP console `exceptions: 0` on conversation route.

---

### Phase 4 — Deferred (P3/P4 — out of v1 MVP gate)

| Module | Defer until | Notes |
|--------|-------------|-------|
| AI work profile server store | P3 | preferred agents, habit summary |
| Task collaboration metadata UI | P3 | manager cockpit — API first |
| Approval policy engine | P4 | fixed table only, not designer |
| Audit replay admin UI | P4 | API sufficient for v1 |
| LDAP/HR sync | never v1 | research note only |

---

### TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| Scope resolver | unit | out-of-scope manager query fails | `cargo test -p aionui-org-identity` (or work-tasks) | employee cannot query peer |
| Lifecycle gate | integration | terminated user POST work-tasks → 403 | `cargo test` + curl smoke | active user unchanged |
| Audit writer | unit | missing actor_user_id fails | `cargo test` audit module | fields per AC5 |
| Org context API | contract | unknown user → 404 | curl with JWT | auth/user still works |
| MCP audit hook | integration | mock tool call → audit row | node smoke script | 07-09 role gates intact |
| Renderer context | unit | profile merge includes dept | `bun test` targeted | 07-06 AC4/AC8 regression |
| Conversation route | smoke | CDP exceptions on Guid click | CDP script | white-screen guard |

---

### Verification profile and gate

**Selected:** Security (extends UI smoke for WanD integration)

**Gate chain (fixed order):**

1. **Agent: code-reviewer** (or trellis-check for spec-only phases) — must include `Runtime Crash Checklist` section
2. **Layer B** (renderer changes): `node scripts/review/smoke-renderer-imports.mjs` if touching aionui-src conversation/settings
3. **Profile commands:**
   - `cargo test -p aionui-work-tasks` (+ new crate tests)
   - `node --check mcp_servers/work-tasks-query-server/index.mjs`
   - `bun test` targeted aionui tests
   - CDP smoke: conversation route `exceptions: 0`
4. **Agent: security-reviewer** — mandatory before declaring P1/P2 complete (auth, scope, audit)
5. **trellis-update-spec** → `.trellis/spec/integration/employee-intelligence-layer.md`
6. **implement.jsonl + check.jsonl** + prd AC `[x]`
7. **git commit** — only if user asks
8. **/trellis:finish-work** — when all MVP phases complete

---

### Parallelization (Scenario D-lite — Phase 2 only)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A | AionCore migration + APIs + audit | **Lands first** — identity contract is canonical |
| B | aionui-src context fetch + Settings read-only | Serial after A: API shape frozen |
| C | claude-code-B ACP merge + MCP audit | Serial after A: uses same context DTO |
| D | `07-09` work-tasks-agent completion | Merge audit + scope into EIL; do not fork permission model |

**Rule:** Never parallel-edit `employeeProfile.ts` + `ccbEmployeeProfileSession.ts` + migration schema.

---

### Manual steps (human)

- [ ] Org SSO login (`start-dev-full.ps1`)
- [ ] Settings → 个人信息 shows org fields (read-only or merged per Q4)
- [ ] Guid → 工作任务助手 → conversation renders (no white screen)
- [ ] Employee: create self task via agent; verify in `/tasks`
- [ ] Manager: query subordinate tasks via agent; verify scope boundary (403 for out-of-scope)
- [ ] Check audit rows exist for agent tool calls
- [ ] Terminated user test account cannot mutate (after lifecycle implemented)

---

### Recovery and re-approval

| Trigger | Return to | Evidence update | Re-approval? |
|---------|-----------|-----------------|--------------|
| Open Q1–Q5 unresolved | Phase 0.5 | prd.md decisions | Required |
| Migration number conflict | Phase 1.1 | research/eil-contract.md | No if schema unchanged |
| 07-09 permission model diverges | Phase 0.4 | both task notes | Required |
| UI white screen on conversation | Phase 2 + debugging | CDP exception log | No if fix is import/runtime only |
| Security review FAIL | Phase owning failed WS | security-reviewer findings | No if scope fixed |
| Scope creep into HR UI | Phase 0 | prd non-goals reaffirmed | Required |

---

### Defer / out of scope (v1)

- Full HR portal, payroll, attendance
- Approval workflow designer
- Manager cockpit dashboard UI
- LDAP/AD sync
- Multi-tenant org admin beyond current VPS

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 Contract | **done** | `eil-contract.md` + prd §Decisions locked 2026-07-09 |
| P0.5 07-09 prerequisite | **in_progress** | Finish work-tasks-agent standalone before EIL P2 |
| P1 AionCore | pending | Blocked until user says 执行 task |
| P2 Cross-repo AI context | pending | Requires 07-09 complete |
| P3 Acceptance scenarios | pending | — |
| P4 Deferred | n/a | — |

---

## Sequencing (locked)

```text
07-09 (standalone)  →  EIL P1 (schema + API)  →  EIL P2 (context + unified audit)  →  EIL P3 (acceptance)
```

**07-09 scope boundary:** MCP tools, role gates, Guid card, structured **application log** (not `employee_audit_log` table).  
**EIL P2 scope:** `employee_audit_log` table + migrate writers + org context injection.

---

## Ready to implement

P0 decisions locked. Say **「执行 task」** to begin **EIL P1** (or **「先收尾 07-09」** to finish sibling task first — recommended).
