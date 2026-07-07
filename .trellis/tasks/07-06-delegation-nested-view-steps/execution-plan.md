# Execution Plan — `07-06-delegation-nested-view-steps`

| Field | Value |
|-------|--------|
| **Status** | draft — **awaiting user approval** |
| **Scenario** | **A**（标准前端；PRD 已锁 A+B0） |
| **Plan depth** | **Standard** |
| **Verification profile** | **UI** |
| **Active phase** | P0 — `DelegationRun` B0 + nested View Steps |
| **North star** | 委派树 + 进行中状态可辨；不改 CCB |

**PRD:** [`prd.md`](./prd.md) · **B0 contract:** [`research/delegation-run-b0-contract.md`](./research/delegation-run-b0-contract.md)

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `frontend/index.md`, `chat-acp-flow.md` §3.4c, `agent-team-architecture.md` § UI observability |
| openspec-explore | Read: | Rudder transcript + B vs B0 tier analysis → `research/rudder-ui-reference.md` |
| User refine | chat | A lightweight + B0完善；B1 bridge 明确 defer |

---

## Phase -1 — Capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| `groupNormalizedToolCalls` | **available** | 06-18 audit, 6/6 tests |
| `DelegationRun` B0 reducer | **unavailable** → build | `delegationRun.ts` new |
| CCB bridge B1 | **deferred** | out of scope |
| aionui-src only | **available** | no deploy CCB for AC |

---

## Architecture (locked)

```text
acp_tool_call stream (unchanged wire)
        │
        ▼
normalizeToolCall  (existing)
        │
        ▼
groupNormalizedToolCalls  (existing)
        │
        ▼
buildDelegationRuns  (NEW — B0)
        │
        ├─► MessageToolGroupSummary  (nested tree)
        ├─► DelegationRunChip       (P1 — running k/n)
        └─► SubagentDrawer          (P1 — same runs)
```

**Forbidden:** parallel grouping in components; CCB changes for this task.

---

## Phase 0 — Activate & audit

| Step | Output |
|------|--------|
| 0a | `task.py start 07-06-delegation-nested-view-steps` |
| 0b | Read `groupNormalizedToolCalls.ts` + tests |
| 0c | Read `MessageToolGroupSummary.tsx`, `SubagentDrawer.tsx` |
| 0d | Confirm Agent output shape for `agentId` / `tool_uses` (fixture or smoke) |
| 0e | Optional: `parentToolUseId` on live child event — only if B0 grouping fails in dev |

---

## Phase 1…N — Workstreams

| Phase | P | WS | Deliverable |
|-------|---|-----|-------------|
| 1 | P0 | **F — DelegationRun B0** | `delegationRun.ts` + `delegationRun.test.ts` (≥6 cases) |
| 1 | P0 | **A — nested View Steps** | `MessageToolGroupSummary` consumes `buildDelegationRuns` |
| 1 | P0 | **B — labels + header** | `委派 → {displayLabel} · {status} · {n} tools` |
| 2 | P1 | **G — live chip** | Compact running indicator, same run ref |
| 2 | P1 | **C — SubagentDrawer** | Reuse runs + nested renderer |
| 2 | P2 | **D — spec** | §3.4c B0 documented |
| 3 | P0 | **E — gate** | code-review → vitest → manual smoke |

### TDD contract (expanded)

| WS | Test file | Cases |
|----|-----------|-------|
| F | `delegationRun.test.ts` | single delegate running→done; blocked Agent; no Agent (Guid); 2 delegates same turn; childAgentId from output; childToolCount |
| A | `groupNormalizedToolCalls.test.ts` | extend nested parent/child |
| A | View Steps DOM/snapshot | 1 parent + 2 children; header shows status |
| G | chip unit/DOM | hidden when done; shows k/n when child running |
| C | drawer | imports `buildDelegationRuns` only — grep guard no duplicate grouper |

### Target UI (approved shape)

**Done:**

```text
View Steps · 1 group
▼ 委派 → 万鼎报价专家 · done · 2 tools
    ✓ Read 业务知识库
    ✓ match_quotation
```

**Running (P1 chip + expandable group):**

```text
┌ 委派 → 万鼎报价专家 · running · 1/2 tools ─┐
└ View Steps ▼ …                             ┘
```

---

## Verification profile — **UI**

```text
1. code-reviewer PASS (aionui-src)
2. vitest: delegationRun + groupNormalizedToolCalls + View Steps (+ chip if P1)
3. Manual smoke:
   a. Default orchestrator 查直接50 — nested + (prefer) running chip flash
   b. Guid quotation — no fake delegation run
   c. Default accurate 1-5月 — nested accurate MCP
   d. SubagentDrawer === View Steps tree
4. trellis-update-spec §3.4c
```

---

## Manual smoke matrix

| # | Session | Prompt | Pass |
|---|---------|--------|------|
| 1 | Default orchestrator | 查直接50价格 | Nested run; running chip optional; done header |
| 2 | Guid quotation | 查直接50价格 | No DelegationRun parent |
| 3 | Default orchestrator | 1-5月采购额 | accurate-agent nested |
| 4 | Drawer | from #1 | Same tree; agentId if in output |
| 5 | Regression | View Steps title merge | 07-04 empty title fix still OK |

---

## Conditional recovery

| Trigger | Action |
|---------|--------|
| B0 tests green but UI flat | Wire bug — fix consumer, not CCB |
| Missing `parentToolUseId` on children | sequential fallback in grouper; document; consider B1 task |
| Chip too noisy | Collapse to View Steps header only (D4 single reducer kept) |

---

## Out of scope reminder

- **No** `deploy-claude-code-b-to-wanding` required for AC
- **No** B1 `_meta.delegationRun` — file follow-up only if 0e fails

---

## Approval

Plan **amended 2026-07-06** — A + B0. Reply **「执行 task」** to implement.

Implementation order: **F → A → B → G → C → D → E**
