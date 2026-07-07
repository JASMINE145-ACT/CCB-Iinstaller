# Execution Plan — `07-06-accurate-purchase-monthly-routing`

| Field | Value |
|-------|--------|
| **Status** | awaiting-smoke (2D deploy done) |
| **Scenario** | C (bug — wrong MCP tool chain / SOP violation) |
| **Plan depth** | Standard |
| **Verification profile** | Standard + manual AionUI smoke |
| **Active phase** | Phase 4 — manual AionUI smoke |

**PRD:** [`prd.md`](./prd.md)

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `get_context.py --mode packages` → layers backend, frontend, integration |
| trellis-task-execution + skill-selection | Read: | Scenario C playbook; matrix §二 debug → systematic-debugging |
| Spec trace | Read: | `agents-unified-model.md` § Specialist direct; `accurate-agent.md` §全公司采购月报 |
| User transcript | — | View Steps ·11; fetch Feb/Mar samples; temp `agg_purchase.py` |
| systematic-debugging | Read: (discipline) | Hypothesis table H1–H6 before any fix |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 — Reproduce & profile | done | `research/execute-extra-tool-drift.md` H7 |
| P1 — MCP direct smoke | deferred | user proved summarize via ExecuteExtraTool on sales-invoice |
| P2 — Fix (branch on root cause) | done | **2D** seed md + `deploy-seed-agents.ps1 -ForceMd` |
| P3 — Harness regression | deferred | optional `test-native-acp-agent.mjs` |
| P4 — Manual smoke | **pending** | Guid 万鼎账务专家 AC |

---

## Task: 07-06 — Accurate 采购月报应用错误工具链

**Repos:** `ccb-installer` (seed agent, MCP, deploy) · `claude-code-best` (CCB ACP if guard) · optional `aionui-src` (profile handoff only if H3)

**Spec entry:**
- `.trellis/spec/integration/agents-unified-model.md` — specialist direct, Accurate smoke
- `.trellis/spec/backend/acp-session-flow.md` — session profile / MCP warmup
- `.trellis/spec/integration/mcp-health.md` — accurate MCP health

**Related tasks:** `07-04-orchestrator-dispatch-hardening` (row #4 pending); `07-04-acp-view-steps-empty-tool-title` (completed — tool title only)

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | Read: trellis-before-dev | available | paths above |
| Debug discipline | Read: superpowers:systematic-debugging | available | inline hypothesis log in `research/` |
| MCP smoke | shell + quotation/accurate MCP scripts | available | manual MCP inspector |
| Agent md deploy | `deploy-seed-agents.ps1 -ForceMd` | available | manual Copy-Item from seed |
| ACP harness | `ccb-installer/test-native-acp-agent.mjs` | available | manual Guid smoke only |
| Implement CCB | Agent: trellis-implement | available | inline after approval |
| Review | Agent: code-reviewer | available | trellis-check |
| UI smoke | manual | available | `start-dev-full.ps1` |

---

## Phase 0 — Reproduce & eliminate H1/H3 (no code)

| Step | Tool | Required output |
|------|------|-----------------|
| Export session evidence | manual | View Steps transcript; first `summarize` input/output if present |
| Verify profile | log grep | `[ACP] agent session profile applied: accurate-agent` on Guid card session |
| Compare live L1 | shell | `fc` or hash: `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\accurate-agent.md` vs seed |
| Check deploy policy | Read: deploy-seed-agents.ps1 | confirm whether `-ForceMd` needed after seed update |

**Decision gate:**

- Profile ≠ accurate-agent → fix **AionUI handoff / createConversation** (H3) before MCP
- Live md missing §全公司采购月报 → **deploy -ForceMd** (H1) then re-smoke

---

## Phase 1 — MCP direct smoke (eliminate H2)

| Field | Value |
|-------|--------|
| Risk | external-api |
| Tool | shell / MCP test script |
| Required output | `research/mcp-summarize-purchase-jan-may.md` |

**Command sketch** (exact script TBD in implement — may use existing accurate MCP entry):

```powershell
# One-shot summarize — expect monthly buckets Jan–May 2026, no errors
# Persist: request JSON, response summary, latency, hints if matched_count=0
```

**Branches:**

| Result | Next |
|--------|------|
| summarize **OK** | H2 rejected → focus H4/H5 (model + guard + live md) |
| summarize **fail/empty** | fix MCP server / params schema → then re-run P0 smoke |

---

## Phase 2 — Fix workstreams (serial merge)

| WS | Priority | Trigger | Files / action | Risk |
|----|----------|---------|----------------|------|
| **2A Deploy L1** | P0 | H1 confirmed | `deploy-seed-agents.ps1 -ForceMd accurate-agent` | packaging |
| **2B MCP fix** | P0 | H2 confirmed | accurate MCP server summarize handler | external-api |
| **2C Repeat guard** | P1 | H4 — summarize blocked, fetch allowed | `mcpToolRepeatGuard.ts` — exempt or separate counter for fetch vs summarize | concurrency |
| **2D Prompt hardening** | **P0** | H7 confirmed | seed `accurate-agent.md`: direct `mcp__accurate__*` + 禁止 ExecuteExtraTool; `-ForceMd` deploy | — |
| **2E Profile routing** | P0 | H3 | `agentSessionProfile.ts`, AionUI `ccbPresetConversationExtra` | cross-repo ui |

**Merge rule:** 2E before 2A if profile wrong; otherwise 2A → harness → 2C/2D only if still failing.

---

## Phase 3 — Regression harness

| Workstream | Test level | RED evidence | GREEN command |
|------------|------------|--------------|---------------|
| ACP CLI profile handoff | integration | expect `accurate_summarize_records` in completed_tools; forbid `fetch_by_date` ×3+ | `test-native-acp-agent.mjs` with `CCB_TEST_PROFILE=accurate-agent`, prompt `查询1-5月采购额` |
| Repeat guard (if 2C) | unit | existing `mcpToolRepeatGuard` tests + new case | `pnpm test` in ccb-installer |

---

## Verification profile and gate

**Selected:** Standard (+ manual AionUI for AC)

1. Read: systematic-debugging — hypothesis log complete before fix
2. MCP smoke artifact in `research/`
3. Agent: code-reviewer PASS (if code changed)
4. Harness or transcript evidence for AC
5. Manual: Guid 万鼎账务专家 → 1-5月采购额 → ≤2 MCP calls, table output
6. `trellis-update-spec` → `agents-unified-model.md` smoke row if behavior contract changes
7. `implement.jsonl` + `check.jsonl`
8. **Wait user 执行 task** before coding

---

## Manual steps (human)

```text
[ ] New Guid chat → 万鼎账务专家 card（非默认 orchestrator）
[ ] Prompt: 查询 1-5 月的采购额
[ ] View Steps: 应 primarily summarize_records；不应 5+ fetch_by_date
[ ] 无 Temp 下 agg_*.py
[ ] 回复含 1–5 月表格
[ ] DevTools/main log: profile applied accurate-agent
```

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| summarize OK but model still fetches | P2D prompt + P3 harness | no |
| Need change orchestrator default path | new scope — 07-04 matrix row #2 | yes |
| MCP API change / date format | P1 + research persist | yes |

---

## Defer / out of scope

- 销售额路径（同规则，可 copy smoke 用 `sales-invoice`）
- View Steps 步骤合并 UI
- 主 agent 默认入口经 orchestrator 再 Agent(accurate) — separate 07-04 row

---

## Parallelization

**Not recommended** — single causal chain (profile → md → MCP → model). Only parallel: live md diff (P0) while MCP smoke (P1) if different operators.
