# Agent Eval Plugin Harness

## Goal

基于 `Agent eval system/` 的研究体系和现有 `eval/` 实际资产，设计并分阶段实现一个可嵌入 Cursor、Codex 和 Claude Code 的 Agent Eval Plugin。用户用真实业务描述 Case 和理想流程；Plugin 通过 Adapter 运行隔离的目标 Agent，执行确定性硬门禁，并由当前父会话 AI 在同一宿主工作进程中完成开放项判断，不调用第二个 LLM Judge API。

## Requirements

- 产品入口是跨宿主 Plugin/Skill，不是新的用户级 Agent CLI。
- 一个 Harness Core 作为权威实现，三个宿主 Wrapper 不复制业务逻辑。
- Core、Runtime Adapter 和 Project Eval Pack 职责分离。
- 评判标准按 Case 组合，标准化 Case、Grader、Trace、Judgment、Metric 和 Report Contract。
- 确定性硬门禁优先，当前 AI Judge 不能覆盖硬失败。
- 被测 Agent 运行在隔离子会话，当前父会话 AI 承担 Judge。
- 第一条可执行 MVP 只实现 CCB ACP Adapter、Claude Code Wrapper 和一条“直接50报价并查库存”黄金 Case；Codex/Cursor Wrapper 随后进入 v1。
- 黄金顺序固定为 `Read -> match_quotation -> inventory.query -> table`；候选选择通过库存编码属于 match 候选集的证据关系验证，不虚构独立 `candidate.confirm` 事件。
- Phase 0 必须对齐生产 Read-first 契约与旧 Eval 案例，并验证无截断 `rawOutput` 采集。
- 支持无当前 AI 的 hard-only 模式；存在必需软 Rubric 时输出 `NEEDS_REVIEW + judgment_pending`。
- Judgment 记录 Judge Fingerprint；软分只在 Judge 与 Rubric 可比时计算 Delta。
- 保留现有 `eval/`，采用非破坏性渐进导入。

## Acceptance Criteria

- [ ] Claude Code 用户能用自然语言创建标准 Case 草案并完成第一条端到端 MVP。
- [x] Case 在运行前经过用户确认并锁定 Hash。
- [x] CCB Adapter 能执行隔离 Agent 会话并输出结构化 Event/Trace。
- [x] 六类硬 Grader 覆盖工具存在、禁用工具、顺序、参数、证据关联和表格结构。
- [x] 黄金路径任一步缺失、乱序或证据不一致时稳定输出 `FAIL`。
- [x] 当前 AI 通过 Judge Packet 提交结构化 Judgment，且不能覆盖硬门禁。
- [x] hard-only 运行保留确定性结果，必需软项未判断时不输出完整 `PASS`。
- [x] Judgment 包含 Host、Model、Version 和 Rubric Hash。
- [x] Adapter/环境故障与 Agent 业务失败严格区分。
- [x] 三次 Trial 输出 pass@1、pass@3、pass^3、Flaky 和延迟指标。
- [x] 现有 `eval/` 在迁移期间保持可运行。
- [ ] Codex/Cursor Wrapper 在 v1 阶段通过 Package/Schema/Contract 测试，并各有一次人工宿主 Smoke 记录。

## Definition of Done

- Schema、Core、Adapter SDK、CCB Adapter、CCB Eval Pack 和 Claude Code Wrapper 有自动化验证；Codex/Cursor 有可自动化的契约验证与人工宿主 Smoke。
- 黄金 Case 端到端通过，并有针对每个硬失败条件的负向测试。
- 原始 Trace 和敏感 Artifact 默认不进入 Git。
- 文档包含安装、创建 Case、运行、复核、报告、Baseline 和故障排查。
- 实施按 Trellis 计划、检查和提交门禁完成。
- Phase 0 形成 Read-first 契约对齐和 ACP `rawOutput` 完整性 Spike 记录。

## Technical Approach

采用 `Plugin + 内嵌 Harness Core + Runtime Adapter + Project Eval Pack`。详细架构、Schema、数据流、安全边界、MVP 和渐进迁移见 [`Agent eval system/eval-harness-plugin-design.md`](../../../Agent%20eval%20system/eval-harness-plugin-design.md)。

## Decision (ADR-lite)

**Context**：用户希望直接在 Cursor、Codex 和 Claude Code 的当前 AI 进程中使用 Eval，不希望操作一个新的 Agent CLI，也不希望 Harness 再调用一个 Judge API。现有 `eval/` 已提供 CCB 专用 Runner 和案例，但缺少通用契约和跨宿主入口。

**Decision**：以 Plugin 为产品入口，内部使用通用 Core；当前父会话 AI 创建 Case 并判断开放项；目标 Agent 在 Adapter 管理的隔离子会话中运行；CCB ACP 作为第一个 Adapter；业务规则位于 CCB Eval Pack。

**Consequences**：获得跨宿主一致性、证据化硬门禁和可扩展 Adapter；代价是需要维护三个薄 Wrapper，并严格处理当前 AI Judge 与被测 Agent 的会话隔离。Claude Code 是第一条端到端 MVP；Codex/Cursor 在 v1 完成契约验证与人工 Smoke。

## Out of Scope

- Web Dashboard、云端服务和生产监控。
- 第二个 LLM Judge API。
- 公共 Benchmark 和大规模失败聚类。
- 第一版支持 CCB 以外的 Runtime Adapter。
- 一次性迁移或删除现有 `eval/`。

## Technical Notes

- 研究依据：`Agent eval system/prd.md`、`Agent eval system/deep-research-report (1).md`。
- 现有 Runner：`eval/run-agent-eval.mjs`。
- 现有案例：`eval/agent_eval_cases.jsonl`、`eval/suites/`、`eval/scenarios/`。
- CCB 业务工具契约：`.trellis/spec/backend/mcp-business.md`。
- 跨宿主项目技能已有 `.agents/skills`、`.claude/skills`、`.cursor/skills` 镜像先例。
- CCB Eval Pack 的权威资产存放在本仓库；`D:\CCB-Wanding` 与 `%LOCALAPPDATA%\CCB-Wanding` 仅作为运行目标环境。
- 当前 ACP Bridge 已提供 `tool_call_update.rawOutput`，但现有 native runner 会截断 dump 且 Eval parser 不读取输出，需 Phase 0 Spike。
- 正式设计：`Agent eval system/eval-harness-plugin-design.md`。
