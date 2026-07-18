# Phase 3 KB 审核接纳 — 放行条件（2026-07-14）

> 来源：外部/Codex 审核结论（用户粘贴）。本轮结论：**可继续推进草案，不可直接 UI Save**。

## 审核裁定

| 项 | 结论 |
|----|------|
| 方向 | PASS — UI Save / 禁 Agent 写 shadow / CONF 显式保留 |
| 发布就绪 | **FAIL** — 仍是 Internal tool plan / 可执行草案 |
| 本轮完成口径 | **仅 slug1 重组稿**；**不**声称五层 8 slug 完成 |

## 放行条件（硬门禁）

1. **禁止** Save 到中心库，直到 CONF-001 / CONF-002 业务确认。  
2. 确认后再执行 `#/org-knowledge` UI Save。  
3. Save 后必须补齐 `smoke-evidence.md`：center version、shadow `.org-meta.json` version、新 Guid 报价引用结果。  
4. 其余 **7 slug deferred**，不纳入本轮完成口径。  
5. UI Save **前**跑 Python 字段同义解析 smoke（见下）。

## 风险登记（采纳）

| Pri | 风险 | 处置 |
|-----|------|------|
| P0 | CONF 未确认不能发中心库 | Phase 3c **blocked**；重组稿保留 ⚠️ |
| P1 | inventory 仅 slug1 | 7 slug 标 `deferred`；完成口径 = slug1 only |
| P1 | smoke-evidence 无 KB 证据 | Save 后强制填模板（见 `smoke-evidence.md`） |
| P1 | `_apply_knowledge_expansion` 兼容 | 解析器匹配 **`【字段匹配`**（全角括号），非仅「字段匹配同义」；重组稿 §7 标题必须含此标记；Save 前本地解析 smoke |
| P2 | append 归档偏人工 | **deferred** — 后续给 `append_business_rule` 固定 section/template；不挡本轮 |

## Python 兼容实测（2026-07-14）

`wanding_fuzzy_matcher._load_field_matching_rules_from_knowledge` 进入段落条件：

```text
"【字段匹配" in line or "【字段匹配同义" in line
```

| 文件 | 标题形态 | 解析规则数（同类逻辑） |
|------|----------|------------------------|
| 当前 `wanding_business_knowledge.md` §6 | `## 6) 字段匹配同义与规格`（无【】） | **0**（潜伏缺陷） |
| 重组稿初版 §7 | 同，无【】 | **0** |
| 重组稿修补后 | `## 7) 【字段匹配同义与规格】` | **19**（PASS ≥10） |

→ 重组稿必须带 `【字段匹配同义与规格】`；Save 前用本地文件 smoke 验证 `rules > 0`。
