# Section D — learn-by-data 导入历史报价库（探索）

**Status:** **approved** (2026-07-06) — decisions locked below; implementation awaits **执行 Phase 2.2**

## Skills invoked (this session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `get_context.py --mode packages` → backend/integration layers |
| trellis-task-execution | Read: | Scenario E explore; Phase -1 matrix below |
| quotation-matching-engine | Read: | §4 dual recall — `mapping_table_matcher` = 历史报价 path |
| mapping_table_matcher.py | Read: | Schema A/B/C/D; load order Neon → custom lib → `mapping_table.xlsx` |
| learn-by-data PRD | Read: | `06-30-quotation-learn-by-data-skill/prd.md` — MVP no new MCP (superseded partially by Phase 2 C) |
| hardening doc | Read: | L1–L3 dedup patterns reusable for mapping |

---

## 1. 用户诉求

learn-by-data 复盘结束后，把**本次报价单**的行数据写入**历史报价库**（映射表），让后续 `match_quotation` 的 **历史报价** 召回更准。

与现有输出的关系：

| 现有 Section | 写什么 | 读者 |
|--------------|--------|------|
| A | 业务知识规则 → `append_business_rule` | 选型 SOP / LLM |
| B | 严重标记表 | 人工核查 |
| C | 价格库 metadata → `upsert_price_library_item` | 中心价格库 |
| **D（新）** | 询价关键词 → 人填料号 → **历史映射表** | `match_quotation` 历史报价路 |

---

## 2. 「历史报价库」在代码里是什么

**不是**价格库（price library），**是**询价→料号映射表：

| 层 | 来源 | 读路径 |
|----|------|--------|
| 1 | Neon `product_mapping` | `admin.cache.get_product_mapping_rows()` — **当前 stub 返回空** |
| 2 | 自定义库名含「整理产品」「映射」 | `repository.fetch_all_library_rows` |
| 3 | 本地 seed | `data/mapping_table.xlsx`（`MAPPING_TABLE_PATH`） |

**行模型（与 `mapping_table_matcher.load_mapping_df` 一致）：**

| 列 | 字段 | learn-by-data 来源（VANTSING） |
|----|------|--------------------------------|
| A | 询价货物名称 | col B `inquiry_name` |
| B | 询价规格型号 | col C `inquiry_spec`（可空） |
| C | 产品编号 | col **F** | **`sheet_product_code`（报价单成单料号，Step 1 读取）** |
| D | 报价名称 | col **G** `quote_name`（已填报价单；不依赖 tier 查询） |

匹配时用 `search_text = A + B`，命中后标 `source: 历史报价`（`match_quotation_union`）。

**关键缺口：仓库内无「写映射表」MCP / org API** — 只有读路径 + `invalidate_mapping_cache()`。

---

## 3. Section D 建议行为（产品）

### 3.1 导入哪些行

| 策略 | 说明 | 推荐 |
|------|------|------|
| **D-all** | 所有 `actual_code` 非空行 | 数据最全；重复多 |
| **D-mismatch** | 仅 `agent_pick ≠ actual_code`（含 in-candidates / not-in-candidates） | 省噪音 |
| **D-not-in-candidates** | 仅 Section B 行 | 太窄，漏掉 in-candidates 纠错 |

**建议默认：D-mismatch ∪ D-gap** — 已批准（2026-07-06 修订）。`agent_pick == actual_code` 且映射表已有同关键词+料号 → **跳过**；对齐但映射缺失 → **D-gap 入库**。

### 3.2 写什么料号

**必须用人填 `actual_code`**，不是 Agent 首位候选 — 历史库记录的是**人类成交选择**。

### 3.3 执行时机

在 **Section A/B/C 表出完后**、session 结束前：

1. 汇总候选 mapping 行  
2. Section D 预览表  
3. 用户确认后批量/逐条写入（两阶段 `confirmed`）

不与 Section C 并行 `confirmed=true` — **串行**，避免 draft/revision 交叉。

---

## 4. 边界性

| 风险 | 措施 |
|------|------|
| quotation-agent 再增写能力 | 与 C 类似：工具白名单仅 mapping append；禁止删库/全量覆盖 |
| 写本地 xlsx vs 写 org | **MVP 禁止 agent 直接改 `mapping_table.xlsx` seed**（多机不同步）；需 org 或 pending-import 文件 |
| 与 Section C 混淆 | C=价格库物料档；D=询价关键词映射；SKILL 分表、分工具 |
| 跨客户报价单 | 映射表当前**无 customer_id** — 默认 fleet-wide；客户专属不进历史库（进 `memory/customers.md`） |
| 非 VANTSING | Phase 2 仍 VANTSING-only；LINGWEI 延后 |

---

## 5. 安全性

| 措施 | 说明 |
|------|------|
| 两阶段确认 | 同 `append_business_rule` / Section C |
| Org 会话 + CSRF | **Section D 不要求**（本地 pending）；Section C 仍要 |
| 权限 | **所有 learn-by-data 用户**（SKILL 即可；无 price_admin） |
| 字段 allowlist | 仅 A/B/C/D + 可选 `source_file/sheet/row` 审计列 |
| 禁止 Bash 改 xlsx | SKILL 硬规则 |

---

## 6. 稳定性 — 拒绝重复导入（与 C 对称）

| 层级 | 检查 | 行为 |
|------|------|------|
| **M1** | 本会话已处理同一 `(keywords, actual_code)` | skip |
| **M2** | 映射表已有相同 `norm_text` + `code` | skip（幂等） |
| **M3** | 相同 `source_file+sheet+row` 已存在 | **reject** |
| **M4** | 相同 `norm_text` 不同 `code` | **二次确认覆盖**（已批准） |
| **M5** | `actual_code` 无效 | reject，不进 D |

Python 可复用 Phase 2.1 模式：`find_by_mapping_provenance()` + `check_learn_by_data_mapping_guards()`，读当前 `load_mapping_df` 快照。

写入后：**必须** `invalidate_mapping_cache()`，否则 match 仍用旧缓存。

---

## 7. 实现路线（三选一）

### 路线 1 — MCP + org 中心库（推荐终态，工作量大）

- 新工具 `append_quotation_mapping_item`（`confirmed=false/true`）
- AionCore / Neon `product_mapping` draft+publish（**需调研是否已有 API**）
- 与价格库对称的 revision / 409

**Pros:** 多机一致、可审计  
**Cons:** 后端可能不存在；阻塞 Phase D

### 路线 2 — MCP + pending 文件（推荐 MVP）

- 工具写入 `data/mapping_import_pending.jsonl` 或 xlsx（带 `source_*`、status）
- 运维/脚本 `merge-mapping-import.py` 合并进 `mapping_table.xlsx` 或 Neon
- Agent 只写 pending，不碰 canonical seed

**Pros:** 快、可测、不破坏 seed  
**Cons:** 需人工或定时 merge 才生效

### 路线 3 — SKILL-only 导出（最快，无 MCP）

- Section D 输出 TSV/Excel 片段 + 复制指引
- 用户手动导入整理产品表

**Pros:** 零后端  
**Cons:** 摩擦大，易漏

**探索结论：** 先做 **路线 2**（pending + 预览 + 去重库），并行 **Agent: trellis-research** 摸清 Neon `product_mapping` 写 API → 再升路线 1。

---

## 8. 建议任务拆分（Phase 2.2 — 待批准）

| ID | 工作项 | 依赖 |
|----|--------|------|
| D-R1 | trellis-research：Neon/AionCore mapping 写 API 现状 | — |
| D-01 | Python：`build_learn_by_data_mapping_row` + guards M1–M5 | — |
| D-02 | MCP：`append_quotation_mapping_item` → pending store | D-01 |
| D-03 | SKILL Section D SOP + 与 A/B/C 顺序 | D-02 或 D-03a export-only |
| D-04 | `merge-mapping-import.py` + cache invalidate | D-02 |
| D-05 | pytest + agent-eval forbidden 全量覆盖 | D-02 |
| D-06 | spec：`quotation-matching-engine.md` § mapping write-back | 实现后 |

**Plan depth:** Standard  
**Verification profile:** Standard（pytest + manual learn-by-data smoke + 重跑 match 见历史报价）

---

## 9. 决策点（已锁定 2026-07-06）

| # | 问题 | **决定** |
|---|------|----------|
| 1 | 行范围 | **D-mismatch ∪ D-gap** — `agent_pick ≠ actual_code` **或** 映射表无 `norm_text+code`；已对齐且 M2 命中则跳过 |
| 2 | M4 同词不同码 | **允许覆盖** — `confirmed=false` 预览标明旧码→新码，用户二次确认后写入 |
| 3 | MVP 写路径 | **路线 2** — pending 文件 + `merge-mapping-import.py` |
| 4 | 权限 | **SKILL 面向所有 learn-by-data 用户** — 不要求 `price_admin` / org 写权限；MVP 以 SKILL + 本地 pending 为主 |
| 5 | D 列与其它字段 | **全部来自当前 VANTSING 报价单** — A/B/C/D 见 §2 列映射；可选 `source_file/sheet/row` 审计 |

### ADR — SKILL-first + pending

- **Agent 契约**以 `quotation-learn-by-data` SKILL Section D 为准（全员可用）。
- **不写** canonical `mapping_table.xlsx`；仅 append `mapping_import_pending.jsonl`（经 quotation MCP 小工具或 Python dispatch）。
- Section C（价格库）仍保留 `price_admin` 门控；Section D **独立**，无 admin 门槛。
- Merge 生效：运维/用户运行 `merge-mapping-import.py` → `invalidate_mapping_cache()`。

---

## 10. 与 Phase 2.1 的关系

| Phase 2.1（已做） | Phase 2.2（本探索） |
|-------------------|---------------------|
| Section C → 价格库 | Section D → 历史映射库 |
| L3 来源三元组去重 | M3 同源去重（同一 Excel 行） |
| `price-library` MCP | `quotation` MCP 新工具（或 export-only） |

两者可同次 learn-by-data 跑完，但 **C 与 D 的 confirmed=true 必须分行串行**。
