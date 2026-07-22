# Accurate 只读查询收敛：禁过度交付 + ROE 误伤 + 父代理乱解释

## Goal

修「查询 5 月销售额」这类 **只读 Accurate 查询**：委派路径正确时，子代理仍过度交付、ROE 误挡、父代理编造「写权限 / ROE 终审未通过」——用户拿到数字却被 A/B/C 打断。

与 `07-19-quotation-agent-prompt` **同级 sibling**（报价稳态 vs 账务只读收敛）；共享 `wande-orchestrator` / ROE 表面，**不**并入 07-19 实现 scope。

## Product lock（2026-07-20 用户确认）

```text
用户 → Orchestrator(工作助手)
         → Agent(accurate-agent)
              → 1× mcp__accurate__accurate_summarize_records
              → Markdown 表格（金额 + 单据数 + 口径一行）
         ← 子结果正文含数字
         → 父代理原样转发数字
用户气泡（结束；无 A/B/C；无 ROE 话术）
```

| 角色 | 必须做 | 禁止 |
|------|--------|------|
| `accurate-agent` | 标准月报：≤2 次 MCP（理想 1× summarize）；立即表格 | Write md/csv、python openpyxl、batch_get_detail 扫单、ExecuteExtraTool、把只读查当成「落盘交付」 |
| ROE (`:roe-judge`) | 纯「查询/销售额/采购额」→ **no_write_intent / skip** | 因通用 `Write`/xlsx 缺失 `fill_quotation_sheet` 等 L2 marker 而 block 5 轮 |
| `wande-orchestrator` | 父泡含金额 + 单据数（有则必转） | 编造「Accurate MCP 无写权限」「ROE-GATE 终审未通过」；用 A/B/C 替代转发 |

## User-visible symptom（2026-07-20）

用户：「查询 5月份销售额」

| 实际 | 期望 |
|------|------|
| 委派 → 万鼎账务专家 · **blocked** · **10 tools** | 委派 + **1** tool + 表格 |
| `summarize_records` 后 3× `batch_get_detail` + Write md/csv + openpyxl xlsx + `ExecuteExtraTool` | 仅 summarize → 表 |
| 父代理：数字已有，却报 ROE 未通过 + A/B/C | 直接转发 `1,470,601,570 IDR / 68 单` |

数字本身可用；问题在 **收敛与话术**，不是 Accurate 只读 API 缺权限。

## Hypothesis

| # | 假设 | 初步证据 |
|---|------|----------|
| H-Acc-1 | **过度交付**：只读查询被当成「要落盘交付」 | Write / openpyxl / 多文件；L1 已禁 Shell/python 临时脚本 |
| H-ROE-1 | **ROE 误伤**：写意图误判，或 L2 marker 不含 `Write`，block 至 max_blocks | `accurate-agent:roe-judge: block`；REJECT「Write not landed」；`default.json` L2 = fill_quotation / edit_excel / mcp__excel__write |
| H-Orch-1 | **父代理乱解释**：有数字仍甩 ROE /「MCP 写权限」 | 与报价 H1 同族；`WANd.ORCH.OUTCOME_RELAY` 已覆盖查询类但未禁编造 gate 失败 |

## Requirements（契约）

| # | Contract | Behavior |
|---|----------|----------|
| R1 | `WANd.ACC.READONLY.CONVERGE.001`（provisional） | 用户只问销售额/采购额（未要导出/明细/top-N）时：1× `accurate_summarize_records` → Markdown 表；禁止 Write/xlsx/python DIY / 额外 batch detail |
| R2 | `WANd.ACC.ROE.READONLY.001`（provisional） | Accurate 只读查询路径 ROE pass（skip 或 dedicated profile）；不得因缺少报价 L2 写工具而 block |
| R3 | `WANd.ORCH.NO_FABRICATE_GATE.001`（provisional） | 父代理已有子结果数字时必须转发；禁止捏造 MCP 写权限 / ROE 终审失败叙事；禁止用 A/B/C 替代转发 |
| R4 | `WANd.AGENT.SEED.SYNC.001`（已有） | packages ↔ staging `accurate-agent.md` 一致 |

## Out of Scope

- Accurate MCP 服务端 / schema 大改
- 报价 L1 轻量化（属 `07-19`）
- Office creator 写路径 ROE（保持 block）
- 强制恢复 Guid 专家卡片（catalog 另议；本任务默认 Orchestrator→Agent 路径）

## Acceptance Criteria

- [ ] AC1: `research/symptom-2026-07-20-sales-roe-false-positive.md` 含工具链解剖 + ROE 机制说明
- [ ] AC2: Guid / Orchestrator：「查询 5 月销售额」→ View Steps ≤2× accurate MCP；无 Write/openpyxl/ExecuteExtraTool；父泡含金额+单据数；无 ROE/A-B-C 话术
- [ ] AC3: pytest：只读「查询销售额」transcript → ROE `verdict=pass` / `no_write_intent`（或等价）
- [ ] AC4: 有写意图的 Accurate 路径（若保留）不回归放行假交付
- [ ] AC5: 无批准前不改 L1 / modes / ROE 实质

## Canonical files

- `ccb-installer/packages/vertical/com.wanding.trade/agents/accurate-agent.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md`
- `ccb-installer/config/skills/ccb-subagent-gate/config/modes.json`
- `ccb-installer/config/skills/ccb-subagent-gate/config/roe-judge-profiles/`
- `ccb-installer/config/skills/ccb-subagent-gate/scripts/lib/parse_transcript_roe_judge.py`
- `.trellis/spec/integration/agents-unified-model.md`
- `.trellis/tasks/07-06-accurate-delegation-convergence/`（委派收敛先验）
- Sibling: `.trellis/tasks/07-19-quotation-agent-prompt/`
