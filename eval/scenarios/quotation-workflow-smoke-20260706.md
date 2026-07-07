# Scenario: Quotation agent workflow smoke (Guid 万鼎报价专家)

> **Scenario ID:** `quotation-workflow-smoke-20260706`  
> **Task:** [`.trellis/tasks/07-09-agent-eval-regression-suite/`](../../.trellis/tasks/07-09-agent-eval-regression-suite/)  
> **Suite:** `eval/suites/quotation-smoke.json`  
> **Agent profile:** `quotation-agent` (Guid 报价助手)

---

## 1. 用户要求的 6 条流程 ↔ eval 映射

| # | 用户流程 | 自动化 case | 模式 | 备注 |
|---|----------|-------------|------|------|
| 1 | 查询直接50 | `quote-direct50-post-hook-golden` | 单轮 | match + Read KB + 推荐 SKU |
| 2 | 进而查库存 | `quote-smoke-direct50-then-inventory` | **多轮** | turn1 查价 → turn2 已选8020020755查库存 |
| 3 | 填写报价单 | `quote-smoke-fill-direct50-draft` | 单轮 | fill_quotation_sheet |
| 4 | 自动化：三通50 + 库存 + 填单 | `quote-smoke-tee50-inventory-fill` | **多轮** | 3 turns；`pass_if_any` 允许部分链 |
| 5 | learn-by-data skill 可用 | `quote-smoke-learn-by-data-vantsing` | 单轮 | **VANTSING** fixture；LingWei 复盘见 §3 |
| 6 | 批量查询（LingWei xlsx） | `quote-smoke-lingwei-batch-query` | 单轮 | `data/smoke/lingwei-6.8-quotation.xlsx` |

---

## 2. 运行命令

```powershell
# Schema
node eval/run-agent-eval.mjs --suite quotation-smoke

# Live（~25-35 min，需 MCP + API + fixture xlsx 可读）
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite quotation-smoke -Run -InstallDir D:\CCB-Wanding -Json

# 单条调试
node eval/run-agent-eval.mjs --run --case quote-smoke-direct50-then-inventory
```

**Fixture 覆盖（可选）：**

```powershell
$env:CCB_EVAL_FIXTURE_LINGWEI = 'C:\...\LingWei6.8报价单.xlsx'
$env:CCB_EVAL_FIXTURE_VANTSING = 'D:\path\to\vantsing-filled.xlsx'
```

---

## 3. LingWei vs VANTSING（learn-by-data）

| 文件 | 用途 | learn-by-data MVP |
|------|------|-------------------|
| `data/smoke/lingwei-6.8-quotation.xlsx` | 批量询价 smoke (#6) | ❌ SKILL 写明 LingWei = Phase 2 |
| `data/smoke/learn-by-data-vantsing-filled.xlsx` | learn-by-data smoke (#5) | ✅ VANTSING 固定列 |

用户提供的 WeDrive 原文件已复制进 repo 作为 **#6 批量** golden；**#5 复盘**仍用 VANTSING filled fixture，直到 SKILL 支持 LingWei。

---

## 4. 人工 judge（eval 不自动判）

- 直接50 推荐是否为 8020020755（B 1219）+ KB §5.1/5.2
- 三通50 是否推荐 8020022784（非 coupling）
- learn-by-data 每批对比表 + Section A/B 结构
- LingWei 批量是否走完 `remaining_keywords`、无静默丢行

---

## 5. 与 routing smoke 关系

| Suite | Cases | 何时跑 |
|-------|-------|--------|
| **smoke** | **15** | 发版/打包（路由 9 + 报价 6，一条命令） |
| **quotation-smoke** | 6 | 可选：报价修复后局部重跑 |
| **core** | 27 | extends smoke + 加深 |

**发版：** `-Suite smoke -Run` 即可，无需跑两次。
