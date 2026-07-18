# Phase 3b done — Layer1 重组稿

| Field | Value |
|-------|--------|
| **Date** | 2026-07-13 |
| **Contract** | `WANd.KB.LAYER1.SCHEMA.001` |
| **CONF decision** | 选项 3：两段排水默认均保留 + `⚠️ 待确认`；**暂不 UI Save** |

## Delivered

| Artifact | Path |
|----------|------|
| 重组稿 | `data/wanding_business_knowledge.restructured.md` |
| 诊断 | `research/kb-architecture-improvement.md` |
| 合同 | `kb-layer1-restructure-contract.md` |
| 审核门禁 | `research/phase3-kb-review-gates.md`（2026-07-14） |

## GREEN checks (draft lint)

- [x] 无顶层「业务规则补充」块
- [x] §7 标题含 **`【字段匹配同义与规格】`**（全角括号；非仅「字段匹配同义」）
- [x] Pre-Save 同源解析 `rules ≥ 10`（修标题后实测）
- [x] 样本测试条目已删除
- [x] CONF-001/002：两段并存 + ⚠️；**暂不 UI Save**
- [x] 完成口径锁定：**slug1 only**；7 slug deferred

## Blocked for UI Save（审核放行条件）

1. CONF-001 / CONF-002 业务确认  
2. Pre-Save Python expansion 再跑一次  
3. UI Save 后填 `smoke-evidence.md`（center / shadow / Guid）  
4. **不**声称五层 8 slug 完成

## Not done

- 未改中心库 / shadow 生产副本  
- 未 PUT org API  
