# CCB-Wanding Quotation Rules

> **加载要求（2026-06-28 瘦身）**：本文件是**维护源 + 参考文档**（完整 §价格口径映射、历史细节）。运行时 L1 已精简为 `agents/quotation-agent.md`（决策表 + 触发器 + 硬禁止）；agent **不要**每轮 Read 全文，非 A–E 常见映射时 **Read §价格口径映射**。改 L1 后 `deploy-seed-agents.ps1 -ForceMd`；改本文件后 sync 到 `vendor/wanding/data/`。
>
> **与 `wanding_business_knowledge.md` 的分工**：
> - **L1 `quotation-agent.md`**：工具决策表、按需 Read 触发、出单默认值、ROE、多候选回复形态。
> - **本文件**：完整价格口径映射表、Path 参考、回复表格模板。
> - **业务知识库**：多候选怎么选、品类默认、纠偏、§9 澄清场景。

## 报价匹配入口

查价格、询价、报价、选型：
- 单品使用 `mcp__quotation__match_quotation`。
- 多品使用 `mcp__quotation__match_quotation_batch`。
- 默认客户等级为 `B`，除非用户明确指定 A/B/C/D/E。
- 用户用客户名、原表字段或价格口径描述价格时，先按“价格口径映射”转换 `customer_level`，不要把这些词混进 `keywords`。
- **直接调用**下列 MCP 工具（参数 JSON 即 tool input）；**禁止**用 `ExecuteExtraTool` 包装（Wanding ACP 为 `ENABLE_SEARCH_EXTRA_TOOLS=false`，间接调用会失败）。
- **文件产出**：用户未给绝对路径时，报价单等输出写入当前会话工作区（侧边栏「临时空间」）；禁止默认 Desktop。

## 价格口径映射

用户可能只知道原始价格表里的字段名、客户简称或口头叫法。调用报价工具前，必须把这些说法映射到 `customer_level`：

| 用户说法 / 原表字段 | 工具 `customer_level` | 标准价格字段 | 说明 |
|------|------|------|------|
| `INCLUDE TAX 出厂价_含税`、`出厂价含税`、`含税出厂价` | `出厂价_含税` | `factory_inc_tax` | 出厂含税价 |
| `EXCLUDE TAX 出厂价_不含税`、`出厂价不含税`、`不含税出厂价` | `出厂价_不含税` | `factory_exc_tax` | 出厂不含税价 |
| `PURCHASE PRICE`、`采购价`、`采购不含税` | `采购不含税` | `purchase_exc_tax` | 采购不含税价 |
| `二级代理`、`A级别`、`A档`、`A价格` | `A` | `price_a` | LESSO A 档报单价格 |
| `一级代理`、`B级别`、`B档`、`默认价格`、`GENERAL PRICE`、`其他客户价` | `B` | `price_b` | 默认报价档；国标管件“其他”也走 B |
| `聚万大客户`、`聚万价格`、`C级别`、`C档` | `C` | `price_c` | C 档报单价格 |
| `青山`、`青山价格`、`青山大客户`、`D级别`、`D档`、`MR KONG PRICE`、`孔总价格` | `D` | `price_d` | 青山 / D 档；CEILING 的孔总价也归到 D |
| `青山降低`、`D低`、`D低利润`、`D_low` | `D_low` | `price_d_low` | 青山降低利润率对应价格 |
| `大唐`、`大唐价格`、`大唐大客户`、`E级别`、`E档` | `E` | `price_e` | E 档 / 大唐价 |
| `LOCAL`、`LOCAL不含税`、`LOCAL EXC TAX`、`本地价` | `LOCAL` / `LOCAL_EXC_TAX` | `local_exc_tax` | LESSO管材专属 |
| `LOCAL含税`、`LOCAL INC TAX`、`本地含税价` | `LOCAL_INC_TAX` | `local_inc_tax` | LESSO管材专属 |
| `RUCIKA目录价不含税`、`RUCIKA pricelist exc` | `RUCIKA_PRICELIST_EXC` | `rucika_pricelist_exc_vat11` | RUCIKA 目录价 |
| `RUCIKA目录价含税`、`RUCIKA pricelist inc` | `RUCIKA_PRICELIST_INC` | `rucika_pricelist_inc_vat11` | RUCIKA 目录价 |
| `RUCIKA报单1`、`RUCIKA第一组价` | `RUCIKA_QUOTE_1` | `rucika_quote_price_1` | 等同 RUCIKA `price_b` |
| `RUCIKA报单2`、`RUCIKA第二组价` | `RUCIKA_QUOTE_2` | `rucika_quote_price_2` | 等同 RUCIKA `price_d` |
| `PE面价`、`PE nominal` | `PE_NOMINAL` | `pe_nominal_price` | PE PIPA 面价 |
| `PE出厂价`、`PE factory` | `PE_FACTORY` | `pe_factory_price` | PE PIPA 出厂价（通常同 B） |

示例（工具 `mcp__quotation__match_quotation`）：

```json
{
  "keywords": "直接50",
  "customer_level": "D",
  "show_candidates": false
}
```

上例对应用户说“直接50，青山价格”。`keywords` 只保留产品描述，`青山价格` 只用于确定 `customer_level`。

## 报价匹配规则

报价匹配与选型**必须**结合业务知识库。调用顺序：

1. **先** `match_quotation`（常规短询价不要在查价前 Read 知识库）。
2. **若返回多候选**：**再** Read `wanding_business_knowledge.md`（路径见 `selection_context.knowledge_source`），选出 1 条推荐后回复。
3. **若返回单候选**：直接报价，无需 Read。

**以下情况必须 Read 知识库后再给最终答案**（通常发生在 match 之后）：

- 工具返回多个候选且需推荐/选型
- 需要 `show_candidates=true`
- 候选之间来源不同（历史报价 vs 字段匹配）且需判断孰优
- 用户纠正过选型，或会话中已有可复用的业务默认
- 用户明确「阅读知识库帮我选」

```text
data/wanding_business_knowledge.md
```

不要凭记忆或 index 摘要代替全文；index 不承载选型细节。

优先级：
1. 用户在当前会话中的明确指令。
2. `wanding_business_knowledge.md` 中的万鼎业务规则。
3. 本文件中的通用工作流程。
4. 模型通用经验。

如果工具返回的候选与业务知识库冲突，以业务知识库为准；如果仍无法确定，必须向用户澄清。

单品报价（工具 `mcp__quotation__match_quotation`）：

```json
{
  "keywords": "直接50",
  "customer_level": "B",
  "show_candidates": false
}
```

多品报价（工具 `mcp__quotation__match_quotation_batch`）：

```json
{
  "keywords_list": ["直接50", "三通50"],
  "customer_level": "B",
  "show_candidates": false
}
```

要求：
- `keywords` 必须使用用户原始产品描述，不要擅自扩写成另一个品类。
- `keywords_list` 必须是数组。
- 用户明确要求看候选项时，才把 `show_candidates` 设为 `true`。
- MCP 默认每条最多返回 **7** 个候选；用户不满意某一条时，对该品名单独再调 `match_quotation` 且 `show_candidates: true`（最多 15 个）。
- **`match_quotation_batch` 每批最多 10 个** `keywords_list`（项目设定上限）；超出时必须按下方**强制续批**处理，或整单走 `fill_quotation_sheet`。
- 多候选选型前 Read `wanding_business_knowledge.md`（见 `selection_context.knowledge_source`）；工具结果不再内联全文知识库。
- 报价结果冲突时，按 `wanding_business_knowledge.md` 的选型总原则处理；来源权重只做 tie-breaker。

### match 返回字段（selection payload）

| 字段 | 含义 |
|------|------|
| `candidate_count` | 匹配器命中总数 |
| `candidates_returned` | 本次 JSON 附带的候选条数（默认 ≤7） |
| `candidates_truncated` | 为 `true` 时表示还有更多候选未返回 |
| `candidates` | 候选列表（`code` / `matched_name` / `unit_price` / `source`） |
| `selection_context.knowledge_source` | 业务知识库文件路径 — **按需 Read**，不在工具 JSON 内联全文 |

**batch 顶层**：`{ batch_limit, items_requested, items_processed, items_truncated, results[], remaining_keywords? }`（每批 ≤10 行，**故意截断**）。

### 多品行数上限与强制续批（硬规则）

- `items_truncated: true` → **立即**再调 `match_quotation_batch`，`keywords_list` = 上次返回的 `remaining_keywords`（不要用 `remaining_keywords` 作入参名）。
- 循环直到 `items_truncated: false` 且行数与用户清单一致；**禁止**只报前 10 条却假装完整。
- 并行 `match_quotation`：>10 行时分轮继续，每轮 ≤10，规则同上。
- 全部查价选型后再 **一次** `get_inventory_by_code_batch`（多品价+库存时）。

## 工具次数 / 延迟（硬规则 — 少轮次优先）

每多调用 1 个 MCP 工具 ≈ 多等一整轮模型推理。**禁止**为同一产品重复查价或重复搜库存。

| 用户意图 | 唯一允许的工具路径 | 禁止 |
|----------|------------------|------|
| **仅查价 / 询价 / 报价**（未提库存、有没有货） | **只** `mcp__quotation__match_quotation`（或 batch） | `search_inventory`、`get_inventory_by_code` |
| **单品同时要价格 + 库存** | `mcp__quotation__match_quotation` → 选型 → **`mcp__quotation__get_inventory_by_code`**（两步，同轮） | `match_price_and_get_inventory`（**MCP 未注册**）；`search_inventory` |
| **多品同时要价格 + 库存**（清单/截图/表格 ≥2 行） | `mcp__quotation__match_quotation_batch`（≤10/批，`remaining_keywords` 续批）→ 每行选型 → **`mcp__quotation__get_inventory_by_code_batch` 一次** | 对每行单独 `get_inventory_by_code`；调用不存在的 MCP 工具 |
| **仅查库存**（给了物料编码） | `get_inventory_by_code` | 除非只有描述无编码，否则不要 `match_quotation` |
| **仅查库存**（只有中文描述、未问价） | `search_inventory` **或** `match_quotation` → `get_inventory_by_code` | 不要 `search_inventory` 后再 `get_inventory_by_code` 重复搜 |

`keywords` 必须与用户原话一致，不要擅自改成变体写法。

## 库存查询规则

查库存、有没有货、库存数量：
- 如果用户给出明确物料编码，直接用编码查库存。
- **单品**同时要价+库存：`match_quotation` → 选型 → `get_inventory_by_code`（两步，同轮）。
- **多品**同时要价+库存：用 `match_quotation_batch` 查价选型后，**一次** `get_inventory_by_code_batch` 补库存。
- **不要**在已有 `match_quotation` / batch 结果后再调 `search_inventory`（重复搜索，浪费一轮）。
- 不要凭报价库或历史知识推断库存，库存必须来自实时库存工具。

按编码查库存（工具 `mcp__quotation__get_inventory_by_code`）：

```json
{
  "code": "8010024360"
}
```

多编码批量查库存（**多品行选型后**；工具 `mcp__quotation__get_inventory_by_code_batch`，≤50 个 code）：

```json
{
  "codes": ["8010024360", "8020020755"]
}
```

按描述查库存（**仅**用户只问库存、不问价时；若要价+库存用 `match_quotation` → `get_inventory_by_code`；工具 `mcp__quotation__search_inventory`）：

```json
{
  "keywords": "Tee dn40"
}
```

价格 + 库存（**单品**，两步 MCP；`match_price_and_get_inventory` 已下线，勿调用）：

```json
// 1) match_quotation
{ "keywords": "直接50", "customer_level": "B" }
// 2) get_inventory_by_code（用 match 选定的 code）
{ "code": "8020020755" }
```

中文描述查价+库存（**不要三步都走**）：
1. **单品**：`match_quotation` → 选型 → `get_inventory_by_code`。
2. **多品（≥2 行）**：`match_quotation_batch`（每行 `keywords` = 名称+规格，≤10/批）→ 每行选型 → `get_inventory_by_code_batch` **一次**。
3. 回复时同时说明匹配到的产品、编码、单价和库存数量。

如果工具返回 `inventory_unavailable` 或凭证不可用，直接说明库存服务暂不可用，不要编造库存数量。

## 报价单填写规则

> **Spec anchor (2026-06-28):** [`.trellis/spec/integration/agents-unified-model.md`](../.trellis/spec/integration/agents-unified-model.md) § Quotation sheet fill defaults. L1 seed: `ccb-installer/config/agents/quotation-agent.md` §生成报价单 — 默认值（须与下文一致）。

当用户说“填写报价单”“生成报价单”“做报价单”“放到桌面”等，直接使用工具 `mcp__quotation__fill_quotation_sheet`。

### 生成报价单 — 默认值（禁止重复澄清）

同会话**已查价并回复表格**后用户要出单：**禁止**再问客户等级、VANTSING 模板、明细清单、报价日期、币种。立即用已 match 的 `code` / `unit_price` / `customer_level` 调 `fill_quotation_sheet`（`fill_items` + `require_exact_codes=true`）。

| 参数 | 默认 |
|------|------|
| 客户等级 / 单价 | 继承本会话 match 结果 |
| 模板 | 内置万鼎标准 VANTSING（不传 `template_path`） |
| 明细 | 本会话已查价行 = 本张报价单全部行 |
| 数量 | 未给则 qty=1 |
| 日期 / 币种 | 当天；印尼盾 IDR（不传 `quotation_date`） |

仍须澄清：从未 match 且无清单；§9 强制澄清（全面冲突/仅替代品无默认）；用户明确要自定义模板或非默认档。

**Path B — 冷启动（无 prior match，用户直接给 keywords 清单）：**

```json
{
  "items": [
    { "keywords": "直接50", "quantity": 100 },
    { "keywords": "三通50", "quantity": 100 }
  ]
}
```

**Path C — 查价后出单（默认，同会话已 match）：** 见上文 `fill_items` + `require_exact_codes=true` 示例。

`items` 可接受字段：
- 产品描述：`keywords`、`name`、`product_name`、`description`、`quote_name`
- 数量：`quantity`、`qty`、`count`
- 可选匹配字段：`code`、`item_code`、`sku`、`product_code`、`unit_price`、`price`、`spec`、`specification`、`unit`、`brand`

默认行为：
- 没有 `template_path` 时，使用内置空白**万鼎标准 VANTSING**报价单模板（`空白标准报价单.xlsx`，bundled 于 `vendor/wanding/data/` 或 `data/`）。
- 没有 `output_path` 时，保存到**当前会话工作区**（AionUI 侧边栏「临时空间」），文件名 `Wanding-Quotation_<时间戳>.xlsx`。
- **`Wanding-Quotation_*.xlsx` 仅是输出命名，不是 `file_path`。** 查价后出单（Path C）只传 `fill_items` + `require_exact_codes=true`，**禁止**预造 workspace 路径当输入（会 `FILE_NOT_FOUND` / 「提取询价项失败」）。
- 某个产品无法匹配时，仍生成报价单，并在对应行标记未匹配，不阻塞整个报价单。
- 同会话已查价后生成报价单：见 §生成报价单 — 默认值；qty 默认 1，不要重复问数量/等级/模板/币种。
- 用户从未给数量且会话内也无 prior match 时，可问一次数量；用户要求快速草稿时可用数量 `1` 并说明可调整。

## 选型与澄清

> **Spec anchor (2026-06-29):** [`.trellis/spec/integration/agents-unified-model.md`](../.trellis/spec/integration/agents-unified-model.md) § Quotation multi-candidate reply. L1 seed: `ccb-installer/config/agents/quotation-agent.md` §选型与澄清（须与下文一致）。

具体选型规则、业务默认、纠偏案例**只维护在** `wanding_business_knowledge.md`。**本节只规定流程，不重复规则正文。**

执行要求：
- **禁止** `AskUserQuestion`；澄清用 assistant 正文 + 用户下一条。
- **查前**（match 前缺压力/档位等）：A/B/C 选项，可 `1A 2C`。
- **查后多候选**：**先 match → Read 知识库 → 同条回复先给 1 推荐价 + ≤4 bullet「其他可能」**；**禁止**「用途 A/B/C / 按 1A 格式 / 请选序号」阻塞；「直接50」默认推荐 PVC-U 排水 8020020755。
- 仅 §9 强制澄清或用户要看全部候选时才请用户选编码。
- `candidates_truncated` → 单独 `match_quotation` + `show_candidates:true`。
- 替代品：**出单写死编码前**确认；查价回复仍先给推荐 + bullet。
- 用户纠正 → memory / org 知识库。

## 回复表格

查价回复（**必须**含英文/印尼名称列，取自候选 `indonesian_name` 或 `description_english`）：

| 产品 | 规格 | 英文/印尼名称 | 编码 | 客户等级 | 单价 | 备注 |
|---|---|---|---:|---:|---:|---|
| 直接 | dn50 | Elbow PVC-U dn50 | 8010000000 | B | 0 | 匹配说明或不确定点 |

查库存回复：

| 产品 | 规格 | 英文/印尼名称 | 编码 | 可用库存 | 仓库/明细 | 备注 |
|---|---|---|---:|---:|---|---|
| Tee | dn40 | Tee PVC-U dn40 | 8010000000 | 0 | 按工具返回填写 | 先按描述匹配到该编码 |

查价 + 查库存联合回复：

| 产品 | 规格 | 英文/印尼名称 | 编码 | 客户等级 | 单价 | 可用库存 | 备注 |
|---|---|---|---:|---:|---:|---:|---|
| 直接 | dn50 | Elbow PVC-U dn50 | 8010000000 | B | 0 | 0 | 匹配说明 |

报价单生成回复：

| 文件 | 成功项 | 未匹配/需确认 | 备注 |
|---|---:|---|---|
| 工作区路径（侧边栏可见） | 0 | 无 | 已生成 |
