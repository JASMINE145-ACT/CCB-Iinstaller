# CCB-Wanding × AionUI 兼容路径评估

**日期**: 2026-06-11
**作者**: Claude (评估)
**状态**: 探索中 — 真实代码分析，未修改源码

> **长期方案可行性计划**（含证据链、分阶段任务、验收标准）见  
> [ccb-runtime-acp-agent-feasibility-plan.md](./ccb-runtime-acp-agent-feasibility-plan.md)  
> **ccb-runtime 复刻标准**：复刻「业务 Agent 行为」九项；不复刻 REPL/QueryEngine/gate（§0.1.1）  
> **双接入面**：Path A static→serve-wanding；新 B registry→ccb-acp-agent；共享 runtime（计划 §2.2、§2.3）

---

## 0. 摘要（TL;DR）

| 结论 | 状态 |
|------|------|
| Trellis 装在 `D:\Projects\claude-code-best`（已从 `claude-code` 卸载） | ✅ |
| ccb-wanding "路线 1"（`ccb-wanding -p --output-format stream-json`）是**死胡同** | ❌ |
| ccb-wanding 的 `cli.js` **没有 `-p` fast-path** | 关键发现 |
| AionUI 接 Claude Code 用的是 **ACP 协议**，不是 `-p` headless | 关键发现 |
| 真实可推进的 3 条路：`web-serve` / `--acp` 补丁 / 重构 -p | 见 §3 |
| 最短路径：继续 `serve-wanding.js` Stage 1→2→3→4 | 推荐 |

---

## 1. Trellis 安装

### 1.1 全局安装

```bash
bun add -g @mindfoldhq/trellis@latest
# → installed @mindfoldhq/trellis@0.5.19 with binaries: tl, trellis
```

**前提**：
- Node v20.20.1 ✅
- Python 3.11.5 ✅
- npm 不在 PATH（已用 Bun 替代）

### 1.2 Init 位置（修正后）

| 步骤 | 位置 | 备注 |
|------|------|------|
| 第一次（错） | `D:\Projects\claude-code` | 已 `trellis uninstall -y`（70 文件删除） |
| 第二次（对） | `D:\Projects\claude-code-best` | 启用 `--claude --cursor` |

**配置差异**：

| 维度 | claude-code | claude-code-best |
|------|-------------|------------------|
| 模板数 | 70 | 112 |
| 仓库类型 | Bun monorepo（17 packages） | 非 monorepo（按 layer） |
| spec 结构 | per-package（17 目录） | per-layer（backend/frontend/guides） |
| Cursor 启用 | 否 | 是 |

### 1.3 本地 Trellis 7 个技能

```
.claude/skills/
├── trellis-before-dev       # 实现前注入编码规范
├── trellis-brainstorm       # 引导需求探索
├── trellis-break-loop       # 跳出 verify 死循环
├── trellis-check            # 质量校验（spec 合规 + lint + type-check + test）
├── trellis-meta             # 自定义 Trellis 架构
├── trellis-spec-bootstarp   # 引导项目 spec
└── trellis-update-spec      # 把执行结果沉淀到 spec
```

### 1.4 工作流（3 阶段，本地 workflow.md）

```
Phase 1: Plan    → task.py create → trellis-brainstorm → prd.md + jsonl
Phase 2: Execute → trellis-implement sub-agent → trellis-check sub-agent
Phase 3: Finish  → trellis-update-spec → git commit → /trellis:finish-work
```

---

## 2. CCB-Wanding 现状评估

### 2.1 背景

`ccb-wanding`（即 `D:\CCB-Wanding\`、`ccb-installer\dist\`）是 reverse-engineered Claude Code 派生版。
- 反代 Claude Code，指向 MiniMax API (`https://api.minimaxi.com/anthropic`)
- 内置 MCP：`quotation` / `accurate`
- 团队目标：让 AionUI 调用 ccb-wanding 而非官方 Claude Code

### 2.2 关键发现：cli.js 没有 -p fast-path

读了 `D:\Projects\claude-code-best\ccb-installer\dist\cli.js`（完整文件 ~7.9KB）。

cli.js 的 fast-path 完整列表：

| argv[0] | 入口 chunk | 用途 |
|---------|-----------|------|
| `--version` / `-v` / `-V` | inline | 版本号 |
| `--claude-in-chrome-mcp` | mcpServer-DZKx0BiR | Chrome MCP |
| `--chrome-native-host` | chromeNativeHost-Ct0ug6pP | Chrome host |
| `--computer-use-mcp` | mcpServer-P7ORCSMK | Computer use |
| `--acp` | **entry-WG7IeDEv** | **ACP 协议**（AionUI 走的） |
| `weixin` | src-DJQlFHr1 | 微信 channel |
| `--daemon-worker` | workerRegistry | Daemon worker |
| `web-serve` / `web` | **serve-wanding.js** | **AionUI HTTP/WebSocket 后端** |
| `remote-control` / `rc` / `remote` / `sync` / `bridge` | bridgeMain | Remote control |
| `daemon` | main-C3P3r08I | Daemon 主 |
| `autonomy` | autonomy | 单次命令执行 |
| `--bg` / `--background` | bg-BKSHc1r3 | 后台启动 |
| `ps` / `logs` / `attach` / `kill` | daemon | 弃用 |
| `job` / `new` / `list` / `reply` | templateJobs | 模板 jobs |
| `--tmux` + `--worktree` | worktree | tmux worktree |
| `--update` / `--upgrade` | (重写 argv) | 升级 |
| `--bare` | (env flag) | 简单模式 |
| (默认) | **main-Dj9buWt1** | **REPL 入口** |

**没有 `-p` / `--print` / `--output-format stream-json` fast-path**。

→ `ccb-wanding -p "你好"` 走的是 `main()`（REPL 入口）
→ `verifyAutoModeGateAccess` 在 main 的 REPL 流程里
→ REPL 期望交互输入（stdin TTY），headless 下挂起

### 2.3 AionUI 兼容 Claude Code 的真实机制

**"AionUI 能接 Claude Code" 不是因为 `-p` headless**，而是因为 **ACP（Agent Client Protocol）**：

```
AionUI (Electron)
  ↓ stdio JSON-RPC（ACP 协议）
claude --acp
  ↓
Claude Code 内部 switch 到 ACP 模式
```

ccb-wanding 的 `--acp` 入口对应 `entry-WG7IeDEv.js`。
AionUI 通过 `acp-agent.js` 补丁（`ccb-installer/patches/aionui-acp/`）启动 ccb-wanding 子进程。

### 2.4 真实可推进的 3 条路

| 路径 | 命令 | 当前状态 | 阻塞点 |
|------|------|---------|--------|
| **A. web-serve** | `cli.js web` | ✅ Stage 1 fake 跑通；AionUI 前端可显示 | Stage 2-4 未做：MiniMax 纯文本 / MCP / 工具调用 |
| **B. --acp** | `cli.js --acp` | ⚠️ 4 轮补丁，交互式跑通；headless 挂 | `query.next()` 60s 无 assistant event |
| **C. -p headless** | `cli.js -p "..."` | ❌ 走 REPL main，verifyAutoModeGateAccess 卡 | cli.js 无 -p fast-path，需新写 |

### 2.5 "路线 1" 为什么是死胡同

用户提出的"路线 1"思路：
> 做一个 `ccb-aionui-wrapper`，模仿 Claude Code 的 headless 输出格式，让 AionUI 通过 `-p --output-format stream-json` 调用

**为什么是死胡同**：
1. AionUI **不**通过 `-p` 接 Claude Code，它通过 `--acp`（ACP 协议）
2. 即使做出 wrapper，AionUI 也不会调用它（AionUI 没这个适配器）
3. ccb-wanding 已经有 `--acp` 入口，正在被补丁中（4 轮）

**唯一让"路线 1"成立的场景**：把 ccb-wanding 当通用 Claude Code 替代品（不针对 AionUI），那 `-p` headless 是合理目标——但这是**新功能**，不是**打通 AionUI**。

---

## 3. 真实瓶颈（4 个差距 vs 当前能力）

| 差距 | 用户描述 | ccb-wanding 现状 | 严重度 |
|------|---------|------------------|--------|
| 1. 稳定 headless 模式 | 不稳定，卡 verifyAutoModeGateAccess | cli.js 无 -p fast-path，REPL 入口期望 TTY | 🔴 最高 |
| 2. AionUI 适配器 | 没有 | 已有 `--acp` 入口 + 4 轮 acp-agent.js 补丁 | 🟡 中等 |
| 3. 输出协议 | 不匹配 | 已有 AionUI 协议（serve-wanding.js 的 WebSocket）；无 stream-json 协议 | 🟡 中等 |
| 4. 权限 / TUI 残留 | 可能卡 gate | bypassPermissions 已设；REPL TTY 期望未解 | 🟡 中等 |

### 3.1 关键代码位置

| 文件 | 作用 |
|------|------|
| `D:\Projects\claude-code-best\ccb-installer\dist\cli.js` | 入口（7.9KB），含 fast-path 分发 |
| `D:\Projects\claude-code-best\ccb-installer\dist\chunks\main-Dj9buWt1.js` | REPL 入口（main()） |
| `D:\Projects\claude-code-best\ccb-installer\dist\chunks\entry-WG7IeDEv.js` | ACP 入口（--acp） |
| `D:\Projects\claude-code-best\ccb-installer\dist\chunks\serve-wanding.js` | Web server 入口（web-serve / AionUI 后端） |
| `D:\Projects\claude-code-best\ccb-installer\patches\aionui-acp\acp-agent.js` | AionUI 侧的 acp-agent 补丁源 |
| `D:\Projects\claude-code-best\ccb-installer\patches\aionui-acp\index.js` | CLI/Bun 启动补丁 |
| `D:\Projects\claude-code-best\ccb-installer\AIONUI-BACKEND-STATUS.md` | 状态日志（6+ 小时工作记录） |
| `D:\Projects\claude-code-best\spec\aionui-ccb-wanding-acp-mcp-fix.md` | ACP 修复 spec |
| `D:\CCB-Wanding\dist\cli.js` | 实际部署的 ccb-wanding 入口（与 ccb-installer/dist 同步） |

### 3.2 当前可工作的子集

经 `AIONUI-BACKEND-STATUS.md` 验证：

**`serve-wanding.js` Stage 1（fake）已端到端工作**：
- ✅ `GET /api/auth/user` / `/api/agents` / `/api/conversations` / `/api/providers` 正常返回
- ✅ AionUI 静态文件（`index.html` + JS chunks）正确分发
- ✅ POST 消息 → 固定回复 `你好，我是 CCB-Wanding。`
- ✅ WebSocket 事件序列完整：`message.userCreated` / `runtime.statusChanged` / `message.stream` / `turn.completed` / `message.agentCreated`
- ✅ TLS bypass（Bun `tls: { rejectUnauthorized: false }`）解决 MiniMax 证书
- ✅ 浏览器打开 `http://localhost:3001/` 不白屏，可输入可发消息
- ✅ MCP 配置目录 `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` 正确读取
- ✅ 工具注入：`inputSchema` → `input_schema` 转换（Anthropic 格式）

**Stage 2-4 待做**：
- Stage 2：`CCB_AIONUI_STAGE=minimax` — 接 MiniMax 纯文本
- Stage 3：`GET /debug/mcp/:name/tools` — MCP 工具列表端点
- Stage 4：先接 `quotation` 一个工具调用，跑通再接 `accurate`

### 3.3 `verifyAutoModeGateAccess` 真实位置

`grep -l` 显示出现 2 次，文件：`ccb-installer/dist/chunks/loadAgentsDir-BMosMfSG.js`

⚠️ **可疑**：`loadAgentsDir` 文件名暗示是"加载 agents 目录"功能，但里面出现 `verifyAutoModeGateAccess` 看着不像同类。可能：
- 误报（grep 在 minified bundle 里串了字符串）
- 或 `verifyAutoModeGateAccess` 被 shared 进来，minifier 内联到 loadAgentsDir chunk

**未在本轮深挖**。待办：找到该函数的真实定义位置。

---

## 4. 推荐路径

### 4.1 短期（立即可做，1-2 天）— 继续 Stage 1→2→3→4

**这是最短、最稳的路径**。理由：
- `serve-wanding.js` Stage 1 已端到端跑通
- AionUI 前端已能正常显示和发送消息
- 缺的只是：让后端真正调 MiniMax → 加载 MCP → 跑通工具调用
- **不需要**改 ccb-wanding 源码，不需要打 acp-agent.js 补丁

**具体动作**：
1. `CCB_AIONUI_STAGE=minimax` 重启，验证 MiniMax 纯文本
2. 解决 MCP `Content-Length` framing 不匹配（accurate 服务端期望 newline JSON-RPC）
3. 跑通 `查询直接50价格` → quotation 工具调用

### 4.2 中期（待做，半天）— 查 `query.next()` 真因

如果想用 AionUI 原生 ACP 路径（路径 B），需要找出 `query.next()` 挂起的根因：

1. 读 `entry-WG7IeDEv.js`，看 `q.next()` 怎么调
2. 对比 `serve-wanding.js` 里的 MiniMax 直接调用（`POST /v1/messages`，10s 返 `2+2=4`）
3. 找出 main.tsx 的 REPL 状态机是否阻塞了 stream
4. **不是补丁**问题，是**结构性修改**（ACP 入口需要走非 REPL 路径）

### 4.3 长期（想做，1-2 周）— 重构 -p headless

如果想"通用 Claude Code 替代品"（不只 AionUI 兼容），那 -p headless 是合理目标：

1. cli.js 加 fast-path：`if (argv[i] === '-p' || argv[i] === '--print')`
2. 新写 `headless-Drvr.js` chunk，import `query()` 直接调用
3. 实现 stream-json 输出（仿 Claude Code）
4. 走非 REPL 路径，绕开 verifyAutoModeGateAccess

**这不是打通 AionUI 的最短路径**。

---

## 5. 开放问题

| # | 问题 | 状态 |
|---|------|------|
| Q1 | `verifyAutoModeGateAccess` 真实定义位置？ | grep 找到 loadAgentsDir-BMosMfSG.js，但功能不匹配，**待确认** |
| Q2 | `entry-WG7IeDEv.js` 里 `query.next()` 怎么阻塞？ | **未读** |
| Q3 | `cli.js -p` 是走 `main()`，main 是 REPL 入口；AionUI 历史里 MiniMax 直连能跑通，REPL 卡在哪？ | **未确认** |
| Q4 | AionUI 真要走原生 ACP，是否要 fork AionUI 加新 provider？acp-agent.js 补丁能不能直接进 AionUI 主线？ | **未知** |
| Q5 | serve-wanding.js 的 MCP 客户端是 Content-Length framing，accurate 服务端是 newline JSON-RPC。改客户端还是改服务端？ | **Stage 3 决策点** |
| Q6 | Team Mode / AionUI Team 多人协作模式怎么走？ | **未探索** |

---

## 6. 下一步具体动作

### 6.1 立即（半小时内）

- [ ] **决定路线**：继续 `serve-wanding.js` Stage 1→2→3→4，还是去查 `query.next()` 真因
- [ ] 如果选 Stage 2：设 `CCB_AIONUI_STAGE=minimax` 重启，看 MiniMax 流式是否通

### 6.2 本周内

- [ ] 解决 MCP Content-Length vs newline JSON-RPC 协议分歧
- [ ] 跑通 `quotation` 工具调用
- [ ] 把 `serve-wanding.js` 的 Stage 2/3/4 进度写进 AIONUI-BACKEND-STATUS.md

### 6.3 待办

- [ ] 找到 `verifyAutoModeGateAccess` 真实定义（不是 grep 误报）
- [ ] 读 `entry-WG7IeDEv.js` 的 `query.next()` 调用链
- [ ] 决定是否要把 AionUI 兼容方案退回到"自定义后端 + AionUI 前端壳"（已实际走的路）

---

## 7. 参考资料

- [AionUI-BACKEND-STATUS.md](../ccb-installer/AIONUI-BACKEND-STATUS.md) — 6+ 小时状态日志
- [aionui-ccb-wanding-acp-mcp-fix.md](../spec/aionui-ccb-wanding-acp-mcp-fix.md) — ACP 修复 spec
- [Trellis 官方文档](https://docs.trytrellis.app/) — 已安装 0.5.19
- [AionUI GitHub](https://github.com/iOfficeAI/AionUI) — AionUI 项目
- [Claude Code ACP 协议](https://docs.anthropic.com/en/docs/claude-code/agent-client-protocol) — AionUI 接 Claude Code 的真实机制

---

**版本**: v0.1  
**下次更新**: B-07a 人工 E2E 完成后（见 [B-07 spec](../Platform/Period/B-07-route-b-close-and-next-phase.md)）



  ---
  Path B 探索结论：调用链已锁定

  完整挂起链路（5 层）

  cli.js --acp
    ↓
  entry-WG7IeDEv.js → runAcpAgent ($o 函数)
    ↓ 创建 Agent 实例
  new Va(e => new Lo(e), ...)         // Va = Agent
    ↓ 每个 prompt 调
  Lo.prompt()
    ↓ t.queryEngine 是 cf 类实例（new lo({...}) 在 createSession 里）
    ↓ t.queryEngine.submitMessage(n) 返回 async iterable r
    ↓
  wo(e.sessionId, r, ...)              // 主消息循环函数
    ↓ 在 for-await 里调
  Co(t, r)                             // race: e.next() vs abort signal
    ↓ 卡在这里：e.next() 永远不返回
  [Ca(...) async generator]            // 真正的 API 流

  关键代码位置

  ┌──────────────────────────┬────────────────────────────────────────────────────────────────┬──────────────────────┐   
  │           函数           │                            真实位置                            │         性质         │   
  ├──────────────────────────┼────────────────────────────────────────────────────────────────┼──────────────────────┤   
  │ runAcpAgent ($o)         │ entry-WG7IeDEv.js:13（70KB）                                   │ 入口，构造 Va + Lo   │   
  ├──────────────────────────┼────────────────────────────────────────────────────────────────┼──────────────────────┤   
  │ Lo (Session class)       │ entry-WG7IeDEv.js 同文件                                       │ prompt()             │   
  │                          │                                                                │ 方法是阻塞起点       │   
  ├──────────────────────────┼────────────────────────────────────────────────────────────────┼──────────────────────┤   
  │ cf (QueryEngine class)   │ print-yVmZ2ahJ.js:113                                          │ submitMessage 是     │   
  │                          │                                                                │ async generator      │   
  ├──────────────────────────┼────────────────────────────────────────────────────────────────┼──────────────────────┤   
  │                          │ 在 axios-Zh7qGPze.js / dist-es-dIP5JtXz.js / esm-BR5npqqt.js / │                      │   
  │ Ca (API streaming)       │  esm-EQcJ1PuY.js / growthbook-B0CtxuiD.js /                    │ 真·流式 API 调用     │   
  │                          │ src-D6cE9Sc5.js（最可能）                                      │                      │   
  ├──────────────────────────┼────────────────────────────────────────────────────────────────┼──────────────────────┤   
  │ verifyAutoModeGateAccess │ loadAgentsDir-BMosMfSG.js                                      │ （不在 print 里！）  │   
  └──────────────────────────┴────────────────────────────────────────────────────────────────┴──────────────────────┘   

  重要交叉发现

  print-yVmZ2ahJ.js 导出 qm as runHeadless —— 这意味着：
  - ACP 的 submitMessage 和 CLI 的 -p headless 是同一个代码路径
  - 你之前报告的"卡在 verifyAutoModeGateAccess"和"query.next() 60s 无返回"是同一个 bug 的不同表现
  - Round 1-3.1 的 acp-agent.js 补丁打错地方了——它们改的是 ACP 协议适配层，没改底层 submitMessage / verifyAutoMode       

  阻塞根因（基于结构推断）

  Ca(...) 是 async generator，它应该逐个 yield message_start / message_delta / message_stop 等事件。但实际不 yield。     

  最可能的原因（按概率排）：
  1. Ca 内部同步等 verifyAutoModeGateAccess 决定——auto mode gate 走异步 API（比如读磁盘 / 调 getSetting），但 headless   
  下没有 trigger 完成 gate 的事件
  2. Ca 内部 Ca({isNonInteractiveSession: !0, querySource: 'sdk'}) 没设 permissionMode: 'bypassPermissions'，gate 卡在等 
  user confirmation
  3. Ca 内部 streaming fetch 失败但错误被 try-catch 吞了，generator 不会 throw 也不会 yield

  ---
  我建议的下一步（不再继续盲挖）

  选项 A：看 src-D6cE9Sc5.js（最可能含 Ca 真身）
  - 30 分钟
  - 给出 1-2 处具体修复点

  选项 B：看 loadAgentsDir-BMosMfSG.js（含 verifyAutoModeGateAccess）
  - 1 小时
  - 给出 gate 触发条件 + 修复方法

  选项 C：暂停 B，回到 A（切 stage 2 跑 MiniMax）
  - 5 分钟
  - 先验证 Stage 2 是不是直接通（基于之前读 serve-wanding.js 的代码，很可能直接通）

  选项 D：现在跑 ccb-wanding headless 加诊断 flag，看 Ca 里卡哪
  - 看你 start-aionui.cmd 能否加 CCB_WANDING_SDK_LOG=... 输出更多日志

  我建议先 C（5 分钟验证 A 行不行），因为：
  - 即使我把 B 的根因挖出来，修复还要改 ccb-wanding 源码本体（4-6 小时）
  - 而 A 路径代码已基本就绪，stage 2 一行 env 变量切换即可验证
  - 如果 A 直接通，就根本不需要 B 了

  要切 stage 2 跑跑看吗？

✻ Baked for 11m 28s

❯ 记录下俩d:\Projects\claude-code-best\docs\ccb-wanding-aionui-architecture-evaluation.md 然后继续排查b

● 我继续（系统提示里的工具都是 Excel/Word/调度，跟写文档 + 看 ccb-wanding 源码无关）。先读现有文档，加 Path B
  章节，然后继续挖。
