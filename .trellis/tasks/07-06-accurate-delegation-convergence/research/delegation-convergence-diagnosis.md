# Research — 默认路由采购月报 4 次 MCP 根因诊断（transcript 实锤）

**Date:** 2026-07-06
**Task:** `07-06-accurate-delegation-convergence`
**Method:** `Skill: superpowers:systematic-debugging` Phase 1–3；直接解析 live transcript。

## 对照组

| 路径 | 会话 | 业务 MCP | 结果 |
|------|------|----------|------|
| 专家卡片直开（图2） | `temp-b8d12432\5326eee7…jsonl` | **1× summarize** | 月表，达标 |
| 默认路由委派（图1） | `temp-013b0d96\3ab0d3f3…jsonl` | 父会话 **0 次**；subagent **4 次** | 月表+总额，但 4 次调用 |

Transcript 根目录：`%LOCALAPPDATA%\CCB-Wanding\.claude\projects\`。

## 判定 1 — dispatch 隔离正常（排除「助手不独立」假设）

- 父 transcript `3ab0d3f3-e662-4ef2-830f-5b6f5cd467ed.jsonl`：0 次 `mcp__accurate__*`，1 次 `Agent(accurate-agent)`。
- 全部 4 次业务 MCP 都在 `…\subagents\agent-a4a2bf90199766e7c.jsonl`（独立 transcript / 上下文 / MCP 工具集）。
- 历史上确有一例共享态 bug（repeat guard 只按 sessionId 计数），已于 2026-06-17 修复（`repeatGuardScopeKey(sessionId, context.agentId)`，见 `agents-unified-model.md` L1102–1104）。
- View Steps「·5」是 UI 把子代理内部调用平铺，不代表主 agent 在打 MCP。

## 判定 2 — 根因 A：orchestrator 委派加码

父会话中 orchestrator 的 `Agent()` dispatch prompt（实录）：

> 查询公司2026年1-5月的采购额汇总数据。
> 1. 按月份汇总…（用户要的）
> 2. 给出1-5月累计采购总额
> 3. **如可能，列出采购额前5的供应商及其对应金额** ← 用户没问
> 4. 标注口径…

「前5供应商」无法用 summarize 满足（不支持按 vendor 分组），迫使子代理 fetch 明细。

## 判定 3 — 根因 B：子代理重试纪律缺失

Subagent 调用序列（实录）：

| # | 调用 | 参数关键点 | 评价 |
|---|------|-----------|------|
| 1 | `summarize_records` | `purchase-invoice`, `group_by: month` | **SOP 完美命中**，221 条一次出月表——用户问题到此已答完 |
| 2 | `summarize_records` | `group_by: total` | 冗余：月表结果已含合计；被 prompt 单列的「累计」需求诱发 |
| 3 | `fetch_by_date` | vendor 字段, `page_size: 200` | 为「前5供应商」拉明细；只返回 100/221 条（截断） |
| 4 | `fetch_by_date` | **与 #3 参数逐字节相同** | 原参重发，再拿同样 100 条——纯浪费 |

运行时侧：`wrapCanUseToolForWandeOrchestrator`（`agentSessionProfile.ts:763`）见 `context.agentId` 即直通，子代理作用域零强制；SOP（`accurate-agent.md` L66-73）只写了直开场景的「只调 1 次」，未覆盖委派加码与截断重试。

## 假设裁定

| 假设 | 裁定 |
|------|------|
| 助手不独立 / dispatch 串会话 | **REJECTED**（判定 1） |
| orchestrator 委派 prompt 失真 | **部分成立**：不是丢失需求，是**加码**需求 |
| 子代理收敛纪律缺失 | **CONFIRMED**（#2 冗余、#4 同参重发） |
| L1 仍教 ExecuteExtraTool | 已由 `07-06-accurate-purchase-monthly-routing` 修复，本次 4 次调用全部 direct `mcp__accurate__*`，修复生效 |

## 附注

- 最终回复其实含完整月表；「只有总金额」是答案排版把总额置顶造成的观感。
- 更早一次会话（08:57 `temp-5d235e64`）子代理 4×summarize + 7×fetch——同根因更糟样本。
