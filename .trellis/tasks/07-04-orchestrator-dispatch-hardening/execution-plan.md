# Execution Plan — `07-04-orchestrator-dispatch-hardening`

| Field | Value |
|-------|--------|
| **Status** | `approved` |
| **Scenario** | A (standard) + cross-layer smoke |
| **Plan depth** | Standard |
| **Verification profile** | UI |
| **Repos** | `claude-code-best` (+ `aionui-src` for warmup smoke if B needs UI) |
| **Active phase** | P0 debug — wrong agent profile (2026-07-04 screenshot) |

**PRD:** [`prd.md`](./prd.md) · **Packaging:** [`ccb-installer/packaging-backlog-1.1.6.md`](../../../ccb-installer/packaging-backlog-1.1.6.md) Issue 3

---

## Debug — 2026-07-04「主 agent 不是主 agent」（用户截图）

### 现象（从 transcript 推断）

| 观察 | 含义 |
|------|------|
| Tool: `mcp__price-library__get_price_library_active` | **price-library-agent** 直连 MCP，不是 orchestrator |
| 无 `Agent(quotation-agent)` | **未走** wande-orchestrator 委派链 |
| Read + Grep 3299 行 dump | 非 quotation `match_quotation` 查价 SOP |
| 侧栏有 **价目库 / Price Library** | 高概率 **Guid-only 价格库管理** 会话，非默认路由 |

### 结论（plan-only，非 orchestrator 委派失败）

**这不是「orchestrator 委派坏了」，而是「会话绑错了 agent 类型」。**

| 用户意图 | 应进入的会话 | 应出现的工具 |
|----------|--------------|--------------|
| 查直接50价格（询价） | **默认会话** 或 Guid **万鼎报价专家** | `Agent(quotation-agent)` 或 `mcp__quotation__match_quotation` |
| 价格库 draft/改价/发布 | Guid **价格库管理**（price_admin） | `mcp__price-library__*` |

`price-library-agent` 在 `CCB_GUID_ONLY_AGENT_IDS` 内，**永远不会**作为 orchestrator 子 agent 被委派；其 L1 明确「You **are** price library admin — **do not** delegate via Agent」。

### 立即验证（manual，5 分钟）

1. F12 / CCB log 搜：`[ACP] agent session profile applied:` → 预期若为查价误路由则为 `price-library-agent` 而非 `wande-orchestrator`
2. **New Chat**（无 Guid 卡片）→ 同 prompt → 应见 `Agent` 或子会话 `match_quotation`
3. Guid **万鼎报价专家** 新会话 → 同 prompt → 应见 `mcp__quotation__match_quotation`，无 price-library

### 若验证 2/3 OK、仅价目库入口 FAIL → 新开 WS **F**（UI 入口 / L1 澄清）

| Step | Owner | Deliverable |
|------|-------|-------------|
| F1 | AionUI | 价目库侧栏/New Chat 是否错误绑定 `price-library-agent`（查 profile staging） |
| F2 | L1 | `price-library-agent.md` 首段：纯查价应提示用户切 **万鼎报价专家**（不拉全库 grep） |
| F3 | smoke | Matrix #7 PASS/FAIL |

**Re-approval:** 仅当 F 需改 AionUI 路由或新增 product 行为时。

---


## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| Explore | **done** | 2026-07-04 chat + packaging-backlog Issue 3 |
| Plan | **approved** | this file (2026-07-04 user 继续) |
| P0 A smoke matrix | **baseline** | [`delivery-smoke-matrix.md`](./delivery-smoke-matrix.md) — CLI cases 1,3 FAIL |
| P0 debug wrong profile | **fixed** | 2026-07-04 — main entry leak: ACP MCP overlay; CCB strip + guard deployed |
| P1 C delegatable bypass | **implemented** | `agentSessionProfile.ts` + test; gate pending |
| P1 D eval scenario | **done** | [`eval/scenarios/orchestrator-delegation-vs-direct-20260704.md`](../../../eval/scenarios/orchestrator-delegation-vs-direct-20260704.md) |
| P2 E spec/backlog | pending | after code gate |
| Gate | **partial** | code-review PASS; `bun test` 10/10 on `D:\claude-code-B` post-sync |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|------------|
| Spec read | `trellis-before-dev` | available | `agents-unified-model.md` |
| CCB implement | `trellis-implement` | available | inline + overlay sync |
| Review | `code-reviewer` | available | `trellis-check` |
| UI smoke | manual AionUI | available | `test-native-acp-agent.mjs` (partial) |
| Eval | eval scenario md | available | manual transcript compare |

---

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| Activate | `task.py start 07-04-orchestrator-dispatch-hardening` | `in_progress` |
| Read spec | `trellis-before-dev` → integration | paths noted |
| Read related | `06-29-specialist-session-resume-profile-drift` status | avoid duplicate B work |

---

## Phase 1…N — Workstreams

| Phase | P | WS | Risk | Tool | Files | Required output | Profile |
|-------|---|-----|------|------|-------|-----------------|---------|
| 1 | P0 | A — smoke matrix baseline | ui | manual + log | `delivery-smoke-matrix.md` | 6-case PASS/FAIL table | UI |
| 1 | P0 | B — idle resume regression | ui, cross-repo | verify/fix | warmup + `agent.ts` | log `quotation-agent` after idle | UI |
| 2 | P1 | C — orchestrator delegatable bypass | concurrency | TDD → implement | `agentSessionProfile.ts` | unit test green | Standard |
| 2 | P1 | D — eval orchestrator vs direct | long-running | trellis-research | `eval/scenarios/…md` | ≥3 prompt pairs | Standard |
| 3 | P2 | E — spec + backlog | docs | trellis-update-spec | `agents-unified-model.md`, backlog | Issue 3 checked | Fast |

### TDD contract

| WS | Test level | RED | GREEN | Regression |
|----|------------|-----|-------|------------|
| C | unit | test orchestrator bypass delegatable | `bun test agentSessionProfile.test.ts` | office `Agent()` from orchestrator |
| A,B | manual | N/A (baseline capture) | smoke log | Guid vs default paths |
| D | eval | N/A | scenario doc + optional runner | delegation quality |

### Manual smoke matrix (WS A)

| # | Session type | Prompt | Expect |
|---|--------------|--------|--------|
| 1 | Default | 查直接50价格 | `Agent(quotation-agent)` → price same turn |
| 2 | Default | 1-5月销售额 | `Agent(accurate-agent)` → table same turn |
| 3 | Guid 报价专家 | 查直接50价格 | direct `match_quotation`, no Agent card |
| 4 | Guid 账务专家 | 1-5月销售额 | direct accurate MCP |
| 5 | Default | 做个 Word | `Agent(word-creator)` → docx path same turn |
| 6 | Guid 报价 idle resume | 查库存 batch | profile `quotation-agent`, no orchestrator guard |
| **7** | **Guid 价格库管理** / 价目库入口 | 查直接50价格 | **mis-route class** — expect redirect or user msg; **not** `get_price_library_active`+grep; log `price-library-agent` |

---

## Verification profile and gate

**Selected:** UI

1. code-reviewer PASS (if code changed in C)
2. `bun test src/services/acp/__tests__/agentSessionProfile.test.ts` (CCB overlay or claude-code-B)
3. Manual smoke matrix AC1–AC4 logged
4. `trellis-update-spec` → `agents-unified-model.md`
5. `implement.jsonl` + `check.jsonl` + prd AC `[x]`
6. `packaging-backlog-1.1.6.md` Issue 3 checkboxes
7. `/trellis:finish-work` — **only when user approves close**

**No exe packaging in this task** unless user explicitly expands scope.

---

## Parallelization

**Serial recommended** — B may depend on A baseline; C independent; D after A captures prompts.

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Smoke shows orchestrator path fundamentally broken | PRD + explore | yes |
| 06-29 already fixed B | Close B as verify-only | no |
| C breaks non-orchestrator sessions | Revert C, re-review | yes |

---

## Defer / out of scope

- Single-agent-only refactor
- `price-library-agent` default routing
- 1.1.6 NSIS build
