# PRD — 07-06 accurate-delegation-convergence

**Origin:** 2026-07-06 上午 smoke 对比：专家卡片「1-5月采购额」1× summarize 出月表；默认路由同问题走 `Agent(accurate-agent)` 后子代理打了 4 次业务 MCP（2×summarize + 2×fetch）。诊断证据见 `research/delegation-convergence-diagnosis.md`（transcript 实锤）。

## Problem

Dispatch 隔离本身正常（父会话 0 次业务 MCP，4 次全在 subagent transcript）。真实缺陷有两个：

1. **Orchestrator 委派加码**：用户只问「1-5月采购额」，`wande-orchestrator` 的委派 prompt 自行追加「前5供应商及对应金额」「累计总额单列」「口径标注」，把 1 次 summarize 能答完的问题推成 4 次调用（前5供应商只能 fetch 明细算）。
2. **accurate-agent 重试纪律缺失**：第 4 次 `fetch_by_date` 与第 3 次**参数逐字节相同**（首次只返回 100/221 条截断后原参重发，再次拿到同样 100 条）。子代理作用域无任何运行时约束（`wrapCanUseToolForWandeOrchestrator` 见 `context.agentId` 即直通），SOP 也没写截断处置规则。

## Requirements (AC)

- [x] R1 委派保真：`wande-orchestrator.md`（vertical 包 seed + 确认 live 部署链）新增规则——委派 prompt **忠实转述用户需求，不得加码**；扩展维度（top-N 供应商、口径附注等）仅当用户明确问到才写入；委派 prompt 中显式声明「仅回答以上需求，不做额外查询」。
- [x] R2 子代理收敛：`accurate-agent.md` SOP 补三条——(a) `group_by: month` 结果自带合计，禁止为「累计」再调 `group_by: total`；(b) fetch 结果截断时禁止原参重发（改分页参数或用已有数据并注明样本口径）；(c) 委派场景与直开场景同守「标准月报 ≤2 次 MCP」预算。
- [x] R3 回归防线：`eval/agent_eval_cases.jsonl`（+ 对应 suite）新增默认路由委派收敛 case——「1-5月采购额」经 orchestrator 委派后：子代理 MCP ≤2 次、无连续同参调用、回复含分月表格。
- [ ] R4 部署与实测：`deploy-seed-agents -ForceMd` 后**新开** Guid 默认会话 smoke「1-5月采购额」→ subagent transcript 中 1×`accurate_summarize_records`（`purchase-invoice`, `group_by: month`）、0×fetch、回复含月表（允许 ≤2 次 MCP 通过，1 次为理想）。
- [x] R5 spec 沉淀：`agents-unified-model.md` §Orchestrator dispatch 补记本次根因（委派加码 + 同参重发）与新规则指针；诊断证据链接进任务 research。

## Non-goals

- 不改 accurate MCP 服务端（summarize/fetch 行为、分页上限）
- 不实现子代理运行时调用预算守卫（WS-D 记入 Defer，需要动 CCB source 两镜像 + 单测，等用户单独拍板）
- 不动 platform src（改动全部落在 `packages/vertical/com.wanding.trade` + eval + spec）

## Canonical files

- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/accurate-agent.md`
- `eval/agent_eval_cases.jsonl` + `eval/suites/*.json`
- `.trellis/spec/integration/agents-unified-model.md`
