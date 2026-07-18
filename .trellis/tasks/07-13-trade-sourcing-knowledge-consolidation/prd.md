# PRD — 报价合并名录 + learn-by-data 沉淀 + 知识库整理

## 目标

1. **方案 A（已拍板）**：`quotation-agent` 吸收 supplier MCP；一张「万鼎报价专家」卡；查价默认同轮 `match_quotation` + `suppliers_hybrid_match`；写权限仍分工具。
2. **learn-by-data 沉淀（已拍板）**：仅 Section A 可写入业务知识库；B 严重标记并通知祐嘉诚；C 直接进价格库。
3. **业务知识库**：按业务逻辑重排 8 个 slug，去重、统一模板、精简正文。

## 已锁定决策（2026-07-13）

| 项 | 决定 |
|----|------|
| Agent | 方案 A；supplier 独立 Guid 卡逐步下线或隐藏 |
| 沉淀知识 | **只有 Section A** → `append_business_rule`；**规则 + 原因 + 来源**；Skill 强制校验 |
| Section B | 严重标记表；**提醒/通知祐嘉诚** |
| Section C | 确认后写 **价库 draft**（非 admin 只出表；403/409 不硬写） |
| Section D | **Skill 硬跳过**（禁映射写入；非「维持现状仍跑」） |
| 知识库 | inventory（`kb-inventory.md`）→ 小批 PUT → 可回滚；禁止无 inventory 的 Big Bang |

## 验收

- [ ] execution-plan lint PASS
- [ ] Phase 1–3 按 plan 交付
- [ ] Guid smoke：查价回复含 SKU + 货源
- [ ] learn-by-data smoke：A/B/C 行为与上表一致
