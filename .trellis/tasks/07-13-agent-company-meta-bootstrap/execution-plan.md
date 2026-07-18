# Execution Plan — `07-13-agent-company-meta-bootstrap`

| Field | Value |
|-------|--------|
| **Status** | **in_progress** — bootstrap delivered; await user Cursor smoke / optional archive |
| **Active phase** | Phase 5 smoke (user) + optional finish-work |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `/trellis:plan-execution` + prior plan |
| trellis-before-dev | Read: | get_context + integration index |
| System Review (user) | Read: | risks P0–P2 → plan gates |
| bootstrap-inventory revise | Write: | allowlist / forbidden / fixtures |
| system-review-accepted | Write: | `research/system-review-accepted.md` |
| plan lint | Shell: | prior PASS; re-lint after this edit |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | capability matrix |
| Phase 0 plan | **done** | prd + plan + inventory |
| Phase 0 review | **done** | System Review + self-allowlist |
| Phase 0b approve execute | **done** | user **执行** 2026-07-13 |
| Phase 1–5 bootstrap | **done** | `p1-bootstrap-done.md`; scanners GREEN/RED; meta+platform commits |
| Contract Verification | **done** | see p1 note |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | prd locked | available | — |
| Research | bootstrap-inventory + review | **done** | — |
| Repo bootstrap | shell + git submodule | available | manual |
| Boundary lint | node scripts | available | rg checklist |
| Review | code-reviewer | after implement | — |
| Verify | Cross-repo checklist | available | — |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `AGENTCO.PRODUCT.REPO_BOUNDARY.001` | platform must not depend on sample-ccb / CCB paths in code&config | `check-no-sample-import.mjs` | GREEN clean; RED with fixtures | packaging |
| `AGENTCO.PRODUCT.CORE_TERMS.001` | platform core free of WanD hardcodes | `check-no-wanding-core-terms.mjs` | GREEN on spec/AGENTS/scripts | packaging |
| `AGENTCO.PRODUCT.META_WORKSPACE.001` | meta = workspace; where-to-commit clear | meta README + workspace | 3× `git status` | — |
| `AGENTCO.PRODUCT.TOOLING_BOOTSTRAP.001` | tooling copy + retarget; no CCB spec body | inventory + retarget report | report exists; CORE_TERMS green | — |
| `AGENTCO.STACK.L4_SAMPLE.001` | sample-ccb read-only migration source | submodule + README | `git -C sample-ccb status --short` empty | packaging |
| `AGENTCO.STACK.L1_DOCS.001` | authority docs snapshot + provenance | `docs/` + `source-map.md` | paths + source-map | docs-only |

### Contract: AGENTCO.PRODUCT.REPO_BOUNDARY.001

**Behavior protected:** No compile/runtime/config dependency from platform core onto sample-ccb or claude-code-best paths.  
**Primary code:** `platform/scripts/check-no-sample-import.mjs`  
**Tests:** default GREEN; `--include-fixtures` must fail on planted bad import; **scanner file itself must be allowlisted (not self-fail)**  
**Risk if broken:** CCB coupling day one  

### Contract: AGENTCO.PRODUCT.CORE_TERMS.001

**Behavior protected:** Forbidden WanD terms absent from platform core scan scope.  
**Primary code:** `platform/scripts/check-no-wanding-core-terms.mjs`  
**Tests:** exit 0 on clean tree; **term-list file must be allowlisted so listing forbidden strings does not self-fail**  
**Risk if broken:** L1/L3 semantic pollution  

### Contract: AGENTCO.STACK.L4_SAMPLE.001

**Behavior protected:** sample-ccb is reference only; working tree clean after bootstrap.  
**Primary code:** `.gitmodules`, meta README  
**Tests:** submodule status + empty short status  
**Risk if broken:** accidental sample commits  

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | P0 | Create meta root + workspace + README (commit rules, 3× status, read-only) | AGENTCO.PRODUCT.META_WORKSPACE.001 | — | shell | `agent-company-meta/**` | README + `.code-workspace` + light `.trellis/tasks` | Cross-repo |
| 1 | P0 | Init platform git skeleton + “no app runtime yet” | AGENTCO.STACK.L1_DOCS.001 | — | shell | `platform/**` | dirs + AGENTS.md | Cross-repo |
| 1 | P0 | Add sample-ccb submodule (**local path**) | AGENTCO.STACK.L4_SAMPLE.001 | packaging | git submodule | `.gitmodules` | local path + remote-replace docs | Cross-repo |
| 1 | P0 | sample-ccb read-only smoke | AGENTCO.STACK.L4_SAMPLE.001 | packaging | shell | — | `status --short` empty | Cross-repo |
| 2 | P0 | Bootstrap tooling + retarget report | AGENTCO.PRODUCT.TOOLING_BOOTSTRAP.001 | — | shell copy | `.cursor` `.agents` scripts | `bootstrap-retarget-report.md` | Cross-repo |
| 2 | P0 | Snapshot-copy authority docs + source-map | AGENTCO.STACK.L1_DOCS.001 | docs-only | copy | `platform/docs/**` | source-map.md | Fast |
| 3 | P0 | `check-no-sample-import.mjs` + fixtures + **self-allowlist** | AGENTCO.PRODUCT.REPO_BOUNDARY.001 | packaging | TDD | `platform/scripts/**` | GREEN/RED; scanner not self-fail | Cross-repo |
| 3 | P0 | `check-no-wanding-core-terms.mjs` + **self-allowlist** | AGENTCO.PRODUCT.CORE_TERMS.001 | packaging | TDD | `platform/scripts/**` | GREEN; scanner not self-fail | Cross-repo |
| 4 | P0 | Platform `.trellis/spec/index.md` L1/L2/L3 only | AGENTCO.PRODUCT.TOOLING_BOOTSTRAP.001 | — | docs | `platform/.trellis/spec/index.md` | CORE_TERMS green | Fast |
| 5 | P0 | Triple git status + Cursor open smoke | all | — | manual | README checklist | all clean / documented | Cross-repo |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| sample-import | AGENTCO.PRODUCT.REPO_BOUNDARY.001 | `--include-fixtures` fails; clean tree GREEN **with scanner file present** | `node platform/scripts/check-no-sample-import.mjs` | same; self-allowlist intact |
| core-terms | AGENTCO.PRODUCT.CORE_TERMS.001 | planted term in `packages/` fails; scanner still GREEN (self-allowlist) | `node platform/scripts/check-no-wanding-core-terms.mjs` | same |
| submodule | AGENTCO.STACK.L4_SAMPLE.001 | empty dir | `git submodule status` + empty short status | — |
| docs | AGENTCO.STACK.L1_DOCS.001 | missing source-map | `Test-Path platform/docs/source-map.md` | — |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| AGENTCO.PRODUCT.REPO_BOUNDARY.001 | check-no-sample-import (±fixtures); self-allowlist | exit codes | **PASS** |
| AGENTCO.PRODUCT.CORE_TERMS.001 | check-no-wanding-core-terms; self-allowlist | exit 0 | **PASS** |
| AGENTCO.PRODUCT.META_WORKSPACE.001 | README + 3× git status | checklist | **PASS** (user open workspace pending) |
| AGENTCO.PRODUCT.TOOLING_BOOTSTRAP.001 | retarget report + CORE_TERMS | files | **PASS** |
| AGENTCO.STACK.L4_SAMPLE.001 | submodule + clean short status | empty | **PASS** |
| AGENTCO.STACK.L1_DOCS.001 | source-map + snapshots | paths | **PASS** |
| plan structure | lint_execution_plan | PASS | **PASS** |
| code-reviewer | scanners + AGENTS | PASS | **PASS** |

## Verification profile and gate

**Selected:** Cross-repo

1. Contract Verification table  
2. code-reviewer on scripts + AGENTS.md after implement  
3. User: open meta workspace; confirm sample-ccb short status empty  

## Parallel split

| Stream | Merge |
|--------|-------|
| A meta+submodule | first |
| B platform skeleton+docs | after A |
| C boundary scripts | after B |

## Recovery / re-approval

| Trigger | Action |
|---------|--------|
| platform inside CCB | **blocked** |
| expand to full trade package extract | **new task** |
| switch submodule to remote-only mid-flight | README update OK |

## Manual steps (human)

- [x] System Review accepted → plan gates  
- [ ] Say **执行** to implement bootstrap  
- [ ] After: open `agent-company-meta.code-workspace`  

## Suggested deliverable files (from review §6)

| File | Purpose |
|------|---------|
| `agent-company-meta/README.md` | boundaries / commit / read-only |
| `agent-company-meta.code-workspace` | Cursor entry |
| `platform/AGENTS.md` | L1–L3; CCB=L4 only |
| `platform/.trellis/spec/index.md` | new product spec entry |
| `platform/scripts/check-no-sample-import.mjs` | dependency gate |
| `platform/scripts/check-no-wanding-core-terms.mjs` | term gate |
| `platform/docs/source-map.md` | provenance |
| `platform/docs/bootstrap-retarget-report.md` | tooling retarget |

## Deferred (review Phase 2–3)

* Rename already done to `AGENTCO.*` for this task  
* `com.wanding.trade-minimal-package-bootstrap` task  
* ClaudeCodeBRuntimeAdapter skeleton task  
* One-shot meta smoke script pack  

## Locked defaults

| Topic | Decision |
|-------|----------|
| Layout | meta / platform / sample-ccb |
| Submodule | **local path** MVP |
| Docs | **snapshot copy** |
| meta .trellis | **required light** |
| No platform→sample import | script-enforced |
| No app runtime | README |
| Contract prefix | `AGENTCO.*` |
