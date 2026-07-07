# Agent Eval 回归大全（打包 / 功能更新门禁）

## Goal

把现有 `eval/` 基础设施升级为**可重复、可分层、可接入打包流程**的 agent 回归套件，确保每次打包或 agent/MCP/路由改动后，核心行为（委派、工具选择、防幻觉、会话边界）仍成立。

**Phase 2（2026-07-06）：** 扩展 **报价助手 quotation-smoke** — 覆盖查价→库存→填单→三通自动化→learn-by-data→LingWei 批量。

## 背景

- 已有 `eval/agent_eval_cases.jsonl`（67→**72 cases**）、`eval/run-agent-eval.mjs`、`ccb-installer/test-native-acp-agent.mjs`
- 用户反馈：routing-only smoke 不足以替代 UI 手点报价流程
- Golden fixture：`data/smoke/lingwei-6.8-quotation.xlsx`（来自 LingWei6.8报价单）

## Scope

| In | Out |
|----|-----|
| 修复 harness（profile / install dir / env 对齐） | 全量 LLM judge / 评分平台 |
| 分层 suite（smoke / **quotation-smoke** / core / full） | 替换 `test-mcp-health.ps1` |
| **多轮 ACP `prompts[]`** | AionUI renderer / View Steps |
| LingWei xlsx 批量 + VANTSING learn-by-data cases | LingWei learn-by-data（SKILL Phase 2） |
| 接入 checklist + release standard | 每条 case 全自动语义断言 |

## Acceptance criteria

### Phase 1（done）

- [x] Harness + smoke/core/full + PS 入口 + CI schema
- [x] orchestrator-no-price-library-mcp

### Phase 2 — Quotation workflow smoke（2026-07-06）

- [x] `prompts[]` 多轮 harness（同 session 连续 prompt）
- [x] `{{fixture:lingwei-6.8}}` / `{{fixture:vantsing-filled}}` 路径替换
- [x] 6 条用户流程 → 6 cases + `quotation-smoke` suite
- [x] `data/smoke/lingwei-6.8-quotation.xlsx` + manifest
- [x] `eval/scenarios/quotation-workflow-smoke-20260706.md`
- [ ] Live `quotation-smoke` 6/6 PASS（打包机 + API）
- [ ] 可选：LingWei learn-by-data 待 SKILL Phase 2

## Quotation smoke 流程表

| # | 流程 | Case ID |
|---|------|---------|
| 1 | 查询直接50 | `quote-direct50-post-hook-golden` |
| 2 | 进而查库存 | `quote-smoke-direct50-then-inventory` |
| 3 | 填写报价单 | `quote-smoke-fill-direct50-draft` |
| 4 | 三通50+库存+填单 | `quote-smoke-tee50-inventory-fill` |
| 5 | learn-by-data skill | `quote-smoke-learn-by-data-vantsing` |
| 6 | LingWei 批量查询 | `quote-smoke-lingwei-batch-query` |

## Canonical files

- `eval/agent_eval_cases.jsonl`
- `eval/suites/quotation-smoke.json`
- `eval/scenarios/quotation-workflow-smoke-20260706.md`
- `data/smoke/lingwei-6.8-quotation.xlsx`
- `data/smoke/lingwei-6.8-quotation.manifest.json`
- `ccb-installer/test-native-acp-agent.mjs`（multi-turn）
- `ccb-installer/scripts/run-agent-eval-suite.ps1`
