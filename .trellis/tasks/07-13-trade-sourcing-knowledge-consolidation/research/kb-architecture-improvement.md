# 知识库架构改进 — `wanding_business_knowledge` 诊断与重组方案

> **Planning artifact** for Phase 3 (`WANd.KB.CANONICAL.001`).  
> Source shadow: `data/wanding_business_knowledge.md` (309 lines, 2026-07-13).  
> **Delivery path (locked):** AI 润色 → 用户在 AionUI `#/org-knowledge` 粘贴 Save → shadow 同步；**不做** VPS SSH 批量 PUT。

---

## 1. 现状摘要

| 维度 | 观察 |
|------|------|
| **结构** | 前半 §1–§9 为人工维护骨架；§172 起为 `append_business_rule` 多次追加的「业务规则补充」块，标题层级混乱 |
| **行数** | 309 行；其中 ~130 行为追加块 + 重复元数据 |
| **读者** | `quotation-agent` 按需 Read；Python `_apply_knowledge_expansion` 只解析 §6 同义词段 |
| **写入路径** | 增量 → MCP `append_business_rule`；全文重组 → `#/org-knowledge` UI（org-knowledge.md §Agent write path） |

---

## 2. 架构问题（按严重度）

### P0 — 规则冲突（须业务确认后再合并）

| ID | 位置 A | 位置 B | 冲突 |
|----|--------|--------|------|
| **CONF-001** | §5.1–5.2：PVC 直管/未说明用途 → **D 排水系列**（白色） | 「排水管件默认系列判断」：默认 **A 系列**国标 dn40–dn160（802001xxxx / 8020020xxx） | 同一「排水」语境下 D vs A 默认相反；可能区分「直管 vs 管件」但未在文中声明边界 |
| **CONF-002** | §5.2：数字口径 50/110/150 未写 | 追加块：150 → **dn160**（国标） | 与「dn150」直觉不一致；需确认是否为团队口径 |

**处置（已拍板 2026-07-13）：** 选项 3 — 重组稿两段均保留 + `⚠️ 待确认`；**业务确认前禁止 UI Save**。见 `data/wanding_business_knowledge.restructured.md` §4.1–4.2 vs §4.6。

### P1 — 结构 / 可维护性

| ID | 问题 | 影响 |
|----|------|------|
| **STR-001** | 6+ 个并列 `## 业务规则补充`，嵌套 `##`/`###` 不一致 | Agent 引用 § 号困难；与 §9 交互规则分散 |
| **STR-002** | 「Agent 引用与陈述纪律」整段重复出现在追加块内（L248–279） | 与 §1 选型原则、§9 交互规则三角重复 |
| **STR-003** | §7「待处理业务提醒」含 matcher.js 技术债 | 非选型语义；污染 Agent Read 上下文 |
| **STR-004** | 「测试用例」样本条目（L286–290） | 应删除，不应进生产中心库 |
| **STR-005** | 多条规则重复「来源：报价专家会话确认」两行 | append 模板未统一；与 `WANd.LEARN.PRECIPITATE.001` 三要素不一致 |

### P2 — 五层边界

| 内容 | 当前位置 | 目标层 |
|------|----------|--------|
| MCP 调用、表格模板 | 已正确指向 `ccb-wanding-quotation` | 层 2 ✓ |
| matcher.js / products.json | §7 | 层 4 `wanding-matching-architecture` 或 task backlog |
| 库存字段 `qty_warehouse` | 追加块 | 层 2 报价分册或层 1 单行 operational note |
| 镀锌穿线盒 / 源泉钢管 | 追加块 | 层 1 § 场景型 / 供应商分流（保留，待补料号） |

---

## 3. 目标架构 — Layer 1  canonical schema（`WANd.KB.LAYER1.SCHEMA.001`）

重组后 **仅保留一层编号**，append 块全部「升格」进固定章节，禁止再新增顶层 `## 业务规则补充`。

```text
§0  元信息（加载边界、与 quotation 分册分工）          — 保留现有 L1–16
§1  选型总原则（四层决策 + 来源 tie-breaker）         — 保留 L22–40
§2  强约束（弯头角度、主径×副径）                   — 保留 L44–58
§3  场景型业务规则（三角阀、软管、电工套管…）         — 保留 L62–74
§4  品类默认                                        — 合并原 §5.1–5.5 + 追加 PVC/PPR/PE/三通/conduit
§5  规格与单位                                      — 原 §5.6
§6  来源优先级边界                                  — 原 §5.7
§7  字段匹配同义（引擎可读）                         — 原 §6；标题改为固定「§7」供 Python 解析
§8  交互与陈述纪律（语言 + 追问 + 引用原文）         — 合并原 §8、§9、Agent 引用纪律
§9  非选型提醒（Agent 可忽略）                      — matcher 技术债迁出或单行索引
§10 待补料 / 开放项                                 — 镀锌穿线盒等；resolved 后删除或降级
附录 变更日志（可选表格：日期 | 规则摘要 | 来源 | 确认人）
```

**Python 兼容：** `_apply_knowledge_expansion` 解析标题含「字段匹配同义」— 重组时 **保留该短语** 或同步改 `python/` 解析（Phase 3b 单独一行 workstream，touch `WANd.BACKEND.KB_EXPAND.001` 若改标题）。

---

## 4. 内容迁移映射（wanding_business_knowledge 单 slug）

| 原块（约行） | 目标 § | 动作 |
|--------------|--------|------|
| §1–§6 骨架 | §1–§7 | 保留，微调标题 |
| §5 用户纠正 | §4 品类默认 | 合并 |
| §8–§9 | §8 交互纪律 | 合并 |
| 排水管件 A 系列 (L172–193) | §4.6 PVC 排水管件 | **CONF-001 确认后**写入 |
| PVC 胶水 ISARPLAS (L195–200) | §4.7 辅材默认 | 保留 |
| D 排水三通 DT vs 斜三通 (L202–224) | §4.8 排水三通 | 保留 |
| PVC conduit 配套 (L226–240) | §4.9 电工套管体系 | 与 §3 电工套管交叉引用 |
| Elbow drat (L242–246) | §7 同义 + §3 场景 | 同义词入 §7，场景一句入 §3 |
| Agent 引用纪律 (L248–279) | §8 | 去重 |
| qty_warehouse (L281–284) | 层 2 或 §9 单行 | 迁出或极简 |
| 样本测试 (L286–290) | — | **删除** |
| 镀锌穿线盒 (L292–308) | §10 待补料 | 保留 |

---

## 5. 与 learn-by-data 的衔接

| 机制 | 重组后行为 |
|------|------------|
| **Section A append** | 仍追加到文末 **附录变更日志** 或指定 §4 子节；Skill 强制「规则 + 原因 + 来源」 |
| **全文重组** | 一次性 UI Save；之后增量仍走 append，**季度**或冲突时再人工合并进 §4–§8 |
| **禁止** | Agent Edit shadow md；无 inventory 的 Big Bang PUT |

---

## 6. 交付物清单（Phase 3）

| # | 产出 | 负责人 |
|---|------|--------|
| 1 | 本诊断 + 冲突表 | trellis-research（done） |
| 2 | `data/wanding_business_knowledge.restructured.md` 润色稿 | trellis-implement（用户批准后） |
| 3 | `kb-inventory.md` 填完 slug1 行 + 重叠段 | 同上 |
| 4 | 用户在 `#/org-knowledge` Save + 记录 version | **用户** |
| 5 | shadow GET + Agent Read smoke | 用户 / smoke.md §KB |
| 6 | CONF-001/002 业务确认 | **祐嘉诚 / 老杨** |

---

## 7. 验收标准（KB.CANONICAL.001）

1. 中心库 GET `wanding_business_knowledge` 与 inventory「目标结构」一致  
2. 本地 shadow `.org-meta.json` version 与中心一致  
3. 无「业务规则补充」游离块；无测试样本条目  
4. quotation-agent 多候选场景可引用 §8 引用纪律（人工抽 1 条 smoke）  
5. CONF-001 要么已确认写入，要么保留显式待确认标记（不得 silent merge）
