---
name: trellis-task-execution
description: "Design phased execution plans that map Trellis task workstreams to project skills and agents (trellis-before-dev, TDD, trellis-check, code-review, parallel agents, verification gate). Use when starting or continuing a Trellis task, asking how to execute a PRD, planning workstream→tool mapping, choosing OpenSpec vs Trellis vs ECC workflows, or before saying 执行task."
---

# Trellis Task Execution — Workstream → Tool Mapping

Help the user **design** how to execute a Trellis task using this repo's meta-tools.
**Output a phased plan for approval** — do not jump to implementation unless the user explicitly says 执行 / implement.

Canonical reference: [`docs/ai-tools-reference.md`](../../docs/ai-tools-reference.md) (§五 协作场景 · §八 验证门禁).

---

## When to invoke

- User has a Trellis task (`prd.md`, workstreams) and asks *how* to execute it
- User says「帮我设计执行计划」「Workstream 怎么分工」「用哪些 skill」
- After `/opsx:explore` or `trellis-brainstorm`, before `task.py start` or coding
- User wants to avoid mixing verification gates or parallel-agent footguns

---

## Step 1 — Classify the task (pick one scenario)

| Scenario | When | Primary path |
|----------|------|--------------|
| **A** 标准功能 | Normal Trellis task, clear PRD | `task.py create` → brainstorm → plan → TDD → check → finish |
| **B** 大型规格 | Multi-week, needs design artifacts | `/opsx:explore` → `/opsx:propose` **+** Trellis task sync |
| **C** Bug 修复 | Regression / production symptom | `systematic-debugging` → TDD repro → `trellis-implement` → check |
| **D** 并行子流 | Independent workstreams, two repos | `dispatching-parallel-agents` with **merge rules** (see §Parallel) |
| **E** 探索 only | Requirements unclear | `/opsx:explore` or `trellis-brainstorm` — **no code** |

**WanD / AionUI 集成任务** (ccb-installer + aionui-src): always **Scenario A or D**, never full ECC `/orchestrate` autopilot — user must do **UI manual** verification step.

### Plan depth and risk

Choose the smallest safe depth:

| Depth | Use when | Detail |
|-------|----------|--------|
| **Lite** | One repo, one low-risk workstream | Capability summary, files, command, fallback |
| **Standard** | Multiple files/layers or 2–4 dependent workstreams | Full table, risks, artifacts, TDD route, profile, recovery |
| **Full** | Cross-repo, parallel, release/security-sensitive, or large design | Standard + capability matrix, merge/checkpoint/manual gates |

Default to **Standard**. Tag only risks that change execution:
`security` · `migration` · `external-api` · `concurrency` · `cross-repo` · `ui` · `packaging` · `long-running`.

| Risk tag | Preferred route | Required planning consequence |
|----------|-----------------|-------------------------------|
| `security` | Security specialist if available; otherwise focused review/tests | Security profile; trust boundary and abuse cases |
| `migration` | Relevant DB/schema skill or `trellis-research` | Forward/rollback/idempotency evidence |
| `external-api` | `trellis-research` | Persist API/version assumptions before implementation |
| `concurrency` | Systematic debugging/TDD capability | Race, retry, timeout, and failure-path tests |
| `cross-repo` | Parallel agents only for disjoint ownership | Cross-repo profile and serial integration point |
| `ui` | UI/component/E2E capability | UI profile and explicit manual smoke |
| `packaging` | Build/deploy/smoke scripts | Release profile and recovery command |
| `long-running` | Checkpoint/session capability if available | Milestones and resume evidence in the plan |

## Phase -1 — Detect executable capabilities

Inspect actual project/platform entry points before naming a tool. A documentation mention is not proof of availability.

| Capability | Preferred tool | Status | Executable fallback |
|------------|----------------|--------|---------------------|
| Requirements | `trellis-brainstorm` | available / unavailable | Main-session PRD clarification |
| Research | `trellis-research` | … | Research in main session; persist under `research/` |
| Implementation | `trellis-implement` | … | Inline after `trellis-before-dev` |
| Review | `trellis-check` | … | Inline spec check + project commands |
| TDD / E2E / security | Platform-specific skill | … | Explicit RED/GREEN/test/review commands |

- Every planned tool must be `available` or have an executable fallback.
- Do not install tools during capability detection.
- A fallback describes equivalent work, not another unchecked tool name.

---

## Step 2 — Load task context (read-only)

```bash
# Task folder
ls .trellis/tasks/<task-dir>/
cat .trellis/tasks/<task-dir>/prd.md
cat .trellis/tasks/<task-dir>/task.json   # if exists
```

Then:

1. **`trellis-before-dev`** — read spec index + Pre-Development Checklist for touched packages (`frontend`, `backend`, `integration`, …).
2. List **workstreams** from PRD (A/B/C… or phased P0/P1/P2).
3. List **acceptance criteria** and **canonical files** from PRD.
4. Note **cross-repo** touches (`claude-code-best` vs `aionui-src`).

---

## Step 3 — Produce the execution plan (required output)

Fill this template and present it to the user **before coding**:

```markdown
## Task: <id> — <title>

**Scenario:** A | B | C | D

**Repos:** claude-code-best | aionui-src | both

**Spec entry:** `.trellis/spec/<package>/...`
**Plan depth:** Lite | Standard | Full

### Phase -1 — Capability matrix
| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| … | … | available / unavailable | … |

### Phase 0 — Activate & read
| Step | Tool / skill | Output |
|------|--------------|--------|
| Activate task | `task.py start <dir>` | in_progress |
| Read spec + PRD | `trellis-before-dev` | spec paths noted |

### Phase 1…N — Workstreams
| Phase | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 1 | P0 | … | ui | TDD / trellis-implement | … | RED evidence + implementation | UI | … |

### TDD contract
| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| … | unit / contract / integration / e2e / smoke | failing test or justified N/A | exact command | protected behavior |

### Verification profile and gate
**Selected:** Fast | Standard | UI | Release | Security | Cross-repo

1. code-review agent **or** `trellis-check` (pick one primary)
2. Profile-specific commands with **evidence**
3. `trellis-update-spec` → relevant spec md
4. `implement.jsonl` + `check.jsonl` + prd AC `[x]`
5. `git commit` — **only if user asks**
6. `/trellis:finish-work`

### Parallelization (if Scenario D)
| Agent | Scope | Merge rule |
|-------|-------|--------------|
| A | ccb-installer … | … |
| B | aionui-src … | JSON manifest → TS mirror **serial merge** |

### Manual steps (human)
- [ ] UI smoke: …
- [ ] …

### Recovery and re-approval
| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| … | Phase … | … | yes / no |

### Defer / out of scope
- …
```

---

## Step 3b — Persist `execution-plan.md` (required before implement)

**Principle:** Stable document over chat memory. Every `/trellis:plan-execution` or「设计执行计划」must land on disk **before** `执行 task` / coding.

### Canonical path

```
.trellis/tasks/<task-dir>/execution-plan.md
```

### Workflow

1. **Draft** — Write `execution-plan.md` from Step 3 template; set header `Status: draft`.
2. **Approve** — User confirms plan → set `Status: approved` + `Approved: <date>`.
3. **Execute** — Set `Status: in_progress`; update **Progress snapshot** after each phase (link `p0x-*-done.md`, pytest counts).
4. **Resume** — New session: read `execution-plan.md` + `prd.md` + latest `*-done.md`; do **not** reconstruct plan from transcript.
5. **Complete** — Set `Status: completed`; `/trellis:finish-work`.

### File header (minimum)

```markdown
# Execution Plan — `<task-dir>`

| Field | Value |
|-------|--------|
| **Status** | draft \| approved \| in_progress \| completed |
| **Scenario** | A \| B \| C \| D |
| **Plan depth** | Lite \| Standard \| Full |
| **Verification profile** | Fast \| Standard \| UI \| Release \| Security \| Cross-repo |
| **Active phase** | P0B \| P0C \| … |

## Progress snapshot
| Phase | State | Delivery / evidence |
```

### Gate

| Allowed | Blocked |
|---------|---------|
| User said 执行 / implement **and** `execution-plan.md` exists with `approved` or `in_progress` | Coding with plan only in chat |
| Update plan Progress + `check.jsonl` after each milestone | Mark phase done without evidence row |

Optional: add `"execution_plan": "execution-plan.md"` to `task.json` `meta` or mention path in `notes`.

---

## Step 4 — Workstream → tool cheat sheet

Use this when mapping each workstream row:

| Work kind | Prefer | Avoid |
|-----------|--------|-------|
| Read spec / conventions | `trellis-before-dev` | Guessing from memory |
| Clarify PRD | `trellis-brainstorm` | Coding first |
| Large design | `/opsx:explore` → `/opsx:propose` | Giant monolithic PRD edit |
| UI / renderer logic | TDD → edit → `code-reviewer` | Skip tests |
| ccb-installer scripts/manifest | `trellis-implement` sub-agent | Hand-editing vendor |
| Diagnosis / mapping logic | TDD on `*.test.ts` first | UI-only validation |
| Spec compliance check | `trellis-check` sub-agent | Self-declare PASS |
| Quality review | `code-reviewer` agent | `/orchestrate` full auto |
| Capture learnings | `trellis-update-spec` | Only task.json notes |
| Stuck in loop | `trellis-break-loop` | Repeated blind fixes |
| Parallel independent streams | `dispatching-parallel-agents` | Same file in two agents |

### Artifact and TDD contracts

| Activity | Required durable output |
|----------|-------------------------|
| Research | One topic per `{task}/research/*.md`, including sources and caveats |
| Design | `info.md` or linked OpenSpec design when needed |
| Planning | `{task}/execution-plan.md` with status/progress |
| Agent context | Curated `implement.jsonl` and `check.jsonl` on sub-agent platforms |
| Implementation | Changed files + RED/GREEN evidence or justified N/A |
| Verification | Exact command/result + manual gate state |
| Learning | Spec update or explicit `spec: no update` |
| Completion | PRD AC checked + finish-work evidence |

| Workstream kind | Minimum test route |
|-----------------|--------------------|
| Pure logic / mapping | Unit RED → targeted GREEN |
| IPC / ACP / API | Contract or integration test |
| UI interaction | Component test; E2E when runtime-shell behavior matters |
| Installer / packaging | Script test or smoke with exit/output evidence |
| Bug fix | Reproduction test fails for the reported reason |
| Docs/config only | TDD `N/A` with reason; parser/schema/link validation where available |

Never write only “TDD” in a workstream row: record level, RED evidence, GREEN command, and regression target.

### Verification profiles

Pick exactly one primary profile; profiles specialize commands, not review systems.

| Profile | Use when | Evidence |
|---------|----------|----------|
| **Fast** | Narrow low-risk change | Targeted validation → primary review |
| **Standard** | Default application change | Lint/typecheck as applicable → unit/integration → primary review |
| **UI** | Renderer/user interaction | Standard → E2E where automatable → manual UI smoke |
| **Release** | Build/deploy/package | Build → deploy/stage → smoke → recovery check → manual acceptance |
| **Security** | Auth/secrets/input/permissions | Standard → security-focused tests/review |
| **Cross-repo** | Multiple repos or deploy mirror | Per-repo tests → serial sync/merge → integrated verification |

If a specialist tool is unavailable, keep the evidence requirement and use its Phase -1 fallback.

### Conditional recovery

| Trigger | Action | Re-approval |
|---------|--------|-------------|
| RED cannot be produced | Revisit testability/requirement | If accepted behavior changes |
| Same test/fix fails twice | Systematic debugging; persist root-cause evidence | No, if scope/AC stay fixed |
| PRD/design defect | Update PRD + execution plan; return to planning | Required |
| API/version assumption disproved | Research; update artifact/context | If architecture/dependency changes |
| Parallel streams touch one canonical file | Assign one owner; serial merge | If delivery scope/order changes |
| Release/UI manual gate fails | Reopen owning workstream with evidence | If workaround changes behavior |

Never retry blindly. Name the resume phase and durable evidence in every recovery row.

---

## Step 5 — Verification gate (fixed chain)

**Do not mix four gate systems in one turn.** Pick **one** primary review path, then tests, then docs:

```
改代码
  → code-reviewer agent（或 trellis-check — 二选一作主审）
  → 运行验证 + 贴证据（bun test / test-mcp-health.ps1 / smoke）
  → trellis-update-spec（+.trellis/spec/）
  → implement.jsonl + check.jsonl + prd AC
  → git commit（用户明确要求时）
  → /trellis:finish-work
```

| 你想… | 用 |
|-------|-----|
| Trellis 任务 / spec 合规 | `trellis-check` sub-agent |
| 窄 diff 质量 | `code-reviewer` agent |
| 声明「完成」 | 上述链 **全部** + 命令输出摘要 |
| Superpowers 自律 | `verification-before-completion`（补证据，不替代 trellis-check） |

**WanD 集成**：门禁通过后仍须 **UI manual**（Settings → 工具 → 健康面板等）— 不可省略。

---

## Step 6 — Parallel agents (Scenario D-lite)

Safe split pattern (two repos):

```
┌─────────────────────────┐     ┌─────────────────────────┐
│ Agent A                 │     │ Agent B                 │
│ ccb-installer           │     │ aionui-src              │
│ manifest JSON           │     │ Panel + diagnosis TS    │
│ test-mcp-health.ps1     │     │ unit tests              │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            └─────────── 串行合并 ──────────┘
                    ccbMcpHealthManifest.ts
                    （必须 mirror JSON）
```

**Rules:**

- Never let two agents edit the **same** manifest mirror concurrently.
- Merge order: **JSON first** → TS mirror → tests.
- Parent agent runs verification gate once after merge.

---

## Reference example — `07-02-mcp-health-coverage-expansion`

Proven mapping (adapt for similar integration tasks):

| Phase | Priority | Workstream | Tool |
|-------|----------|------------|------|
| 0 | — | Activate | `task.py start` + `trellis-before-dev` → `mcp-health.md` + prd |
| 1 | P0 | A — UI agents + coverage | TDD → `ccbMcpHealth.ts` + `CcbMcpHealthPanel.tsx` → code-review |
| 2 | P1 | C — manifest deep probe | `trellis-implement` (backend-leaning) |
| 2 | P1 | E — diagnosis + MiniMax | TDD `ccbMcpHealthDiagnosis.test.ts` first |
| 3 | P1 | B — Session probe UI | Spike: reuse `test-mcp-session-health.mjs`; serial ~30s; loading UI |
| 4 | P2 | D — exa / ppt optional | WARN semantics; defer OK |
| 5 | — | Gate | code-review → `bun test` + `test-mcp-health.ps1 -Probe -Session` → `trellis-update-spec` → finish-work |

More detail: [examples.md](./examples.md)

---

## Anti-patterns

| Don't | Do instead |
|-------|------------|
| Mix trellis-check + code-review + `/verify` without order | Single chain §Step 5 |
| ECC `/orchestrate` for WanD UI tasks | Phased plan + manual UI step |
| Parallel edit JSON + TS manifest | Serial merge after JSON lands |
| Mark task complete without spec + jsonl | `trellis-update-spec` + implement/check jsonl |
| `openspec-explore` then implement | User must exit explore or `/opsx:propose` |

---

## User triggers

| User says | Action |
|-----------|--------|
| 「设计执行计划」 | Run Steps 1–3, **write `execution-plan.md` (Step 3b)**, present summary, **wait for approval** |
| 「落档执行计划」 | Step 3b only — create/update `execution-plan.md`, status `draft` |
| 「执行 task」 / 「继续做」 | Read `execution-plan.md` → execute **Active phase**; enforce §Step 5 gate; update Progress |
| 「可以并行吗？」 | Scenario D table + merge rules |
| 「用哪个 skill？」 | §Step 4 cheat sheet + quick decision table in ai-tools-reference §六 |
