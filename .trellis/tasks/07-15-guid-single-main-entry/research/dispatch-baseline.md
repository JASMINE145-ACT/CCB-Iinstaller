# Phase 2 Baseline — 主 agent / Dispatch 体系评估 (2026-07-15)

> **Role:** `07-15-guid-single-main-entry` Phase 2 起点（不写代码）。  
> **Sources:** `agent-team-architecture.md` · `agents-unified-model.md` · `agent-runtime-registry.yml` · `wande-orchestrator.md` · tasks `07-04` / `07-11` / `07-14-handoff` + related in-progress.

---

## 1. 一句话结论

**架构已够「单入口」用；交付信任还不够。**  
主 agent（`wande-orchestrator`）作为 **员工主入口 + Agent() 路由工具** 的合同、守卫、路由表已经成型；但 **Path A（委派）相对 Path B（Guid 直连卡）的可靠性从未被矩阵闭环证明**，且关键加固 / 多意图任务仍 `in_progress`。  
→ **现在砍卡 = 提前拆逃生舱**；Phase 2 应先「证明并补强 Path A」，再谈 P1 默认藏卡。

| 维度 | 评级 | 说明 |
|------|------|------|
| 身份与叙事 | **A** | `07-11` 完成：主入口 ≠ 纯路由台；`WANd.ENTRY.*` |
| 安全边界（禁业务 MCP） | **A−** | 守卫+strip 已落地；曾漏 price-library（已修） |
| 路由表完备度（L1 意图→specialist） | **B+** | 报价/账务/任务/办公/价库/名录→报价 已写清 |
| 单意图委派可靠性 | **C+** | 用户手测「查价委派」曾 PASS；CLI 矩阵仍 FAIL/pending |
| 多意图 / 拆解计划 | **C** | `ASSIGNMENT.004` + `07-14-handoff` 进行中，非闭环 |
| 可观测（View Steps） | **B** | B0 `DelegationRun` 已上；B1 meta bridge 延期 |
| 对「可关卡」的产品就绪度 | **D+** | 缺权威对照矩阵；Path B 仍是隐式备份 |

---

## 2. 现有主 agent 体系（你已经有什么）

### 2.1 心智模型（锁死）

```text
Employee Primary Entry = wande-orchestrator
  Tools: Agent() 路由 · 记忆 ·（预留 skills / thin MCP / EIL）
  Hard: 自身不调 quotation/accurate/price-library/… 业务 MCP

Path A  默认发送 → Entry → Agent(specialist) → 原样回传
Path B  Guid 卡  → Specialist 直连 MCP（无 Agent 目标）
```

出处：`agent-team-architecture.md` § Glossary / Two entry paths；`WANd.ENTRY.IDENTITY.001` + `WANd.ROUTING.ASSIGNMENT.001`。

### 2.2 Roster（委派目标）

| Specialist | 委派？ | 备注 |
|------------|--------|------|
| `quotation-agent` | 是 | 报价+库存+名录（SUPPLIER_DIR→报价） |
| `accurate-agent` | 是 | 财务统计 |
| `work-tasks-agent` | 是 | 任务 CRUD / 名单；主入口不自答明细 |
| `word/ppt/excel-creator` | 是 | office；曾有 `delegatable` 脚枪（07-04 WS C） |
| `research-agent` | 是 | 调研 |
| `price-library-agent` | **受限** | 多为 Guid admin；`delegatable:false` 阶段性 |

### 2.3 运行时硬能力（已实现，非纸面）

| 能力 | 合同 / 代码 |
|------|-------------|
| Session 绑主入口 | Guid 无卡 → `wande-orchestrator` |
| 剥业务 MCP | `filterMcpConfigsForOrchestratorSession` · `ASSIGNMENT.002` |
| 禁顶层业务工具 | `evaluateOrchestratorToolGuard` |
| 禁后台 Agent / TaskOutput | `sanitizeOrchestratorAgentInput` · `ADMISSION` |
| Sync spawn + 原样转发 | `runAgent.ts` · playbook P3 verbatim |
| Delegation 索引注入 | `appendWanDDelegationIndex` · `ASSIGNMENT.003` |
| Intent split（业务 vs 个人） | L1 + `ENTRY.INTENT_SPLIT.001` |
| Nested View Steps | B0 `OBSERVE.DELEGATION.001` |

### 2.4 L1 路由表（已写进 `wande-orchestrator.md`）

覆盖：查价/报价/库存/名录 → `quotation-agent`；Accurate → `accurate-agent`；价库维护 → `price-library-agent`；任务 → `work-tasks-agent`；Office → creators；多意图 → 硬确认后串行 Agent（与 `07-14-handoff` 对齐草稿）。

→ **「表够不够」不是 Phase 2 主矛盾；「走表是否稳」才是。**

---

## 3. 任务族现状（dispatch 相关）

| Task | 状态 | 对「够强」的含义 |
|------|------|------------------|
| `07-11-orchestrator-employee-primary-entry` | **completed** | 身份 OK；用户手测「你是谁」+ 查价委派「效果很好」 |
| `07-04-orchestrator-dispatch-hardening` | **in_progress（停在 07-04）** | 权威矩阵未闭环：CLI #1 超时无 Agent、#3 specialist L0 bleed；多行 pending |
| `07-09-work-routing-execution-contracts` | completed | 域拆分清晰（Routing vs Execution vs Observe） |
| `07-06-delegation-nested-view-steps` | in_progress | UI 可看委派树；不等于委派质量 |
| `07-14-orchestrator-handoff-brief-decomp-plan` | in_progress | Brief + 多意图计划 = 下一档复杂度 |
| `07-06-accurate-delegation-convergence` | in_progress | Accurate Path A 专项 |
| `07-09-optimize-wande-orchestrator-prompt` | in_progress | 提示词/模型遵从 |
| `06-29-specialist-session-resume-profile-drift` | in_progress | Path B 护栏；关卡后仍要保留历史会话 |
| `07-15-quotation-mcp-warm-timeout` | planning | 冷启动超时伤 Path A/B 双方 |
| `07-13-word-creator-document-toolchain` | in_progress | Office 委派交付链 |

**关键事实：** 产品已宣布主入口身份成立，但 **`07-04` 的「委派可度量 / 可回归」从未收口** —— 这正是单入口 Phase 2 的缺口来源。

---

## 4. 证据债（相对「可关卡」标准）

摘自 `07-04` `delivery-smoke-matrix.md`（2026-07-04，**未见到后续全绿覆盖**）：

| # | 路径 | 期望 | 当时结果 |
|---|------|------|----------|
| 1 | Path A 查价 | `Agent(quotation)` 同轮交付 | **FAIL** timeout / 无 Agent |
| 3 | Path B 报价卡 | 直连 `match_quotation` | **FAIL** L0「不得调业务 MCP」Bleed |
| 2/4/5/6 | 账务 / Office / idle | … | **pending** |
| 7 | Path A 不漏价库 MCP | 守卫 | **fixed** |

另：`agents-unified-model.md` 仍记载 Path A 历史债（stdin hang→已修、子代理乱码/空壳、office 跳步、verbatim）。  
**用户 07-11 手工「查价委派很好」与 CLI FAIL 并存** → 环境/模型敏感，更需要固定矩阵，不能靠感觉。

---

## 5. Gap → Phase 2 工作包（建议）

把本任务 `WANd.ORCH.DISPATCH.001` 拆成可执行包（**继承 `07-04`，不重造轮子**）：

| 包 | Goal | 主要依据 | 建议顺序 |
|----|------|----------|----------|
| **2a 矩阵复活** | 更新并跑通 Path A vs Path B 对照矩阵（报价 · 账务 · 任务 · Word 至少各 1） | `07-04` matrix + Guid hand smoke | **先做** |
| **2b 遵从加固** | 降低「只思考不 Agent」；固定 eval `#orchestrator-*-delegates` | `07-09-optimize-prompt` · `07-04` Case1 | 与 2a 并行读、修后复测 |
| **2c Accurate / Office 收敛** | Path A ≈ Path B 业务结果 | `07-06-accurate-*` · word-creator | 矩阵 FAIL 行驱动 |
| **2d Brief / 多意图** | ASSIGNMENT.004 闭环；复杂题可硬确认后串行 | `07-14-handoff` | **可后置**；单意图 PASS 即可藏卡 MVP |
| **2e 卡逃生舱策略** | 矩阵未全绿前：flag 藏卡默认 **off**；绿后 Opt A 开 | 本 task P1 | **最后** |

### 「Dispatch 够强」操作定义（建议作为 AC）

单意图 MVP（关卡门槛）：

1. Path A：正确 `Agent(id)`，同轮有表格/路径/任务结果（无「请稍候」空壳）  
2. 同题 Path B（若仍有卡）业务结果等价（允许话术差）  
3. 连续 N=3 次不出现顶层业务 MCP / 120s 级挂死回归  
4. Evidence：矩阵表 + View Steps 委派组截图/日志  

多意图 / Brief：**不阻塞**「单入口默认开」，但阻塞「宣称 dispatch 完备」。

---

## 6. 对 Phase 1（藏卡）的含义

| 决策 | 建议 |
|------|------|
| 现在默认藏卡？ | **否** |
| Flag 先合？ | 可（默认 off） |
| Opt A exe+Web 同藏？ | 矩阵绿后再开 |
| 历史 specialist 会话 | 永远保留 Path B resume 合同 |

---

## 7. 本评估未覆盖（明确边界）

- 未重跑 CLI/Guid smoke（以 07-04 / 07-11 文档证据为准；2a 必须刷新）  
- 未深读 `07-09-optimize-wande-orchestrator-prompt` 实现 diff  
- 模型选择（minimax vs 其他）对 Case1 的敏感度 — 矩阵需钉死模型列  

---

## 8. Next（等待用户）

1. 认可本 baseline 作为 Phase 2 起点  
2. 锁定 MVP 行：报价 · 账务 · work-tasks · word（四行）是否够  
3. 说「执行」→ 先做 **2a 矩阵复活**（可开 `trellis-research`/手测，再决定 2b 修什么）
