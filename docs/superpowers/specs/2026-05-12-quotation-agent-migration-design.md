# 报价 Agent 迁移设计

> 日期：2026-05-12
> 目标：将 agent-jk 报价能力迁移到 claude-code-best，打造专注报价的 Claude Code Agent

---

## 1. 背景与目标

### 现状
- agent-jk（Python/FastAPI）已有成熟的报价业务体系：7 类 Skills、3 层架构（Skills → Tools → 数据）、万鼎价格库、历史映射表
- 核心工具：`match_quotation`（历史+万鼎并集匹配）、`get_inventory_by_code`（实时库存）、`run_quotation_fill`（整单填充流水线）

### 目标
在 `claude-code-best` 中构建一个**报价专用 Agent**：
- 用户通过自然语言对话完成询价、查库存、填充报价单
- 数据层通过 MCP（Model Context Protocol）Server 暴露工具
- 全部 7 类 Skills 迁移

---

## 2. 架构设计

```
用户（终端对话）
    │
    ▼
Claude Code CLI（REPL）
    │ System Prompt / CLAUDE.md 注入报价 Skills 规则
    ▼
MCP Client（内置）
    │ stdio / HTTP
    ▼
┌─────────────────────────────────────────┐
│  MCP Server (TypeScript/Bun)             │
│  ─────────────────────────────────────  │
│  读取本地 Excel 数据文件：               │
│  • 万鼎价格库_管材与国标管件_标准格式.xlsx│
│  • 整理产品(2).xlsx（历史映射表）         │
│  • 报价单.xlsx（用户上传）               │
│                                          │
│  暴露工具（Tool Handlers）：              │
│  • match_quotation                       │
│  • get_inventory_by_code                 │
│  • run_quotation_fill                    │
│  • parse_excel_smart                     │
│  • append_business_knowledge             │
│  • ...（共 7 类 Skills 对应工具）         │
└─────────────────────────────────────────┘
```

**MCP Server 位置**：`D:\Projects\claude-code-best\mcp_servers\quotation-server\`

**数据文件位置**：`D:\Projects\claude-code-best\data\`
```
data/
  万鼎价格库_管材与国标管件_标准格式.xlsx   ← 万鼎价格库
  整理产品(2).xlsx                          ← 历史映射表
  wanding_business_knowledge.md             ← 业务知识（LLM 选型用）
  <用户上传报价单>                          ← 临时放在 uploads/
```

---

## 3. 目录结构

```
mcp_servers/
  quotation-server/
    package.json
    tsconfig.json
    src/
      index.ts              ← MCP Server 入口（stdio 协议）
      tools/
        match_quotation.ts  ← 核心：历史+万鼎并集匹配
        inventory.ts         ← get_inventory_by_code（占位，暂用 mock）
        parse_excel.ts       ← Excel 读取（openpyxl-style）
        run_quotation_fill.ts ← 整单填充流水线
        append_knowledge.ts  ← 业务知识写入
      services/
        fuzzy_matcher.ts     ← 字段匹配 + token 打分（同 agent-jk 逻辑）
        llm_selector.ts     ← LLM 候选选型（fast path）
        mapping_matcher.ts  ← 历史映射表查询
      types.ts               ← 统一类型定义
      config.ts              ← 文件路径配置
```

**注意**：实时库存（ACCURATE API）在 Phase 1 为占位 mock，Phase 2 再对接。价格匹配逻辑完整迁移。

---

## 4. Skills 迁移（7 类 → Claude Code 提示词）

### 4.1 注入方式

在 `CLAUDE.md` 中新增「报价技能」章节，将 Skills 规则内联为 System Prompt 约束。

同时创建 `.claude/skills/quotation.md` Skill 文件供 `/quotation` 命令调用。

### 4.2 迁移映射

| agent-jk Skill | Claude Code 等效 | 工具 |
|----------------|----------------|------|
| `SKILL_INVENTORY_PRICE_RULES` | 库存/价格路由规则 | `match_quotation` |
| `SKILL_OOS_RULES` | 无货管理规则 | `get_oos_list` / `register_oos` |
| `SKILL_QUOTE_RULES` | 报价单解析规则 | `parse_excel_smart` |
| `SKILL_FILL_RULES` | 整单填充规则 | `run_quotation_fill` |
| `SKILL_EXCEL_CHAT_RULES` | Excel 对话规则 | `parse_excel_smart` / `edit_excel` |
| `SKILL_CLARIFY_RULES` | 意图澄清规则 | `ask_clarification` |
| `SKILL_KNOWLEDGE_RULES` | 知识记录规则 | `append_business_knowledge` |

### 4.3 关键路由规则（内联到 CLAUDE.md）

```markdown
## 报价路由规则（硬约束）

### 库存查询链路（中文产品名）
用户说「XX库存」→ match_quotation → get_inventory_by_code
禁止直接 search_inventory（仅英文）

### 批量优先
≥2 产品 → match_quotation_batch（≤20条）
多个 code → get_inventory_by_code_batch（≤50条）

### 关键词保护
「直接dn50」必须原样传 keywords="直接dn50"
禁止简化或去除管件名

### PVC 歧义
用户只说「pvc」未指定品类 → ask_clarification 展示 6 类选项后再匹配

### 档位映射
二级代理→A | 一级代理→B | 聚万大客户→C | 青山大客户→D | 大唐大客户→E
出厂价含税/不含税 | 采购不含税
```

---

## 5. MCP 工具设计

### 5.1 核心工具

```typescript
// 工具清单（mcp_servers/quotation-server/src/tools/）

// P0: 直接注入 schema
match_quotation(keywords, customer_level?, lang?, show_all_candidates?)
match_quotation_batch(keywords_list, customer_level?, lang?)
get_inventory_by_code(code)           // Phase1: mock return
get_inventory_by_code_batch(codes)    // Phase1: mock return
parse_excel_smart(file_path, sheet_name?)

// Deferred（需 tool_search 展开）
run_quotation_fill(file_path, customer_level?)
append_business_knowledge(content)
get_oos_list(limit?)
get_oos_stats()
register_oos_from_text(product_name, spec?, qty?, unit?)
ask_clarification(questions, reasoning?)
```

### 5.2 match_quotation 执行逻辑（TypeScript 迁移）

```
keywords
  │
  ├─ 并行两路（Promise.all，max_workers=2）
  │   ① 历史映射路：mapping_matcher.match_mapping_top_candidates(keywords)
  │      对「询价货物名称+规格」列做 fuzzy match
  │   ② 万鼎价格库路：fuzzy_matcher.match_wanding_price_candidates(keywords)
  │      对 Describrition 列做 token 打分 + 规格等价
  │
  ├─ _merge_candidates_by_code：按 code 去重，标注 source（历史报价/字段匹配/共同）
  │
  ├─ 对 unit_price=0 的项尝试按 code 补价
  │
  ├─ 按 source 优先级排序：共同 > 历史报价 > 字段匹配
  │
  ├─ 截断前 15 条
  │
  └─ 候选数=0 → unmatched
     候选数=1 → 直接返回 chosen
     候选数≥2 → llm_selector.select_best(keywords, candidates)
```

---

## 6. 数据文件迁移

| 源路径 | 目标路径 |
|--------|---------|
| `agent-jk/Agent Team version3/data/万鼎价格库_管材与国标管件_标准格式.xlsx` | `claude-code-best/data/wanding_price_lib.xlsx` |
| `agent-jk/Agent Team version3/data/整理产品(2).xlsx` | `claude-code-best/data/mapping_table.xlsx` |
| `agent-jk/Agent Team version3/data/wanding_business_knowledge.md`（如存在） | `claude-code-best/data/wanding_business_knowledge.md` |

**数据文件不包含实际业务数据**（库存、销售记录），仅含：
- 产品基础信息（编号、名称、规格、价格档位）
- 历史询价映射关系

---

## 7. 分阶段实施计划

### Phase 1：基础设施（本周）
- [ ] 创建 MCP Server 目录结构 + package.json
- [ ] 迁移数据文件（Excel + md）到 `data/`
- [ ] 实现 `parse_excel_smart`（读取 Excel 返回结构化数据）
- [ ] 实现 `match_quotation` 核心匹配逻辑（历史+万鼎并集）
- [ ] 实现 `llm_selector`（fast path，调用外部 LLM）
- [ ] 注册 MCP Server 到 Claude Code 配置
- [ ] 更新 CLAUDE.md：注入报价 Skills 路由规则
- [ ] 基本功能测试通过

### Phase 2：完整工具链（下周）
- [ ] 实现 `match_quotation_batch`
- [ ] 实现 `run_quotation_fill`（整单填充流水线）
- [ ] 实现 `get_inventory_by_code`（mock 数据）
- [ ] 实现 `get_oos_list` / `get_oos_stats`
- [ ] 实现 `append_business_knowledge`
- [ ] 实现 `ask_clarification`
- [ ] 实现 `edit_excel`
- [ ] 集成测试通过

### Phase 3：精度优化（后续）
- [ ] 对接真实库存 API（ACCURATE Online）
- [ ] 业务知识学习循环（纠错学习）
- [ ] 英文询价路径完善
- [ ] 性能优化（大表处理）

---

## 8. 技术约束

- **TypeScript strict mode**：`bunx tsc --noEmit` 必须零错误
- **Bun 运行时**：全部用 Bun 执行，不用 Node.js
- **Excel 解析**：用 `xlsx` npm 包（支持 .xlsx/.xls）
- **LLM 调用**：通过 HTTP 请求调用外部 LLM API（复用 agent-jk 的 OpenAI 兼容接口）
- **MCP 协议**：使用 `@modelcontextprotocol/sdk` 的 Bun 兼容实现

---

## 9. 测试策略

- 单元测试：每个工具函数独立测试（bun test）
- 集成测试：MCP Server 与 Claude Code CLI 端到端对话测试
- 回归测试：对比 agent-jk 原版与迁移版的 match_quotation 输出

---

## 10. 设计决策记录

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 数据文件位置 | 迁移 vs 保留原位 | **迁移到新项目** | 独立性强，不依赖 agent-jk 目录 |
| MCP 语言 | Python vs TypeScript/Bun | **TypeScript/Bun** | 与 claude-code-best 技术栈一致 |
| 实时库存 | Phase1 mock vs 立即对接 | **Phase1 mock** | 降低初期复杂度 |
| Skills 注入方式 | 全部内联 CLAUDE.md vs Skill 文件 | **CLAUDE.md 内联 + Skill 文件** | CLAUDE.md 管路由规则，Skill 文件管工具说明 |

---

> 审查要点：
> - Phase 1 范围是否合理（最小可运行验证）？
> - MCP Server 目录结构是否符合 Claude Code 规范？
> - 数据文件迁移路径是否正确？