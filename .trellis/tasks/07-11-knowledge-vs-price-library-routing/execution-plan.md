# Execution Plan — `07-11-knowledge-vs-price-library-routing`

| Field | Value |
|-------|--------|
| **Status** | in_progress — impl done; **manual smoke pending** |
| **Approved** | 2026-07-11 |
| **Scenario** | **C**（路由行为 bug）+ 消歧产品规则 |
| **Plan depth** | **Standard** |
| **Verification profile** | **UI**（agent L1 + manual chat smoke） |
| **Repos** | `claude-code-best`（ccb-installer vertical agents/skills + `.trellis/spec`） |
| **Active phase** | Gate / manual smoke |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Plan | approved | 2026-07-11 |
| P1 | done | `wande-orchestrator.md` KB_* + 路由行 |
| P2 | done | `quotation-agent.md` 决策表 append 行 |
| P3 | done | skill/agent 触发词；`delegatable: true` |
| P3b | done | `guidOnlyAgentIds: []` + packageRegistry LEGACY + tests |
| P4 | done | registry + org-knowledge + price-library + work-routing specs |
| Gate | code-review **PASS** (2 rounds) | packageRegistry **8/8**; live seed + fleet synced |
| Smoke | **#1 PASS (user 2026-07-12)** | 「更新知识库」→ quotation；无价库。#2/#3 可选 |
| Adjacent | **explore parked** | [`research/wecom-yolo-mode-not-selectable-2026-07-12.md`](./research/wecom-yolo-mode-not-selectable-2026-07-12.md) — `yolo` mode 不可选；非本 task 实现范围 |

## Skills invoked

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verification；Scenario C |
| skill-selection.md | Read: | Debug → systematic-debugging；Explore → openspec |
| trellis-before-dev | Read: | integration index → org-knowledge / agents / routing contracts |
| openspec-explore | Read: | `openspec list` — only unrelated `unified-org-sso` |
| systematic-debugging | Read: | Root-cause table in prd.md（5 layers） |
| User lock | Chat: | 业务知识 / 价库 / 歧义必澄清 — 三条全要 |
| code-reviewer | Agent: | PASS ×2（Layer A PASS, Layer B N/A） |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | User lock + this PRD | available | — |
| Research | explore notes in prd | available | `research/routing-misroute-2026-07-11.md` |
| Implementation | Main session / trellis-implement | available | Inline edit L1 md |
| TDD | Characterization via smoke matrix | available | Eval case optional P2 |
| Review | code-reviewer（agent md / Layer A if picker） | available | trellis-check |
| Deploy seed | `deploy-seed-agents.ps1 -ForceMd` | available | Manual copy notes |

**Plan depth:** Standard（多 agent L1 + skill + spec；无 cross-repo UI）

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| **WANd.ROUTING.KB_ORG.001**（provisional） | **知识库 = 业务知识库** → quotation → `append_business_rule` | `quotation-agent.md`, `wande-orchestrator.md` | Manual smoke #1 | ui |
| **WANd.ROUTING.KB_PRICE.001**（provisional） | **价格库** → `price-library-agent`，不走 append | `price-library-agent.md`, `price-library-edit/SKILL.md` | Manual smoke #2 | ui |
| **WANd.ROUTING.KB_DISAMBIG.001**（provisional） | 混信号时先澄清「业务知识库 vs 价格库」 | `wande-orchestrator.md` | Manual smoke #3 | ui |
| `WANd.ROUTING.ASSIGNMENT.001` | 主入口仍不直连业务 MCP | `wande-orchestrator.md` | 回归：澄清/委派后仍无 top-level MCP | — |

### Contract cards

### Contract: WANd.ROUTING.KB_ORG.001

**Behavior protected:** 「知识库 / 业务知识库」默认走 `append_business_rule` 两阶段确认，禁止价库 upsert。  
**Primary code:** `quotation-agent.md` 工具决策表 + `wande-orchestrator.md` 路由行  
**Tests:** Manual smoke #1  
**Eval / smoke:** 「更新知识库加一条 test」→ `append_business_rule`，无 `upsert_price_library_item`  
**Risk if broken:** 业务知识库更新误进价格库

### Contract: WANd.ROUTING.KB_PRICE.001

**Behavior protected:** 「价格库 / 价库」走 `price-library-agent` + edit SOP，不走 append。  
**Primary code:** orchestrator 路由行 + `price-library-edit` description  
**Tests:** Manual smoke #2  
**Eval / smoke:** 「给价格库加 TEST-001」→ price-library 路径；Skill 不因「知识库」触发  
**Risk if broken:** 价格库维护跑到业务知识库工具

### Contract: WANd.ROUTING.KB_DISAMBIG.001

**Behavior protected:** 混信号时先澄清「业务知识库 vs 价格库」，禁止直接写库。  
**Primary code:** `wande-orchestrator.md`（消歧段）  
**Tests:** Manual smoke #3  
**Eval / smoke:** 「知识库加物料 TEST-001 单价 1 元」→ 澄清句，无 upsert/append  
**Risk if broken:** 口语混用导致写错库

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | — | Activate + read | docs-only | — | `task.py start` | prd / this plan | in_progress | Fast |
| 1 | P0 | Orchestrator 消歧 + 路由两行 | WANd.ROUTING.KB_DISAMBIG.001, KB_ORG.001, KB_PRICE.001 | ui | TDD N/A→edit L1 | `wande-orchestrator.md` | 澄清模板 + 两行路由 | UI |
| 2 | P0 | quotation 决策表 append 行 | WANd.ROUTING.KB_ORG.001 | ui | edit L1 | `quotation-agent.md` | 决策表行 + 禁止价库误路由注记 | UI |
| 3 | P0 | 价库 skill/agent 触发词收紧 | WANd.ROUTING.KB_PRICE.001 | ui | edit | `price-library-edit/SKILL.md`, `price-library-agent.md` | description 排除裸「知识库」 | UI |
| 4 | P1 | Spec + registry | 三合同 | — | trellis-update-spec | `work-routing-execution-contracts.md`, `agent-runtime-registry.yml`, `org-knowledge.md` 交叉链 | registry IDs | Fast |
| 5 | — | Deploy + smoke | all | ui | `deploy-seed-agents.ps1 -ForceMd` | live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` | 3-case smoke log | UI |

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P1 Orchestrator | KB_ORG + DISAMBIG | 2026-07-11 实测：知识库→price-library-edit | Smoke #1+#3 | 同 prompt 再跑 |
| P2 quotation | KB_ORG.001 | 决策表无业务知识库/append 行 | Smoke #1：Steps 含 `append_business_rule` | 同 |
| P3 price skill | KB_PRICE.001 | skill 被「知识库」误触发 | Smoke #2；description 仅「价格库/价库」 | 同 |
| P4 spec | all | registry 无 KB_* | grep registry 含三 ID | — |

**TDD note:** Agent L1 行为以 **手工 smoke / 可选 eval** 为主；无强制单元 RED。若后续加 `eval/agent_eval_cases.jsonl` 条目，GREEN 可升级为 eval harness。

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| KB_ORG.001 | 「更新知识库」 | 委派 quotation；无 upsert；本轮用 `ask_clarification` 问规则类型（无规则原文时合理） | **PASS** (user 2026-07-12) |
| KB_PRICE.001 | 「给价格库加 TEST-001」 | `price-library-agent` / upsert；非 append | pending-user |
| KB_DISAMBIG.001 | 「知识库加物料 TEST-001 单价 1 元」 | 澄清「业务知识库 vs 价格库」；无写库工具 | pending-user |
| ASSIGNMENT.001 | 主入口 View Steps | 无 top-level `mcp__quotation__*` / `mcp__price-library__*` | **PASS**（主入口仅 Agent 委派） |
| Fleet derive | `bun test packageRegistry.test.ts` | **8/8 PASS** | done |

---

## Verification profile and gate

**Selected:** UI

1. **Contract Verification** — 上表 4 行 smoke  
2. **Primary review:** `code-reviewer`（agent L1 / Layer A N/A unless picker）  
3. Deploy: `deploy-seed-agents.ps1 -ForceMd`（或项目等价）+ **新会话**  
4. `trellis-update-spec` → routing + org-knowledge 交叉引用 + registry  
5. `implement.jsonl` / `check.jsonl` + PRD AC `[x]`  
6. `git commit` — 仅当用户要求  
7. `/trellis:finish-work`

---

## Manual steps (human)

- [ ] Smoke #1：「知识库更新」→ `append_business_rule` 预览  
- [ ] Smoke #2：「价格库」→ price-library 路径  
- [ ] Smoke #3：混信号 → 澄清「业务知识库 vs 价格库」  

- [ ] Deploy seed 后开**新**默认会话（旧会话 L1 可能缓存）

---

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| Smoke 仍误走价库 | P1+P3 | 更新 smoke 失败笔记 | 若改澄清文案产品语义 → yes |
| Guid quotation 直连仍误 upsert | P2 | quotation 决策表 + 禁止项 | no（同 AC） |
| 产品要求「知识库」默认业务知识、不澄清 | PRD | 改 AC1 | **yes** |

---

## Defer / out of scope

- MCP 实现改动  
- Org Knowledge UI updater display  
- 自动 eval harness（可选加分，非 MVP）
