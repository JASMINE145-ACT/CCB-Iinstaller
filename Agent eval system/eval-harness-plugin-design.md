# Agent Eval Plugin Harness 设计

状态：已确认设计  
日期：2026-07-15  
任务：`.trellis/tasks/07-15-agent-eval-plugin-harness`

## 1. 背景与现状

本项目已经存在两类资产：

- `Agent eval system/`：Agent Eval 的研究、架构建议和产品化方向。
- `eval/`：面向 CCB-Wanding/ACP 的实际项目级 Eval Harness，包含案例、Suite、Runner、场景和离线评测。

现有 `eval/` 已经能启动 CCB Agent、收集 ACP 输出，并检查工具是否出现、工具参数、禁用工具和部分响应线索。它是可用的内部评测体系，不只是案例集合。但当前实现仍然与 CCB 仓库和 ACP 日志格式耦合，主要依赖拼接日志和字符串匹配，缺少通用 Case Contract、结构化 Trace、严格顺序断言、证据关联、标准化指标和跨宿主 Plugin 入口。

本设计不重写现有体系。它以现有 `eval/` 为第一个参考实现，抽取通用 Harness Core，再实现 CCB ACP Adapter 与 CCB Eval Pack。

## 2. 产品目标

构建一个可嵌入 Cursor、Codex 和 Claude Code 的 Agent Eval Plugin。用户通过当前正在使用的 AI 描述真实业务、理想流程和失败条件；Plugin 将描述标准化为可执行 Case，通过项目 Adapter 运行目标 Agent，收集证据，执行确定性 Grader，并由当前父会话 AI 在同一宿主工作进程中完成开放性 Rubric 判断。

核心原则：

1. 真实业务优先，而不是公共 Benchmark 优先。
2. Evidence 优先，而不是最终回答文本优先。
3. 确定性硬门禁优先，当前 AI Judge 只判断开放项。
4. 评判标准因 Case 而异，但 Case、Grader、Trace、Judgment 和 Report 的表达方式统一。
5. 不调用第二个 LLM Judge API。
6. 被测 Agent 与 Judge 必须逻辑隔离，不能让被测 Agent 自评。
7. 保留现有 `eval/`，采用渐进导入，不进行一次性迁移。

## 3. 非目标

第一版不包含：

- 面向用户的新 Agent CLI 产品。
- Web Dashboard 或云端服务。
- 第二个 LLM Judge API。
- 自动生产监控与线上 Trace 抽样。
- 公共 Benchmark 平台。
- 大规模失败聚类和自动生成案例。
- 对所有 Agent Framework 的一次性支持。
- 对现有 CCB Eval 的全量替换。

本地 Node/Python 模块可作为 Plugin 的内部确定性执行器，但不是用户产品入口。

## 4. 方案选择

### 4.1 方案 A：仅 Skill 和自然语言约定

由宿主 AI 阅读 Skill，直接运行零散脚本并自行判断。

优点：开发快。  
缺点：证据、数据格式、指标和执行结果不稳定，难以形成可靠回归。

### 4.2 方案 B：Plugin + 内嵌 Harness Core + Adapter（采用）

Plugin 负责宿主集成和当前 AI 工作流；Core 负责标准契约、确定性评测、指标和持久化；Adapter 负责运行目标 Agent；Project Eval Pack 负责业务动作和案例。

优点：满足同进程 AI Judge、跨宿主复用、确定性门禁和项目隔离。  
代价：需要维护少量宿主 Wrapper 和 Adapter SDK。

### 4.3 方案 C：独立 Eval 平台或服务

通过独立服务执行 Agent、调用 Judge、存储 Trace 并提供 Dashboard。

优点：适合大团队和集中运营。  
缺点：偏离“直接嵌入当前 AI”的目标，第一版成本和运维复杂度过高。

### 4.4 决策

采用方案 B。产品入口是 Plugin，不是新 CLI；Core 是 Plugin 内部能力；CCB ACP 是第一个 Runtime Adapter。

## 5. 总体架构

```text
Cursor / Codex / Claude Code
          |
          v
   Agent Eval Plugin
   - 创建 Case
   - 运行 Case/Suite
   - 当前 AI Judge
   - 报告与 Baseline
          |
          v
   Eval Harness Core
   - Schema / Runner / Grader
   - Trace / Metrics / Report
          |
          +----------------------+
          |                      |
          v                      v
   Runtime Adapter         Project Eval Pack
   - 启动目标 Agent         - Action 映射
   - 发送输入               - Cases / Suites
   - 采集原始事件           - 自定义 Grader
   - 状态快照               - Fixtures / Policies
          |
          v
      目标 Agent
```

### 5.1 Agent Eval Plugin

面向用户提供以下能力：

- `create`：当前 AI 将真实业务描述转换成标准 Case，展示并确认后保存。
- `run`：运行单个 Case 或 Suite。
- `review`：让当前 AI 对已有 Judge Packet 或 Trace 做开放项复核。
- `report`：查看 Case 结果、失败证据和 Baseline 差异。
- `baseline promote`：显式提升通过的运行结果为 Baseline。

宿主支持斜杠命令时可以暴露 `/agent-eval:create` 等命令；不支持统一命令格式时，通过同名 Skill 和自然语言触发。三种宿主使用相同语义。

### 5.2 Eval Harness Core

Core 不知道报价、库存或 CCB 的含义，负责：

- Case、Event、Trace、Judgment 和 Report Schema 校验。
- Case/Suite 加载、版本锁定和多次 Trial 编排。
- 标准 Event 流和 Artifact 引用。
- 通用确定性 Grader。
- 硬门禁与软评分聚合。
- pass@k、pass^k、Flaky、延迟和成本指标。
- Baseline 可比性检查和 Delta 报告。
- Judge Packet 生成与 Judgment 校验。
- 运行历史、失败分类和脱敏报告。

### 5.3 Runtime Adapter

Adapter 只负责如何运行目标 Agent，不承载业务规则。统一接口：

```text
prepare(case, workspace) -> environment
startSession(environment) -> session
sendInput(session, message) -> acknowledgement
collectEvents(session) -> raw events
snapshot(environment) -> state reference
cleanup(environment) -> cleanup result
```

第一版实现 `ccb-acp`。未来可以扩展 OpenAI Agents、Claude Agent SDK、LangGraph、HTTP API 和 Transcript Import Adapter。

### 5.4 Project Eval Pack

业务规则不进入 Core 或 Runtime Adapter。CCB 业务资产放在 CCB Eval Pack：

```text
packs/ccb-wanding/
|- actions.yaml
|- cases/
|- suites/
|- graders/
|- fixtures/
`- policies/
```

示例 Action 映射：

```yaml
actions:
  knowledge.read:
    tool: Read
    args:
      file_path_contains: wanding_business_knowledge.md

  quotation.match:
    tool: mcp__quotation__match_quotation

  inventory.query:
    tools:
      - mcp__quotation__get_inventory_by_code
      - mcp__quotation__get_inventory_by_code_batch
```

## 6. 核心运行流程

```text
用户描述真实业务和理想流程
  -> 当前 AI 生成 Case 草案
  -> Core 校验 Case
  -> 用户确认并锁定 Case Hash
  -> Adapter 在隔离子会话中运行目标 Agent
  -> Adapter 将原始事件转换成标准 Event
  -> Core 执行确定性 Grader
  -> 当前 AI 可用：Core 生成 Judge Packet
       -> 当前父会话 AI 按 Rubric 提交 Judgment
       -> Core 校验 Judgment 并聚合结果
  -> 当前 AI 不可用：进入 hard_only
       -> 保留硬门禁结果
       -> 输出 NEEDS_REVIEW + judgment_pending
  -> 保存 Trace、Report 和指标
  -> 可选：显式提升 Baseline
```

若宿主无法创建隔离的目标 Agent 会话，运行结果必须为 `BLOCKED`；不得退化为同一会话自问、自答、自评。

## 7. Eval Case Contract

标准化的是 Case 容器，不是所有业务的评判内容。每个 Case 独立选择流程、Grader、Rubric 和决策策略。

```yaml
version: eval.case/v1

id: quotation-direct50-price-stock
name: 直接50报价并查询库存
suite: regression
owner: quotation-agent

business:
  objective: 根据业务知识选择正确的直接50产品，返回B级价格和真实库存
  source_of_truth:
    - wanding_business_knowledge
    - quotation_match_result
    - inventory_result

input:
  messages:
    - role: user
      content: 帮我查直接50的B级价格和库存

process:
  mode: strict
  steps:
    - id: read_knowledge
      action: knowledge.read
      required: true
    - id: match_product
      action: quotation.match
      required: true
      params:
        customer_level: B
    - id: query_inventory
      action: inventory.query
      required: true
      evidence:
        input_code_must_be_in: match_product.candidates[*].code
    - id: render_table
      action: response.table
      required: true
  order:
    - read_knowledge
    - match_product
    - query_inventory
    - render_table

forbidden:
  actions:
    - inventory.query_before_match
    - fabricate_price
    - fabricate_inventory
    - select_code_outside_candidates
    - delegate_unrequested_agent

output:
  format: markdown_table
  required_columns:
    - 产品
    - 规格
    - 物料编码
    - B级价格
    - 库存
  evidence_rules:
    table_code_must_equal: query_inventory.input.code
    price_must_match_candidate_with_code: query_inventory.input.code
    inventory_must_match: query_inventory.result

judge:
  mode: current_ai_process
  rubric:
    - id: requirement_satisfaction
      description: 是否完整满足报价和库存需求
      weight: 40
    - id: selection_reasoning
      description: 候选选择是否符合业务知识
      weight: 35
    - id: clarity
      description: 表格及说明是否清晰
      weight: 25
  threshold: 80

trials:
  count: 3
  metrics:
    - pass_at_1
    - pass_at_3
    - pass_power_3
    - latency
    - cost
```

CCB 第一条黄金路径固定为：

```text
Read 业务知识库
  -> match_quotation
  -> 使用 match 候选集中的编码查询库存
  -> 输出价格与库存证据一致的表格
```

`candidate.confirm` 不作为独立顺序事件。CCB 当前没有稳定的原始“确认候选”事件；选型正确性由 `evidence_link` 确定性验证：库存调用编码必须属于 `match_quotation` 候选集，表格编码必须等于库存调用编码，表格价格和库存必须分别来自同一候选与库存工具结果。

当前生产契约的权威来源已经是 Read-first：源 Agent、Live Agent 和 PreToolUse Gate 均要求本会话第一次查价前 Read。现有 `eval/agent_eval_cases.jsonl` 中仍有 `read_knowledge_before_match` 等 match-first 历史描述，属于回归资产漂移。Phase 0 必须更新或退役这些冲突断言，但旧 Runner 在新 Harness 验证完成前保持可运行。

## 8. 可组合 Grader

Core 提供通用 Grader Registry：

- `tool_presence`
- `tool_forbidden`
- `sequence`
- `tool_args`
- `evidence_link`
- `state_match`
- `structured_output`
- `latency_budget`
- `cost_budget`
- `current_ai_rubric`
- `human_review`

每个 Grader 标记为 `hard` 或 `soft`。硬门禁失败后，AI Judge 可以解释，但不能把最终结果改成通过。

```yaml
graders:
  - id: knowledge_first
    type: sequence
    severity: hard
    config:
      before: knowledge.read
      after: quotation.match

  - id: candidate_provenance
    type: evidence_link
    severity: hard
    config:
      source: quotation.match.candidates[*].code
      target: inventory.query.input.code
      operator: contains

  - id: table_schema
    type: structured_output
    severity: hard
    config:
      format: markdown_table
      required_columns: [产品, 规格, 物料编码, B级价格, 库存]

  - id: explanation_quality
    type: current_ai_rubric
    severity: soft
    rubric: 候选选择是否结合业务知识给出清晰解释
```

决策策略由 Case 指定：

```yaml
decision:
  policy: all_hard_and_soft_threshold
  hard:
    require: all
  soft:
    aggregate: weighted_average
    threshold: 80
```

其他 Case 可以选择 `hard_gates_only` 或 `human_required` 决策策略；`hard_only` 保留为“运行时没有当前 AI Judge”的执行模式。任何策略都不能通过软评分抵消安全或关键业务失败。

## 9. 标准 Event 与 Trace

### 9.1 Event

Adapter 输出只追加的标准事件：

```json
{
  "schema_version": "eval.event/v1",
  "event_id": "evt-003",
  "trace_id": "trace-123",
  "span_id": "span-003",
  "parent_span_id": "span-001",
  "sequence": 3,
  "timestamp": "2026-07-15T10:00:03Z",
  "type": "tool.call.completed",
  "actor": "quotation-agent",
  "action": "quotation.match",
  "status": "ok",
  "input": {
    "keywords": "直接50",
    "customer_level": "B"
  },
  "output_ref": "artifact://trace-123/match-result.json",
  "origin": "raw",
  "raw_event_ref": "adapter://ccb-acp/update-18",
  "metrics": {
    "latency_ms": 820
  }
}
```

核心事件类型：

- `session.started`
- `user.message`
- `knowledge.read`
- `tool.call.started`
- `tool.call.completed`
- `tool.call.failed`

- `permission.requested`
- `permission.approved`
- `state.snapshot`
- `assistant.message`
- `artifact.created`
- `error`
- `session.completed`

派生事件必须标记 `origin: derived` 并通过 `derived_from` 引用原始事件。不得从 Agent 的自我声明直接推导成功。CCB 的候选选型是 Grader 基于 match 输出、inventory 输入和表格内容生成的派生证据关系，不进入 `sequence` 事件链。

### 9.2 Trace

一次 Trial 形成一个 Trace：

```json
{
  "schema_version": "eval.trace/v1",
  "trace_id": "trace-123",
  "case_id": "quotation-direct50-price-stock",
  "case_version": "sha256:...",
  "adapter": "ccb-acp@1.0.0",
  "agent_version": "quotation-agent@...",
  "model": "...",
  "events": [],
  "artifacts": [],
  "environment_before_ref": "artifact://state/before.json",
  "environment_after_ref": "artifact://state/after.json",
  "metrics": {
    "turns": 1,
    "tool_calls": 3,
    "latency_ms": 5200,
    "tokens": 3200,
    "cost": null
  }
}
```

Trace 必须记录 Case、Adapter、Agent、模型、Prompt、Skill、知识库和工具契约版本或内容 Hash。无法获得的字段使用 `null` 并附带 `unavailable_reason`，不得伪造。

## 10. 当前 AI Judge

Harness 不调用额外模型 API。Core 在确定性评分后生成经过筛选的 Judge Packet，交给当前父会话 AI。

Judge Packet 只包含：

- 业务目标和 Rubric。
- Agent 最终输出。
- 与 Rubric 相关的 Trace/Event 片段。
- 工具和环境证据引用。
- 确定性 Grader 结果。
- `eval.judgment/v1` 输出约束。

当前 AI 提交：

```json
{
  "schema_version": "eval.judgment/v1",
  "judge": {
    "host": "claude-code",
    "model": "current-host-model",
    "version": "host-reported-version",
    "rubric_hash": "sha256:..."
  },
  "batch": {
    "batch_id": "judge-batch-001",
    "trial_order_randomized": true,
    "independent_trials": false
  },
  "scores": {
    "requirement_satisfaction": 95,
    "selection_reasoning": 88,
    "clarity": 92
  },
  "evidence_refs": [
    "event://evt-003",
    "event://evt-006"
  ],
  "reason": "候选选择有业务依据，价格与库存均有工具证据。",
  "confidence": 0.91,
  "needs_human_review": false
}
```

Core 验证分数范围、Rubric 完整性、证据引用、Judge Fingerprint、置信度和硬门禁不可覆盖规则。Judge Packet 默认不提供历史评分。

同一父会话对三个 Trial 逐次评分会产生锚定。MVP 必须先完成全部目标 Agent Trial，再将三个匿名化、随机顺序的 Trial 合成一个 Batch Judge Packet，由当前 AI 一次性提交全部 Judgment。报告必须标记 `independent_trials: false`；软评分的 pass@k/pass^k 不得声称具有独立 Judge 样本含义，确定性硬门禁的多 Trial 指标不受此限制。

当 CI 或其他无当前 AI 的环境运行时，Core 使用 `hard_only`：所有确定性 Grader 正常执行；若 Case 含必需软 Rubric，则最终状态为 `NEEDS_REVIEW`，并记录 `judgment_status: pending`，不能输出完整 `PASS`。

## 11. 指标、Suite、Baseline 与报告

### 11.1 运行状态

- `PASS`：硬门禁和质量阈值全部满足。
- `FAIL`：Agent 行为不符合 Case。
- `ERROR`：Adapter、工具或环境异常，不能归因于 Agent。
- `BLOCKED`：权限、凭据、数据或隔离会话不可用。
- `NEEDS_REVIEW`：证据冲突、AI Judge 置信度不足，或 hard-only 运行仍有必需软 Rubric 未判断。

### 11.2 Suite

- `smoke`：少量关键流程，每次重要修改运行。
- `regression`：已修复历史问题，要求接近 100% 稳定。
- `capability`：新能力爬坡。
- `safety`：越权、注入、危险写入和隐私泄露。
- `robustness`：超时、空结果、429、脏数据和用户改口。
- `cost`：成本、延迟、轮数和工具调用限制。

合法替代路径用显式 `valid_paths` 表达，不使用宽松分支掩盖强制流程。

### 11.3 指标

- `pass@1`
- `pass@k`
- `pass^k`
- `flaky_rate`
- `error_rate`
- `needs_review_rate`
- `latency_p50` / `latency_p95`
- `tool_calls`
- `retries`
- `tokens`
- `cost`
- `success@cost`
- `regression_delta`

发布关键流程以 `pass^k` 为主，不以“多次重试至少成功一次”代替可靠性。

### 11.4 Baseline

Baseline 绑定 Case Set Hash、Adapter、Agent、知识库、工具契约和环境指纹。Judgment 额外绑定 `judge_host`、`judge_model`、`judge_version` 和 `rubric_hash`。硬门禁结果在目标环境指纹可比时可以比较；软评分只有 Judge Fingerprint 和 Rubric Hash 相同时才能计算 Delta，否则软分标记 `NOT_COMPARABLE`。Baseline 只能显式提升，不能在每次运行后自动覆盖。

### 11.5 报告

报告分三层：

1. 摘要：Verdict、Case 通过率、硬门禁、质量、稳定性和相对 Baseline 变化。
2. Case 明细：失败 Grader、Trace/Event 证据和可执行原因。
3. 趋势：Flaky、延迟、成本和失败分类。

不生成可掩盖硬失败的单一全局总分。

## 12. Plugin 打包与项目存储

一个权威实现生成三个薄宿主入口：

```text
agent-eval-plugin/
|- plugin/
|  |- skills/agent-eval/
|  |- core/
|  |- schemas/
|  |- graders/
|  |- report-templates/
|  `- adapter-sdk/
|- hosts/
|  |- codex/
|  |- claude-code/
|  `- cursor/
|- adapters/
|  `- ccb-acp/
`- templates/
```

宿主 Wrapper 只负责 Skill/Command 注册、宿主工具调用、当前会话上下文和 Judgment 提交。Core Contract 只有一份权威来源，不手工维护三份分叉实现。

评测资产属于被评测项目。对于 CCB，权威 Eval Pack、Case、Suite 和脱敏 Baseline 存放在源码仓库 `D:\Projects\claude-code-best`；`D:\CCB-Wanding` 与 `%LOCALAPPDATA%\CCB-Wanding` 是 Adapter 读取和运行的目标环境，不是评测资产的权威来源：

```text
.agent-eval/
|- config.yaml
|- cases/
|- suites/
|- graders/
|- baselines/
|- runs/
`- reports/
```

`runs/`、原始 Trace 和未脱敏 Artifact 默认加入项目忽略规则；Case、Suite、Grader 和脱敏 Baseline 摘要可以版本化。

## 13. 安全与隔离

1. 目标 Agent 在独立子会话运行，当前父会话 AI 负责 Judge。
2. Case 确认后锁定 Hash，运行期间不可修改。
3. 默认仅允许 `read_only` Case。
4. 写文件、数据库或外部操作必须显式声明副作用级别和审批策略。
5. 每次运行使用隔离工作区和 Fixtures。
6. Trace 必须清理密钥、Token、客户隐私和敏感工具结果。
7. Adapter 异常判为 `ERROR`，不能误判成 Agent `FAIL`。
8. AI Judge 不能覆盖硬门禁。
9. Baseline 只能显式提升。
10. Cleanup 失败必须报告残留路径和状态，不得静默忽略。

## 14. MVP 范围

第一条可执行 MVP 使用 Claude Code Wrapper 完成端到端报价 Eval，因为 CCB 目标运行时本身基于 Claude Code/ACP：

```text
自然语言业务描述
  -> 当前 AI 生成标准 Case
  -> 用户确认
  -> CCB Adapter 启动 quotation-agent
  -> 采集 ACP 结构化 Event
  -> 验证严格业务路径和证据
  -> 当前 AI 完成开放项评分
  -> 输出报告
  -> 保存三次 Trial 指标和 Baseline
```

MVP 必须交付：

1. `eval.case/v1`、`eval.event/v1`、`eval.trace/v1`、`eval.judgment/v1`。
2. Agent Eval Skill 和可端到端运行的 Claude Code Wrapper。
3. Case 创建、校验、确认和版本锁定。
4. CCB ACP Adapter。
5. CCB Wanding Eval Pack。
6. 工具存在、禁用工具、顺序、参数、证据关联、表格结构六类硬 Grader。
7. Judge Packet 与当前 AI Judgment 提交。
8. 单 Case 报告和三次 Trial 指标。
9. 项目本地 `.agent-eval/` 存储。
10. 从现有 `eval/` 导入案例的非破坏性入口。

Codex 和 Cursor Wrapper 属于 v1 交付范围，不阻塞第一条 Claude Code 黄金链路。两者必须通过自动化的 Package/Schema/Contract 测试，并各完成一次记录在案的人工宿主 Smoke；不得宣称无法程序化驱动的宿主会话已经完成全自动 E2E。

## 15. 验收标准

- [ ] Claude Code 用户可以用自然语言创建报价 Case 草案并完成端到端运行。
- [ ] Plugin 在保存前展示标准化 Case 并要求用户确认。
- [ ] Case 确认后生成稳定 Hash，运行中修改会被拒绝。
- [ ] CCB Adapter 能启动隔离的 `quotation-agent` 会话并采集结构化事件。
- [ ] 黄金 Case 严格验证 `Read -> match_quotation -> inventory.query -> table`。
- [ ] 缺失 `Read` 或 `match_quotation` 必须判为 `FAIL`。
- [ ] 任意流程乱序必须判为 `FAIL`。
- [ ] 候选编码不来自匹配结果必须判为 `FAIL`。
- [ ] 库存查询编码不属于 match 候选集必须判为 `FAIL`。
- [ ] 表格价格或库存与工具证据不一致必须判为 `FAIL`。
- [ ] 当前 AI 可以提交开放项 Judgment，但不能覆盖硬门禁。
- [ ] 无当前 AI 时使用 hard-only；必需软项未判断时输出 `NEEDS_REVIEW + judgment_pending`。
- [ ] Adapter 或环境故障输出 `ERROR` 或 `BLOCKED`，不计为 Agent 业务失败。
- [ ] 三次 Trial 输出 pass@1、pass@3、pass^3、Flaky 和延迟指标。
- [ ] Judgment 记录 Judge Fingerprint；软分只在 Fingerprint 与 Rubric Hash 相同时比较。
- [ ] 现有 `eval/` 在 MVP 验证期间保持可运行且不被自动迁移。
- [ ] v1 的 Cursor、Codex、Claude Code Wrapper 使用同一套 Case 和 Report Contract；Cursor/Codex 有契约测试和人工 Smoke 记录。

## 16. 渐进迁移

1. 冻结现有 `eval/` 为 CCB 参考行为，不立即重构。
2. Phase 0 对齐生产 Agent、Live Agent、PreToolUse Gate 与旧 Eval 案例的 Read-first 契约；更新或退役 match-first 冲突断言。
3. Phase 0 验证 CCB ACP `tool_call_update.rawOutput` 的完整性。当前 Bridge 已生成 `rawOutput`，但 native runner 将 update JSON 截断到 3000 字符且现有 parser 忽略输出；Adapter 必须改用无截断结构化 JSONL/对象采集。只有 live dist 确认不提供 `rawOutput` 时，才升级为 ACP Bridge Patch 或 MCP/state snapshot 采集。
4. 从现有案例中选择“直接50报价并查库存”作为第一条黄金 Case。
5. CCB Adapter 将 ACP `tool_call_update` 转换为标准 Event，同时保留 Raw Event 引用。
6. 新旧 Runner 对同一目标流程并行运行，记录结果差异。
7. 只有新 Harness 能解释所有关键差异且黄金 Case 稳定通过后，才逐步导入其他案例。

## 17. 实施拆分建议

实施阶段按小步交付：

0. Phase 0 Spike：Read-first 契约对齐；无截断 `rawOutput` 采集验证；输出书面结论和固定 Fixture。
1. Schema 与项目存储骨架。
2. 标准 Event、Trace 和六类确定性硬 Grader。
3. CCB ACP Adapter、证据关联与黄金 Case。
4. Judge Packet、Batch Judgment、hard-only 和报告。
5. Claude Code Wrapper 端到端 MVP。
6. Baseline、三次 Trial 与旧案例导入。
7. Codex/Cursor Wrapper 契约测试和人工 Smoke，完成 v1 跨宿主交付。

每一步都必须先有自动化验收，再扩展下一层。
