# Execution Plan — `07-06-accurate-delegation-convergence`

| Field | Value |
|-------|--------|
| **Status** | approved（2026-07-06 用户「执行你刚刚的任务」） |
| **Scenario** | C（bug 修复；根因已实锤，见 research/） |
| **Repos** | claude-code-best（vertical 包 + eval + spec；不动 platform src） |
| **Plan depth** | Standard |
| **Verification profile** | Fast + 强制 manual smoke（R4） |
| **Active phase** | 待批准 |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| superpowers:systematic-debugging | Skill: | Phase 1–3 完成：transcript 双路对照、4 次调用逐条归因、假设裁定表 → `research/delegation-convergence-diagnosis.md` |
| trellis-before-dev | Skill: | get_context --mode packages（single-repo, 3 层）；integration/index.md → agent-team-architecture.md + agents-unified-model.md §L1070-1139 已精读 |
| trellis-task-execution | Skill: | 本计划按 Step 1–3b 产出 |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| SOP/prompt 实现 | `Agent: trellis-implement` | available | — |
| 合规核验 | `Agent: trellis-check` | available | inline spec check |
| eval 回归 | `node eval/run-agent-eval.mjs` | available（07-09 套件） | 手工 transcript 计数 |
| 部署种子 | `deploy-seed-agents.ps1 -ForceMd` | available（dev-sync-playbook §4.7） | 手工复制 + BOM 检查 |

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| `task.py start 07-06-accurate-delegation-convergence` | Bash | in_progress（切换 active task） |
| Spec 上下文 | trellis-before-dev | 已完成（见上） |

## Phase 1–3 — Workstreams

| Phase | Priority | Workstream | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|------|------|-------|-----------------|---------|
| 1 | P0 | **WS-A 委派保真规则**（R1）：忠实转述、不加码、「仅回答以上需求」尾注 | — | `Agent: trellis-implement` | `packages/vertical/com.wanding.trade/agents/wande-orchestrator.md` | 规则落在 L1「委派」节；与 Thinking-switch 规则同级并列 | Fast |
| 1 | P0 | **WS-B 子代理收敛纪律**（R2）：月表自带合计禁二次 total、截断禁原参重发、≤2 次预算覆盖委派场景 | — | 同一 trellis-implement 派发 | `…/agents/accurate-agent.md` | SOP L66-73 扩展 + 反例表（对照 research 实录 #2/#4） | Fast |
| 2 | P1 | **WS-C eval 回归 case**（R3）：默认路由委派收敛断言 | — | trellis-implement（先读现有 case schema） | `eval/agent_eval_cases.jsonl` + `eval/suites/core.json` | 新 case + schema 校验通过（agent-eval-schema.yml CI） | Fast |
| 3 | P1 | **WS-D spec 沉淀**（R5） | — | `Skill: trellis-update-spec` | `.trellis/spec/integration/agents-unified-model.md` | §dispatch 补记根因+规则指针 | Fast |

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| WS-A/B（prompt 文档） | N/A（markdown SOP，无运行时单测面） | 基线 = research 实录：4 次调用/同参重发 | R4 manual smoke：新 Guid 默认会话「1-5月采购额」→ subagent transcript ≤2 次 MCP、0 同参重发、含月表 | 委派链路调用预算 |
| WS-C（eval） | smoke/eval | 修复前跑新 case 应 FAIL（4 次调用超预算） | `node eval/run-agent-eval.mjs --suite core`（或按 eval/README 实际命令） | 委派收敛不回退 |

## Verification gate（§Step 5 单链）

1. `Agent: trellis-check`（主审：AC R1-R5 合规 + 对照 research 实录堵漏核验）
2. eval suite run + **R4 manual smoke**（用户或我跑 deploy-seed-agents 后新会话实测，贴 subagent transcript 调用计数）
3. `Skill: trellis-update-spec`（WS-D 即此步）
4. implement.jsonl / check.jsonl 已就绪；prd AC 打钩
5. git commit（主会话驱动，Phase 3.4）
6. `/trellis:finish-work`

## Progress snapshot (2026-07-06)

- [x] Phase 0 activate（task.py start → in_progress）
- [x] Phase 1 WS-A + WS-B（trellis-implement 完成；证据：`research/delegation-convergence-diagnosis.md` 实录根因 ↔ 新规则逐条对应，trellis-check R1/R2 PASS）
- [x] Phase 2 WS-C（新 case `orchestrator-accurate-purchase-monthly-convergence` 挂 core；`node eval/run-agent-eval.mjs` 74 cases schema ok、`--suite core` 29 selected schema ok；trellis-check R3 PASS）
- [x] Verification gate step 1 trellis-check（R1/R2/R3 全 PASS、零缺陷；编码 UTF-8 无 GBK、越界检查干净）
- [x] Verification gate step 3 trellis-update-spec（WS-D：`agents-unified-model.md` 新增 2026-07-06 块）
- [ ] R4 manual smoke（human：deploy-seed-agents -ForceMd + 新 Guid 默认会话）

## Manual steps (human)

- [ ] `deploy-seed-agents.ps1 -ForceMd` 后**新开** Guid 默认会话问「1-5月采购额」（R4）
- [ ] 可选加测：明确问「前5供应商」→ 允许 fetch，但不得同参重发

## Recovery / re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| smoke 仍 >2 次 MCP | Phase 1（WS-A/B 措辞加固，参照 rationalization-table 手法） | 新 subagent transcript | no（AC 不变） |
| 同措辞两轮仍失败 | systematic-debugging 重开 + 考虑 WS-Defer 运行时守卫 | root-cause 更新进 research/ | yes（引入代码改动） |
| eval case schema 不符 | Phase 2 读 07-09 现有 case 重写 | CI agent-eval-schema 通过 | no |

## Defer / out of scope

- **子代理运行时调用预算守卫**（`wrapCanUseToolForWandeOrchestrator` 对 `context.agentId` 直通处加轻量 identical-args 拦截）：动 CCB source `src/` + `claude-code-b-src/` 两镜像 + 单测，收益需先看 prompt 修复效果——等用户拍板。
- accurate MCP 服务端分页上限 / vendor 分组能力。
