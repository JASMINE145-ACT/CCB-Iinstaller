# Contract — Layer 1 知识库重组 (`WANd.KB.LAYER1.SCHEMA.001`)

| Field | Value |
|-------|--------|
| **Parent** | `WANd.KB.CANONICAL.001` |
| **Slug** | `wanding_business_knowledge` |
| **Status** | provisional / **not publish-ready** until CONF + Python expansion smoke + UI Save evidence |
| **Review** | `research/phase3-kb-review-gates.md`（2026-07-14）|

## Behavior protected

Layer 1 文档对 Agent 呈现 **单一 canonical 章节树**；选型规则、品类默认、交互纪律可引用 § 号；`append_business_rule` 增量不再制造并列「业务规则补充」顶层块。

## Primary artifacts

| Role | Path |
|------|------|
| Shadow SoT (dev) | `data/wanding_business_knowledge.md` |
| Restructure draft | `data/wanding_business_knowledge.restructured.md` |
| Org center | VPS `#/org-knowledge` slug `wanding_business_knowledge` |
| Expansion parser | `python/inventory/services/wanding_fuzzy_matcher.py` → `_load_field_matching_rules_from_knowledge` |

## Section schema (fixed)

§0 元信息 · §1 选型总原则 · §2 强约束 · §3 场景型 · §4 品类默认 · §5 规格单位 · §6 来源边界 · §7 字段同义 · §8 交互陈述纪律 · §9 非选型提醒 · §10 待补料 · 附录 变更日志

## Python expansion hard requirement

标题行 **必须** 含子串 `【字段匹配`（推荐完整：`【字段匹配同义与规格】`）。

```text
GREEN (pre-Save, against restructured file):
  rules = parse with same loop as _load_field_matching_rules_from_knowledge
  assert len(rules) >= 10
```

仅含「字段匹配同义」而无全角【】 → **RED**（实测当前 live md 亦为 0 规则，属潜伏缺陷；重组稿必须修复）。

## Write path

| Operation | Path |
|-----------|------|
| Full restructure | AionUI `#/org-knowledge` PUT（`expected_version`）— **仅 CONF 确认后** |
| Incremental rule | MCP `append_business_rule` → 附录变更日志（P2：后续固定 template） |
| Forbidden | SSH batch PUT；Agent Write shadow；CONF 未解时发中心库 |

## Verification (post-Save)

1. `smoke-evidence.md` 记录 center version + shadow `.org-meta.json` version  
2. 新 Guid 多候选报价：§8 引用原文片段  
3. Python expansion：live path `rules > 0`  
4. 完成口径：**slug1 only**；7 slug deferred
