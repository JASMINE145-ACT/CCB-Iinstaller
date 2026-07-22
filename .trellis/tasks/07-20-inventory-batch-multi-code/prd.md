# 多编码「查库存」必须用 inventory batch

## Goal

用户给出 **≥2 个明确物料编码** 并要求查库存时，`quotation-agent` **只调用 1 次** `mcp__quotation__get_inventory_by_code_batch`，禁止对同一意图连打多次 `get_inventory_by_code`（除非 batch 失败后按 L1 降级）。

## User-visible symptom（2026-07-20）

查价后跟进「查库存」+ 三码（8020020755 / 8010024812 / 102496）→ View Steps 显示 **3×** `get_inventory_by_code`，无 `_batch`。

## Root cause（已证）

见 `research/symptom-2026-07-20-inventory-no-batch.md`：

- MCP batch **存在且可用**。
- L1「**仅查库存（有编码）**」只写单查，未要求多码 batch → 模型合法地走了三次单查。
- 「多品价 + 库存」的 batch 硬规则 **不覆盖**「纯库存跟进句」。

## Requirements

| # | Contract | Behavior |
|---|----------|----------|
| R1 | `WANd.INV.BATCH.MULTI_CODE.001` | ≥2 明确编码查库存 → 1× `get_inventory_by_code_batch`；`codes` 覆盖全部用户编码 |
| R2 | `WANd.AGENT.SEED.SYNC.001` | packages ↔ staging `quotation-agent.md` 同步 |
| R3 | Eval / grader | 新或扩展 case：硬要求 batch；禁止 ≥2× 单查（batch 失败降级除外） |

## Out of Scope

- Accurate / ROE / hybrid 名录（已有 sibling）
- 改 inventory MCP 服务端算法
- 单编码查库存（继续单工具）

## Acceptance Criteria

- [ ] AC1: L1 决策表「仅查库存（有编码）」区分 1 码 vs ≥2 码
- [ ] AC2: Guid smoke：贴 ≥2 码 +「查库存」→ View Steps **1×** `_batch`，0× 多余单查
- [ ] AC3: eval 或 pytest 锁定 batch 义务
- [ ] AC4: 无批准前不改 L1

## Parent / sibling

- Parent: `07-19-quotation-agent-prompt`
- Sibling: `07-20-accurate-agent-readonly-convergence`（completed）
