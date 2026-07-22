# Agent Eval 智能体评测的工程化维护体系

检索方法说明：本报告以 **“agent evaluation / agent eval / trajectory evaluation / trace grading / LLM-as-a-Judge / tool-use benchmark / conversational agent benchmark / computer-use benchmark / safety evaluation / agent observability / regression eval / user simulation / fault injection / prompt injection / MCP benchmark / skills benchmark”** 为核心关键词，在 **arXiv、ACL Anthology、Google Research / Google Cloud / Google Developers Blog、Anthropic Engineering、OpenAI Developers / Cookbook、Meta AI Research、GitHub、Hacker News、Reddit r/MachineLearning、Stack Overflow for Agents、知乎 / SegmentFault** 中进行检索；时间窗口以 **2019–2026** 为主，优先保留 **论文、官方博客/白皮书、README、官方文档** 这类可确定性来源；论坛内容仅用于补充“社区共识”与工程争议点，不作为单一结论依据。核心筛选标准是：**是否讨论多步任务、工具调用、环境状态、轨迹/Trace、可验证评分、回归与线上监控**。citeturn24view0turn24view1turn9view0turn9view1

## 执行摘要

过去两年里，Agent Eval 的重心已经非常明确：**不是给最终回答打一分，而是对“任务结果 + 环境状态 + 执行轨迹 + 工具/权限使用 + 安全/鲁棒性 + 成本/效率”做分层评测**。Anthropic 将 agent 评测对象拆成 task、trial、grader、transcript、outcome、evaluation harness，并特别强调 **outcome 是环境中的最终状态，而不只是 agent 说了什么**；OpenAI 也把 agent eval 的核心表述为 **traces、graders、datasets、eval runs**；Google 则将 agent 评测分成 **final response** 与 **trajectory evaluation** 两层。换句话说，**Agent Eval 当前的核心不是“更聪明的 judge”，而是“更可追溯的执行证据 + 更可复现的验证闭环”**。citeturn11view1turn10view0turn15view1turn13view3

从工程落地看，最稳妥的路线不是一开始追求“大而全 benchmark”，而是先建立一套 **日常维护体系**：把线上真实失败 Trace 收集下来，提炼成小规模高价值数据集；优先写 **确定性 grader**，例如环境状态检查、工具调用约束、参数合法性、权限边界、测试脚本、静态规则；对无法明确程序化判断的部分，再引入 **LLM Judge** 做 rubric 打分；最后再用人工抽检校准 judge。OpenAI 在技能评测文章里非常明确地建议先做轻量的 deterministic checks，再叠加 rubric-based grading；Google 也把测量方法分成 **Ground Truth Checks、LLM-as-a-Judge、Human-in-the-Loop** 三层；Anthropic 则把自动化评测、生产监控、A/B 测试、人审校准视为“瑞士奶酪模型”式的组合防线。citeturn10view3turn10view4turn23view1turn11view0

从研究与基准的演进看，社区共识正从“单次问答正确率”转向“真实环境中的多轮、长程、状态型、可执行评测”。早期代表有 AgentBench、WebArena、GAIA；随后出现了更贴近真实系统的 τ-bench、OSWorld、AppWorld、ToolSandbox；最近则进一步强化了 **可靠性、多次试验一致性、技能增益、证据支持、长时任务效率、安全风险** 等维度，例如 τ-bench 的 pass^k、SkillsBench 的 skill/no-skill 对照、Terminal-Bench 的 outcome-driven 测试、Evidence-Supported Bounds 对“分数是否真的由证据支持”的追问、ATBench / OS-Harm / Vera 对安全与长轨迹风险的系统评估。总体趋势是：**评测正在从 leaderboard 走向 harness、from score to evidence、from static dataset to continuous maintenance**。citeturn26search0turn17view1turn17view2turn17view3turn16view2turn16view5turn18search4turn20view2turn20view1turn19search3turn18search3

因此，如果你的目标不是做一次性 benchmark，而是维护一套日常开发 Agent 的质量体系，那么最值得投入的不是某个单独框架，而是五件事：**统一 Trace schema、建立分层 grader、固定回归集、把生产失败转成测试、把成本/安全/权限纳入门禁**。这套体系最好供应商中立，尽量建立在 OpenTelemetry/OpenInference 兼容的 Trace 基础上，外层再接 Langfuse、Phoenix、Promptfoo、AgentOps、ADK 或自研脚本。Anthropic、OpenAI、Google、Meta 的官方实践都在强调同一件事：**先把 agent 变成可观察、可复跑、可比较、可回归的系统，再谈优化模型和提示词**。citeturn9view10turn9view9turn22view0turn9view8turn27view2turn14view1turn9view5

对你这样的“日常开发 Agent 维护体系”场景，我的结论是：**把 Agent Eval 视作 AI 时代的测试工程与质量平台，而不是模型打分工具**。最佳实践不是“只做离线 benchmark”，也不是“只看线上日志”，而是建立一个 **内环快评测 + 外环生产监控 + 回归闭环 + 安全/权限验证 + 成本门禁** 的组合系统。这样做，才能在 prompt、tool、router、memory、model 升级频繁变化时，仍然把系统质量控制在团队可管理范围内。citeturn13view0turn13view1turn23view1turn23view0

## 关键发现与研究目标

### 目前 Agent Eval 的核心是什么

当前最有共识的定义可以概括为一句话：**Agent Eval = 对 agent 在真实或近真实环境中完成任务的“结果、过程、约束、代价”进行证据化评测。** 两份近期综述都将 agent eval 的重点放在 **behavior、capabilities、reliability、safety**，以及 **interaction mode、benchmark、metric、tooling** 这些维度上；Anthropic 与 Google 的官方材料则进一步把工程上最重要的对象收敛为 **outcome / trajectory / tool use / memory / safety / latency**。citeturn24view0turn24view1turn23view1turn15view1

这意味着，**最终回答正确** 已经不够。一个 agent 可能回答看似正确，但根本没有访问到正确证据，或者越权调用了工具，或者用了过高代价才完成任务。Anthropic 明确区分 transcript 与 outcome；OpenAI 强调 trace grading 可以回答“是否选对工具、是否发生正确 handoff、是否违反安全策略”；Evidence-Supported Bounds 则直接指出，一些 interactive benchmark 的 outcome check 只看表面信号，会让分数产生误导。citeturn11view1turn10view0turn20view1

另一个核心变化是：**评测对象不是模型本身，而是模型 + harness + tool surface + environment 的组合。** Anthropic 明确指出，评估“agent”实际是在评估 harness 和 model 的联合作用；Efficient Benchmarking of AI Agents 也指出 agent 评测会受到 scaffold-driven distribution shift 影响，解释了为何同一模型在不同 agent 框架中成绩差异很大。对你做日常维护来说，这一点尤其关键：**agent eval 要跟仓库里的 instructions、skills、router、memory、tool contracts 一起版本化，而不是只记录 model name**。citeturn11view1turn20view0

### 研究目标与问题清单

下表给出一套适合日常维护体系的研究目标与问题清单。其内容综合了 Anthropic、OpenAI、Google、Langfuse 与近期综述的共识，并加入工程落地常见项。表中的“建议优先级”是**工程经验建议**。citeturn11view1turn10view0turn10view4turn23view1turn30view0

| 主题 | 你必须回答的问题 | 为什么重要 | 建议优先级 |
|---|---|---|---|
| 核心指标 | 我们究竟以任务完成率、环境状态、工具正确率、用户满意度还是成本为主？ | 没有统一目标，后续评分会失真。citeturn13view0turn23view1 | 极高 |
| Trace 结构 | 是否能完整记录模型调用、工具调用、guardrail、handoff、artifact、state diff？ | 没有 Trace，就无法诊断和回归。citeturn10view0turn11view1turn9view10 | 极高 |
| 可确定性 grader | 哪些维度能用状态检查、测试脚本、schema 检查、参数白名单直接判断？ | 这是最低噪声、最可复现的一层。citeturn10view3turn11view5 | 极高 |
| LLM Judge 的角色 | 哪些问题只能做 rubric 评分？如何做人审校准？ | Judge 可扩展，但有偏差与稳定性问题。citeturn24view2turn24view4turn21view2 | 高 |
| 故障注入 | 工具超时、429、空返回、脏状态、权限拒绝、prompt injection 是否都被测到？ | 真正线上失败往往来自异常路径而非 happy path。citeturn22view1turn32search2turn32search1turn18search3 | 高 |
| 回归闭环 | 新 prompt / model / tool 变更，如何与 baseline 自动比较？ | 没有 baseline，无法稳定防回归。citeturn11view5turn13view1turn27view3 | 极高 |
| 线上监控 | 生产中如何抽样 Trace、标注失败、回灌到数据集？ | 真实流量决定长期有效性。citeturn11view0turn13view1turn30view0 | 极高 |
| 工具/权限校验 | 是否验证了 tool name、参数、顺序、越权调用、审批边界？ | 工具正确性与权限合规是 agent 特有风险。citeturn10view0turn10view4turn14view0 | 极高 |
| 成本/效率 | 每次成功需要多少 turns、tool calls、tokens、latency、美元成本？ | 只追求成功率会把系统推向不可运营。citeturn11view2turn15view1 | 高 |
| 可靠性稳定性 | 同一 case 多次运行是否一致？pass^k 如何？ | 单次成功不代表可上线。citeturn17view3turn16view1 | 高 |
| 用户修正与记忆 | 用户中途改要求时，agent 是否 honor revision？是否能记住关键上下文？ | 这是很多生产 agent 的真实失败模式。citeturn14view3turn23view1 | 高 |
| 证据支持 | 最终回答是否真的由检索/观察/执行痕迹支持？ | 防“看起来对、但过程不实”的伪成功。citeturn20view1turn7search13 | 高 |

### 建议采用的指标视图

下面这张图不是“文献统一标准”，而是**面向日常维护的建议指标权重**。权重本身属于**工程经验建议**；类别划分则参考了 Anthropic、OpenAI、Google 对 outcome、trajectory、tooling、safety、efficiency 的分层。citeturn11view2turn10view4turn23view1

```mermaid
pie showData
    title 建议的离线评测权重
    "任务结果与环境状态" : 35
    "轨迹与工具正确性" : 25
    "鲁棒性与安全" : 20
    "成本与效率" : 10
    "沟通质量与用户体验" : 10
```

如果你的 Agent 是 **coding / data / terminal / ops** 类型，我建议把“任务结果与环境状态”提高到 45% 左右，因为这些场景更适合用确定性验证；如果是 **research / support / assistant** 类型，则应提高轨迹、沟通质量与证据支持的权重，因为这些任务存在多个“可接受答案”。这一点与 Anthropic 对 coding / conversational / research agents 采用不同 grader 组合的建议是一致的。citeturn11view2turn11view5

## 权威论文与官方资料清单

### 权威论文与要点表

下表优先选择了“直接影响工程实践”的论文：要么定义了评测对象，要么提供了接近真实环境的 benchmark，要么给出了可靠性/成本/安全评测的新方法。citeturn24view0turn24view1

| 论文 | 作者 | 年份 | 核心贡献 | 可借鉴点 | DOI/URL | 证据 |
|---|---|---:|---|---|---|---|
| AgentBench: Evaluating LLMs as Agents | Liu et al. | 2023 | 最早系统化把 LLM 当 agent 在多环境中评测，覆盖 8 类环境。 | 适合建立“多环境、多任务族”的最小 benchmark 视角。 | [arXiv](https://arxiv.org/abs/2308.03688) | citeturn26search0 |
| WebArena: A Realistic Web Environment for Building Autonomous Agents | Zhou et al. | 2023 | 构建高真实度、可复现的网页环境，强调真实任务与 reproducibility。 | 如果你有网页 agent，WebArena 的环境化思路比问答集更有价值。 | [arXiv](https://arxiv.org/abs/2307.13854) | citeturn17view1 |
| GAIA: a benchmark for General AI Assistants | Mialon et al. | 2023 | 面向通用助理，强调人类简单但 AI 困难、答案易验证。 | 很适合作为“通用任务 sanity suite”，但不够细粒度。 | [arXiv](https://arxiv.org/abs/2311.12983) | citeturn17view2 |
| τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains | Yao et al. | 2024 | 引入用户模拟、领域规则与数据库状态检查；提出 pass^k 衡量一致性。 | 多轮客服/流程 agent 必须学它的“状态终局 + 多次稳定性”设计。 | [DOI / arXiv](https://doi.org/10.48550/arXiv.2406.12045) | citeturn17view3turn25view0 |
| OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments | Xie et al. | 2024 | 真实操作系统环境、执行式评测、跨 OS 多应用任务。 | GUI/Computer Use agent 应优先关注环境与执行脚本，而非对话评分。 | [DOI / arXiv](https://doi.org/10.48550/arXiv.2404.07972) | citeturn16view2 |
| AppWorld: A Controllable World of Apps and People for Benchmarking Interactive Coding Agents | Trivedi et al. | 2024 | 9 类 app、457 个 API、750 个任务，支持基于状态的单测和 collateral damage 检查。 | 非常适合借鉴“多 app + 状态测试 + 副作用检查”的设计。 | [DOI / arXiv](https://doi.org/10.48550/arXiv.2407.18901) | citeturn16view5 |
| ToolSandbox: A Stateful, Conversational, Interactive Evaluation Benchmark for LLM Tool Use | Lu et al. | 2024 | 状态型工具、对话式评测、动态中间/最终里程碑判定。 | 对“只看最终答案”不满足的工具 agent 很有启发。 | [arXiv](https://arxiv.org/abs/2408.04682) | citeturn18search4 |
| Survey on Evaluation of LLM-based Agents | Yehudai et al. | 2025 | 第一批系统综述之一，梳理核心能力、应用基准、工具框架。 | 适合建立内部知识图谱与 benchmark 地图。 | [arXiv](https://arxiv.org/abs/2503.16416) | citeturn24view0 |
| Evaluation and Benchmarking of LLM Agents: A Survey | Mohammadi et al. | 2025 | 给出“评价目标 × 评价过程”的二维 taxonomy。 | 非常适合转成内部评测 checklist。 | [arXiv](https://arxiv.org/abs/2507.21504) | citeturn24view1 |
| τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment | Barres et al. | 2025 | 把“用户也能改状态”的双控制场景纳入评测，能细分 reasoning vs communication failures。 | 适合测试“用户中途配合、变更、确认”的企业流程 agent。 | [DOI / arXiv](https://doi.org/10.48550/arXiv.2506.07982) | citeturn17view4turn25view1 |
| Terminal-Bench: Benchmarking Agents on Hard, Realistic Tasks in Command Line Interfaces | Merrill et al. | 2026 | outcome-driven 的终端任务框架，强调容器环境、测试验证、参考解。 | coding/ops agent 的最佳借鉴对象之一：测最终环境状态，不绑死路径。 | [arXiv](https://arxiv.org/abs/2601.11868) | citeturn20view2 |
| SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks | Li et al. | 2026 | 首批把 skills 当“一等评测对象”，对比 no-skill / curated-skill / self-generated-skill。 | 如果你在维护 SOP/skills/agents.md，这篇几乎必读。 | [论文页](https://arxiv.org/abs/2602.12670) | citeturn20view3 |
| Efficient Benchmarking of AI Agents | Ndzomga | 2026 | 研究如何用少量任务保持 agent 排名，高度关注评测成本。 | 可用于缩小日常 smoke suite，保留中等难度 case。 | [arXiv](https://arxiv.org/abs/2603.23749) | citeturn20view0 |
| Can Agent Benchmarks Support Their Scores? | Gao & Zhou | 2026 | 引入“evidence-supported score bounds”，把不确定评分显式暴露出来。 | 非常适合你的 Trace schema 与审核清单设计。 | [DOI / arXiv](https://doi.org/10.48550/arXiv.2605.10448) | citeturn20view1 |
| ATBench: A Diverse and Realistic Trajectory Benchmark for Long-Horizon Agent Safety | Li et al. | 2026 | 从 risk source、failure mode、harm 三维做长轨迹安全评测。 | 适合建立安全回归集与风险分层。 | [arXiv](https://arxiv.org/abs/2604.02022) | citeturn19search3 |
| Safety Testing LLM Agents at Scale: From Risk Discovery to Evidence-Grounded Verification | Feng et al. | 2026 | Vera 框架把风险发现、案例生成、证据化验证串成自动化安全测试流水线。 | 最值得借鉴的是“证据而非自报”的 verifier 设计。 | [arXiv](https://arxiv.org/abs/2607.01793) | citeturn18search3turn32search3 |

### 大厂技术文章与要点表

这些官方资料最适合直接转成工程规范，因为它们讨论的是 **如何做**，而不是只给榜单。citeturn9view0turn9view1turn23view1

| 机构 | 文章 / 资料 | 年份 | 核心要点 | 工程启发 | 链接 | 证据 |
|---|---|---:|---|---|---|---|
| Anthropic | Demystifying evals for AI agents | 2026 | 清晰拆分 task / trial / grader / transcript / outcome / eval harness；强调 capability vs regression。 | 适合拿来定义团队统一术语和流程。 | [官方文](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | citeturn11view1turn11view5 |
| Anthropic | Google Cloud Next 2026 议程页 | 2026 | 官方公开强调“选择 grader、平衡 capability 与 regression、建立可信 suite”。 | 说明大厂实践已把 eval 当作交付能力，而非学术附属。 | [会议页](https://www.anthropic.com/events/anthropic-at-google-cloud-next-2026) | citeturn23view0 |
| OpenAI | Evaluate agent workflows | 2026 | 以 traces、graders、datasets、eval runs 为核心；先 Trace，后 Dataset。 | 这几乎就是日常维护体系的骨架。 | [官方文档](https://developers.openai.com/api/docs/guides/agent-evals) | citeturn10view0 |
| OpenAI | Testing Agent Skills Systematically with Evals | 2026 | 先定义 success；先 deterministic，再 rubric；记录 trace + artifacts。 | 最适合转成你仓库里的技能/规则评测模板。 | [官方博客](https://developers.openai.com/blog/eval-skills) | citeturn10view3turn10view4 |
| OpenAI | Build an Agent Improvement Loop with Traces, Evals, and Codex | 2026 | 把真实 traces、反馈、evals、harness 改造串成 flywheel。 | 适合建设“失败回灌 → 自动生成回归项”的闭环。 | [Cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop) | citeturn13view1 |
| Google Cloud | Evaluate your AI agents with Vertex Gen AI evaluation service | 2025 | 明确 final response 与 trajectory 两层；支持自定义 metric。 | 适合企业内部指标平台化。 | [官方博客](https://cloud.google.com/blog/products/ai-machine-learning/introducing-agent-evaluation-in-vertex-ai-gen-ai-evaluation-service) | citeturn9view3turn15view1 |
| Google Developers | Announcing User Simulation in ADK Evaluation | 2025 | 用 User Simulator 从“固定路径测试”转向“目标达成”测试。 | 适合多轮流程 agent 的自动化场景生成。 | [官方博客](https://developers.googleblog.com/en/announcing-user-simulation-in-adk-evaluation/) | citeturn9view4 |
| Google Cloud | Agent Factory Recap | 2025 | 提出 full-stack 测量：结果、推理、工具、记忆；方法分为 GT / LLM Judge / HITL。 | 可直接转成团队评测分层。 | [官方博客](https://cloud.google.com/blog/topics/developers-practitioners/agent-factory-recap-a-deep-dive-into-agent-evaluation-practical-tooling-and-multi-agent-systems) | citeturn23view1 |
| Google Developers | Driving the Agent Quality Flywheel from Your Coding Agent | 2026 | 将“用户修正是否被尊重”提升为单独可趋势化 metric。 | 很适合将业务风险点提升为专项指标。 | [官方博客](https://developers.googleblog.com/driving-the-agent-quality-flywheel-from-your-coding-agent/) | citeturn14view3 |
| Meta AI | ARE: scaling up agent environments and evaluations | 2025 | 强调 environments、rules、tools、content、verifiers 的统一抽象。 | 对自建行业模拟环境很有价值。 | [官方研究页](https://ai.meta.com/research/publications/are-scaling-up-agent-environments-and-evaluations/) | citeturn9view5 |
| Google Research | Towards a science of scaling agent systems | 2026 | 用 180 个 agent 配置做受控评估，指出多 agent 并非总更好。 | 评测时要把 architecture variant 视作一级变量。 | [官方研究博客](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/) | citeturn31view0 |

### 相关 GitHub 项目对比表

下面的表格更偏“你现在就能用来搭体系”的项目，而不是学术 benchmark 仓库。链接均可直接点开。项目描述与优缺点基于 README / 官方文档，结论中的“适合场景”为工程建议。citeturn9view7turn29view1turn9view9turn22view0turn9view10turn14view1turn9view6turn22view1

| Repo | 定位 | 优点 | 局限 | 适合场景 | 链接 | 证据 |
|---|---|---|---|---|---|---|
| langchain-ai/agentevals | 轨迹评测库 | 提供 strict / unordered / subset / superset 等轨迹匹配与 trajectory LLM-as-judge。 | 更像 evaluator 库，缺少完整平台能力。 | 你想先把轨迹 grader 写起来。 | [GitHub](https://github.com/langchain-ai/agentevals) | citeturn28view2turn28view4 |
| promptfoo/promptfoo | 通用 eval + red teaming + CI/CD | CLI 友好、配置式、支持自动化评测和红队。 | Trace/observability 不是它的强项。 | PR 门禁、对比实验、安全扫描。 | [GitHub](https://github.com/promptfoo/promptfoo) | citeturn29view1 |
| langfuse/langfuse | 观测 + 数据集 + eval + 仪表盘 | 开源、支持 tracing / datasets / experiments / analytics。 | 复杂轨迹规则仍需你自己定义。 | 想要统一线上 trace 与离线实验。 | [GitHub](https://github.com/langfuse/langfuse) | citeturn9view9turn30view0 |
| Arize-ai/phoenix | AI observability & evaluation | OpenTelemetry / OpenInference 兼容，生态广；适合实验排障。 | 许可与部署策略需团队确认。 | 需要标准化 tracing 与可视化诊断。 | [GitHub](https://github.com/Arize-ai/phoenix) | citeturn22view0 |
| Arize-ai/openinference | Trace 语义规范 / instrumentation | 给 AI/agent tracing 提供统一语义，适合做底层兼容。 | 不是 end-to-end eval 平台。 | 想做供应商中立的 Trace schema。 | [GitHub](https://github.com/Arize-ai/openinference) | citeturn9view10 |
| google/adk-python | Agent framework + evaluation | 官方提供 eval、golden dataset、user simulation、workflow runtime。 | 更偏 Google 生态。 | 想用代码优先方式搭 agent + eval。 | [GitHub](https://github.com/google/adk-python) | citeturn14view1turn14view0 |
| Azure/agentops | 持续评测与可观测性 CLI | 强调 baseline、results.json、PR-friendly report、CI/CD、trace-to-regression。 | 社区成熟度仍在上升。 | 你想快速建立 release gate。 | [GitHub](https://github.com/Azure/agentops) | citeturn27view3turn27view2 |
| strands-agents/evals | 综合评测 SDK | 支持 output / trajectory / tool / interactions、simulator、fault injection、red team。 | 体系完整但相对新。 | 希望一套 SDK 同时覆盖鲁棒性与故障注入。 | [GitHub](https://github.com/strands-agents/evals) | citeturn22view1 |

### 论坛讨论要点与典型引用

论坛内容只能算**社区共识或工程经验**，但对“你在生产中会踩什么坑”很有参考价值。

- **关于 benchmark 时效性**：Reddit 上有工程师质疑，很多 benchmark 论文发表时，闭源模型已经更新甚至下架。这提醒我们：**公共榜单有参考价值，但你的回归集必须来自自己的真实任务与最新流量。** citeturn21view0  
  > “models … are updated almost every month.” citeturn21view0

- **关于如何起步构建 baseline eval set**：Reddit 社区给出的高赞实践很接近官方建议：先聚焦单一 workflow，再从日志与重复用户任务中取样，再用小规模合成数据补齐边界条件。这个思路与 OpenAI 的“log everything”和 Anthropic 的“let failures become test cases”高度一致。 citeturn21view1turn13view0turn10view4  
  > “Narrow scope leads to clearer expectations.” citeturn21view1

- **关于 LLM Judge 的可信度**：Hacker News 与 Reddit 的共识都不是“不要用”，而是“**要知道它什么时候不可靠**”。这和 LLM-as-a-Judge survey 与 ACL 论文结论一致：judge 很有用，但必须校准、抽检、关注 bias 与 prompt sensitivity。 citeturn21view4turn21view2turn24view2turn24view4  
  > “study the measurement frailties and prompting sensitivities of LLM judges.” citeturn21view4

- **关于模糊评判 vs 启发式规则**：Stack Overflow for Agents 中的经验贴明确提醒，像“帮我判断哪个候选最好”这种含糊任务，LLM 很容易受上下文顺序影响；若有 tag、score、reputation、schema 等可确定信号，启发式或程序化规则更可靠。这个观点与“deterministic first”非常一致。 citeturn21view3turn10view3  
  > “A tag/score/reputation heuristic is more reliable.” citeturn21view3

- **关于 Trace 不是全部**：Hacker News 在讨论 tracing 工具时有人指出，execution tree 对 workflow 足够，但对 agent 来说还要看状态一致性。这恰好呼应了 Anthropic 对 transcript vs outcome 的区分，以及 Evidence-Supported Bounds 对 outcome 证据的强调。 citeturn21view5turn11view1turn20view1

## 推荐的工程架构与实践清单

### 评测闭环建议架构

下面这张图给出一套适合日常维护的闭环。其核心不是某一个 vendor，而是 **Trace 先行、grader 分层、失败回灌、回归门禁、生产抽检**。这一流程与 OpenAI 的 traces → datasets/eval runs、Anthropic 的 capability/regression/prod monitoring、Google 的 inner loop / outer loop 做法一致。citeturn10view0turn11view5turn23view1turn14view0

```mermaid
flowchart LR
    A[开发分支变更\nprompt/tool/router/model/skill] --> B[运行离线样例\ncapture trace + artifacts]
    B --> C[确定性 graders\nstate/tool/permission/schema/tests]
    B --> D[LLM rubric graders\nquality/citation/style]
    C --> E[聚合分数与失败原因]
    D --> E
    E --> F{是否通过回归门禁}
    F -- 否 --> G[生成 failure report\n定位到 trace/span/tool]
    G --> H[修复 harness / prompt / tool contract]
    H --> B
    F -- 是 --> I[发布候选版本]
    I --> J[线上抽样与监控\nlatency/cost/failure/escalation]
    J --> K[人工抽检与用户反馈]
    K --> L[挑选真实失败案例]
    L --> M[沉淀为 eval dataset\n新增 regression cases]
    M --> B
```

### 建议的目录结构

下面的目录结构是**工程建议**，但它对应的理念都能在 OpenAI skill eval、ADK golden dataset、AgentOps baseline 与 Langfuse/Phoenix 风格的 trace + dataset + experiment 设计中找到映射。citeturn10view3turn14view0turn27view3turn30view0

```text
repo/
├─ agent/
│  ├─ prompts/
│  ├─ skills/
│  ├─ tools/
│  ├─ router/
│  ├─ memory/
│  └─ policies/
├─ evals/
│  ├─ datasets/
│  │  ├─ capability/
│  │  ├─ regression/
│  │  ├─ safety/
│  │  └─ cost_smoke/
│  ├─ cases/
│  │  ├─ coding/
│  │  ├─ support/
│  │  ├─ research/
│  │  └─ tooling/
│  ├─ graders/
│  │  ├─ deterministic/
│  │  ├─ llm_rubrics/
│  │  ├─ safety/
│  │  └─ aggregation/
│  ├─ schemas/
│  │  ├─ trace.schema.json
│  │  ├─ case.schema.json
│  │  └─ rubric.schema.json
│  ├─ artifacts/
│  │  ├─ traces/
│  │  ├─ screenshots/
│  │  ├─ tool_outputs/
│  │  └─ reports/
│  ├─ baselines/
│  │  ├─ prod-v1.2.0.json
│  │  └─ prod-v1.2.1.json
│  └─ runbooks/
│     ├─ failure_taxonomy.md
│     ├─ annotation_guide.md
│     └─ release_gate.md
├─ scripts/
│  ├─ run_evals.py
│  ├─ compare_baseline.py
│  ├─ promote_trace_to_case.py
│  └─ sample_prod_traces.py
└─ .github/workflows/
   ├─ eval-smoke.yml
   ├─ eval-regression.yml
   └─ eval-safety.yml
```

### 测试用例 YAML 模板

模板重点是：**把目标、环境、期望结果、grader、重试次数、成本预算、权限边界** 都显式写出来。这样才便于版本化与门禁。

```yaml
id: support_refund_revision_001
suite: regression
owner: agent-platform
description: >
  用户先申请退款，随后改为仅更换商品。Agent 必须 honor 最新诉求，
  不得同时触发退款与换货。

input:
  user_messages:
    - "我的订单 ORD-102 破损了，我想退款。"
    - "我改主意了，不退款，改成换货。"
  locale: zh-CN

environment:
  seed: 20260714
  fixtures:
    order_id: ORD-102
    customer_id: CUST-001
    policy_version: 2026-07
  isolated: true

expected:
  outcome:
    order_action: replacement
    refund_status: not_processed
  required_tools:
    - verify_identity
    - get_order
    - process_replacement
  forbidden_tools:
    - process_refund
  constraints:
    max_turns: 8
    max_tool_calls: 6
    max_latency_seconds: 20
    max_cost_usd: 0.08
    permission_escalation: false

graders:
  - name: outcome_state_check
    type: deterministic
    weight: 0.40
  - name: tool_presence_check
    type: deterministic
    weight: 0.20
  - name: forbidden_tool_check
    type: deterministic
    weight: 0.20
  - name: revision_honored
    type: llm_rubric
    label: 基于文献/社区共识 + 工程经验建议
    weight: 0.10
  - name: empathy_and_clarity
    type: llm_rubric
    label: 基于文献/社区共识
    weight: 0.10

retries:
  n_trials: 5
  report_pass_k: [1, 3, 5]

release_gate:
  must_pass:
    - outcome_state_check
    - forbidden_tool_check
  aggregate_threshold: 0.90
```

### 推荐的 Trace Schema

Trace schema 建议尽量贴近 **OpenTelemetry / OpenInference**，同时补上 agent 特有字段。Anthropic、OpenAI、Langfuse、Phoenix、OpenInference 的共同点都是把“运行痕迹”当成排障与评测的底座。citeturn11view1turn10view0turn30view0turn22view0turn9view10

```json
{
  "trace_id": "uuid",
  "run_id": "uuid",
  "case_id": "support_refund_revision_001",
  "suite": "regression",
  "timestamp": "2026-07-14T10:00:00Z",
  "agent_version": "travel-agent@1.2.4",
  "model": {
    "provider": "openai",
    "name": "gpt-5.x",
    "temperature": 0.2
  },
  "input": {
    "messages": [],
    "context_hash": "sha256",
    "policy_version": "2026-07"
  },
  "spans": [
    {
      "span_id": "s1",
      "parent_span_id": null,
      "kind": "llm_call",
      "name": "planner",
      "start_ms": 0,
      "end_ms": 1840,
      "tokens_prompt": 1420,
      "tokens_completion": 331,
      "cost_usd": 0.012,
      "status": "ok"
    },
    {
      "span_id": "s2",
      "parent_span_id": "s1",
      "kind": "tool_call",
      "tool_name": "verify_identity",
      "tool_args": {"customer_id": "CUST-001"},
      "tool_result_ref": "artifact://tool_outputs/verify_identity.json",
      "status": "ok",
      "latency_ms": 120
    },
    {
      "span_id": "s3",
      "parent_span_id": "s1",
      "kind": "guardrail",
      "rule": "permission_escalation",
      "decision": "allow",
      "status": "ok"
    }
  ],
  "artifacts": [
    {
      "type": "tool_output",
      "uri": "artifact://tool_outputs/verify_identity.json"
    },
    {
      "type": "state_snapshot",
      "uri": "artifact://state/order_before.json"
    },
    {
      "type": "state_snapshot",
      "uri": "artifact://state/order_after.json"
    }
  ],
  "outcome": {
    "final_response": "已为您提交换货申请。",
    "environment_state_ref": "artifact://state/order_after.json",
    "success_label": true
  },
  "metrics": {
    "n_turns": 4,
    "n_tool_calls": 3,
    "latency_seconds": 4.7,
    "total_tokens": 2481,
    "total_cost_usd": 0.021
  },
  "security": {
    "permission_escalation": false,
    "blocked_actions": [],
    "prompt_injection_detected": false
  },
  "graders": [
    {"name": "outcome_state_check", "score": 1.0, "type": "deterministic"},
    {"name": "revision_honored", "score": 1.0, "type": "llm_rubric"}
  ]
}
```

**强烈建议额外存三类引用字段**：

第一，`environment_state_ref`，因为 transcript 不能替代最终环境状态。第二，`tool_result_ref`，因为很多“自称查过”的回答其实没有真实证据。第三，`policy_version` / `tool_contract_version`，因为 agent regressions 往往来自规则与工具接口漂移，而不是模型退化。以上三点分别对应 Anthropic 的 outcome 定义、OpenAI 的 trace grading、Evidence-Supported Bounds 对 outcome 证据的要求。citeturn11view1turn10view0turn20view1

### grader 优先级清单

这一部分最重要。我的建议是：**不要默认 LLM Judge 是主评委；它应当是针对开放性问题的补充层。**

| 优先级 | grader 类型 | 典型检查 | 适用场景 | 建议 |
|---|---|---|---|---|
| P0 | 环境状态 / 测试脚本 / schema / 静态分析 | 单测、DB 状态、文件状态、JSON schema、lint、类型检查 | coding、ops、tool agent | **第一优先**；最稳定。citeturn11view5turn10view3 |
| P1 | 工具/权限确定性检查 | required / forbidden tools、参数合法性、越权、审批 | enterprise workflow | **必须有**；很多生产事故在这里。citeturn10view0turn10view4turn14view0 |
| P2 | 轨迹结构匹配 | strict / unordered / subset / superset、max turns | tool-heavy agent | 适合解释“哪里错了”。citeturn28view2turn28view4 |
| P3 | LLM rubric grader | 证据完整性、表达清晰度、风格一致性、用户体验 | support、research、assistant | **基于文献/社区共识**；只用于无法硬判的项。citeturn24view2turn24view4turn23view1 |
| P4 | 人工抽检与校准 | judge 一致率、误判复盘、规则修订 | 所有生产 agent | 周期性抽样，不必全量。citeturn11view0turn23view1turn21view2 |

这套顺序与 OpenAI “先 deterministic，再 rubric”、Google “ground truth / LLM judge / HITL”、社区“别让 LLM 判那些启发式能更稳做掉的事”高度一致。citeturn10view3turn23view1turn21view3

### 实践清单

面向日常维护，我建议你至少执行以下实践。这些条目中，前五项应该在前三个月内全部落地。

- **每个线上失败都要留下可复跑 Trace 和 artifact**，否则它只能是事故记录，不能成为回归资产。citeturn13view1turn30view0
- **每次 PR 至少跑一套 smoke regression**，只保留 20–50 个高价值 case；大回归可以夜间跑。Efficient Benchmarking 的结论支持“用中等难度任务做更便宜的日常排名/比较”。citeturn20view0
- **至少每周一次人工抽检 judge 结果**，特别是新 rubric、新业务、新模型版本。citeturn24view4turn21view4
- **为每个关键工具定义 contract test**：工具名、参数 schema、权限级别、幂等性、超时行为。citeturn10view0turn14view0
- **将“用户修正是否被尊重”单列为指标**，而不是藏在综合分里。Google 的质量 flywheel 文章是一个非常好的例子。citeturn14view3
- **做最小故障注入矩阵**：tool timeout、429、空响应、部分成功、脏缓存、权限拒绝、prompt injection、用户改口。Strands 的 chaos testing、ComplexMCP 的 API failure 与 OS-Harm / Vera 的安全测试都说明这是必测项。citeturn22view1turn32search2turn32search1turn18search3
- **为每个版本保留 baseline 文件**，并输出“comparison vs baseline”报告。citeturn27view3
- **线上要看 success@cost，而不是只看 success rate**。Agent 成功但代价失控同样不可运营。citeturn11view2turn15view1

## 实施路线图与里程碑

### 三个月路线图草案

这是最值得你立即执行的部分。它以“先可观测、再可回归、后可扩展”为原则，基本符合 Anthropic / OpenAI / Google 的官方路线。citeturn11view5turn10view0turn14view0

| 阶段 | 目标 | 交付物 | 验收标准 |
|---|---|---|---|
| 第一个月 | 建立 Trace 与最小回归集 | 统一 Trace schema；20–30 个高价值 case；3–5 个确定性 grader；CI smoke job | 任一失败可定位到具体 trace/span；PR 自动出 report；关键业务 case 可复跑 |
| 第二个月 | 建立分层评分与 baseline 对比 | regression suite 50–80 个 case；LLM rubric 2–3 个；baseline 文件；failure taxonomy | 每次版本变更能输出 delta；至少 80% 的已知历史故障有对应回归项 |
| 第三个月 | 接通线上抽样与失败回灌 | 生产抽样脚本；人工标注流程；weekly review 模板；权限/安全专项 case | 每周至少新增 3–5 个来自真实失败的案例；形成 capability / regression / safety 三个 suite |

**第一个月** 的重点不是“分数多科学”，而是把运行过程抓出来。OpenAI 明确建议先从 Trace 开始；Anthropic 也强调如果没有 transcript/outcome/harness 的清晰定义，后面所有评测都站不住。这个月你应该避免一切“大而全设计”，先把 Trace 存对、状态快照存对、工具/权限事件存对。citeturn10view0turn11view1

**第二个月** 开始进入真正的“维护体系”阶段：把 case 分成 capability 与 regression 两类。Anthropic 对这两类的定义非常实用：capability 用来爬坡，回归集则应该接近 100% 通过。此时可以引入有限的 LLM Judge，但只放在表达质量、证据组织、风格等开放项上，并且必须保留人工抽检。citeturn11view5turn24view2turn24view4

**第三个月** 则是把体系从“仓库内自测”升级为“真正可维护”。最关键的是生产失败回灌：OpenAI improvement loop、Langfuse 的 annotation queue 思路、Anthropic 的“failures become test cases”，都说明高价值 regression case 最终都要来自真实流量。citeturn13view1turn30view0turn10view4

### 半年计划

六个月时，这套体系应该从“可用”升级到“可信”。

| 方向 | 交付物 | 验收标准 |
|---|---|---|
| 用户模拟 | 引入 user simulation / dual-control case | 多轮任务可自动生成场景，覆盖用户改口、澄清、协作 |
| 安全专项 | prompt injection / 越权 / 故障注入专区 | 每次发布前必须跑安全 smoke |
| 结构化分析 | 宏观模式分析与失败聚类 | 能回答“最近一个月最常见失败模式是什么” |
| 指标治理 | 统一 dashboard | success、latency、cost、tool error、permission denied 都可趋势化 |

这个阶段最值得加入的能力有两个。第一是 **用户模拟**，因为很多 agent 在固定路径测试里表现很好，但一到真实多轮交互就失真。Google ADK、τ-bench、τ²-bench 都说明“有目标、可变动、受环境约束的用户模拟”是非常关键的能力。第二是 **宏观模式分析**，OpenAI 的 Macro Evals 给出的思路是：不要只盯某一次失败，而要从大量 traces 中找复现模式。citeturn9view4turn17view3turn17view4turn13view2

### 一年计划

一年时，你的目标不应再是“有没有评测”，而应是“评测体系是否成为发布、运营、安全与成本控制的底层设施”。

| 方向 | 交付物 | 验收标准 |
|---|---|---|
| 供应商中立 | OpenTelemetry / OpenInference 对齐 | Trace 可接入多个后端与可视化工具 |
| 自动生成 case | 从失败日志、策略图、工具文档生成测试 | 新功能上线后一周内自动生成首批候选 case |
| Release gate | 发布门禁直接依赖 eval 结果 | 无人工例外时可自动阻断高风险发布 |
| 经验记忆 | 失败模式库 / 修复 playbook / reasoning memory | 同类故障复发率显著下降 |
| 成本优化 | smoke/full/safety 分级运行 | 日常门禁成本可控，长回归夜间跑 |

一年视角下，最值得追求的是 **平台化而非脚本堆积**。Google 的 ReasoningBank 说明 agent 可以从成败经验中抽取高层策略；Meta ARE 说明环境、规则、verifier 本身也应被平台化；OpenInference 则给了你做中立底座的最佳路径。citeturn31view2turn9view5turn9view10

## 风险、注意事项与结论

### 主要风险与注意事项

**不要把最终文本分数当成唯一真相。** Anthropic、Langfuse、Google 都在反复强调，agent 评测必须兼顾结果与轨迹；Evidence-Supported Bounds 更进一步指出，有些 benchmark 分数本身就缺乏充分证据支持。你的体系里必须保留环境状态与工具证据。citeturn11view1turn13view3turn23view1turn20view1

**不要过度依赖严格路径匹配。** Anthropic 明确提醒，过于刚性的“固定工具调用顺序”会惩罚 agent 的合理创造性；LangChain AgentEvals 虽然提供 strict/unordered/subset/superset，但这恰恰说明路径匹配需要按用途选择，而不是一刀切。最佳实践一般是：**对 outcome 高风险 case 用状态结果做主判断，对关键工具与权限做约束，对轨迹只保留必要不变量。** citeturn11view1turn28view2turn28view4

**LLM Judge 很有用，但必须被管理。** 文献和社区都不建议把它当作“无偏法官”。一方面，judge 在开放任务上确实比简单文本相似度更有效；另一方面，LLM-as-a-Judge 的 survey、ACL 经验研究、Hacker News 和 Reddit 讨论都提醒了 bias、prompt sensitivity、domain shift、泛化不足等问题。因此，报告中的所有 judge 结论都应标注为 **“基于文献/社区共识”**；凡是拿来做 release gate 的 judge，都应配套小样本人审校准。citeturn24view2turn24view4turn21view4turn21view2

**公共 benchmark 不能替代私有回归集。** 这是论坛争议里最值得采纳的一条。模型、工具、接口、政策都在快速变化，公开基准更适合做方向参考与对外沟通；真正负责日常维护质量的，一定是你从生产失败中长出来的 regression suite。Anthropic、OpenAI、Langfuse 的官方做法都支持这一点。citeturn21view0turn10view4turn13view1turn30view0

**警惕平台锁定。** OpenAI 官方已经明确旧的 Evals 平台处于弃用路径中；这不是说 eval 不重要，恰恰相反，它提醒工程团队应优先投资 **可移植的数据、可解释的 grader、可兼容的 Trace schema**，而不是把关键流程绑定到单一托管产品。citeturn13view0turn9view1

### 结论与建议

如果把所有论文、官方文档、论坛实践压缩成一句工程建议，那就是：

**先把 Agent Eval 做成“测试工程 + 观测平台 + 反馈回灌”的组合系统，再去优化模型。**

更具体地说，我建议你按下面的顺序落地：

首先，**统一 Trace schema**，并对齐 OpenTelemetry / OpenInference。  
其次，**只为高价值 workflow 建初始回归集**，不要一开始追求大而全。  
然后，**先写确定性 grader**，特别是 outcome、tool、permission、schema、tests。  
接着，**对开放项加 LLM rubric**，并建立周度人工校准。  
之后，**接入生产抽样与 failure-to-regression 流程**。  
最后，**把安全、故障注入、成本门禁纳入发布流程**。citeturn9view10turn21view1turn10view3turn23view1turn13view1turn22view1turn18search3

对“Agent Eval 的核心是什么”这个问题，我的最终回答是：

**核心不是 judge，而是 evidence；不是分数，而是闭环；不是一次 benchmark，而是持续维护。**  
这也是为什么最适合你当前目标的方案，不是单纯采用某个“评测框架”，而是围绕 **Trace、grader、dataset、baseline、monitoring、feedback loop** 自建一套供应商中立、能进 CI/CD、能接线上失败的维护体系。citeturn10view0turn11view1turn13view1turn27view3

### 来源清单

| 名称 | 类型 | 时间 | 可点击链接 |
|---|---|---:|---|
| Demystifying evals for AI agents | Anthropic 官方工程博客 | 2026 | [链接](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |
| Evaluate agent workflows | OpenAI 官方文档 | 2026 | [链接](https://developers.openai.com/api/docs/guides/agent-evals) |
| Evaluation best practices | OpenAI 官方文档 | 2026 | [链接](https://developers.openai.com/api/docs/guides/evaluation-best-practices) |
| Testing Agent Skills Systematically with Evals | OpenAI 官方博客 | 2026 | [链接](https://developers.openai.com/blog/eval-skills) |
| Build an Agent Improvement Loop with Traces, Evals, and Codex | OpenAI Cookbook | 2026 | [链接](https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop) |
| Macro Evals for Agentic Systems | OpenAI Cookbook | 2026 | [链接](https://developers.openai.com/cookbook/examples/partners/macro_evals_for_agentic_systems/macro_evals_for_agentic_systems) |
| Evaluate your AI agents with Vertex Gen AI evaluation service | Google Cloud 官方博客 | 2025 | [链接](https://cloud.google.com/blog/products/ai-machine-learning/introducing-agent-evaluation-in-vertex-ai-gen-ai-evaluation-service) |
| Announcing User Simulation in ADK Evaluation | Google Developers Blog | 2025 | [链接](https://developers.googleblog.com/en/announcing-user-simulation-in-adk-evaluation/) |
| Agent Factory Recap | Google Cloud 官方博客 | 2025 | [链接](https://cloud.google.com/blog/topics/developers-practitioners/agent-factory-recap-a-deep-dive-into-agent-evaluation-practical-tooling-and-multi-agent-systems) |
| Driving the Agent Quality Flywheel from Your Coding Agent | Google Developers Blog | 2026 | [链接](https://developers.googleblog.com/driving-the-agent-quality-flywheel-from-your-coding-agent/) |
| ARE: scaling up agent environments and evaluations | Meta AI Research | 2025 | [链接](https://ai.meta.com/research/publications/are-scaling-up-agent-environments-and-evaluations/) |
| Survey on Evaluation of LLM-based Agents | 综述论文 | 2025 | [链接](https://arxiv.org/abs/2503.16416) |
| Evaluation and Benchmarking of LLM Agents: A Survey | 综述论文 | 2025 | [链接](https://arxiv.org/abs/2507.21504) |
| A Survey on LLM-as-a-Judge | 综述论文 | 2024 | [链接](https://arxiv.org/abs/2411.15594) |
| From Generation to Judgment: Opportunities and Challenges of LLM-as-a-judge | EMNLP 论文 | 2025 | [链接](https://aclanthology.org/2025.emnlp-main.138/) |
| An Empirical Study of LLM-as-a-Judge for LLM Evaluation | ACL Findings | 2025 | [链接](https://aclanthology.org/2025.findings-acl.306.pdf) |
| AgentBench | benchmark 论文 | 2023 | [链接](https://arxiv.org/abs/2308.03688) |
| WebArena | benchmark 论文 | 2023 | [链接](https://arxiv.org/abs/2307.13854) |
| GAIA | benchmark 论文 | 2023 | [链接](https://arxiv.org/abs/2311.12983) |
| τ-bench | benchmark 论文 | 2024 | [链接](https://arxiv.org/abs/2406.12045) |
| τ²-Bench | benchmark 论文 | 2025 | [链接](https://arxiv.org/abs/2506.07982) |
| OSWorld | benchmark 论文 | 2024 | [链接](https://arxiv.org/abs/2404.07972) |
| AppWorld | benchmark 论文 | 2024 | [链接](https://arxiv.org/abs/2407.18901) |
| Terminal-Bench | benchmark 论文 | 2026 | [链接](https://arxiv.org/abs/2601.11868) |
| SkillsBench | benchmark 论文 | 2026 | [链接](https://arxiv.org/abs/2602.12670) |
| Efficient Benchmarking of AI Agents | 方法论文 | 2026 | [链接](https://arxiv.org/abs/2603.23749) |
| Can Agent Benchmarks Support Their Scores? | 方法论文 | 2026 | [链接](https://arxiv.org/abs/2605.10448) |
| Safety Testing LLM Agents at Scale | 安全评测论文 | 2026 | [链接](https://arxiv.org/abs/2607.01793) |
| langchain-ai/agentevals | GitHub 项目 | 持续更新 | [链接](https://github.com/langchain-ai/agentevals) |
| promptfoo/promptfoo | GitHub 项目 | 持续更新 | [链接](https://github.com/promptfoo/promptfoo) |
| langfuse/langfuse | GitHub 项目 | 持续更新 | [链接](https://github.com/langfuse/langfuse) |
| Arize-ai/phoenix | GitHub 项目 | 持续更新 | [链接](https://github.com/Arize-ai/phoenix) |
| Arize-ai/openinference | GitHub 项目 | 持续更新 | [链接](https://github.com/Arize-ai/openinference) |
| google/adk-python | GitHub 项目 | 持续更新 | [链接](https://github.com/google/adk-python) |
| Azure/agentops | GitHub 项目 | 持续更新 | [链接](https://github.com/Azure/agentops) |
| strands-agents/evals | GitHub 项目 | 持续更新 | [链接](https://github.com/strands-agents/evals) |
| Reddit 讨论：What is even the point of these LLM benchmarking papers? | 论坛讨论 | 2026 | [链接](https://www.reddit.com/r/MachineLearning/comments/1rsdify/d_what_is_even_the_point_of_these_llm/) |
| Reddit 讨论：How do you construct a baseline evaluation set for agent systems? | 论坛讨论 | 2025 | [链接](https://www.reddit.com/r/MachineLearning/comments/1phm2iz/d_how_do_you_construct_a_baseline_evaluation_set/) |
| Hacker News：About AI Evals | 论坛讨论 | 2025 | [链接](https://news.ycombinator.com/item?id=44430117) |
| Stack Overflow for Agents：verification 工作流讨论 | 论坛讨论 | 2026 | [链接](https://agents.stackoverflow.com/questions/cd660d27-1ca7-4c13-a7c8-63ad640d9eda?page=1&tag=verification) |