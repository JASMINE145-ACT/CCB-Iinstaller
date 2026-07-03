# Examples — trellis-task-execution

## Example 0: Execution plan artifact (all tasks)

After `/trellis:plan-execution`, persist:

```
.trellis/tasks/<task-dir>/execution-plan.md   # Status: draft → approved → in_progress
.trellis/tasks/<task-dir>/p0b-*-done.md     # Per-phase delivery notes (optional)
```

**Resume rule:** New agent session reads `execution-plan.md` **Active phase** row — not chat history.

Reference: [`07-01-price-library-admin-agent/execution-plan.md`](../../.trellis/tasks/07-01-price-library-admin-agent/execution-plan.md)

---

## Example 1: MCP health coverage (`07-02`)

**Scenario:** D-lite (two repos)

**Spec:** `.trellis/spec/integration/mcp-health.md`

### Full phase table (as executed)

```
Phase 0  激活
  task.py start
  trellis-before-dev  → 读 mcp-health.md + prd

Phase 1  P0 Workstream A（UI agents 层 + 覆盖说明）
  TDD → 改 ccbMcpHealth.ts + CcbMcpHealthPanel.tsx
  trellis-check / code-review

Phase 2  P1 可并行两支
  ┌─ Workstream C（manifest deep probe）     ← trellis-implement（backend 向）
  └─ Workstream E（diagnosis + MiniMax）      ← TDD diagnosis.test.ts 先写

Phase 3  P1 Workstream B（Session 探针 UI）
  spike：IPC 是否复用 test-mcp-session-health.mjs
  注意：串行、~30s，UI 要有 loading 态

Phase 4  P2 Workstream D（exa / ppt skill）— 可 defer
  optional layer WARN 语义
  exa HTTP 不可达不阻塞 core 4

Phase 5  门禁
  verification-before-completion
  test-mcp-health.ps1 -Probe -Session
  bun test ccbMcpHealth*.test.ts
  trellis-update-spec → mcp-health.md
  implement.jsonl + check.jsonl + prd AC [x]
  /trellis:finish-work
```

### Parallel split

| Agent | Owns |
|-------|------|
| A | `ccb-installer/config/mcp-health-manifest.json`, `test-mcp-health.ps1`, probe scripts |
| B | `aionui-src/.../ccbMcpHealth*.ts`, `CcbMcpHealthPanel.tsx`, unit tests |

**Merge:** A lands JSON → B updates `ccbMcpHealthManifest.ts` → parent runs tests.

### Evidence captured

- code-review: PASS
- bun test: 12/12
- CLI: `optional/exa:http` WARN + exit 0

---

## Example 2: Bug fix (Scenario C)

**Symptom:** Guid session missing MCP after idle resume.

```
Phase 0  systematic-debugging → root cause doc in task research/
Phase 1  TDD repro in ccbMcpHealthDiagnosis.test.ts or session test
Phase 2  trellis-implement → minimal fix
Phase 3  trellis-check → bun test + test-mcp-health.ps1 -Session
Phase 4  trellis-update-spec → mcp-health.md symptom row
Phase 5  finish-work
```

No parallel agents — single stream until gate passes.

---

## Example 3: Large feature (Scenario B)

**Task:** New org SSO rollout with OpenSpec design.

```
Phase 0  /opsx:explore → architecture sketch
Phase 1  /opsx:propose org-sso → proposal.md + design.md + tasks.md
Phase 2  task.py create (sync Trellis task dir)
Phase 3  /opsx:apply per tasks.md (or trellis-implement per subtask)
Phase 4  Gate per subtask OR once at end (prefer per-milestone for integration tasks)
Phase 5  /opsx:archive + finish-work
```

OpenSpec owns **design**; Trellis owns **spec沉淀 + task audit trail**.

---

## Template: blank plan for a new task

Copy into chat when user asks for a plan:

```markdown
## Task: ___________

**Scenario:** ___
**Repos:** ___
**Spec entry:** ___
**Plan depth:** Lite | Standard | Full

### Phase -1 — Capability matrix
| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| | | available / unavailable | |

### Phase 0 — Activate & read
| Step | Tool | Output |
|------|------|--------|
| | | |

### Workstreams
| Phase | P | WS | Risk | Tool | Files | Required output | Profile | Notes |
|-------|---|----|------|------|-------|-----------------|---------|-------|
| | | | | | | | | |

### TDD contract
| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| | | | | |

### Verification profile and gate
**Selected:** Fast | Standard | UI | Release | Security | Cross-repo

1. review: trellis-check | code-reviewer
2. tests: ___
3. trellis-update-spec: ___
4. jsonl + prd AC
5. commit (if asked)
6. finish-work

### Recovery and re-approval
| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| | | | |

### Parallelization
- ___

### Manual steps
- [ ] ___

### Defer / out of scope
- ___
```
