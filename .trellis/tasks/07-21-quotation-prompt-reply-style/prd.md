# PRD — Quotation L1 优化 + 结构化回复风格

| Field | Value |
|-------|--------|
| **Task** | `07-21-quotation-prompt-reply-style` |
| **Parent** | `07-19-quotation-agent-prompt`（轻量化 + 全量转发仍有效） |
| **Priority** | P1 |
| **Status** | planning |

## Two goals (user 2026-07-21)

| Goal | Intent |
|------|--------|
| **G1** | 继续优化 `quotation-agent` prompt（L1 瘦身、决策清晰、不丢合同） |
| **G2** | 优化 **agent 输出风格**：参考 WorkBuddy 式「结论 → 根因 → 案例拆解 → 修复/规则 → 验证」结构化正文 |

## Critical product split（推荐，待你批准）

参考图是 **诊断/修复叙事**（管材 vs 水龙头误匹配 → 写规则），**不是**日常查价交付形态。

| 场景 Genre | 用户在干什么 | 推荐正文形态 |
|------------|--------------|--------------|
| **A · 交付** | 查价 / 价+库存 / 出单 | 保持现有：**1 推荐 + ≤4 bullet** + 固定结果表；短、可转发 |
| **B · 诊断** | 纠偏、解释为何错、追加业务规则、learn-by-data mismatch 说明 | **WorkBuddy 式结构**（见下） |

**禁止**：把每次「直接50」查价都写成「根因/修复」长文 — 会与 `WANd.QUOTE.RETURN.FULL.001` 冲突，父转发也变重。

### Genre B 模板（对齐参考图）

```text
**结论**（一行：已处理 / 需确认 / 已生成规则预览）

**根因**（一行）

**查询拆解**（对本轮 keywords / 候选）
- token/语义要点（可 inline `code`）
- 为何旧结果错 / 为何选中新码

**处理**（编号：规则编号或动作）
1. …
2. …

**验证**（一行：再查同一关键词应如何）
```

落库时：`append_business_rule` 的 `rule_text` 仍须自含规则+原因；Genre B 是 **对用户可见的叙述壳**，不替代 MCP 契约。

## Goal 1 — L1 优化（承接父任务，本 child 执行切片）

继承 `07-19`：`WANd.QUOTE.L1.SLIM.001` · `RETURN.FULL.001` · `NO_DIY.001` · orch relay。

本 child **P0 可落地切片**：

1. L1 增加 **§回复体裁（Genre A/B）** 短表 + GOOD/BAD 各 1 例（B 例 = WorkBuddy 骨架）
2. 不删决策表/select-first/inventory batch 锚点；细则仍可迁 maint
3. `quotation-agent-output-contract.test.mjs` 锚定 Genre 分流 + 不破坏九列表格契约

父任务未做完的大减 hook / orch 转发可仍挂父 plan；本 child 不强制一次做完所有 H1–H4。

## Acceptance

| ID | Criterion |
|----|-----------|
| AC1 | L1 有 Genre A vs B 分流（可见、可测字符串） |
| AC2 | Genre A：price/inventory contract tests 仍 PASS |
| AC3 | Genre B：契约测试要求诊断类回复含「根因」+「处理/修复」骨架关键词（或等价标题） |
| AC4 | Guid：日常查价仍短表；一次「解释为何匹配错/追加规则」呈现 WorkBuddy 式结构 |
| AC5 | deploy-seed `-ForceMd` 后新会话生效 |

## Out of scope

- 改 matcher 内核 / 自动写 Rule 5.6.7（那是价库算法；本任务只规范 **怎么说**）
- 把 orch / accurate 全面改成同一文风（可后续）
- 参考图里的「v36.89c」版本号体系（无）

## Open question（批准前请你定 1 句）

Genre B 触发范围：

- **推荐：** 仅 `append_business_rule` 预览、用户纠偏/「为什么选错」、learn-by-data Section A 说明  
- **或：** 凡 `unable_to_select` / 0 候选 / Section B 也用 Genre B  

默认按 **推荐** 写入 plan；你若要扩大触发再说。
