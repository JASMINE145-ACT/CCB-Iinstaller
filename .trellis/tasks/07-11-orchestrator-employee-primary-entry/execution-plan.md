# Execution Plan — `07-11-orchestrator-employee-primary-entry`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Scenario** | A (clear PRD; extensible phases) |
| **Plan depth** | Standard |
| **Verification profile** | UI |
| **Active phase** | Done |
| **Approved** | 2026-07-11 (execute) |
| **Completed** | 2026-07-11 |
| **Repos** | claude-code-best (ccb-installer agents + integration specs); aionui-src only if sidecar/copy |
| **Related** | Sibling of `07-14-employee-intelligence-layer` (does not block P0) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` — Scenario A, Standard depth |
| skill-selection | Read: | §二 — brainstorm→trellis-brainstorm; explore→openspec-explore; plan→this skill |
| trellis-before-dev | Read: | `get_context.py --mode packages` → integration index; `agent-team-architecture.md`, `work-routing-execution-contracts.md` |
| openspec-explore | Read: | Prior turn explore — employee entry gaps; `openspec list --json` → `unified-org-sso` only (no conflict) |
| Baseline agents | Read: | `wande-orchestrator.md`; package.json `mcpServers: []` / `skills: []` |
| Sibling PRD | Read: | `07-14-employee-intelligence-layer/prd.md` + `research/eil-contract.md` |

## Task: 07-11 — Orchestrator as employee primary entry

**Scenario:** A  
**Plan depth:** Standard  
**Spec entry:** `.trellis/spec/integration/index.md` → `agent-team-architecture.md` + routing contracts

---

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm / main-session PRD | available | PRD written this session |
| Research | Inline → `research/extension-slots.md` | available | Agent: trellis-research |
| Implementation | Inline after trellis-before-dev | available | Agent: trellis-implement |
| Review (quality) | Agent: code-reviewer | available | Inline + Runtime Crash Checklist |
| Review (spec) | Agent: trellis-check | available | Inline checklist |
| TDD | superpowers:test-driven-development | available | Eval/smoke + md contract checks; unit N/A for pure L1 copy unless guard tests exist |
| Verify finish | trellis-update-spec + finish-work | available | §Step 5 |

---

### Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Approve plan | User | `Status: approved` |
| Activate | `task.py start 07-11-orchestrator-employee-primary-entry` | in_progress |
| Re-read specs | trellis-before-dev | agent-team + routing contracts + orchestrator.md |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ENTRY.IDENTITY.001` *(provisional)* | Main entry identity = employee primary assistant; routing is a capability, not sole identity | `wande-orchestrator.md` | Manual smoke AC6; grep/spec consistency | ui |
| `WANd.ENTRY.INTENT_SPLIT.001` *(provisional)* | Personal/workbench vs business intents follow playbook | `wande-orchestrator.md` § playbook | Manual: identity Q vs quote Q | ui |
| `WANd.ROUTING.ASSIGNMENT.001` *(existing)* | Main entry must not call business MCP; domain work via `Agent()` | orchestrator.md + MCP filter/guards | Existing guard tests / health forbidden_mcp; smoke: quote still delegates | security |
| `WANd.ENTRY.EXTENSION.001` *(provisional)* | Future tools documented as slots; identity not rewritten per tool | `research/extension-slots.md` | Doc review in check gate | — |

### Contract cards

### Contract: WANd.ENTRY.IDENTITY.001

**Behavior protected:** Default-session agent presents as the employee's primary work assistant; routing is one tool.  
**Primary code:** `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md`  
**Tests:** N/A unit — contract is L1 persona; assert via smoke + spec wording  
**Eval / smoke:** Ask「你是谁」→ not pure switchboard; still mentions specialists  
**Risk if broken:** Product confusion; blocks EIL/skills landing cleanly  

### Contract: WANd.ENTRY.INTENT_SPLIT.001

**Behavior protected:** Workbench/personal asks are first-class; business asks still delegate.  
**Primary code:** `wande-orchestrator.md` playbook section  
**Tests:** N/A  
**Eval / smoke:** 「我是谁/我今天有什么任务」vs「查一下XX价格」  
**Risk if broken:** Either over-delegates personal asks or under-delegates business  

### Contract: WANd.ROUTING.ASSIGNMENT.001

**Behavior protected:** No business MCP on main entry.  
**Primary code:** orchestrator.md + `filterMcpConfigsForOrchestratorSession` / health manifest  
**Tests:** existing orchestrator guard tests if present  
**Eval / smoke:** Quotation path still uses `Agent(quotation-agent)`  
**Risk if broken:** Safety regression / wrong numbers from router  

### Contract: WANd.ENTRY.EXTENSION.001

**Behavior protected:** Additive slots without re-locking identity as router.  
**Primary code:** `research/extension-slots.md`  
**Tests:** docs-only  
**Eval / smoke:** N/A  
**Risk if broken:** Future MCP/skills force another identity rewrite  

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| P0.1 | P0 | Persona unlock in L1 | WANd.ENTRY.IDENTITY.001 | ui | trellis-implement / inline | `wande-orchestrator.md`, `wande-orchestrator.aionui.json` | Core duties + 自我介绍 rewritten; **fix literal `` `n`n `` on ~L83**; soften `display_name`「全局路由」 | UI |
| P0.2 | P0 | Intent-split playbook (thin v1) | WANd.ENTRY.INTENT_SPLIT.001 | ui | inline | same | Personal/workbench = memory + clarify + **delegate** work-tasks; do **not** claim main-entry self-answers tasks | UI |
| P0.3 | P0 | Safety + copy consistency | WANd.ROUTING.ASSIGNMENT.001 | security | verify + grep | package.json, mcp-health, guards, all「只路由/全局路由」hits | Business MCP still forbidden; **global grep** no leftover「只路由」identity contradiction | Security |
| P0.4 | P0 | Spec glossary + **register ENTRY contracts** | WANd.ENTRY.* | — | trellis-update-spec | agent-team-architecture, work-routing-execution-contracts, agents-unified-model, **`contracts/agent-runtime-registry.yml`** | Promote provisional `WANd.ENTRY.{IDENTITY,INTENT_SPLIT,EXTENSION}.001` into registry | Fast |
| P0.5 | P0 | Extension slots freeze | WANd.ENTRY.EXTENSION.001 | — | docs | `research/extension-slots.md` | Already drafted; confirm on approve | Fast |
| P0.6 | P0 | Pre-pack hygiene | docs-only/no-runtime-contract | packaging | shell | — | After agent md edits: `git status` + `git diff` **before** any `build-wanding.ps1` (known silent rollback risk) | Release |
| P1* | P1 | Optional skills | ENTRY.* | ui | TDD N/A + implement | new skill md + package.json skills[] | Only if user includes in scope | UI |
| P2* | P2 | Thin employee MCP | ENTRY + EIL | security, cross-repo | defer | MCP + EIL API | **Out of P0**; child or 07-14 | Security |

\* Not in default approval scope — activate only after user says include.

### P0 execution checklist (from review notes)

- [ ] **Bug:** rewrite `wande-orchestrator.md` §工作任务 — replace literal `` `n`n `` with real newlines (PowerShell Chinese write artifact)
- [ ] **Copy:** `rg "只路由|全局路由" ccb-installer/packages/vertical/com.wanding.trade .trellis/spec/integration` — align frontmatter / L1 / 自我介绍 / `.aionui.json` `display_name`
- [ ] **Thin workbench:** playbook states v1 personal path = memory + clarify + delegate `work-tasks-agent`; smoke must **not** expect main entry to answer「今天任务」itself
- [ ] **Registry:** add three ENTRY contract IDs to `agent-runtime-registry.yml` during P0.4 (avoid duplicate IDs later)
- [ ] **Packaging:** never pack until `git status/diff` confirms agent md changes still present

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P0.1–P0.2 | ENTRY.IDENTITY / INTENT_SPLIT | N/A — L1 persona (no unit harness for md); RED = current「只路由」wording in file | Diff review + manual smoke AC6 | Re-read md after edits |
| P0.3 | ROUTING.ASSIGNMENT.001 | If guard tests exist: run before change (expect PASS) | Same guard/health checks PASS after persona change | Same |
| P0.4 | docs | N/A docs-only | Spec links consistent; no "identity=router-only" contradiction | — |
| P1 skills | ENTRY.* | Add eval scenario failing on old behavior if skill ships | Eval or scripted prompt check | Same |

**Guard-test discovery (on execute):** grep `evaluateOrchestratorToolGuard` / orchestrator forbidden MCP tests under `ccb-installer` / `claude-code-B` and bind exact GREEN command into Progress snapshot.

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| WANd.ENTRY.IDENTITY.001 | Manual: default session「你是谁」 | User smoke PASS 2026-07-11 | PASS |
| WANd.ENTRY.INTENT_SPLIT.001 | Manual: identity vs quote intents | User smoke PASS 2026-07-11 | PASS |
| WANd.ROUTING.ASSIGNMENT.001 | Health forbidden_mcp + quote still delegates; unit strip work-tasks | `bun test` 15 pass in D:\claude-code-B | PASS (unit) |
| WANd.ENTRY.EXTENSION.001 | `research/extension-slots.md` present + linked from PRD | file path | PASS |

---

## Verification profile and gate

**Selected:** UI

1. **Contract Verification** — rows above  
2. **code-reviewer** (primary) — Layer A if picker/copy identity fields touched; Layer B N/A unless renderer  
3. Sync vendor agent md if required by playbook (`sync-dev-wanding-vendor` / ensure settings)  
4. `trellis-update-spec` → integration agent docs  
5. PRD AC checkboxes + `implement.jsonl` / `check.jsonl`  
6. Commit only if user asks  
7. `/trellis:finish-work` when P0 (or agreed scope) done  

### Manual steps (human)

- [ ] Default session:「你是谁」→ 工作助手 / 主入口，不是纯转接台  
- [ ] 「帮我查一下 XX 价格」→ 仍委派 quotation-agent  
- [ ] （可选）「我今天有什么任务」→ **仍委派** `work-tasks-agent`（P0 不要求主入口自答；勿把 smoke 写满）  
- [ ] After md edits, before any pack: `git status` / `git diff` still shows intended agent changes

---

## Parallelization

Not Scenario D for P0 (single-repo L1 + specs).  
If P2 thin MCP later: serial merge — EIL API first (07-14) → MCP wire → orchestrator allowlist for **employee** MCP only.

---

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| User wants P1 skills in same delivery | Expand workstreams P1 | Update plan + PRD AC | yes |
| Thin MCP pulled into this task | Add P2; link 07-14 API | extension-slots claim S5/S6 | yes |
| Guard regression (business MCP callable) | P0.3 | systematic-debugging + restore forbidden | no if AC unchanged |
| Product rename Guid/display | Q1 decision | PRD open questions | yes if UI scope |
| `build-wanding.ps1` wiped agent md | P0.1 + P0.6 | restore from git; re-diff before re-pack | no if AC unchanged |
| Leftover「只路由」in sidecar/spec | P0.3 | re-grep + fix | no |

---

## Defer / out of scope (default approval)

- Thin employee MCP (S5–S7)  
- EIL DB/API (`07-14`)  
- Role-biased routing from `business_roles`  
- Attaching any business MCP to main entry  
- Renaming agent id `wande-orchestrator`  

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| Planning | done | prd.md + execution-plan.md + research/extension-slots.md; **rev2** review notes folded |
| P0 code | done | L1+sidecar+fallback TS+registry ENTRY+forbidden work-tasks; code-reviewer PASS×2; bun test 15 pass (claude-code-B) |
| P0 manual | done | AC6 user smoke PASS 2026-07-11 |
| P1+ | deferred slots | extension-slots.md |

---

## Approval gate

Reply **批准计划** / **approved** to set `Status: approved`.  
Then **执行 task** to start P0 only (unless you explicitly include P1/P2).
