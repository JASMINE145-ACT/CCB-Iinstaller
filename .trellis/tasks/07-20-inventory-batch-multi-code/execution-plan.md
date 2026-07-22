# Execution Plan — `07-20-inventory-batch-multi-code`

| Field | Value |
|-------|--------|
| **Status** | **completed** — Guid smoke 1× `_batch` PASS 2026-07-20 |
| **Active phase** | closeout |
| **Parent** | `07-19-quotation-agent-prompt` |
| **Risk tags** | `ui` · `migration`(deploy L1) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 bootstrap | Shell: | `task.py current` → 07-20-accurate（completed）；`list in_progress` → 49；`get_context packages` → agent-eval/backend/frontend/integration；`git status -sb` → main ahead 34, dirty |
| trellis-before-dev | Read: | `.trellis/spec/integration/index.md` → agents-unified-model / quotation MCP surface |
| systematic-debugging | Read: | Iron law Phase 1 → root cause in `research/symptom-2026-07-20-inventory-no-batch.md` |
| skill-selection | Read: | Scenario C → diagnose first；Lite depth（单 L1 + eval） |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec inject | trellis-before-dev (Read) | available | inline |
| Debug | superpowers:systematic-debugging (Read) | available | inline |
| TDD | pytest / agent-eval | available | Guid smoke only |
| Review | Agent: code-reviewer | available | Layer A N/A unless picker |
| Deploy | deploy-seed-agents -ForceMd | available | manual copy |

**Plan depth rationale:** 单契约、单文件主改（L1）+ 可选 eval → **Lite**。

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix + root-cause research |
| Phase 0 | done | autopsy: L1「仅查库存」缺 multi-code batch |
| Phase 1 | done | L1 + section WANd.INV.BATCH.MULTI_CODE.001；packages↔staging sync |
| Phase 2 | done | draft eval `quotation-multi-code-inventory-only.json`（soft batch；normalizer 限制） |
| Phase 3 | skipped | PostToolUse nudge（L1 优先） |
| Phase 4 | **PASS** | Guid：1× `get_inventory_by_code_batch`；三码表完整；无 N× 单查 |

## Contract map (lite)

- **touches:** `WANd.INV.BATCH.MULTI_CODE.001`
- **Behavior protected:** ≥2 明确编码查库存 → 1× `get_inventory_by_code_batch`；禁止无降级的 N× `get_inventory_by_code`
- **GREEN:** Guid smoke「查库存」+ 2–3 码 → View Steps 仅 1× `_batch`；可选 eval case hard tool_presence
- **Manual smoke:** Orchestrator → 贴码表 +「查库存」

## Why not batch today（答用户）

不是 batch 坏了，也不是工具没挂上。

1. **Batch MCP 存在**：`get_inventory_by_code_batch` 在 quotation ListTools 里。
2. **L1 多品「价+库存」已要求 batch**——但你这次是查价之后的**纯「查库存」跟进**。
3. **决策表「仅查库存（有编码）」只写了单查** → 模型对 3 个码各调一次 `get_inventory_by_code`，符合当前字面，违反少轮次意图。

## Workstreams（post-approval）

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 1 | P0 | L1 决策表：仅查库存分 1 / ≥2 码 | WANd.INV.BATCH.MULTI_CODE.001 | ui | trellis-implement | `quotation-agent.md` packages+staging | 决策表行更新 | Standard |
| 2 | P1 | Eval：multi-code inventory-only | WANd.INV.BATCH.MULTI_CODE.001 | — | agent-eval | `.agent-eval/cases/…` | hard require `_batch`；forbid ≥2× single | Standard |
| 3 | P2 | （可选）PostToolUse：同轮 ≥2 单查 nudge batch | WANd.INV.BATCH.MULTI_CODE.001 | migration | inline | `post-*-inventory-batch-nudge.py` | 仅当 L1 仍不够 | Fast |
| 4 | — | Deploy + Guid smoke | — | migration | deploy-seed | live agents | AC2 | UI |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| L1 + eval | WANd.INV.BATCH.MULTI_CODE.001 | 现状：3× 单查 smoke；eval 无 inventory-only multi-code case | new/locked eval trial PASS 或 Guid View Steps = 1× batch | seed sync + existing price-stock cases 不破 |

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| WANd.INV.BATCH.MULTI_CODE.001 | Guid「≥2 码查库存」 | 1× `_batch` | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-20-inventory-batch-multi-code/execution-plan.md` | PASS | pending |

## Explicit non-goals

- 不改 Accurate / ROE
- 不强制「价+库存」同轮路径改变（已有 batch 规则）
- 默认不做 Stop block，优先 L1 + eval

## Approval gate

说 **「批准，执行」** 后再改 `quotation-agent.md` / eval。
