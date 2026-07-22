# Execution Plan — `07-19-quotation-agent-prompt`

| Field | Value |
|-------|--------|
| **Status** | draft — awaiting approval（轻量化 + 全量转发已写入 prd/research） |
| **Scenario** | **E→C/A**：先探索归因（E），再按层修 bug（C）/ 收敛设定（A） |
| **Plan depth** | Standard |
| **Verification profile** | Standard（+ UI smoke 1 次 Guid 委派查价） |
| **Active phase** | Phase -1 done → 产品决策已记 → Phase 0 pending approval |
| **Product lock** | 子→父完整结果；父只转发、不缺斤少两；轻量化三刀见 `research/lightweight-approach.md` |
| **Repos** | claude-code-best |
| **Parent / children** | 本任务；child `07-21-quotation-relay-stale-fix`（closeout 已写；接线补丁待部署验收） |
| **Sibling** | `07-20-accurate-agent-readonly-convergence`（Accurate 只读：过度交付 + ROE 误伤 + 父乱解释；独立 plan，不并入本任务实现） |
| **Risk tags** | `ui` · `migration`(deploy L1/hooks) · `long-running`(eval) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 bootstrap | Shell: | `task.py current` → none；`list --mine in_progress` → 49；`get_context --mode packages` → agent-eval/backend/frontend/integration；`git status -sb` → main ahead 34, dirty |
| trellis-before-dev | Read: | `.trellis/spec/integration/index.md` → agents-unified-model / agent-hooks / work-routing；quotation L1 slim 注记（06-28 曾 ~451→~180，现又膨胀） |
| trellis-task-execution + skill-selection | Read: | Scenario E 先探索；Capability「Explore」→ openspec-explore / trellis-research；Debug → systematic-debugging 后再改 |
| openspec-explore（stance） | Read: | 用户假设「prompt/设定相对其他 agent」；对照 accurate vs quotation 结构差已实证 |
| prior art | Read: | `07-11-safe-quotation-agent-prompt-refactor/prd.md`（禁盲删锚点）；`07-21-…/closeout.md`（relay nudge 接线曾漏）；`07-19-roe-judge-lightweight-loop-fix`（roe-judge 自锚循环） |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec inject | trellis-before-dev (Read) | available | inline spec index |
| Symptom taxonomy | Agent: trellis-research / inline research | available | Grep + handwrite `research/` |
| Debug discipline | superpowers:systematic-debugging (Read) | available | inline 四阶段 |
| TDD | superpowers:test-driven-development | available | pytest / node --test first |
| Implement | Agent: trellis-implement | available | inline after approve |
| Review | Agent: code-reviewer | available | Layer A N/A unless picker |
| Verify | trellis-check / agent-eval | available | pytest + Guid smoke |

**Plan depth rationale:** 多层（orch + L1 + hooks），非单文件改字 → **Standard**。不并行（Scenario D 否）——归因未定时并行会改错层。

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | bootstrap + 对照 accurate/quotation/orch + modes.json |
| Decision | done | 用户确认：轻量化三刀可记；**报价完整回传 + orch 转发不缺斤少两** → `prd.md` + `research/lightweight-approach.md` |
| Symptom H4 | done | 2026-07-20 DIY 扫盘查价 → `research/symptom-2026-07-20-mcp-bypass-diy.md`；prd 增 H4 / R6 `NO_DIY.001` |
| Phase 0 | pending | 批准本 plan；`task.py start`；写满 prd AC |
| Phase 1a | **done** | `research/symptom-layer-matrix.md` — H1 主导「看不到价」；H2≠行数 KPI；硬 120–180 不建议 |
| Phase 1b | pending | settings-parity vs accurate |
| Phase 1c | pending | 07-11 inventory 锚点映射（2b 前置） |
| **归因门禁** | **await user** | 选 2a / 2b合同保全 / 串行；禁止未确认就腰斩 L1 |

## 背景图（本 session 已实证的结构差）

```text
                    ┌──────────────────────────┐
  User 「直接50」──▶│  wande-orchestrator      │  Stop: outcome-relay (block)
                    │  L1: 必须转述查询结果     │
                    └────────────┬─────────────┘
                                 │ Agent()
              ┌──────────────────┼──────────────────┐
              ▼                                     ▼
   ┌─────────────────────┐               ┌─────────────────────┐
   │ quotation-agent     │               │ accurate-agent      │
   │ ~390 行 L1          │               │ ~短 L1              │
   │ MCP ×4              │               │ MCP ×1              │
   │ PostToolUse ×5      │               │ PostToolUse ×0      │
   │ roe-judge: warn     │               │ roe-judge: block    │
   └─────────┬───────────┘               └─────────┬───────────┘
             │                                     │
             ▼                                     ▼
   工具齐但文本易 BAD / 空壳              一次 summarize → 表
             │                                     │
             └──────────▶ 父气泡？ ◀───────────────┘
                    现场：报价侧常只剩「交给专家」
                    账务侧常能转述数字
```

**初步裁定（待 Phase 1 钉死）：**  
「总是出问题」很可能是 **三层叠加**，不是单一 prompt 句。你贴的「4 tools done → 只说交给专家」**优先像 H1（父转述）**；H2/H3 解释「为什么报价比账务更脆」。

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.QUOTE.ORCH.RELAY.STRICT.001` | 父**只转发、不缺斤少两**（锁码+单价+子已给出的货源/库存） | `parse_transcript_outcome_relay.py` · `wande-orchestrator.md` | pytest outcome-relay query；Guid 委派「直接50」 | 用户看不到价 |
| `WANd.QUOTE.RETURN.FULL.001`（prov） | 子返回 orch 的正文自含最小交付集 | `quotation-agent.md` + relay nudge | price-only eval / output-contract | 父无料可转 |
| `WANd.QUOTE.RELAY.GUARD.001` | select-ok 后子文本含锁码 nudge | `post-quotation-relay-nudge.py` + L1 frontmatter | `test_post_quotation_relay_nudge.py` + `test_seed_sync` wiring | 子 BAD 文本 |
| `WANd.QUOTE.L1.SLIM.001`（prov） | L1 轻量化且不丢合同与交付义务 | `quotation-agent.md` | `quotation-agent-output-contract.test.mjs` + price-only case | 误删锚点回归 |
| `WANd.QUOTE.SETTINGS.PARITY.001`（prov） | 与 accurate 的差异可解释 | `modes.json` · frontmatter hooks | 文档表 + 可选 warn/block 决策记录 | ROE 再死循环 |
| `WANd.AGENT.SEED.SYNC.001` | packages ≡ staging | staging + packages agents | `test_seed_sync.py` | 装机旧 L1 |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | **Activate + approve** | docs-only | — | `task.py start` | task.json · prd.md | status=in_progress | Fast |
| 1a | P0 | **Symptom layer matrix** | H1/H2/H3 | — | Agent: trellis-research / inline | `research/symptom-layer-matrix.md` | ≥5 行现场→层标签 | Standard |
| 1b | P0 | **Settings parity vs accurate** | `WANd.QUOTE.SETTINGS.PARITY.001` | — | inline Read | `research/settings-parity-vs-accurate.md` | 对照表 + keep/change 建议 | Standard |
| 1c | P1 | **Reuse 07-11 inventory** | `WANd.QUOTE.L1.SLIM.001` | — | Read | link `07-11-…/quotation-agent-logic-inventory.md` | 标注过时行 / 仍有效行 | Fast |
| 2a | P0 | **If H1 ≥50%：orch query relay** | `WANd.QUOTE.ORCH.RELAY.STRICT.001` | ui | TDD → trellis-implement | `parse_transcript_outcome_relay.py` · orch L1 仅必要时 | RED→GREEN pytest；live 1 smoke | Standard |
| 2b | P1 | **If H2：L1 slim（合同保全）** | `WANd.QUOTE.L1.SLIM.001` | ui · migration | 07-11 纪律 + TDD | `quotation-agent.md` · staging sync | 行数↓ + contract test PASS | Standard |
| 2c | P1 | **If H3：modes/hooks 收敛** | `WANd.QUOTE.SETTINGS.PARITY.001` | ui | 小步 modes 或减 PostToolUse | `modes.json` · frontmatter | 书面决策；roe 不死循环 | Standard |
| 3 | P0 | **Verify + deploy** | all touched | migration | deploy-seed + deploy-subagent-gate | live `.claude/agents` | Guid 新会话 smoke | UI |
| G | — | **Gate** | all | — | code-reviewer → finish | — | PASS | Standard |

**Serial:** 0 → 1a∥1b → **归因门禁（用户确认主因）** → 只开 2a **或** 2b **或** 2c（可串第二层）→ 3 → G。

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1a/1b research | docs-only | N/A（落盘矩阵） | `Test-Path research/*.md` | — |
| 2a orch relay | `ORCH.RELAY.STRICT.001` | fixture：Agent query 齐、父泡仅「交给专家」→ outcome-relay 应 block/nudge | `python -m pytest …/test_*outcome_relay*`（现有测试路径以 research 钉死） | 同 GREEN |
| 2b L1 slim | `L1.SLIM.001` | 删锚点前 `quotation-agent-output-contract` 或 inventory 行未映射 → FAIL 门禁 | `node --test ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` | + `test_seed_sync` |
| 2c settings | `SETTINGS.PARITY.001` | 改 modes 前记录 roe 自锚回归 fixture | `pytest …/test_roe_judge_*.py -q` | 同 GREEN |
| wiring | `RELAY.GUARD` + `SEED.SYNC` | 去 frontmatter matcher → `test_quotation_agent_wires_relay_nudge_hook` FAIL | `pytest …/test_seed_sync.py -q` | 同 GREEN |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| ORCH.RELAY.STRICT | outcome-relay pytest + Guid：委派「查询直接50的B级价格」父泡含 `8020020755`/`1219` 类数字 | 命令输出 + 截图/复制父泡 | pending |
| RELAY.GUARD | `pytest test_post_quotation_relay_nudge.py` + L1 含 matcher | PASS | pending |
| L1.SLIM | output-contract + price-only node test | PASS | pending |
| SETTINGS.PARITY | research 表签字 + roe pytest | 文件存在 + PASS | pending |
| SEED.SYNC | `pytest test_seed_sync.py -q` | PASS（含 wiring） | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-19-quotation-agent-prompt/execution-plan.md` | PASS | pending |

## Verification profile and gate

**Selected:** Standard + UI

1. Phase 1 research 完成 → **用户确认主因层**（归因门禁）  
2. 仅实现对应 Phase 2 工作流（禁止「三层一起大改」）  
3. Contract Verification 表逐行贴 Progress  
4. `Agent: code-reviewer`（L1/hooks → Layer A N/A；无 renderer）  
5. Deploy：`deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` + **新 Guid 会话**  
6. `/trellis:finish-work`（用户要求时）

## Manual steps (human)

- [ ] Guid / 主入口：`查询直接 50 的 B 级价格` → 父泡必须见锁码+价（不只「交给专家」）
- [ ] 同会话再问账务一句（如月销售额）→ 确认未回归 accurate
- [ ] 若动了 modes：确认查价不再 ROE 死循环

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Phase 1 证明主因是 H1 而非 H2 | 跳过 2b；只做 2a | no（范围缩小） |
| Phase 1 证明主因是 H2 | 跳过 2a 或仅 smoke；做 2b | no |
| L1 slim 导致 eval 硬失败 | 回滚该 diff；按 inventory 逐条恢复锚点 | yes if 删合同 |
| roe-judge 再死循环 | 回 `warn` 或修 parser；回 Phase 2c | yes if 改 block 语义 |
| seed drift 再现 | Phase 3 强制 sync + wiring test | no |

## Defer / out of scope

- 改 select 内部选型模型  
- 修 `direct50-price-stock` live flaky（另任务）  
- Accurate L1 改写  
- 把 49 个 in_progress 历史 quotation 任务一次性清账（本任务只挂接证据，不吞并）

---

## 批准前

产品方向已记录（轻量化 + 全量转发）。实现前请回复：

- **「批准」** / **「批准，执行」** — 开 Phase 0→1；或  
- 指定优先：`先修转发不缺斤少两` / `先轻量化 L1+hooks` / `两边一起但串行（先转发后瘦身）`（推荐最后一项的串行变体）
