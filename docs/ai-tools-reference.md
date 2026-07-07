# AI 编程助手体系参考手册

> **四套元工具**：**Trellis**（项目工作流） · **Superpowers**（过程纪律） · **ECC**（命令/技能百宝箱） · **OpenSpec**（规格驱动变更）  
> **本文定位**：元工具索引 + `claude-code-best` 仓库落地指针。**不是** WanD 业务 MCP / 报价 Agent 的完整手册。

---

## 零、文档范围与交叉索引

### 本文管什么 / 不管什么

| 在范围内 | 不在范围内（见链接） |
|----------|---------------------|
| Trellis 任务流、spec、子 agent | WanD **业务** MCP（quotation/excel）→ [`guide/04-MCP配置.md`](./guide/04-MCP配置.md) |
| Superpowers / ECC 思维与命令 | CCB **安装包**用户指南 → [`guide/README.md`](./guide/README.md) |
| OpenSpec 变更工作流 | **发版打包验收** → [`.trellis/spec/integration/wanding-release-standard.md`](../.trellis/spec/integration/wanding-release-standard.md) |
| 平台差异（Cursor / Codex / Claude Code） | Trellis **权威细则** → [`.trellis/workflow.md`](../.trellis/workflow.md) |
| 验证/审查由谁做 | Skill 机制（CCB 内置 skill）→ [`guide/08-Skill指南.md`](./guide/08-Skill指南.md) |

### 本仓库（`claude-code-best`）快速入口

| 你要做… | 先读 |
|---------|------|
| 任何开发 | [`AGENTS.md`](../AGENTS.md) → [`.trellis/spec/index.md`](../.trellis/spec/index.md) |
| AionUI 前端 | [`.trellis/spec/frontend/index.md`](../.trellis/spec/frontend/index.md) |
| CCB-Wanding / MCP 后端 | [`.trellis/spec/backend/index.md`](../.trellis/spec/backend/index.md) |
| 集成边界 / route-b / 发版 | [`.trellis/spec/integration/index.md`](../.trellis/spec/integration/index.md) |
| 任务治理 | [`.trellis/tasks/GOVERNANCE.md`](../.trellis/tasks/GOVERNANCE.md) |

---

## 体系关系总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                        你的 AI 编程体系                              │
│                                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  │  Trellis    │   │  Superpowers │   │  ECC (Everything CC)    │  │
│  │ 项目管理层  │   │  过程纪律层  │   │  工具执行层             │  │
│  │             │   │              │   │                         │  │
│  │ 任务/规格/  │   │ 思维方式/    │   │ /commands · skills ·   │  │
│  │ 三阶段流程  │   │ 何时做什么   │   │ agents · hooks         │  │
│  └──────┬──────┘   └──────┬───────┘   └────────────┬────────────┘  │
│         └──────────────────┴────────────────────────┘              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  OpenSpec  — 规格驱动开发 (独立 CLI + /opsx 命令)           │   │
│  │  explore → propose → apply → archive                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**配合逻辑**：Trellis 管理"做什么任务"，Superpowers 告诉 AI "怎么思考"，ECC 提供具体的命令/工具执行力，OpenSpec 为大型功能提供规格文档链。

---

# 一、Trellis — 项目工作流引擎

**位置**：`.trellis/` 目录（每个项目内）  
**核心理念**：Plan → Execute → Finish 三阶段，所有决策文件化，AI 不靠记忆。  
**权威源**：[`.trellis/workflow.md`](../.trellis/workflow.md)（比本文更细，冲突时以 workflow 为准）

### 首次使用：开发者身份

```bash
python .trellis/scripts/init_developer.py <your-name>
```

创建 `.trellis/.developer`（gitignore）与 `.trellis/workspace/<name>/` journal 目录。

## 1.0 平台差异 — 子 Agent 模式 vs 内联模式

同一套 Trellis，**不同 IDE 默认行为不同**（摘自 workflow Skill Routing）：

```
┌─────────────────────────────────────────────────────────────────┐
│  Class-1：Cursor · Claude Code · OpenCode · Copilot …           │
│  ─────────────────────────────────────────────────────────────  │
│  Phase 2 默认：主会话 **派发子 agent**，自己不直接改业务代码     │
│    实现 → Task(trellis-implement)                               │
│    验收 → Task(trellis-check)                                   │
│  上下文：hooks 注入 implement.jsonl + 派发首行 Active task      │
├─────────────────────────────────────────────────────────────────┤
│  Class-2：Codex inline · Kilo · Windsurf …                      │
│  ─────────────────────────────────────────────────────────────  │
│  Phase 2 默认：主会话 **自己写代码**                             │
│    写前 → skill trellis-before-dev                              │
│    验后 → skill trellis-check                                   │
│  Phase 1.3 jsonl 整理可跳过（无子 agent 可注入）                  │
└─────────────────────────────────────────────────────────────────┘
```

**派发协议（所有平台、所有 Trellis 子 agent）**：提示词**第一行**必须是：

```text
Active task: .trellis/tasks/07-02-xxx
```

Class-1 上 hooks 正常时该行冗余但仍是 **fallback**（Windows hook 静默跳过、`--continue` 恢复等）。

### Hooks 与上下文注入

| 平台 | 位置 | 作用 |
|------|------|------|
| Claude Code | `.claude/hooks/` | `session-start.py`、`inject-subagent-context.py`、`inject-workflow-state.py` |
| Codex | `.codex/hooks/` | 同上（项目内副本） |
| Cursor | 规则 + Task 子 agent | 无 Trellis hook 时靠 `Active task:` 首行 |

项目级 Trellis skills 副本：`.agents/skills/`（Codex 等可读）。Claude Code 另有 `.claude/skills/` 同步副本。

## 1.1 三阶段工作流

```
Phase 1: Plan    → 搞清楚做什么 (brainstorm + research → prd.md)
Phase 2: Execute → 写代码并通过质量检查
Phase 3: Finish  → 提炼经验 + 收尾
```

### Phase 1 步骤

| 步骤 | 说明 | 命令/工具 |
|------|------|-----------|
| 1.0 创建任务 | 必须，只做一次 | `python .trellis/scripts/task.py create "<title>"` |
| 1.1 需求探索 | 必须，可重复 | 加载 `trellis-brainstorm` skill 与用户迭代 prd.md |
| 1.2 研究 | 可选，可重复 | 派发 `trellis-research` 子 agent |
| 1.3 配置上下文 | 必须，只做一次 | 手动整理 `implement.jsonl` 和 `check.jsonl` |
| 1.4 激活任务 | 必须，只做一次 | `task.py start <task-dir>` → 状态变 in_progress |
| 1.5 完成标准 | 定义验收条件 | 写入 prd.md |

### Phase 2 步骤

| 步骤 | 说明 | 命令/工具 |
|------|------|-----------|
| 2.1 实现 | 必须，可重复 | 派发 `trellis-implement` 子 agent |
| 2.2 质量检查 | 必须，可重复 | 派发 `trellis-check` 子 agent |
| 2.3 回滚 | 按需 | git 操作 |

### Phase 3 步骤

| 步骤 | 说明 | 命令/工具 |
|------|------|-----------|
| 3.1 质量验证 | 必须，可重复 | `trellis-check` |
| 3.2 Debug 回顾 | 按需 | `trellis-break-loop` |
| 3.3 更新规格 | 必须，只做一次 | `trellis-update-spec` skill |
| 3.4 提交代码 | 必须，只做一次 | `git commit`（在 finish-work 之前） |
| 3.5 收尾 | — | `/trellis:finish-work` |

## 1.2 task.py 完整命令参考

```bash
# 任务生命周期
task.py create "<title>" [--slug <name>]   # 创建任务（状态→planning）
task.py start <task-dir>                    # 激活（状态→in_progress）
task.py finish                              # 清除活跃任务
task.py archive <name>                      # 归档（状态→completed）

# 查询
task.py current --source                    # 查看当前活跃任务
task.py list [--mine] [--status <s>]        # 列出任务
task.py list-archive                        # 列出已归档
task.py report [--write]                    # 卫生仪表板 → DASHBOARD.md

# 上下文 JSONL（给子 agent 注入的规格文件）
task.py add-context <name> <action> <file> <reason>
task.py list-context <name> [action]
task.py validate <name>

# 元数据
task.py set-status <name> <status>
task.py set-branch <name> <branch>
task.py set-base-branch <name> <branch>
task.py set-scope <name> <scope>

# 层级（父子任务）
task.py add-subtask <parent> <child>
task.py remove-subtask <parent> <child>

# PR 创建
task.py create-pr [name] [--dry-run]
```

## 1.3 Trellis Skills（技能）

| Skill | 触发时机 | 作用 |
|-------|----------|------|
| `trellis-brainstorm` | Phase 1.1，需求不清 | 结构化需求探索，生成/迭代 prd.md |
| `trellis-before-dev` | 内联模式写代码前 | 注入项目 spec 到上下文（子 agent 模式不用手动调） |
| `trellis-check` | Phase 2.2，代码写完后 | 规格合规 + lint + 类型检查 + 测试 + 一致性 |
| `trellis-update-spec` | Phase 3.3 | 将经验/发现写入 `.trellis/spec/` 文档 |
| `trellis-break-loop` | 同一 bug 修了多次 | 根因分析 + 防止复发机制 + 写入 spec |
| `trellis-meta` | 需要定制 Trellis 本身 | 理解/修改 .trellis 配置、hooks、skills |
| `trellis-spec-bootstarp` | 新项目或刷新规格 | 分析代码库，从零生成 spec 文档树（目录名拼写为 bootstarp） |

> **`trellis-check` 双形态**：既是 **skill**（内联模式主会话加载）也是 **sub-agent**（Class-1 派发）。workflow 建议：代码改完后 **优先派发 trellis-check agent**。

## 1.4 Trellis Sub-agents（子 Agent，只能用 Task/Agent 工具派发）

| Sub-agent | 作用 |
|-----------|------|
| `trellis-implement` | 读取 implement.jsonl 中的 spec 上下文，写代码 |
| `trellis-check` | 读取 check.jsonl 中的规格，做质量核查 |
| `trellis-research` | 研究技术问题并将发现写入 `{task_dir}/research/` |

**派发协议**：派发提示的第一行必须是 `Active task: <task path>`。

## 1.5 Trellis Slash Commands

| 命令 | 作用 |
|------|------|
| `/trellis:continue` | 继续当前任务（上下文恢复） |
| `/trellis:finish-work` | 收尾流程（校验工作树干净后归档） |

## 1.6 Trellis Spec 系统

```
.trellis/spec/
├── <package>/
│   └── <layer>/
│       └── index.md     ← Pre-Development Checklist + Quality Check
├── guides/
│   └── index.md         ← 跨包思维指南
```

```bash
# 查看当前项目的包/层
python .trellis/scripts/get_context.py --mode packages

# 获取某步骤的详细指导
python .trellis/scripts/get_context.py --mode phase --step 1.1
```

---

# 二、Superpowers — 过程纪律插件

**版本**：v6.1.0（Claude Code 官方插件）  
**核心理念**：在做任何事之前先检查是否有对应 skill，强制纪律性思维过程。  
**黄金法则**：即使 1% 概率适用，也必须调用对应 skill。

## 2.1 Skills 完整参考

### 元 Skill

#### `using-superpowers`
- **触发**：每次对话开始
- **作用**：建立"先检查 skill，再行动"的元规则，防止跳过 skill 直接执行
- **记住**：这个 skill 的规则在 CLAUDE.md 里自动注入，不需要手动调用

---

### 规划与设计类

#### `brainstorming`
- **触发**：用户描述新功能、组件、需求，或说"我想做 X"
- **作用**：理解项目上下文 → 逐个提问澄清需求 → 展示设计 → 获取用户确认
- **应用场景**：
  - 功能点还不清晰时
  - 有多个实现方向可选时
  - 避免"写了一半发现做错了"

#### `writing-plans`
- **触发**：有明确规格/需求，准备开始多步骤任务前
- **作用**：生成详细实现计划（每个任务包含：改哪些文件、怎么写、怎么测试）
- **输出格式**：任务列表，工程师无需了解代码库上下文也能执行
- **原则**：DRY、YAGNI、TDD、频繁提交

#### `executing-plans`
- **触发**：有一份已写好的实现计划需要执行
- **作用**：加载计划 → 审视计划 → 逐任务执行 → 完成后汇报
- **注意**：每个任务完成后有检查点，防止上下文漂移

---

### 执行类

#### `subagent-driven-development`
- **触发**：有实现计划，且任务可以并行/独立执行
- **作用**：为每个任务派发独立的 implementer subagent → 每个任务后做 task review → 全部完成后做 branch review
- **优势**：子 agent 上下文隔离，不被历史对话干扰

#### `dispatching-parallel-agents`
- **触发**：有 2 个以上独立任务，不共享状态，无顺序依赖
- **作用**：精确构造每个子 agent 所需的上下文，并行派发
- **原则**：子 agent 永远不继承你的 session 历史，只接收你给的上下文

#### `using-git-worktrees`
- **触发**：开始 feature 工作需要隔离工作区时
- **作用**：确保工作在隔离的 worktree 中进行，优先使用平台原生工具，回退到 git worktree

---

### 调试类

#### `systematic-debugging`
- **触发**：遇到任何 bug、测试失败、非预期行为
- **作用**：
  1. 描述问题现象
  2. 制定假设清单
  3. 设计最小复现路径
  4. 逐步验证，排除假设
  5. 找到根因后修复
- **禁止**：随机猜测修复，或快速打补丁掩盖问题

---

### 质量保证类

#### `test-driven-development`
- **触发**：实现任何功能或 bugfix，写代码之前
- **流程**：
  1. 写测试（RED — 必须先失败）
  2. 写最小实现（GREEN — 让测试通过）
  3. 重构（REFACTOR — 保持测试绿色）
- **要求**：先看到测试失败，才能写实现

#### `verification-before-completion`
- **触发**：即将声明"工作完成"/"测试通过"之前
- **作用**：强制运行验证命令，用实际输出为证据，不允许靠推测声称成功
- **原则**：证据优先于断言（Evidence before assertions）

#### `requesting-code-review`
- **触发**：完成任务或重要功能后，提交前
- **作用**：派发专门的 reviewer subagent，聚焦在代码产物本身，不受 session 历史影响

#### `receiving-code-review`
- **触发**：收到代码审查反馈时
- **作用**：技术性评估反馈，而非盲目接受——对每条建议独立判断是否正确
- **原则**：需要技术严谨性，不是表演性同意

---

### 完工类

#### `finishing-a-development-branch`
- **触发**：实现完成，所有测试通过，需要决定如何集成
- **作用**：呈现完成选项（merge/PR/cleanup），引导选择并处理工作流

#### `writing-skills`
- **触发**：创建新 skill、修改现有 skill 或验证 skill 是否有效
- **作用**：像 TDD 一样对待 skill 编写：先定义成功条件，再写内容

---

# 三、Everything Claude Code (ECC) — 工具执行层

**来源**：`everything-claude-code` 插件（v1.9.0） + 个人命令库  
**规模**：60+ 个命令，60+ 个 skill，14+ 个专属 agent  
**位置**：`~/.claude/commands/` · `~/.claude/skills/`

## 3.1 核心工作流命令

| 命令 | 触发方式 | 作用 |
|------|----------|------|
| `/plan` | 开始新功能前 | 调用 planner agent 生成计划，**必须等用户确认才动代码** |
| `/tdd` | 实现功能/修 bug | 调用 tdd-guide agent 强制先写测试 |
| `/code-review` | 代码改完后 | 全面安全+质量审查（hardcoded secrets、SQL注入、XSS等） |
| `/orchestrate` | 复杂任务 | 顺序多 agent 工作流（planner→tdd-guide→code-reviewer→security-reviewer） |
| `/verify` | 声明完成前 | 完整验证流程（build → typecheck → lint → tests） |
| `/quality-gate` | 随时 | 运行 ECC 质量流水线（format/lint/typecheck） |

## 3.2 多模型协作命令

| 命令 | 作用 |
|------|------|
| `/multi-workflow <task>` | 6 阶段工作流：Research→Ideation→Plan→Execute→Optimize→Review |
| `/multi-plan` | 多模型协作规划 |
| `/multi-execute` | 多模型协作执行 |
| `/multi-frontend` | Gemini 主导前端开发 |
| `/multi-backend` | Codex 主导后端开发 |
| `/devfleet` | DevFleet MCP 服务：自然语言→任务图→并行 agent 执行 |

## 3.3 语言构建命令

| 命令 | 语言 | 触发时机 |
|------|------|----------|
| `/cpp-build` | C++ | C++ 构建失败 |
| `/go-build` | Go | Go 构建/vet 失败 |
| `/rust-build` | Rust | cargo build 失败 |
| `/kotlin-build` | Kotlin | Kotlin/Gradle 失败 |
| `/gradle-build` | Java/Gradle | Gradle 构建失败 |
| `/build-fix` | 通用 | 分析 + 修复构建错误 |

## 3.4 代码审查命令（按语言）

| 命令 | 作用 |
|------|------|
| `/cpp-review` | C++ 代码审查（内存安全、现代 C++ 惯用法） |
| `/go-review` | Go 代码审查（错误处理、并发模式） |
| `/rust-review` | Rust 代码审查（所有权、生命周期、unsafe） |
| `/kotlin-review` | Kotlin/Android 审查（协程、Compose） |
| `/python-review` | Python 审查（PEP 8、类型注解、安全） |

## 3.5 测试命令

| 命令 | 作用 |
|------|------|
| `/cpp-test` | C++ 测试运行 |
| `/go-test` | Go 测试运行 |
| `/rust-test` | Rust 测试运行 |
| `/kotlin-test` | Kotlin 测试运行 |
| `/e2e` | E2E 测试（Playwright 等） |
| `/test-coverage` | 验证测试覆盖率 ≥ 80% |

## 3.6 连续学习系统（Instincts）

这是 ECC 的 **"AI 持续进化"** 模块，AI 从每次 session 中提取规律，形成"直觉"（instincts）并可在项目/全局间流通。

| 命令 | 作用 | 应用场景 |
|------|------|----------|
| `/learn` | 从当前 session 提取可复用模式 | session 中解决了非平凡问题后 |
| `/learn-eval` | 评估已学习的直觉的质量 | 定期审核 instincts |
| `/instinct-status` | 查看项目+全局直觉（按域分组） | 了解 AI 已学到了什么 |
| `/instinct-import <file/url>` | 导入直觉 | 从队友或其他机器引入经验 |
| `/instinct-export` | 导出直觉 | 分享给队友或备份 |
| `/promote [id]` | 项目直觉→全局直觉 | 经验值得在所有项目应用 |
| `/prune` | 删除 30 天未晋升的过期直觉 | 定期清理 |
| `/projects` | 查看项目注册表和 instinct 统计 | 多项目管理 |
| `/evolve [--generate]` | 分析直觉，建议进化结构 | 系统性提升 AI 行为 |
| `/skill-create` | 从 git 历史提取编码模式生成 SKILL.md | 将团队实践转化为 skill |
| `/skill-health` | skill 健康仪表板（成功率、失败模式） | 维护 skill 质量 |
| `/rules-distill` | 从 skills 提炼跨领域原则→rules | 系统性规则沉淀 |

## 3.7 Session 管理命令

| 命令 | 作用 | 应用场景 |
|------|------|----------|
| `/save-session` | 将当前 session 状态写入 `~/.claude/session-data/` | 下班前、上下文接近上限时 |
| `/resume-session` | 加载最近的 session 文件，完整恢复上下文 | 新 session 继续上次工作 |
| `/sessions [list/load/alias/info]` | 管理 session 历史、别名、元数据 | 多 session 协作 |
| `/checkpoint [create/verify/list]` | 创建/验证工作流检查点 | 长任务中的安全检查点 |

## 3.8 代码维护命令

| 命令 | 作用 |
|------|------|
| `/refactor-clean` | 识别并安全删除死代码（knip/depcheck/vulture 等） |
| `/docs` | 更新文档 |
| `/update-codemaps` | 更新代码地图 |
| `/update-docs` | 更新 README 等文档 |

## 3.9 AI 效能提升命令

| 命令 | 作用 | 应用场景 |
|------|------|----------|
| `/model-route <task>` | 推荐最佳模型档位（haiku/sonnet/opus） | 平衡成本与能力 |
| `/prompt-optimize <prompt>` | 分析并优化 prompt（不执行任务，只输出建议） | 写复杂 prompt 前 |
| `/context-budget [--verbose]` | 分析上下文窗口消耗，找优化点 | 上下文快满或响应变慢时 |
| `/aside` | 中途插问，回答后自动回到原任务 | 不想打断当前工作流时 |
| `/loop-start [pattern]` | 启动自主循环（sequential/continuous-pr/infinite） | 需要 AI 持续执行长任务 |
| `/loop-status` | 检查循环状态 | 监控自主任务 |
| `/pm2 <cmd>` | 分析项目并生成 PM2 服务命令 | 管理前后端进程 |
| `/modo` | 模式选择器（交互式 UI） | 切换 AI 工作模式 |

---

# 四、OpenSpec — 规格驱动开发

**本仓库数据**：`openspec/`（`claude-code-best` 项目根目录，非其他 repo）  
**CLI**：`openspec` 命令（`npm i -g @fission-ai/openspec` 或项目文档约定）  
**Cursor skills**：`.cursor/skills/openspec-*/`（本地，`.cursor/` 通常 gitignore）  
**核心理念**：先写规格 / 变更 artifacts，再按 tasks 实现，完成后归档。

## 4.1 核心概念

| 概念 | 位置 | 说明 |
|------|------|------|
| `specs/` | `openspec/specs/`（随变更增长） | 能力规格「真相源」 |
| `changes/` | `openspec/changes/<name>/` | 每个变更的 proposal、design、tasks 等 |
| `archive/` | `openspec/changes/archive/` 或 `.archive/` | 已完成变更 |
| Schema | `openspec/config.yaml` | 控制需要哪些 artifacts（如 `schema: spec-driven`） |

## 4.2 完整工作流

```
1. openspec init             → 初始化项目（创建 specs/、changes/、.openspec/ 目录）
2. 写规格文档                → 手动编写或 openspec spec new
3. /opsx:propose <name>      → 创建变更 + 自动生成所有 artifacts
4. /opsx:apply [name]        → 按 tasks.md 逐步实现
5. /opsx:archive [name]      → 归档并更新主 spec
```

## 4.3 Slash Commands（/opsx 系列）

### `/opsx:explore`
- **作用**：进入探索模式——只思考，不写代码
- **会做的事**：探索问题域、调研代码库、对比方案、可视化架构图、生成 artifacts
- **不会做的事**：绝对不写应用代码
- **特色**：可以随时偏题，可以不产出任何东西，"思考本身就是价值"
- **应用场景**：
  - 想法还很模糊，需要思考空间
  - 面对技术选型（Redis vs SQLite？）
  - 理解现有架构后再决定怎么做

### `/opsx:propose <name>`
- **作用**：一步创建变更 + 生成所有 artifacts
- **生成的 artifacts**：
  - `proposal.md`：做什么 + 为什么
  - `design.md`：怎么做
  - `tasks.md`：实现步骤清单
- **流程**：
  1. `openspec new change "<name>"`
  2. `openspec status --change "<name>" --json`（获取 artifact 顺序）
  3. 逐个 `openspec instructions <artifact-id>` 生成文件
  4. 按依赖顺序创建所有必要 artifacts
- **完成后**：提示运行 `/opsx:apply`

### `/opsx:apply [name]`
- **作用**：按 tasks.md 实现所有任务
- **流程**：
  1. 选择变更（可从对话推断或列出选择）
  2. `openspec status --change "<name>" --json`（了解 schema）
  3. `openspec instructions apply --change "<name>" --json`（获取上下文文件和任务列表）
  4. 读取所有上下文文件（proposal、design、specs 等）
  5. 逐 task 实现，完成后标记 `- [ ]` → `- [x]`
- **碰到问题就暂停**，等待指导
- **完成后**：提示 `/opsx:archive`

### `/opsx:archive [name]`
- **作用**：归档已完成的变更
- **发生了什么**：
  - `openspec/changes/<name>/` 移动到 `.archive/`
  - 相关 spec 文件更新（合并 acceptance criteria）
  - `progress.txt` 记录 learnings

## 4.4 CLI 命令参考

```bash
# 初始化
openspec init [--tools claude]

# 规格管理
openspec spec new                          # 创建新规格文档
openspec list --specs                      # 列出所有规格

# 变更管理
openspec list [--json]                     # 列出所有变更
openspec new change "<name>"               # 创建新变更
openspec status --change "<name>" [--json] # 查看变更的 artifact 完成状态
openspec instructions <artifact-id> --change "<name>" [--json]  # 获取生成 artifact 的指令
openspec instructions apply --change "<name>" [--json]           # 获取实现指令

# 验证与归档
openspec validate [change-name]            # 验证格式和完整性
openspec archive <name>                    # 归档已完成的变更

# 查看
openspec view                              # 交互式看板（specs + changes）
openspec config                            # 查看/修改配置
```

## 4.5 规格文档格式示例

```markdown
# Spec: [功能名称]

## Overview
[功能概述]

## Artifacts
- `src/components/Feature.tsx`
- `src/hooks/useFeature.ts`

## Behavior
[期望行为描述]

## Acceptance Criteria
- [ ] 具体可验收条件
- [ ] Typecheck passes
- [ ] Tests pass
```

## 4.6 OpenSpec Skills（Cursor / 本地）

| Skill | 作用 |
|-------|------|
| `openspec-explore` | 探索模式：思考、对比方案，不写应用代码 |
| `openspec-propose` | 创建变更 + 生成 artifacts |
| `openspec-apply-change` | 按 tasks.md 实现 |
| `openspec-archive-change` | 归档变更 |
| `openspec-sync-specs` | 将变更合并回主 specs |
| `/opsx:*` 斜杠命令 | 与上表 skills 对应（Cursor 中 `@` 或命令面板调用） |

**与 Trellis 关系**：大型功能可 OpenSpec 管 design/tasks，同时 `task.py create` 开 Trellis 任务做实现与 spec 沉淀（场景 B）。

---

# 五、四个体系的协作场景

## 场景 A：新功能开发（标准流程）

```
1. Superpowers: brainstorming     → 澄清需求，防止做错
2. Trellis: task.py create        → 创建任务，进入 planning
3. Trellis: trellis-brainstorm    → 迭代 prd.md
4. Superpowers: writing-plans     → 生成详细实现计划
5. Trellis: task.py start         → 激活任务，进入 in_progress
6. ECC: /tdd                      → TDD 工作流开始
7. Trellis: trellis-implement     → 子 agent 按 spec 实现
8. Superpowers: verification-before-completion → 确认测试真的过了
9. ECC: /code-review              → 代码质量审查
10. Trellis: trellis-update-spec  → 记录新发现
11. ECC: git commit               → 提交
12. Trellis: /trellis:finish-work → 归档任务
```

## 场景 B：大型功能（规格驱动）

```
1. /opsx:explore                  → 思考方案，绘制架构
2. /opsx:propose <feature>        → 生成 proposal + design + tasks
3. Trellis: task.py create        → 同步创建 Trellis 任务
4. /opsx:apply                    → 按 tasks.md 逐步实现
5. Superpowers: requesting-code-review → 最终审查
6. /opsx:archive                  → 归档 OpenSpec 变更
7. Trellis: finish-work           → 归档 Trellis 任务
```

## 场景 C：Bug 修复

```
1. Superpowers: systematic-debugging   → 根因分析，不乱猜
2. Superpowers: test-driven-development → 先写复现测试
3. Trellis: trellis-implement          → 实现修复
4. Trellis: trellis-check              → 质量验证
5. Trellis: trellis-break-loop         → 防止同类 bug 复发 → 写入 spec
6. Superpowers: verification-before-completion → 验证修复
```

## 场景 D：并行多任务

```
1. Superpowers: writing-plans          → 将任务分解为独立子任务
2. Superpowers: dispatching-parallel-agents → 并行派发
   └─ Agent A: 处理任务 1（上下文隔离）
   └─ Agent B: 处理任务 2（上下文隔离）
   └─ Agent C: 处理任务 3（上下文隔离）
3. ECC: /verify                        → 汇总验证
```

## 场景 E：持续学习循环

```
1. 每次 session 结束前: /learn         → 提取本次发现的模式
2. /instinct-status                    → 查看已积累的直觉
3. /evolve                             → 分析是否需要进化结构
4. /promote [id]                       → 好的经验晋升为全局直觉
5. /rules-distill                      → 提炼为永久 rules
```

---

# 六、快速决策表

> **同功能 skill 四体系选型裁定（12 能力维度 + 降级链）与场景 F–L（构建失败/重构/安全/性能/发布/文档/研究）playbooks**：
> 见 [`.cursor/skills/trellis-task-execution/skill-selection.md`](../.cursor/skills/trellis-task-execution/skill-selection.md)。
> 本表是单条速查；两个体系提供同一能力时以裁定矩阵为准。

## 遇到新任务，应该用什么？

| 任务类型 | 首选工具 |
|----------|----------|
| 需求不清晰 | Superpowers: `brainstorming` |
| 功能很大，需要文档 | OpenSpec: `/opsx:explore` → `/opsx:propose` |
| 普通功能开发 | Trellis: `task.py create` → `trellis-brainstorm` |
| **设计任务怎么执行** | **`trellis-task-execution`** → Workstream→工具映射 + 门禁链；Step 3b 金标准见 `07-01-price-library-admin-agent/execution-plan.md`；集成 D-lite 见 `07-02`（含 2026-07-03 追溯补档） |
| 遇到 bug | Superpowers: `systematic-debugging` |
| 即将写代码 | Superpowers: `test-driven-development` |
| 代码写完 | Superpowers: `verification-before-completion` + ECC: `/code-review` |
| 声明完成 | Superpowers `verification-before-completion` + §八 门禁顺序 |
| 重复修同一个 bug | Trellis: `trellis-break-loop` |
| WanD 打包发员工 | [wanding-release-standard.md](../.trellis/spec/integration/wanding-release-standard.md) |
| 有独立任务可并行 | Superpowers: `dispatching-parallel-agents` |
| session 要结束 | ECC: `/save-session` |
| 下次 session 开始 | ECC: `/resume-session` |
| 想提升 AI 长期表现 | ECC: `/learn` → `/promote` → `/rules-distill` |

## 命令速查（常用 20 条）

```bash
# 任务管理
task.py create "功能名"    # 创建任务
task.py start <dir>        # 激活任务
task.py finish             # 完成任务

# Trellis 流程
/trellis:continue          # 继续任务
/trellis:plan-execution    # 设计并落档 execution-plan.md（trellis-task-execution Step 3b）
/trellis:finish-work       # 收尾归档

# 核心工作流
/plan                      # 生成实现计划
/tdd                       # TDD 工作流
/code-review               # 代码审查
/verify                    # 完整验证

# OpenSpec
/opsx:explore              # 探索思考
/opsx:propose <name>       # 创建变更提案
/opsx:apply                # 实现任务
/opsx:archive              # 归档变更

# 效能
/save-session              # 保存 session
/resume-session            # 恢复 session
/learn                     # 学习提取
/instinct-status           # 查看直觉
/model-route <task>        # 推荐模型
/context-budget            # 检查上下文用量
```

---

# 七、各体系安装位置（三层）

| 层级 | 位置示例 | 范围 | 更新 |
|------|----------|------|------|
| **项目** | `.trellis/` · `.agents/skills/` · `.codex/agents/` · `openspec/` | 本仓库 git 跟踪（`.cursor/` 常 gitignore） | 提交到 git |
| **个人** | `~/.agents/skills/` · `~/.claude/commands/` | 你机器上所有项目 | 手动 / ECC 命令 |
| **插件** | `~/.claude/plugins/cache/...` | Superpowers · ECC | `/plugins update` |

| 体系 | 安装位置 | 更新方式 |
|------|----------|----------|
| Trellis | `claude-code-best/.trellis/` | 项目内维护；`trellis update` 可覆盖模板块 |
| Trellis skills（项目） | `.agents/skills/trellis-*` | 与 `.claude/skills/` 同步 |
| Codex sub-agents | `.codex/agents/trellis-*.toml` | 项目内 |
| Superpowers | `~/.claude/plugins/cache/.../superpowers/` | `/plugins update` |
| ECC | 插件 cache + `~/.claude/commands/` | `/plugins update` |
| OpenSpec CLI | 全局 `openspec` | `npm update -g` |
| OpenSpec 数据 | **`claude-code-best/openspec/`** | 项目内 git |
| Cursor OpenSpec skills | `.cursor/skills/openspec-*` | 本机 only |

---

# 八、验证与审查 — 四套门禁对照

改完代码后可能同时命中 **多套** 约束，不要混为一谈：

| 门禁 | 谁触发 | 做什么 | 典型工具 |
|------|--------|--------|----------|
| **Superpowers** | AI 自律 | 完成前必须有运行证据 | skill `verification-before-completion` |
| **ECC** | 用户/AI 调命令 | build/lint/test 流水线 | `/verify` · `/code-review` |
| **Trellis** | 工作流 | 对照 task spec + 项目 `.trellis/spec/` | `trellis-check` agent/skill |
| **Cursor User Rules** | 用户规则（若启用） | **顺序**：code-review agent PASS → test PASS → 文档；renderer UI 加 **Layer B** import smoke | Task `code-reviewer` 等 |
| **Layer B（renderer）** | code-reviewer / trellis-check | 变更 `renderer/**` 时模块可加载 + icon export 存在 | `node scripts/review/smoke-renderer-imports.mjs` — [spec](../.trellis/spec/frontend/layer-b-renderer-review.md) |
| **Commit 硬门禁**（2026-07-03 新增） | 代码层 hook（不是自律） | 有 active task 但无验证证据（execution-plan.md ✅ / check.jsonl PASS / task.json notes）时，**代码层拦截** `git commit` | `.trellis/scripts/common/commit_gate.py` + 三平台 `commit-gate.py` adapter — 详见 [`trellis-meta` change-hooks.md § Example: Add a Blocking Pre-Commit Gate](../.claude/skills/trellis-meta/references/customize-local/change-hooks.md) |

> **注意**：上面四套门禁（Superpowers/ECC/Trellis/Cursor Rules）此前**全部是文本约定**——AI 读 skill 文档后自觉执行，没有代码层强制。"Commit 硬门禁"是第一个真正在代码层拦截的机制，且目前只有 **Cursor（已接线）+ Codex（已接线）** 生效；**Claude Code 侧 `commit-gate.py` 已写好但 `.claude/settings.json` 的 `PreToolUse`/`Bash` matcher 尚未注册**——这是刻意的：注册这个 matcher 属于修改 AI 自己的权限/hook 配置，被 auto-mode 权限分类器拦下，需要用户手动添加或显式二次授权，AI 不会自行绕过。

```
推荐顺序（与本仓库 user rules 对齐时）：

  改代码
    → code-review agent（或 trellis-check / ECC /code-review）
    → 测试 agent 或 /verify / trellis-check
    → trellis-update-spec / 文档
    → git commit（Phase 3.4）
    → /trellis:finish-work
```

**审查工具别选错：**

| 你想… | 用 |
|-------|-----|
| Trellis 任务规格合规 | `trellis-check` **sub-agent** |
| 通用安全/质量扫一遍 | ECC `/code-review` |
| 架构/计划对齐（大步骤后） | Cursor `code-reviewer` agent |
| renderer / Settings UI 可加载性 | Layer B：`scripts/review/smoke-renderer-imports.mjs` + [layer-b-renderer-review.md](../.trellis/spec/frontend/layer-b-renderer-review.md) |
| 声明「可以提交了」 | Superpowers `verification-before-completion` + 实际命令输出 |

---

# 九、业务侧 vs 元工具（WanD 分界）

员工在 **Mixing / 万鼎报价专家** 里用的是 **产品 Agent + MCP**，与本文 ECC/Trellis **不是同一层**：

| 层 | 例子 | 文档 |
|----|------|------|
| **产品 Agent** | `quotation-agent`、`wande-orchestrator` | `ccb-installer/config/agents/` |
| **产品 Skill** | `quotation-learn-by-data`、`ccb-subagent-gate` | 装后 `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\` |
| **斜杠命令** | `/learn-by-data`、`modo.md` | 装后 `.claude\commands\`（注意与 ECC `/modo` 不同名空间） |
| **MCP 工具** | `match_quotation`、`append_business_rule` | [`guide/04-MCP配置.md`](./guide/04-MCP配置.md) · [`.trellis/spec/integration/org-knowledge.md`](../.trellis/spec/integration/org-knowledge.md) |

**组织知识库冒烟**：常规发版用 GET/CSRF 验证，**不要**每次对生产库 `append_business_rule`（append-only，见 org-knowledge spec）。

---

> 最后更新：2026-07-02（rev.2 — 范围索引、平台模式、OpenSpec 路径、验证门禁、WanD 分界）  
> Superpowers / ECC 版本以本机 `plugins cache` 为准（文档撰写时参考 6.1.0 / 1.9.0）
