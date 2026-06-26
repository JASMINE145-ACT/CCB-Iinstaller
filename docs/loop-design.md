# Loop Design（循环工程）— 记录与实践

> **用途：** 把"Loop Engineering"这件事讲清楚 —— 它和 prompt engineering 的关系、五个必备零件 + 一个状态文件、Codex 与 Claude Code 的对位、CCB-Wanding 项目可以怎么用、以及它解决不了的问题。  
> **版本：** 2026-06-21（v1，读书笔记 + 实践映射）  
> **关联：** [Agent 工程化成熟度评估](./ccb-wanding-agent-engineering-maturity.md) · [平台架构总览](./ccb-wanding-platform-architecture.md) · [业务记忆架构](./memory系统改造.md)

---

## 1. 一句话结论

**Loop engineering = 你不再是"那个写 prompt 的人"，而是"那个设计循环的人"。**

循环 = 一个递归目标：你定义目的，AI 自行迭代直到完成。你设计一次，它替你按下回车键。

这不是工具升级，是工作模式的位移。杠杆点从"我下一句该说什么"挪到了"我应该让这个系统怎么跑"。

---

## 2. 为什么这件事现在成立

过去两年，coding agent 的标准用法是这样的：

```text
人 → 写 prompt → agent → 输出 → 人读 → 写下一个 prompt → agent → ...
```

人一直在场，握着工具，turn by turn。

现在的变化是：**这个循环里"握着工具"的那只手可以不是你了。** 你把它换成一个小系统：找活儿 → 派活儿 → 验收 → 落账 → 决定下一步。然后让这个系统去戳 agent。

Pieces 已经 ship 在产品里了 —— Codex App 和 Claude Code 的五件套几乎一一对应。所以**工具换了不要紧，循环设计是稳态**。

---

## 3. 五个零件 + 一个状态文件

| # | 零件 | 角色 | Codex App | Claude Code |
|---|------|------|-----------|-------------|
| 1 | **Automations** | 心跳：定时发现 + 分流 | Automations tab（项目/prompt/频率/环境）；Triage inbox；`/goal` 跑-直到-完成 | Scheduled tasks、cron、`/loop`、`/goal`、hooks、GitHub Actions |
| 2 | **Worktrees** | 隔离：两个 agent 不会互踩 | 内置 worktree per thread | `git worktree`、`--worktree`、subagent 的 `isolation: worktree` |
| 3 | **Skills** | 沉淀：项目知识不用每次重说 | `SKILL.md`，`$name` 或隐式调用 | `SKILL.md`，`$name` 或隐式调用 |
| 4 | **Plugins / Connectors** | 接入：让循环碰到真实工具 | MCP Connectors + plugins | MCP servers + plugins |
| 5 | **Sub-agents** | 分工：写的人和查的人分开 | `.codex/agents/*.toml`（自定义） | `.claude/agents/*`、agent teams |
| 6 | **State** | 记忆：跨会话记得住"做到哪了" | Markdown / Linear via connector | `AGENTS.md`、progress 文件 / Linear via MCP |

第 6 件看起来最蠢（"不就是个文件吗"），但**没有它整个循环就是失忆的**。模型每轮重启会忘记一切，状态必须活在 disk 上、不在 context 里。Agent 忘，repo 不忘。

---

## 4. 五个零件逐个拆

### 4.1 Automations — 心跳

把"循环"和"一次性跑"区分开的就是这个。

- **Codex App**：在 Automations tab 选 project / prompt / cadence / 环境（本地 checkout 还是后台 worktree）。找到事儿的跑进 Triage inbox，没找到的自动归档。Skill 可以被 automation 调用 —— `$skill-name` 比把一坨指令贴在 schedule 上好维护一万倍。
- **Claude Code**：通过 scheduling + hooks 走到同一个地方。`/loop` 周期跑、`/loop` 加 cron 定时、hooks 挂在 agent 生命周期某些点、关电脑也能跑就推 GitHub Actions。

**两个值得记住的 in-session 原语**：

- `/loop` — 按 cadence 反复跑
- `/goal` — 跑到**你写下的可验证条件**成立为止，并且每轮用一个**不同的小模型**判定 done（写代码的 agent 不给自己批改卷子）

> 在 Codex 里 `/goal` 同名同义，pause / resume / clear 都齐。两个工具同一套原语，这是整篇文章的缩影。

### 4.2 Worktrees — 隔离

第二个 agent 一上场，文件就开始撞车。两个 agent 改同一行 ≈ 两个工程师谁也不沟通就 commit 同一行。

git worktree 解决：同一个 repo、同一个 history、不同 working directory、不同 branch。一个 agent 的编辑物理上碰不到另一个 agent 的 checkout。

- **Codex**：内建 worktree，多 thread 同 repo 互不干扰
- **Claude Code**：`git worktree` + `--worktree` 旗 + subagent 的 `isolation: worktree`

> Worktree 解决的是机械碰撞，**不解决 review 带宽**。你同时能跑几个取决于你能审几个，不取决于工具。

### 4.3 Skills — 沉淀

金鱼记忆的解药。`SKILL.md` 写在 repo 里，每次跑循环自动加载。

> 一个不显然的点：**写 skill 描述的时候，精准 > 巧妙**。Codex 的隐式匹配是按 description 做的，写得花里胡哨反而命中错。

Skill 解决的是 **intent debt**：agent 每次冷启动，会拿"自信的猜测"去填你没说清的地方。Skill 把 intent 写在 disk 上，agent 每次跑都读得着。没有 skill，循环每个 cycle 都从零重新推导整个项目；有 skill，循环在**复利**。

> 区分两个东西：**Skill 是创作格式，Plugin 是分发方式**。要跨 repo 共享或打包多个 skill 时才升级成 plugin。

### 4.4 Plugins / Connectors — 接入

一个只看得见文件系统的循环，是个小循环。MCP 让 agent 读 issue tracker、查数据库、打 staging API、丢 Slack 消息。

Codex 和 Claude Code 都讲 MCP，所以你给一个写的 connector 另一个大概率能直接用。Plugin 把 connector + skill 打包成"一键安装"。

这就是为什么：

- 普通 agent → 给你"建议"
- 真正的循环 → **自己开 PR、关 Linear、CI 绿了 ping 频道**

Connectors 是"建议"和"行动"的分水岭。

### 4.5 Sub-agents — 写的人和查的人分开

整套结构里**最有用的一件**。写代码的模型给自己批改卷子会过水 —— 它太 nice 了。

第二个 agent 拿不同指令、有时不同模型，能抓回第一个自己糊弄过去的东西。

- **Codex**：用户显式召唤 subagents，**并行**跑，结果折回一个答案。`.codex/agents/*.toml` 里写 name / description / instructions / 可选 model & reasoning effort。安全审计用强模型 + 高 effort，扫一眼的 explorer 用快只读模型。
- **Claude Code**：`.claude/agents/*` + agent teams（互相交接任务）。标准切法是 explorer / implementer / spec-verifier 三件套。

> Sub-agents 烧 token（每个都跑自己一份模型 + 工具），**花在"值得要第二意见"的地方**。  
> 这其实就是 `/goal` 在做的事情 —— 用**新鲜的小模型**判定 done，写代码的 agent 不判自己的卷子。Maker-checker split 应用到了停止条件本身。

---

## 5. 一个 loop 长什么样

每天早上 9 点：

```text
┌─ Automation 触发（早 9 点，本地 checkout 或 worktree）──┐
│ 调用 $triage skill：                                      │
│   - 读昨日 CI failures                                    │
│   - 拉 open issues                                        │
│   - 看 recent commits                                     │
│   - 写 findings 到 memory/triage/YYYY-MM-DD.md            │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌─────────────────┐
│ Maker subagent│ ──────▶ │ Reviewer subagent│
│ (worktree-A)  │  PR     │ (worktree-A 同)  │
│ 起 fix 分支    │         │ 对照 skill + 测试│
└───────────────┘         └────────┬────────┘
                                   │
                                   ▼
                          Connectors: open PR
                          更新 Linear ticket
                          通知 Slack
                                   │
                                   ▼
              ┌──────── 人类 triage inbox ────────┐
              │ 循环搞不定的才进这里                │
              └──────────────────────────────────┘
```

**关键事实**：你设计它一次。下面每一个 step，都不是你按的回车键。

---

## 6. 在 CCB-Wanding 怎么落地（实践映射）

| Loop 零件 | 现状 | 第一步可做的事 |
|-----------|------|----------------|
| Automations | Trellis 任务靠人手推 | 写一个 `trellis-triage` skill 跑 daily issues / failed CI 摘要 |
| Worktrees | 当前 subagent 都在主 checkout | 给 `code-reviewer` / `trellis-implement` 配 `isolation: worktree` |
| Skills | `.cursor/skills/`, `.trellis/spec/` 都有 | 把"踩过的坑"统一成 `SKILL.md`，description 写精准（不要花哨） |
| Plugins / Connectors | `.mcp.json` 已挂一批 MCP（neon / xlsx / pdf / excel / sql / maps / canva） | 把 Linear / GitHub Project 接成 MCP，循环里自动开 PR/关 ticket |
| Sub-agents | `.claude/agents/` 已有（`trellis-check` / `trellis-implement` / `trellis-research` / `code-reviewer` / `best-of-n-runner`） | 把"实现 vs 验收"显式拆：implementer 不写测试，verifier 不看实现 |
| State | `AGENTS.md` + `.trellis/workspace/` 已存 developer journal | 把 `.trellis/tasks/` 当 state 源，循环每轮必读 active tasks |

> 注意：CCB-Wanding 的 loop 不是替代开发流程，**是把"找活 + 派活 + 验收"这一段最累的机械动作从人身上挪到系统**。人留下来做 spec、定 subagent、写 skill。

---

## 7. 它没解决的三件事（而且会变严重）

> Loop 改变工作，不把人从工作里删掉。三件事随循环变好**反而变难**。

### 7.1 验证责任还在你

一个无人值守的循环 = 一个无人值守会犯错的循环。

拆 verifier subagent 是为了让"它说做完了"这句话**有点分量**，但**"做完了"是 claim，不是 proof**。Rule of thumb：

> 你的工作 = ship 你确认能跑的代码。

### 7.2 你的理解在腐

循环跑得越快、你越少读、你和代码之间的**理解差**越大。Comprehension debt。Loop smooth = debt 长更快。

> 不读自己循环出来的东西 = 自动接受腐烂。

### 7.3 舒适姿势就是危险姿势

循环自己跑起来之后，最省力的姿态是**闭嘴接结果**。Cognitive surrender。

Loop design 既是解药（设计得带判断）也是毒药（设计得为了不思考）。同一个动作，正反两种结果。

---

## 8. 实践守则（写给自己）

1. **每个循环要有一份写下来的 stopping condition。** 没有 stopping condition 的循环不是循环，是"跑着看"。
2. **Maker / checker 必须分人（最好分模型）。** 自己写自己审一律判假。
3. **Skill 的 description 写精准。** 写花哨就匹配错。
4. **State 在 disk，不在 context。** 文件名稳定、路径稳定、agent 找得到。
5. **每个 worktree 收尾前必读 diff。** 哪怕只是 5 行，不读就发出去 = 主动放弃理解。
6. **停掉循环比启动循环更值得思考。** 跑起来容易，喊停难 —— 写好"什么时候 abort"的硬条件。
7. **Loop 是给熟悉的工作加速的，不是给陌生的工作省思考的。** 不熟悉的领域，先 prompt 走通，再上 loop。

---

## 9. 速记对照

```text
prompt engineering  → 设计"这一轮该说什么"
harness engineering → 设计"这个 agent 在什么环境里跑"
loop engineering    → 设计"这个系统怎么自己跑、怎么停、怎么记"
```

杠杆点位移。`"Build the loop. Stay the engineer."`
