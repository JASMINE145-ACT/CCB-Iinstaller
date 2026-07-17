# Agent Eval Plugin：当前成果总览

> 更新时间：2026-07-16
>
> 当前定位：**Internal MVP（内部可用的最小产品）**
>
> Task 状态：`in_progress`

## 1. 我们在做什么

目标不是再造一个独立的 Agent CLI，而是做一套可以嵌入 **Claude Code、Codex 和 Cursor** 的 Agent Eval Plugin。

用户用真实业务描述一个 Eval Case，并为这个 Case 单独描述：

- 用户需求和理想结果；
- 理想业务流程；
- 必须调用、禁止调用的工具；
- 参数、顺序、证据关系和输出格式；
- 哪些项目必须确定性通过，哪些开放项由当前宿主 AI 判断。

Harness 随后在隔离子会话中运行被测 Agent，收集真实工具调用证据，先执行确定性硬门禁，再由当前 Claude/Codex/Cursor 会话中的 AI 完成软项判断。整个过程不额外调用第二个 LLM Judge API。

## 2. 当前架构

```text
Claude Code / Codex / Cursor
        ↓ 自然语言触发 Plugin Skill
Agent Eval Plugin
        ↓
Shared Harness Core
        ├─ Case 确认与 Hash 锁定
        ├─ Event / Trace 标准化
        ├─ 六类确定性 Hard Grader
        ├─ 当前宿主 AI Judge Packet
        ├─ Trial 指标、Report、Baseline
        └─ FAIL / ERROR / BLOCKED / NEEDS_REVIEW 状态判定
        ↓
Runtime Adapter
        ↓
被测 Agent 的隔离子会话
```

职责已经分离：

| 层 | 当前职责 |
| --- | --- |
| Plugin / Host Wrapper | 接收自然语言请求，组织创建、确认、运行、复核和报告流程 |
| Harness Core | 唯一评测语义来源；三个宿主不复制判断逻辑 |
| Runtime Adapter | 启动目标 Agent、采集工具事件、快照和清理会话 |
| Project Eval Pack | 保存某个项目自己的 Case、业务动作和评判标准 |

内部存在 `scripts/agent-eval.mjs` 作为 Plugin 与 Core 之间的确定性协议，但它不是要求用户学习和操作的新 Agent CLI。

## 3. 已完成的能力

### 3.1 标准化 Case

- 支持从真实业务场景生成 `eval.case/v1` 草案。
- Case 必须展示给用户并显式确认。
- 确认后生成稳定的 canonical SHA-256 Hash。
- 未确认、被修改或 Hash 不一致的 Case 无法运行。
- 不同 Case 可以组合完全不同的流程、Grader 和 Rubric。

### 3.2 标准证据模型

- 已实现 `Event`、`Trace`、`Judgment`、`Report` 五类 v1 Contract。
- ACP 工具调用的输入和完整 `rawOutput` 可以被采集，不再只看工具入参。
- Event 区分原始证据和派生证据，不能根据 Agent 自己声称“已经调用工具”推导成功。
- Trace 记录 Adapter 版本和 Prompt Hash。
- 无法获得的 Agent、Model、Skill、知识库、工具和环境指纹使用 `null + unavailable_reason`，不伪造版本信息。
- 原始 Trace、私有报告和未脱敏运行数据默认不进入 Git。

### 3.3 六类确定性硬 Grader

已实现并注册：

1. `tool_presence`：必须调用指定工具；
2. `tool_forbidden`：禁止调用指定工具或动作；
3. `sequence`：验证 Case 特定的动作顺序；
4. `tool_args`：验证工具参数；
5. `evidence_link`：验证不同工具和最终输出之间的数据来源关系；
6. `structured_output`：验证表格或结构化输出。

任何 Hard Grader 失败都会保持 `FAIL`，AI Judge 的高分不能覆盖硬失败。

### 3.4 当前宿主 AI Judge

- 所有目标 Trial 完成后才生成 Judge Packet。
- Trial 会匿名化并随机排序。
- 当前父会话一次性提交整个批次的 Judgment。
- 不调用额外 Judge 模型 API。
- Judge 必须记录真实的 Host、Model、Version 和 Rubric Hash。
- 没有当前 AI 时进入 hard-only：保留硬门禁结果，软项为 `NEEDS_REVIEW`，不伪造 Judge 或 Packet。
- Packet 明确把 Agent 文本和工具输出视为不可信数据，Judge 不得执行证据中嵌入的指令。
- 报告明确标记 `independent_trials: false`，不把同一父会话的三次判断伪装成独立 Judge 样本。

### 3.5 Trial、状态、报告与 Baseline

- 支持多 Trial，当前 CCB Case 默认三次。
- 输出 pass@1、pass@3、pass³、Flaky、错误率、延迟、工具调用量和软评分统计。
- 严格区分：
  - `FAIL`：Agent 业务行为不符合 Case；
  - `ERROR`：Adapter、子进程或运行环境异常；
  - `BLOCKED`：权限、配置、依赖或数据不可用；
  - `NEEDS_REVIEW`：硬门禁通过，但必需软项还没有可靠判断。
- 混合 Trial 中，只有真正待软评且有 Trace 的 Trial 会进入 Judge Packet；故障 Trial 保持原状态。
- JSON/Markdown Report 保留每个 Trial 的稳定 reason code 和安全的错误摘要。
- Baseline 只能由通过的 Report 显式提升，不能自动覆盖。
- Baseline 支持比较并将 Delta 写回 JSON/Markdown Report。
- 目标指纹不完整或不匹配时，硬软指标均为 `NOT_COMPARABLE`；Judge/Rubric 不同则仅软分不可比较。

### 3.6 跨宿主与旧 Eval 兼容

- Claude Code、Codex、Cursor 已具有共享 Plugin/Skill Contract 和 Manifest。
- 三个 Host Wrapper 都指向同一个 Core，没有复制 CCB 报价业务规则。
- 已有 `eval/` 的 80 个旧案例被保留，没有破坏性删除或整体重写。
- 已实现只读 Legacy Importer，把可确定映射的旧案例转换为新 Case 草案。
- 无法安全翻译的 `pass_if_any` 等语义会明确拒绝，不猜测业务含义。
- 历史 match-first 断言已与当前生产 Read-first 契约对齐。

## 4. 第一条 CCB 报价 Eval

第一条锁定 Case：`quotation-direct50-price-stock`。

用户需求示例：

> 查询直接 50 的 B 级价格并查库存，用表格列出结果。

当前黄金路径：

```text
Read 业务知识库
  -> match_quotation 确认报价候选
  -> 使用候选编码查询库存
  -> 输出价格和库存表格
```

这里没有虚构 `candidate.confirm` 工具事件。候选是否选对由确定性证据关系验证：

- 库存查询编码必须属于 `match_quotation` 候选集；
- 表格编码必须等于库存查询编码；
- 表格价格必须来自同一报价候选；
- 表格库存必须等于库存工具结果；
- 表格必须包含产品、规格、物料编码、B 级价格和库存。

针对缺少 Read、使用禁用工具、顺序错误、客户等级参数错误、库存编码不属于候选、表格缺列等情况，都已有独立负向测试。

## 5. 当前验证程度

最新完整验证结果：

| 验证项 | 结果 |
| --- | --- |
| Plugin 单元、Contract、集成和 E2E | **57/57 PASS** |
| ACP 完整输出 Recorder | **3/3 PASS** |
| 旧 Eval 全案例 Schema | **80/80 PASS** |
| 旧 Eval Smoke Suite | **16/16 PASS** |
| 官方 Plugin Validator | **PASS** |
| JavaScript Syntax / `git diff --check` | **PASS** |
| Trellis implement/check context | **PASS：8 / 7 entries** |

Sanitized Fixture 已经完成三次隔离 Trial、六个硬门禁、当前 Codex 会话批量 Judgment 和最终 Report，结果为 PASS。该结果证明 Harness 主链路可以工作，但不代表真实生产报价 Agent 已经通过。

## 6. 目前做到什么程度

### 已达到：Internal MVP

以下部分已经形成可执行产品骨架：

- 通用标准和核心架构；
- 可锁定的 Case；
- 完整工具证据采集；
- 六类硬门禁；
- CCB ACP Adapter；
- 当前宿主 AI Judge；
- hard-only；
- 多 Trial 指标；
- Report 和 Baseline；
- 三宿主共享 Contract；
- 旧 Eval 渐进兼容；
- 自动化测试和系统审查。

这意味着：现在已经不是只有设计文档或 Demo，Core 和第一条 Eval 都可以实际运行，也能准确识别成功、业务失败和基础设施故障。

### 尚未达到：真实业务可交付产品

当前不能宣称报价 Agent 已经通过生产黄金路径，原因有两类：

1. **真实 Route B 目标 Agent 尚未通过。**
   - 早期 Live Run 返回默认 Router Persona，零个业务工具调用，被 Harness 正确判为业务 `FAIL`。
   - 2026-07-16 最终 Live Run 返回 `ERROR / ADAPTER_EXECUTION_ERROR / CHILD_EXIT(1)`。
   - Harness 没有把环境故障误判为 Agent 业务失败，没有生成 Judge Packet，也没有留下新进程或 Temp 会话。

2. **人工宿主验收未全部完成。**
   - Codex：当前会话的 Fixture Judge Smoke 已完成。
   - Claude Code：自动化 Wrapper E2E 已完成，真实自然语言安装/加载 Smoke 未完成。
   - Cursor：Manifest/Contract 测试已完成，真实自然语言安装/加载 Smoke 未完成。

因此 Trellis Task 保持 `in_progress`，没有归档。

## 7. 还没有覆盖的产品能力

以下项目明确不应被误认为已经完成：

- 真实生产报价 Agent 的黄金 Case PASS；
- Claude Code 和 Cursor 的人工会话验收；
- CCB 之外的第二种 Runtime Adapter；
- Dashboard、云端服务和生产 Trace 采样；
- 对 `write_file`、`external_side_effect` Case 的二次执行授权策略；
- 面向真实客户数据的可配置 PII 脱敏策略；
- Adapter 自动生成完整 Agent、知识库、工具和环境指纹；
- 独立 Judge 样本或第二模型复核。

## 8. 下一步主线

建议严格按以下顺序继续：

1. 修复真实 CCB Route B 的 Profile、Persona、工具可用性或退出问题；
2. 使用现有锁定 Case 重跑，不能为了迁就目标 Agent 而降低 Grader；
3. 真实完成 `Read -> match -> inventory -> table` 后，由当前宿主完成一次批量 Judgment；
4. 完成 Claude Code 自然语言 create/confirm/run/review/report Smoke；
5. 完成 Cursor 同样的宿主 Smoke；
6. 满足 PRD 剩余验收项后，再决定是否完成并归档 Trellis Task。

如果下一阶段准备支持其他 Agent 项目，应先新增对应的 Runtime Adapter 和 Project Eval Pack，而不是把新项目的业务逻辑写进 Core 或 Host Wrapper。

## 9. 关键文件入口

- 产品说明：[`agent-eval-plugin/README.md`](../../../agent-eval-plugin/README.md)
- 宿主 Skill：[`agent-eval-plugin/skills/agent-eval/SKILL.md`](../../../agent-eval-plugin/skills/agent-eval/SKILL.md)
- 永久代码规范：[`spec/agent-eval/index.md`](../../spec/agent-eval/index.md)
- 本任务 PRD：[`prd.md`](./prd.md)
- 执行计划：[`execution-plan.md`](./execution-plan.md)
- 最终系统审查：[`research/final-system-review-2026-07-16.md`](./research/final-system-review-2026-07-16.md)
- CCB 锁定 Case：[`quotation-direct50-price-stock.json`](../../../.agent-eval/cases/quotation-direct50-price-stock.json)

## 10. 本分支提交记录

```text
11824b13  capture complete ACP tool evidence
d901dbda  add plugin contracts and locked CCB case
3fb851e7  add evidence-based hard graders
aa1a1dba  add CCB ACP adapter and hard-only runner
c2a949ea  add current-host judgment and baselines
0f3715c6  add embedded host wrapper workflow
fcbe3062  add legacy importer and cross-host contracts
b661bf81  close harness system-review gaps
```

当前实现位于分支 `feat/agent-eval-plugin-harness`，隔离 Worktree 为 `D:\tmp\claude-code-best-agent-eval-plugin`。
