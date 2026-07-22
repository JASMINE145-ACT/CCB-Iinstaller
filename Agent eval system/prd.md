你的目标不是做一次性的 Benchmark，而是建立一套类似传统软件：

> 单元测试 + 集成测试 + 日志追踪 + 回归测试 + 线上监控

的 **Agent 工程维护体系**。

我查了一下目前 GitHub 和主流团队的做法。我的结论是：

> **Agent Eval 的核心已经不再是“评估最终回答”，而是把 Agent 当成一个会调用工具、修改状态、产生副作用的非确定性软件系统，持续评估它的结果、过程、状态和可靠性。**

---

# 一、GitHub 上有哪些类似项目

## 1. LangChain AgentEvals

`langchain-ai/agentevals`

它是目前最接近“Agent 轨迹单元测试”的轻量项目，重点不是普通文本质量，而是评估 Agent 的 trajectory，也就是消息、工具调用和中间步骤。

主要支持：

* 工具调用顺序匹配；
* 必须调用哪些工具；
* 任意顺序工具匹配；
* 使用 LLM Judge 判断整体轨迹是否合理；
* Python 和 TypeScript。

它适合你现在的 LangGraph、ReAct、MCP Agent，尤其适合测试：

```text
用户输入
→ Agent 是否选择 quotation MCP
→ 参数是否正确
→ 是否又调用 accurate MCP
→ 最终是否返回正确结果
```

但它主要是一个 **Evaluator 库**，不负责完整的生产观测、数据集管理和 Dashboard。([GitHub][1])

**定位：Agent 行为测试组件。**

---

## 2. Promptfoo

`promptfoo/promptfoo`

它更接近 LLM/Agent 世界里的 `pytest + GitHub Actions + 安全测试`。

主要能力包括：

* YAML 定义测试用例；
* 比较不同模型、Prompt 和 Agent 版本；
* 自定义 Python/JavaScript 断言；
* CI/CD 回归测试；
* Prompt Injection、工具滥用、数据泄露等红队测试；
* PR 改动前后结果对比。

它本地运行、MIT 开源，并且很适合在每次修改 Prompt、Skill、Tool Schema 或模型之后自动跑一次回归测试。([GitHub][2])

**定位：Agent CI 回归和安全测试入口。**

---

## 3. Langfuse

`langfuse/langfuse`

Langfuse 更偏向完整的 LLMOps 平台：

* Trace；
* Prompt 管理；
* 数据集；
* 线上评分；
* 成本和延迟；
* 实验对比；
* 生产监控；
* 自托管。

它适合回答：

```text
这次任务到底经过了哪些 Agent？
调用了哪些 MCP？
每一步用了多少 Token？
哪里报错？
模型升级后失败率有没有增加？
```

Langfuse 更像 Agent 系统的“日志中心和质量后台”，而不是单纯测试框架。([GitHub][3])

**定位：生产 Trace、数据积累和质量监控。**

---

## 4. Arize Phoenix

`Arize-ai/phoenix`

Phoenix 和 Langfuse类似，但更强调 OpenTelemetry、OpenInference 和本地开发。

它提供：

* Agent/LLM Trace；
* Dataset 版本管理；
* Prompt、模型、检索实验；
* Response 和 Retrieval Eval；
* LangGraph、OpenAI Agents、Claude Agent SDK 等集成；
* 本地直接 `phoenix serve`；
* Docker/Kubernetes 自部署。

对于你的 Python、LangGraph、MCP 体系，Phoenix 的优势是接入较轻，而且数据模型更偏开放标准。([GitHub][4])

**定位：开发阶段的可观测性和实验平台。**

---

## 5. Strands Evals

`strands-agents/evals`

这是 2026 年出现的较完整 Agent Eval SDK，已经把很多能力放进一个框架：

* 输出评测；
* Tool Usage；
* Trajectory；
* 多 Agent 交互；
* 多轮用户模拟；
* OpenTelemetry Trace；
* 故障注入；
* Chaos Testing；
* 红队测试；
* 自动生成测试案例；
* 根因分析。

它的方向非常接近“完整 Agent 测试平台”，但项目较新。适合参考设计，不建议你现在直接把自己的维护体系完全绑定在它上面。([GitHub][5])

**定位：新一代综合 Agent Eval SDK。**

---

## 6. Azure AgentOps Accelerator

`Azure/agentops`

这个项目目前名气不算大，但它的设计和你想做的东西最接近：

* 本地 Eval；
* 保存 Baseline；
* 与新版本比较；
* GitHub Actions 质量门禁；
* Trace 导入；
* 将生产失败升级为回归测试；
* 自动生成机器可读 `results.json`；
* 生成 PR 可读报告；
* Release Evidence；
* 线上质量趋势和告警。

尤其值得参考的是：

```text
生产 Trace
→ 发现失败
→ 转成测试案例
→ 加入 Regression Suite
→ PR 自动执行
→ 与 Baseline 比较
→ 决定是否发布
```

这才是一套真正的 Agent 运维闭环。不过它明显偏向 Azure AI Foundry，因此更适合借鉴目录、流程和概念，不一定适合直接采用。([GitHub][6])

**定位：Agent 质量工程和发布管理参考架构。**

---

# 二、目前 Agent Eval 真正的核心是什么

## 1. 评估的对象不是 Model，而是整个 Harness

Agent 的实际表现由很多部分共同决定：

```text
Model
+ System Prompt
+ Skill
+ Context
+ Memory
+ Tool Schema
+ MCP Server
+ Workflow
+ Permission
+ Retry Logic
+ Environment
```

所以模型没变，只要 Tool Description、Skill、路由规则或者 MCP 返回格式改变，Agent 就可能退化。

Anthropic 将其区分为：

* Agent Harness：让模型成为 Agent 的运行系统；
* Evaluation Harness：运行测试、记录轨迹、执行评分、汇总结果的系统。

因此你最终测试的是：

> **Model + Agent Harness 的整体行为。**

而不是单独测试 MiniMax、Claude 或 GPT。([Anthropic][7])

---

## 2. 最终环境状态比 Agent 自己说了什么更重要

例如 Agent 回答：

> 已成功生成报价单，库存充足。

不能仅凭这句话判定成功。

你必须验证：

```text
报价文件是否真的存在
SKU 是否正确
价格是否符合客户等级
库存数据是否来自 Accurate
有没有写入不该写的数据
数据库最终状态是否正确
```

Anthropic明确区分了：

* Transcript：Agent 说了什么、调用了什么；
* Outcome：环境最终发生了什么。

Agent 声称“已经完成”，不代表任务真的完成。([Anthropic][7])

所以你的评测优先级应该是：

```text
环境状态 > 工具返回值 > 工具调用过程 > 最终自然语言
```

---

## 3. Trace 是 Agent Eval 的基础数据

OpenAI现在也把 Trace Grading 作为 Agent 调试的起点。

一条完整 Trace 至少应该包含：

```text
run_id
agent_version
model
prompt_version
skill_version
user_input
context
tool_calls
tool_arguments
tool_results
handoffs
guardrail_results
errors
retries
final_output
final_state
latency
tokens
cost
```

只有先把这些记录下来，才能回答：

* 为什么这次失败？
* 是模型选错工具，还是工具本身失败？
* 是 Tool Schema 变化，还是 Prompt 变化？
* 新版本到底改善了什么？
* 哪一类用户输入最容易出错？

OpenAI也建议先收集高质量 Trace，再把已理解的行为沉淀为可重复数据集和评测。([OpenAI开发者][8])

---

## 4. Eval 必须同时检查结果和过程

比较合理的是四类检查。

### Outcome Check

检查事情是否真正完成：

```text
报价金额正确
文件存在
库存结果正确
数据库状态正确
没有发生多余写入
```

### Process Check

检查关键过程：

```text
必须调用 get_inventory
禁止调用 update_inventory
customer_id 参数必须正确
写操作前必须经过确认
```

### Quality Check

检查开放式质量：

```text
是否清楚解释库存不足
是否说明数据来源
是否给用户可执行的下一步
```

### Efficiency Check

检查是否出现 Agent Thrashing：

```text
工具调用次数
重复查询次数
总轮数
Token
延迟
重试次数
```

OpenAI将其概括为 outcome、process、style、efficiency 几类目标。([OpenAI开发者][9])

---

## 5. 确定性检查优先，LLM Judge 作为补充

评分优先顺序应该是：

```text
代码断言
→ 数据库/文件状态验证
→ Tool Call 参数验证
→ 规则和正则
→ LLM Judge
→ 人工抽查
```

可以程序判断的内容，不应该交给另一个 LLM：

```python
assert quote.total == expected_total
assert "update_inventory" not in called_tools
assert inventory_result.source == "accurate"
```

LLM Judge 更适合判断：

* 表达是否专业；
* 是否完整解释；
* 是否遵守模糊业务规范；
* 多条合法路径中哪条更合理。

Anthropic建议尽可能使用 deterministic graders，只在必要时使用模型评分，并通过人工评审校准 LLM Judge。([Anthropic][7])

---

## 6. 不要把 Agent 的路径写得过死

例如你规定唯一正确路径：

```text
先查客户
→ 再查库存
→ 再查产品
→ 再生成报价
```

但 Agent 可能采用另一条同样正确的路径：

```text
并行查询客户和产品
→ 查询库存
→ 生成报价
```

如果最终结果正确、权限合规、没有危险操作，就不应该因为顺序不同判错。

因此过程 Eval 最好定义：

* 必须发生什么；
* 禁止发生什么；
* 哪些步骤有顺序要求；
* 哪些顺序可以自由；
* 最终环境状态是什么。

Anthropic也提醒，严格要求完整工具序列容易形成脆弱测试；通常应该优先评估产出和关键约束，而不是要求 Agent 完全照着设计者预想的路径执行。([Anthropic][7])

---

# 三、适合你的体系结构

结合你现在的：

```text
AionUI
→ ccb-acp-agent
→ ccb-runtime
→ MiniMax
→ quotation / accurate MCP
```

我建议不要直接引入一个巨大平台，而是建立自己的 `agent-evals` 层：

```text
agent-project/
├── src/
├── skills/
├── prompts/
├── mcp/
├── evals/
│   ├── contracts/
│   ├── datasets/
│   │   ├── smoke/
│   │   ├── regression/
│   │   ├── capability/
│   │   ├── safety/
│   │   └── robustness/
│   ├── graders/
│   │   ├── outcome.py
│   │   ├── tools.py
│   │   ├── permissions.py
│   │   ├── response.py
│   │   └── efficiency.py
│   ├── fixtures/
│   ├── runners/
│   └── baselines/
└── traces/
```

单个案例可以定义为：

```yaml
id: quote_inventory_001

input:
  message: 查询 A001 库存，并为 B 级客户报价 50 件

expected_outcome:
  sku: A001
  quantity: 50
  inventory: 120
  unit_price: 35000
  total_price: 1750000

required_tools:
  - get_customer_level
  - get_inventory
  - calculate_quote

forbidden_tools:
  - update_inventory
  - send_quote

constraints:
  require_confirmation_before_write: true
  max_tool_calls: 6
  max_retries: 2

graders:
  - outcome
  - tool_arguments
  - permission
  - response_quality
  - efficiency
```

---

# 四、你真正要建立的维护闭环

```text
日常开发
↓
运行 10～20 条 Smoke Eval
↓
提交 PR
↓
运行完整 Regression + Safety Eval
↓
和 Baseline 比较
↓
达到质量门槛后发布
↓
线上收集 Trace
↓
人工抽查失败和低评分 Trace
↓
将真实失败转成新的测试案例
↓
进入 Regression Suite
```

初期不需要几百个案例。Anthropic建议可以先从约 20～50 个真实任务或真实失败开始，再持续扩充；同时要分别维护“能力测试”和接近满分要求的“回归测试”。([Anthropic][7])

---

# 五、我的具体选型建议

你的第一版可以采用：

```text
pytest
    负责确定性业务断言和状态检查

AgentEvals
    负责轨迹、工具选择和开放路径判断

Phoenix 或 Langfuse
    负责 Trace、Replay、Dataset 和生产观测

Promptfoo
    负责 CI 回归矩阵和安全红队
```

其中：

* **Phoenix** 更适合当前个人开发、本地启动、Python/LangGraph；
* **Langfuse** 更适合未来团队协作、自托管 Dashboard；
* **Azure AgentOps Accelerator** 最适合拿来参考你的整体目录和发布流程；
* **Strands Evals** 可以持续观察，但暂时不建议把它作为核心依赖。

最核心的公式可以定义为：

[
Agent\ Quality =
Outcome

* Critical\ Process
* Safety
* Reliability
* Efficiency
  ]

而不是：

[
Agent\ Quality = LLM\ Judge(Final\ Answer)
]

**所以 Agent Eval 的本质不是“给 Agent 打分”，而是把每一次 Agent 失败转化成一个永远不会再次发生的自动化回归测试。**

[1]: https://github.com/langchain-ai/agentevals "GitHub - langchain-ai/agentevals: Readymade evaluators for agent trajectories · GitHub"
[2]: https://github.com/promptfoo/promptfoo "GitHub - promptfoo/promptfoo: Test your prompts, agents, and RAGs. Red teaming/pentesting/vulnerability scanning for AI. Compare performance of GPT, Claude, Gemini, DeepSeek, and more. Simple declarative configs with command line and CI/CD integration.  Used by OpenAI and Anthropic. · GitHub"
[3]: https://github.com/langfuse/langfuse?utm_source=chatgpt.com "langfuse/langfuse: 🪢 Open source AI engineering platform ..."
[4]: https://github.com/arize-ai/phoenix "GitHub - Arize-ai/phoenix: AI Observability & Evaluation · GitHub"
[5]: https://github.com/strands-agents/evals "GitHub - strands-agents/evals: A comprehensive evaluation framework for AI agents and LLM applications. · GitHub"
[6]: https://github.com/Azure/agentops "GitHub - Azure/agentops: AgentOps Accelerator is an open source framework and CLI for adding continuous evaluation and observability to enterprise AI agents. It standardizes evaluation patterns, automates assessments in CI/CD workflows, and generates structured signals that help teams monitor, control, and safely operate agentic systems at scale. · GitHub"
[7]: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents "Demystifying evals for AI agents \ Anthropic"
[8]: https://developers.openai.com/api/docs/guides/agent-evals "
  Evaluate agent workflows | OpenAI API
"
[9]: https://developers.openai.com/blog/eval-skills "
  Testing Agent Skills Systematically with Evals | OpenAI Developers
"
