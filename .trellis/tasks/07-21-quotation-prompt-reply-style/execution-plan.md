# Execution Plan — `07-21-quotation-prompt-reply-style`

| Field | Value |
|-------|--------|
| **Status** | **cancelled / deferred** — user 2026-07-21: only want quotation L1 prompt optimize (no Genre B / WorkBuddy this turn) |
| **Active phase** | deferred — use parent `07-19-quotation-agent-prompt` |
| **Parent** | `07-19-quotation-agent-prompt` |
| **Scenario** | **A**（目标清晰）+ 父任务 **E/C** 的 L1 切片 |
| **Plan depth** | **Standard** |
| **Verification profile** | **UI** + Standard contract tests |
| **Risk tags** | `ui` · `migration`(deploy L1) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 bootstrap | Shell: | `task.py current` → 07-21-release-2.0.1；`list in_progress` → 49；packages → agent-eval/backend/frontend/integration；`git status -sb` → ahead 34 dirty |
| trellis-before-dev | Read: | integration index → `agents-unified-model` multi-candidate reply · L1 slim notes |
| skill-selection | Read: | Scenario A；Capability「需求」→ trellis-brainstorm for Genre trigger；TDD → contract tests |
| trellis-brainstorm | Read: | Genre A/B split + open question on B triggers recorded in prd |
| prior art | Read: | `07-19-quotation-agent-prompt/prd.md` · `quotation-agent.md` §回复形态 · WorkBuddy reference image (user) |

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| Spec inject | trellis-before-dev | available | inline |
| Requirements | trellis-brainstorm | available | prd open Q |
| TDD | node --test contract | available | Guid only |
| Review | code-reviewer | available | Layer A/B N/A |
| Deploy | deploy-seed-agents -ForceMd | available | manual copy |

**Plan depth rationale:** Two contracts + L1 + tests + Guid → Standard（非 Full：无并行 D、无发版 J）。

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | bootstrap + Genre split locked in prd |
| Phase 0 | done | this plan + lint |
| Phase 1 | pending | L1 Genre A/B + slim touches |
| Phase 2 | pending | contract tests |
| Phase 3 | pending | deploy + Guid smoke |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.QUOTE.L1.SLIM.001` | L1 可度量变短且不丢决策表/select/batch 锚点 | `quotation-agent.md` | output-contract | 误删锚点 |
| `WANd.QUOTE.RETURN.FULL.001` | Genre A 仍含锁码+单价等可转发最小集 | same + orch | Guid 委派查价 | 父空壳 |
| `WANd.QUOTE.REPLY.GENRE.001`（prov） | Genre A=交付短表；Genre B=结论/根因/拆解/处理/验证 | §回复形态 | contract + Guid 纠偏/append | 每轮长文 |
| `WANd.QUOTE.NO_DIY.001` | 保持禁止 DIY（不因改文风放松） | L1 硬禁令 | existing | DIY 回归 |

### Contract card — `WANd.QUOTE.REPLY.GENRE.001`

**Behavior protected:** Diagnostic / rule-preview turns use WorkBuddy-like structure; price/inventory turns stay compact delivery tables.
**Primary code:** `quotation-agent.md` §回复形态（+ optional GOOD/BAD）
**Tests:** extend `quotation-agent-output-contract.test.mjs`
**Eval / smoke:** Guid「直接50」短表；Guid「解释误匹配 / 追加规则」Genre B
**Risk if broken:** 查价变博客；或诊断仍甩锅 A/B/C

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 1 | P0 | L1 §回复体裁 Genre A/B + GOOD/BAD | `WANd.QUOTE.REPLY.GENRE.001` · `L1.SLIM.001` | ui | implement | `quotation-agent.md` | 分流表 + B 模板 + 不破坏决策表 | Standard |
| 2 | P0 | Contract tests Genre anchors | `REPLY.GENRE.001` · `RETURN.FULL.001` | — | TDD | `quotation-agent-output-contract.test.mjs` | RED→GREEN | Standard |
| 3 | P1 | Optional: trim duplicated §回复形态 vs 选型（slim） | `L1.SLIM.001` | ui | implement | same | 行数↓、锚点保留 | Standard |
| 4 | — | Deploy + Guid | all | migration | deploy-seed | live agents | AC4 | UI |
| 5 | P2 | Spec note multi-candidate + Genre B | docs | — | trellis-update-spec | `agents-unified-model.md` | after verify | Fast |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Genre section | `REPLY.GENRE.001` | missing Genre A/B / 根因骨架 | `node --test ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` | 九列表 / select_wire / inventory batch / learn-by-data asserts still PASS |
| Slim optional | `L1.SLIM.001` | N/A if Phase 3 skipped | same + line-count note in p*-done | 07-11 inventory anchors |

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| `WANd.QUOTE.REPLY.GENRE.001` | Guid 纠偏或 append 预览呈 Genre B；查价仍短表 | View Steps + 截图/转述 | pending |
| `WANd.QUOTE.RETURN.FULL.001` | 查价含锁码+价 | Guid / contract | pending |
| `WANd.QUOTE.L1.SLIM.001` | 决策表+select+batch 锚点在；可选行数记录 | contract | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-21-quotation-prompt-reply-style/execution-plan.md` | PASS | **PASS** |

## Parallel split

None. Do not parallel with matcher rule invent (Elbow/pipe isolation is separate engine work).

## Conditional recovery

| Trigger | Action |
|---------|--------|
| 用户要「每次查价都 WorkBuddy」 | 停；重开审批 — 与 RETURN.FULL / 父转发冲突 |
| Genre B 导致 append 不展示 rule_text | 强化：B 壳内必须含完整 `rule_text` |
| Slim 误删 select/batch | 恢复锚点；重跑 contract |

## Manual steps (UI)

1. `deploy-seed-agents.ps1 -ForceMd` → **新会话**
2. Genre A：`直接50` / 价+库存 → 短表，无「根因」长文
3. Genre B：纠偏或「追加规则：管材查询不得匹配水龙头」→ 结论/根因/拆解/处理/验证
4. Orchestrator 委派查价：父泡仍有锁码+价

## Explicit non-goals

- 自动生成 Rule 5.6.7 进 matcher（除非另开 engine task）
- Accurate / orch 全文风统一
- 发版 2.0.2（本任务只 L1；需要时另开 J）

## Approval gate

说 **「批准，执行」** 前请确认 Genre B 触发范围（prd Open question；默认=推荐窄触发）。
