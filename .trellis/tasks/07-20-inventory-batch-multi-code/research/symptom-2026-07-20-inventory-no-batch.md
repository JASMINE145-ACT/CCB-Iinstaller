# Root cause — multi-code「查库存」用了 3× 单查而非 batch（2026-07-20）

## Symptom

用户在查价回复后贴了 3 个编码并说「查库存」：

| 编码 | 品名 |
|------|------|
| 8020020755 | PVC-U 排水 |
| 8010024812 | JIS AW 给水 |
| 102496 | HDPE |

View Steps：`get_inventory_by_code` × **3**（running 3/3），**无** `get_inventory_by_code_batch`。

## Expected

≥2 个明确编码查库存 → **1×** `mcp__quotation__get_inventory_by_code_batch`（`codes` = 全部编码）。

## Phase 1 — Root cause（systematic-debugging）

### What is NOT broken

- MCP **已注册** `get_inventory_by_code_batch`（`quotation-server/dist/index.js` ListTools）。
- L1 **多品价 + 库存** 路径已要求 batch once（`quotation-agent.md` 决策表 + §多品价 + 库存）。
- Eval `quotation-direct50-tee50-price-stock` 覆盖「同轮价+库存」双品；**不**覆盖「跟进句仅查多码库存」。

### Actual root cause

**L1 决策表缺口 + 路径误匹配：**

| 用户意图行 | L1 唯一路径 | 问题 |
|------------|-------------|------|
| **仅查库存（有编码）** | `get_inventory_by_code`（单数） | **未写**「≥2 码 → `_batch` 一次」 |
| 多品价 + 库存（≥2 行） | `_batch` once | 要求同轮有价+库存；跟进「查库存」不命中此行 |

模型把「查库存」+ 3 码归入「仅查库存（有编码）」→ 对每个码调一次单查。这不是 MCP 缺失，是 **prompt 路由歧义**。

### Contributing factors

1. **无 PostToolUse 挡**：现有 nudge 盯 match/select/hybrid，**不**盯 inventory 单查重复。
2. **跟进句语境**：上一轮已有价表；本轮只有库存意图 → 更容易走「仅查库存」行。
3. **「3/3 tools」UI**：三次同名工具并列，用户正确质疑为何不 batch。

## Fix direction (plan only — not implemented)

1. **L1**：改「仅查库存（有编码）」→ ≥2 码必须 `_batch`；单码才 `get_inventory_by_code`。
2. **轻量 nudge（可选）**：若同轮已出现 ≥2× `get_inventory_by_code` 且无 batch，inject「改用 `_batch`」——或 PreToolUse 不现实；优先 L1 + eval。
3. **Eval**：新 case「跟进多码查库存」硬要求 `get_inventory_by_code_batch`，禁止 ≥2× 单查。

## Contracts

- `WANd.INV.BATCH.MULTI_CODE.001`（provisional）
- Existing multi price+stock: keep `WANd` multi-batch rules in agents-unified-model § Quotation
