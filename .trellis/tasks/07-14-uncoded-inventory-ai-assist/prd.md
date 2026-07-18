# PRD — 外购无码库存可见性：AI 融入路径

## Problem (from live ops, 2026-07-14)

报价员问库存时常卡在「仓库（Accurate）里其实有货，但价格库没录 / 没有编码」：

- 例：客户要 **1 包堵漏王**（外购品）；库里以前采过还有货；报价员**不能实时按品名查库存**，因走 Accurate 习惯依赖**编码**。
- 价格库日常查价路径给不出码 → 也不能调用现有 MCP `get_inventory_by_code`。
- 不能每个 SKU 都去问印尼同事要编码；Rubi 历史采购编码表可短期救急。
- 同事结论：**整理固定编码清单为主**；明确 **不着急黑盒 AI 匹配**。
- VPN/Accurate 中文 UI / Mac 客户端 = 旁支，不是本任务主目标。

## Product goal (AI-in-the-loop)

**Primary（业务闭环）：** 报价员对「价库未录、但库里可能有」的外购品，能**自主**知道有没有、有多少 —— 沟通成本低、可持续。

**Sustainment（2026-07-14 加锁 — 查缺补漏）：**  
采购会持续增加。长期靠采完即登记；**近期主路径用户锁定为三步全量同步：**

1. **用 Accurate API 抓 Item 表（尽量全量）**  
2. **存放好**（本地 slim xlsx + 审计快照）  
3. **对比价格库，按编码查缺补漏**（增补 draft → 人工 publish）

历史洞用这一波压下去；之后用增量登记防回潮。

**AI 角色（本 PRD 核心）：** AI **不替代**编码权威，而是：

1. **建表 / 补表助手（存量）**：Rubi、采购记录、Accurate 导出 → 候选映射，人确认落库。
2. **采购后即时登记助手（增量 · 查缺补漏主机制）**：业务报采购/入库结果后，Agent 引导「中文名/印尼文 + Accurate 码」写入映射（缺码则提示向谁拿码或走按名搜候选），**同轮完成登记**，禁止「以后再说」。
3. **查询断点助手**：查价 miss 问库存 → 映射码或（若接线）`search_inventory`；禁瞎报 qty。
4. **目录 enrichment**：确认映射可建议价库补录（price-library），不自动 publish。

**非目标（v1）：**

- 黑盒「中文名 → 编造库存数字」无编码、无确认。
- 强依赖 Mac 客户端或强制国内直连 Accurate UI。
- 印尼同事另建平行「杂项表」作为唯一流程（可作数据源，不作为人肉常问）。
- 假设 Accurate 编码由国内自行生成（码仍来自 Accurate/印尼侧；AI 只是**落库登记**）。

## Acceptance criteria

| ID | AC |
|----|----|
| AC1 | 有一份正式「无码/外购库存映射」契约（字段、owner、更新节奏）— 可先 CSV/表，再进 Org/价库扩展 |
| AC2 | AI 辅助建表：给定 Rubi/导出样例，产出候选映射供人确认；未确认不得写生产价库 |
| AC3 | 报价路径：价库 miss + 用户问库存 → Agent **不得**装有编码/瞎报库存；须走映射码或（若接线）`search_inventory` |
| AC4 | 若重新接线 `search_inventory`：keywords → AOL → 返回编码+数量；多候选要人选型 |
| AC5 | 用户可见话术区分：价库命中 / 仅仓库映射命中 / 需补录价库 |
| AC6 | 文档写明：同事要的「固定编码清单」= **主交付**；AI = **清单生产与维护工具** |
| **AC7** | **查缺补漏**：采购/报入库意图触发「立即登记编码」流程；完成后同品再查库存不再无码（地板砖式剧本） |
| **AC8** | 未完成登记时 Agent **不得**只说「知道了」结束；须给出缺字段清单或确认已写入映射证据 |

## Decisions to lock in plan

1. 映射落点：**已锁** MVP = `vendor/wanding/data/uncoded_inventory_map.jsonl`（见 `uncoded-inventory-map.md`）；Org → Phase 3。
2. `search_inventory`：**Phase 3 前禁止**；agent 已改（2026-07-14）。接线需口头批准。
3. 查库/登记主入口：**quotation-agent**；价库 enrich：**price-library-agent**。
4. 写入证据：`status` envelope（`enrolled|missing_fields|conflict|…`）— AC8。

## Out of scope now

- Stage：供应商议价、多仓、Accurate 全量中文化。
- 强制立刻把所有 Accurate SKU 灌进价格库。
- 自动从供应商发票 OCR「无码也写死」（可做后续增强，非 AC7）。
