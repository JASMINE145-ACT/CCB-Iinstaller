# Skill Selection — 四大体系真实调用与选型裁定

> `trellis-task-execution` 的必读参考。回答三个问题：
> **① 每个体系的 skill 在当前 harness 里怎么"真实调用"？②同功能 skill 四体系谁更优、选谁？③ 规划之外的场景（debug/重构/安全/性能/发布/文档/研究）用哪条 skill 链？**
>
> 主框架不变：所有场景最终回到 Trellis task 生命周期（`task.py` → `execution-plan.md` → §Step 5 验证链 → `/trellis:finish-work`）。

---

## 一、真实调用机制（per harness）

**"真实调用"的定义**：本 session 内产生了下列三种记录之一，并留下了输出证据：

| 调用类型 | 记录形式 | 何时用 |
|----------|----------|--------|
| `Skill:` | Skill 工具调用（如 `Skill: superpowers:test-driven-development`） | skill 在当前平台的 Skill 清单里 |
| `Agent:` | Agent/Task 工具派发子代理（如 `Agent: trellis-research`） | 能力以 subagent 形式存在 |
| `Read:` | Read 该 SKILL.md **并执行其流程、产出其要求的工件** | skill 只以文件存在、不在 Skill 清单（如 Claude Code 上的 openspec-*） |

只写名字 = 未调用。`Read:` 后不执行流程、不产出工件 = 仍然未调用。

### 各体系在三个 harness 的调用方式

| 体系 | Claude Code | Cursor | Codex / 其他 |
|------|-------------|--------|--------------|
| **Trellis skills**（trellis-before-dev / brainstorm / check / update-spec / break-loop / meta） | `Skill: <name>`（项目 skill 已注册于清单） | `Read: .cursor/skills/<name>/SKILL.md` + follow | `Read: .agents/skills/<name>/SKILL.md` |
| **Trellis agents**（trellis-research / implement / check） | `Agent: <name>` 派发 | 内联执行（Cursor 无子代理） | `.codex/agents/<name>.toml` |
| **OpenSpec**（openspec-explore / propose / apply-change / archive-change / sync-specs） | **不在 Skill 清单** → `Read: .cursor/skills/openspec-<x>/SKILL.md` + `openspec` CLI | `/opsx:*` 命令或 Read | `Read:` + CLI |
| **Superpowers**（13 个过程纪律 skill） | `Skill: superpowers:<name>`（plugin，**可直接真实调用，不是 "if on disk"**） | Cursor Superpowers 插件命令 | `Read:` plugin cache（若存在） |
| **ECC skills**（`ecc:*` 100+） | `Skill: ecc:<name>` | 部分有 `.claude/commands` 对应 | 不可用 → 用矩阵降级链 |
| **ECC agents**（80+ 语言 reviewer/resolver 等） | `Agent: ecc:<name>`（或平台注册的同名 agent） | 不可用 → 内联 | 不可用 → 内联 |

**平台差异要点**：Claude Code 上唯一必须走 `Read:` 的体系是 OpenSpec；把 Superpowers 写成"看磁盘上有没有"是错的——它是 plugin，直接 `Skill:` 调用。

---

## 二、四体系同功能比对矩阵（裁定表）

每行：四体系候选 → **裁定**（✔ = 首选）→ 降级链。所有条目均已核实真实存在于本仓库/插件清单。

### 1. 需求澄清 / Brainstorm

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `trellis-brainstorm` ✔ | 落盘 prd.md、与 task.py 生命周期绑定、一次一问 | 提问纪律弱于 superpowers |
| OpenSpec | `openspec-explore` | 思考伙伴模式，适合"想清楚再说" | 不落盘到 trellis task |
| Superpowers | `superpowers:brainstorming` | 意图挖掘纪律最强（禁止跳过直接动手） | 无项目工件 |
| ECC | `ecc:plan-prd`、`ecc:planner` agent | PRD 模板全 | 与 trellis prd.md 重复 |

**裁定**：主干用 `trellis-brainstorm`（唯一与 task 框架绑定）。需求特别模糊时**先** `Skill: superpowers:brainstorming` 借其提问纪律，产出仍写入 trellis prd.md。
**降级链**：trellis-brainstorm → superpowers:brainstorming → 主 session 直接澄清并手写 prd.md。

### 2. 代码 / 架构探索

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `Agent: trellis-research` | **强制落盘** `{task}/research/*.md` | 是研究代理，非思考伙伴 |
| OpenSpec | `openspec-explore` ✔ | 探索心态最正：只理解不实现 | Claude Code 上须 `Read:` |
| Superpowers | —（无专职探索 skill） | — | — |
| ECC | `Agent: ecc:code-explorer`、`ecc:codebase-onboarding` | 执行路径追踪、分层架构图 | 输出不自动落盘到 task |

**裁定**：轻量探索/想法梳理 → `Read: openspec-explore`；需要**持久证据** → `Agent: trellis-research`；要追踪执行路径/依赖图 → `Agent: ecc:code-explorer`，结论手动存 `research/`。
**降级链**：openspec-explore → ecc:code-explorer → 主 session Grep/Read + 手写 research/*.md。

### 3. 规格 / 设计文档

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `.trellis/spec/` + `trellis-update-spec` | 项目契约长期沉淀 | 非变更设计工具 |
| OpenSpec | `openspec-propose` ✔ | 一步生成 design+specs+tasks 全套工件 | 需 openspec CLI |
| Superpowers | `superpowers:writing-plans` | 步骤自包含纪律 | 是计划不是规格 |
| ECC | `Agent: ecc:spec-miner` | 从存量代码**反向提取**行为规格 | 只适合 brownfield |

**裁定**：大型变更设计 → `openspec-propose`（工件最全）；给存量代码补规格 → `Agent: ecc:spec-miner`；日常约定沉淀 → `trellis-update-spec`。三者互补不互斥。

### 4. 实现计划

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `trellis-task-execution`（本 skill）✔ | execution-plan.md + 验证 profile + 恢复规则 | — |
| OpenSpec | `openspec-propose` 的 tasks.md | 与规格联动 | 无验证门禁 |
| Superpowers | `superpowers:writing-plans` | "冷启动可执行"的步骤自包含标准 | 无项目落盘约定 |
| ECC | `ecc:plan`、`blueprint`（用户级） | blueprint 适合多 session 大工程 | 与 trellis 框架重叠 |

**裁定**：主干**永远**是本 skill 的 `execution-plan.md`。写计划时借 `Skill: superpowers:writing-plans` 的自包含纪律；跨多 PR/多 session 巨型工程加 `blueprint` 分解，产物仍挂到 trellis task。

### 5. TDD

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | SKILL 内嵌 TDD contract 表 | 强制记录 RED 证据/GREEN 命令/回归目标 | 无 RED-GREEN 过程纪律 |
| OpenSpec | — | — | — |
| Superpowers | `superpowers:test-driven-development` ✔ | RED/GREEN/REFACTOR 纪律最严，反 rationalization 设计 | 语言无关，无框架细节 |
| ECC | `Agent: ecc:tdd-guide`；`ecc:django-tdd` 等语言特定 | 语言/框架专精 | 纪律弱于 superpowers |

**裁定**：过程纪律 → `Skill: superpowers:test-driven-development`（写实现代码前调用）；语言特定测试模式 → 叠加对应 `ecc:<lang>-tdd`；证据回写 trellis TDD contract 表。

### 6. Debug / 根因定位

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `trellis-break-loop` | 打断"盲目重试"循环 | 不做根因分析 |
| OpenSpec | — | — | — |
| Superpowers | `superpowers:systematic-debugging` ✔ | 先根因后修复的阶段化纪律 | 不动手修 |
| ECC | `Agent: ecc:<lang>-build-resolver` 系列、`ecc:orch-fix-defect`、`Agent: ecc:silent-failure-hunter` | 构建类错误直达修复；静默失败猎手 | resolver 只管构建面 |

**裁定**：症状未知/行为异常 → `Skill: superpowers:systematic-debugging` **先于任何修复**；纯构建/编译报错 → 直接 `Agent:` 对应语言 build-resolver（见场景 F）；同一修复两连败 → `trellis-break-loop`。

### 7. 实现执行

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `Agent: trellis-implement` ✔ | implement.jsonl spec 注入、禁 commit | 需子代理平台 |
| OpenSpec | `openspec-apply-change` | 按 change tasks 逐项实现 | 仅当存在 OpenSpec change |
| Superpowers | `superpowers:executing-plans`、`superpowers:subagent-driven-development` | 计划执行纪律 / 本 session 多任务派发 | 无 spec 注入 |
| ECC | `ecc:feature-dev`、`ecc:orch-*` | 全自动流水线 | 本仓库禁 WanD UI 任务 autopilot |

**裁定**：本仓库默认 `Agent: trellis-implement`（spec 注入独有）；已有 approved plan 且本 session 执行 → 叠加 `Skill: superpowers:executing-plans` 的 checkpoint 纪律；存在 OpenSpec change 工件 → `Read: openspec-apply-change`。

### 8. 并行执行

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | §Step 6 merge rules ✔（合并秩序） | JSON→TS 串行合并等本仓库铁律 | 不管派发 |
| OpenSpec | — | — | — |
| Superpowers | `superpowers:dispatching-parallel-agents` ✔（派发纪律）、`superpowers:using-git-worktrees` | 派发前置条件检查 / worktree 隔离 | 不知道本仓库 merge 规则 |
| ECC | `ecc:multi-plan` / `ecc:multi-execute`、`ecc:team-builder`、`ecc:dmux-workflows` | 规模化多模型编排 | 重 |

**裁定**：组合拳——派发纪律 `Skill: superpowers:dispatching-parallel-agents` + 合并秩序 trellis §Step 6，两者都调用才允许 Scenario D。≥3 个异构 agent 的规模化编排才上 `ecc:multi-*`。

### 9. 代码审查

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `Agent: trellis-check` | spec 合规审查 + 自修复 | 不管通用质量 |
| OpenSpec | — | — | — |
| Superpowers | `superpowers:requesting-code-review` / `receiving-code-review` | 审查交互纪律（如何提请求/接反馈） | 自己不审 |
| ECC | `Agent: code-reviewer`；`Agent: ecc:<lang>-reviewer`（typescript/python/rust/react/vue…）✔；`Agent: ecc:security-reviewer` | 语言专精深度最高 | 不知道 .trellis/spec |

**裁定**：**主审二选一不变**（trellis-check 管 spec 合规 / code-reviewer 管 quality）。语言明确时优先派语言特定 `ecc:<lang>-reviewer` 而非通用 code-reviewer。审查交互纪律借 superpowers。

**Code-reviewer 身份（本项目）**：`Task` → `subagent_type: "code-reviewer"` = **Superpowers** `agents/code-reviewer.md`（路径见 `.cursor/rules/code-reviewer-agent.mdc`）+ 项目扩展 `.cursor/agents/code-reviewer.md`。

**Layer A（普世语义审查）**：当 diff 触及 **picker / 设置绑定 / 路由身份字段**（任意层：renderer、API、worker）时，code-reviewer **必须**对照 `.trellis/spec/code-review-layer-a.md` 的 A1–A5；无 Layer A 规则结论不得 PASS。典型触发：Agent/助手/模型下拉、Channels 与 Guid 同类选择、config persist + backend read 链。

**Layer B（renderer UI）**：当 diff 触及 `aionui-src/.../renderer/**` 时，code-reviewer **必须**运行 `node scripts/review/smoke-renderer-imports.mjs`（`--git-diff` 或 `--file`），并在 verdict 附输出；无 Layer B 证据不得 PASS。详见 `.trellis/spec/frontend/layer-b-renderer-review.md`。

### 10. 验证 / 完工

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | §Step 5 gate + `/trellis:finish-work` ✔ | 唯一带 spec 更新 + jsonl 证据的完整链 | — |
| OpenSpec | `openspec-archive-change` | change 归档 | 仅 OpenSpec 工件 |
| Superpowers | `superpowers:verification-before-completion`、`superpowers:finishing-a-development-branch` | "声称完成前必须验证"的自律 | 无项目门禁 |
| ECC | `ecc:verification-loop`、`ecc:quality-gate` | 可执行验证命令集 | 与 Step 5 重叠 |

**裁定**：骨架永远是 trellis §Step 5 链。声明"完成"前叠加 `Skill: superpowers:verification-before-completion` 自查；需要成套验证命令 → `Skill: ecc:verification-loop` 取命令、证据仍回填 Step 5。

### 11. 知识沉淀

| 体系 | 候选 | 强项 | 弱项 |
|------|------|------|------|
| Trellis | `trellis-update-spec` ✔ | 项目契约进 .trellis/spec/ | — |
| OpenSpec | `openspec-sync-specs` / `openspec-archive-change` | delta 规格同步回主规格 | 仅 OpenSpec |
| Superpowers | — | — | — |
| ECC | `ecc:learn`、`ecc:continuous-learning-v2`、`ecc:save-session` | 个人习惯/instinct 沉淀、session 存档 | 非项目契约 |

**裁定**：项目级契约 → `trellis-update-spec`；OpenSpec change 收尾 → `sync-specs`/`archive-change`；个人跨项目习惯 → `ecc:learn`（instincts）。三层互补。

### 12. 安全（ECC 独占维度）

四体系中只有 ECC 有安全专职：`Agent: ecc:security-reviewer`（或平台注册的 security-reviewer）、`Skill: ecc:security-scan`、`Skill: security-review`（用户级）。触发 `security` risk tag 时无可辩驳直接调用，见场景 H。

---

## 三、场景扩充 Playbooks（F–L）

沿用 SKILL.md 场景 A–E；以下为扩充场景。每条链的调用类型（`Skill:`/`Agent:`/`Read:`）即证据要求；**所有场景收口回 trellis gate（§Step 5）**。轻量场景（F/K）允许 Lite 深度 + Fast profile，但 evidence block 不可省。

### F — 构建 / 编译失败

**入口判定**：`bun build` / `tsc` / `cargo build` 等报错；症状在构建面而非运行时行为。

```
1. Agent: <lang>-build-resolver（ecc；如 ecc:react-build-resolver / rust-build-resolver）
2. 两轮未修复 → Skill: superpowers:systematic-debugging（升级为根因问题）
3. 修复须附回归测试（TDD contract：Bug fix 行）
4. Gate: Fast profile → 主审二选一 → finish
```

### G — 重构 / 死代码清理

**入口判定**：行为不变的结构改动；用户说「清理」「简化」「拆文件」。

```
1. 安全网先行：Skill: superpowers:test-driven-development —— 缺测试的部分先补 characterization test（RED 证据 = 现状行为锁定）
2. Skill: ecc:refactor-clean（knip/depcheck/ts-prune 分析）或 Agent: ecc:code-simplifier
3. Gate: Standard profile；主审优先 Agent: ecc:<lang>-reviewer
4. 行为若意外改变 → 回场景 C（bug 流程）
```

### H — 安全审计 / 敏感变更

**入口判定**：触碰 auth / secrets / 用户输入 / 支付 / 权限 / 加密；`security` risk tag。

```
1. Agent: security-reviewer（或 ecc:security-reviewer）—— 强制，不可用矩阵降级跳过
2. Skill: ecc:security-scan（密钥/注入/OWASP 扫描命令集）
3. 攻击面变更 → Read: openspec-explore 梳理信任边界，结论进 research/
4. Gate: Security profile（滥用用例 + 信任边界证据）→ finish
```

### I — 性能优化

**入口判定**：慢、卡、包体大、内存涨；有可量化指标。

```
1. 先测量后优化：Agent: performance-optimizer（ecc）；web 场景用 chrome-devtools MCP trace（performance_start_trace / lighthouse_audit）
2. 基线数字落盘 research/perf-baseline.md（trellis-research 承接）
3. 优化实现走 TDD（性能断言或基准对比即 RED/GREEN 证据）
4. Gate: Standard/UI profile + 前后对比数字 → finish
```

### J — 发布 / 打包

**入口判定**：build-wanding / 安装器 / 版本发布 / 「打包」「发版」「NSIS」；`packaging` risk tag。

**硬门禁（开跑 `build-wanding.ps1` 之前必须完成）：**

```
1. Read（整份或至少下列节）:
   .trellis/spec/integration/wanding-release-standard.md
     — §0 黄金法则 · §2.3 新 seed skill 清单 · §5.5 LASTEXITCODE
     — §6.8 live≠staging · §6.9 修包后必须重打 · §10 wallet card
2. Read:
   .trellis/spec/integration/wanding-packaging-whitelist.md
     — $shipScripts + bootstrap/deploy 运行时闭包（dotsource/callee 必须同包）
3. 对照 §2.3 / wallet card 勾选本次变更（新 skill / 新脚本 / config_generation）
4. Skill: ecc:verification-loop 取验证命令集（build → smoke → recovery check）
5. 打包前 git status/diff 核对工作树（防静默回退）
6. Gate: Release profile + 人工验收；delivery SHA256 = 当前 exe（修 packaging 后须 §6.9 repack）
```

未完成 1–3 不得声明「开始打包」。Cursor 规则：`.cursor/rules/wanding-release-packaging.mdc`（编辑安装器相关文件时自动带上）。

### K — 文档 / 规格同步

**入口判定**：只动 md/注释/codemap；代码行为不变。

```
1. Agent: doc-updater（或 Skill: ecc:update-docs / ecc:update-codemaps）
2. 存在 OpenSpec change 未同步 → Read: openspec-sync-specs
3. 项目契约变化 → Skill: trellis-update-spec
4. Gate: Fast profile；TDD = N/A（注明理由）+ 链接/schema 校验 → finish
```

### L — 深度研究（无代码产出）

**入口判定**：技术选型、外部 API 调研、竞品分析；`external-api` risk tag 的前置。

```
1. Agent: trellis-research —— 强制落盘 {task}/research/*.md（含来源与置信度）
2. 需要网络检索 → Skill: ecc:deep-research 或 ecc:exa-search（引用带来源）
3. 输出：research/*.md + 结论摘要；不写实现计划、不写代码
4. 研究否定原假设 → 回 Phase 1 更新 prd.md（Conditional recovery 表）
```

### 场景速判表

| 症状 | 场景 | 首发调用 |
|------|------|----------|
| 需求不清 | E | `Read: openspec-explore` 或 `Skill: trellis-brainstorm` |
| 行为异常/未知根因 | C | `Skill: superpowers:systematic-debugging` |
| 构建报错 | F | `Agent: ecc:<lang>-build-resolver` |
| 清理/简化 | G | `Skill: superpowers:test-driven-development`（安全网） |
| 触碰 auth/secrets | H | `Agent: security-reviewer` |
| 慢/卡/包大 | I | `Agent: performance-optimizer` + 测量 |
| 打包/发版 | J | **先** `Read: wanding-release-standard` §0/§2.3/§5.5/§6.8–6.9/§10 + `wanding-packaging-whitelist` 闭包，再 build |
| 只动文档 | K | `Agent: doc-updater` |
| 纯调研 | L | `Agent: trellis-research` |

---

## 四、调用纪律 — Rationalization 反驳表与 Red Flags

### 借口 → 现实

| 借口 | 现实 |
|------|------|
| 「计划里写了 skill 名，执行时自然会用」 | 名字 ≠ 调用。本 session 无 `Skill:`/`Agent:`/`Read:` 记录 = 无效计划（§Step 1b） |
| 「Superpowers 不在磁盘上」 | Claude Code 上它是 plugin：`Skill: superpowers:<name>` 直接调用。说"不在磁盘"= 没查 Skill 清单 |
| 「ECC skill 太多了，先不选」 | 矩阵已按 12 个能力维度裁定完毕，照抄胜者即可 |
| 「这是 debug 不是规划，这套不适用」 | 场景 F–L 已覆盖 debug/重构/安全/性能/发布/文档/研究，每条都有首发调用 |
| 「Read 过 SKILL.md 就算调用了」 | `Read:` 型调用必须执行其流程并产出其要求的工件；只读不做 = 名字调用 |
| 「这个场景太小，不值得走链」 | 小场景走 Lite + Fast，但 evidence block 不可省。降级深度 ≠ 免除调用 |
| 「四体系都提了，很融合了」 | 融合 = 每个能力维度用裁定胜者真实调用，不是罗列四个名字 |

### Red Flags — 出现即停，回 §Step 1b

- execution-plan.md 里出现没有 `Skill:`/`Agent:`/`Read:` 前缀的工具名
- 写了 "if on disk" / "if present" 而没有查当前平台 Skill 清单
- Scenario C/F 直接开始改代码，没有 systematic-debugging 或 build-resolver 记录
- `security` tag 出现但计划里没有 security-reviewer 行
- Evidence block 里某行只有 skill 名、没有输出证据（spec 路径 / research 文件 / 测试结果）

---

## 五、Evidence block 扩展格式

`execution-plan.md` 与聊天中的证据块，每行必须带调用类型前缀：

```markdown
## Skills invoked (this session)
| 调用 | 类型 | 证据 |
|------|------|------|
| trellis-before-dev | Skill: | spec index: .trellis/spec/integration/… |
| superpowers:systematic-debugging | Skill: | 根因假设 + 排除记录（见 research/bug-x.md） |
| ecc:react-build-resolver | Agent: | build green，diff 3 files |
| openspec-explore | Read: | openspec list --json 输出 + 架构图 in chat |
```

矩阵裁定的首选不可用时：按该维度降级链取下一项，并在 Phase -1 capability matrix 标注 `unavailable + fallback`。
