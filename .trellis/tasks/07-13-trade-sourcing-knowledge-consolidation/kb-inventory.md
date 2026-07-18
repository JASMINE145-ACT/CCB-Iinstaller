# 知识库 inventory — WANd.KB.CANONICAL.001

> **本轮完成口径（2026-07-14 审核）：仅 slug1** `wanding_business_knowledge`。  
> 其余 7 slug = **deferred**，不声称五层整理完成。无 inventory / 无 per-slug diff → **禁止** Big Bang PUT。

## 五层目标（长期；本轮不验收全表）

| 层 | 职责 | 主 slug（初稿） | 本轮 |
|----|------|-----------------|------|
| 1 选型规则 | Agent 必读 SoT | `wanding_business_knowledge` | **in scope** |
| 2 报价话术 | 回复形态；去与层1重复 | `ccb-wanding-quotation` | deferred |
| 3 档位说明 | 列/档位 | `data-md` + 本地 `data.Md` | deferred |
| 4 原理 | 匹配/定价（人读） | `wanding-matching-architecture`, `ccb-wanding-pricing-system` | deferred |
| 5 运维索引 | 索引/更新/账务 | `ccb-wanding-claude-index`, `ccb-wanding-update-server`, `ccb-wanding-accurate` | deferred |

## 每 slug 检查行

| slug | 读者 | 与层 | 重叠段（路径/标题） | 建议：保留/迁/删 | 目标 version | 回滚方式 | 本轮 |
|------|------|------|---------------------|------------------|--------------|----------|------|
| wanding_business_knowledge | agent | 1 | 旧 L172–308 游离 append；CONF-001/002；§7 须含 `【字段匹配…】` | 重组稿 `data/wanding_business_knowledge.restructured.md`；CONF 确认前 **不 UI Save** | TBD after UI Save | `#/org-knowledge` revert | **active** |
| ccb-wanding-quotation | both | 2 | — | — | — | history revert | **deferred** |
| data-md | both | 3 | — | — | — | history revert | **deferred** |
| wanding-matching-architecture | human | 4 | — | — | — | history revert | **deferred** |
| ccb-wanding-pricing-system | human | 4 | — | — | — | history revert | **deferred** |
| ccb-wanding-claude-index | human | 5 | — | — | — | history revert | **deferred** |
| ccb-wanding-update-server | human | 5 | — | — | — | history revert | **deferred** |
| ccb-wanding-accurate | human | 5 | — | — | — | history revert | **deferred** |

## 批次规则

1. 每批 ≤2 slug  
2. PUT 前记录 `expected_version`  
3. PUT 后 GET + shadow 同步 smoke  
4. 失败 → `#/org-knowledge` revert；禁止 force overwrite  
5. **本轮禁止**对 deferred slug 做 PUT
