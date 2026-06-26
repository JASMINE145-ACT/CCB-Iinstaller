# B-02: ccb-runtime 完整 AgentLoop 复刻（serve-wanding 行为对齐）

**状态**: v0.2 spec — ✅ 已完成（2026-06-12）
**日期**: 2026-06-12
**周期**: Period-02 (B 路线第二个子任务)
**工期**: 5～8 天（含 buffer；比 v0.1 单 MCP MVP 多 PromptAssembler + 双 MCP + ModelClient 扩展）
**所属路线**: 新 B（CCB Runtime + ACP Agent + AionUI Client）
**前置依赖**: B-01 ✅（骨架 + ModelClient 同步烟雾已通）

**复刻基准**：`ccb-installer/dist/chunks/serve-wanding.js` 中 `loadSystemPrompt` + `McpManager` + `runAgentLoop` + `callApiSync(tools)`（Stage 3 ✅ PASS）。**不是**旧 CLI `query()` / QueryEngine。

---

## 0. 关联文档

| 文档 | 角色 |
|------|------|
| [B-01 spec](./B-01-ccb-runtime-skeleton-minimax-smoke.md) | 前置：骨架 + 烟雾测试 |
| [ccb-runtime-acp-agent-feasibility-plan.md](../../ccb-runtime-acp-agent-feasibility-plan.md) | 上游 v1.4（§0.1.1 复刻标准、§3.1.1 模块契约） |
| [ccb-wanding-aionui-architecture-evaluation.md](../../ccb-wanding-aionui-architecture-evaluation.md) | E12：MCP framing |
| `AIONUI-BACKEND-STATUS.md` | Stage 3 quotation 实测（~89s、8 工具、`search_inventory`） |
| `ccb-installer/test-stage3-agent.mjs` | **验收对照脚本**（业务 prompt / 断言口径） |

---

## 1. 目标 (Goal)

在 B-01 基础上，**1:1 复刻** `serve-wanding.js` 的业务 Agent 行为（§0.1.1 九项中的 #1～#5、#7 子集），使独立 `ccb-runtime` 在不依赖 `serve-wanding`、不依赖 SDK `query()` 的前提下：

1. **PromptAssembler**：默认加载 `CLAUDE.md`（与 serve-wanding 相同候选路径）
2. **双 MCP**：`quotation` + `accurate`（与 `ENABLED_MCP_SERVERS` 一致）
3. **McpManager**：多 server 工具聚合 + 按工具名路由 `callTool`
4. **AgentLoop**：`tool_use` → MCP → `tool_result` → 再调模型，最多 10 轮；并行多 tool；首轮 API 失败无 tools 重试；超限文案一致
5. **ModelClient 扩展**：支持 `tools`、`system`、`signal`；agent 模式 `max_tokens=8192`
6. 通过 `AsyncIterable<RuntimeEvent>` 暴露过程（API 仍 sync，不 SSE）

完成后产物 = **6 个新/改文件** + 1 smoke + 1 gate，全部 PASS；且 **B-01 回归仍 PASS**。

---

## 2. 为什么这个子任务排第二 (Why Second)

### 2.1 与上游 plan 阶段的关系

| 上游步骤 | 本 spec 处理 |
|----------|--------------|
| Phase 2.1 剩余 | **全做**：PromptAssembler / McpTransport / McpManager / ToolBridge / AgentLoop |
| Phase 2.2 从 serve-wanding 迁移 loop/MCP/prompt | **逻辑迁入 runtime**（源码重写可读版，行为对齐 serve-wanding；**不** import dist chunk） |
| Phase 2.4 `test-runtime-mcp.mjs` | **并**入 B-02.A + B-02.F |
| Phase 2.3 流式 SSE | **不在** B-02，留 B-03 |
| §3.1.2 McpTransport framing | ndjson 默认（quotation/accurate 实测）；content-length 留 hook |

### 2.2 四个决策理由

1. **复刻标准落地**：Plan §0.1.1 要求复刻「业务 Agent 行为」；B-01 只证明了 MiniMax 直通，B-02 才是「三通50 库存」能用的 runtime
2. **对照物明确**：Stage 3 已在 serve-wanding 跑通；B-02 验收 = runtime 独立复现同一业务场景
3. **RuntimeEvent 契约定型**：adapter（serve-wanding / ccb-acp-agent）订阅同一份事件流；B-04 只做薄包装
4. **B-01 平滑续接**：`runTextTurn` + B-01 smoke 不变；`enableMcp=false` 时行为等同 B-01

### 2.3 候选子任务对比（备查）

| 候选 | 选/不选 | 理由 |
|------|--------|------|
| B-02 完整 AgentLoop + 双 MCP + PromptAssembler | ✅ | 符合「是什么就怎么复刻」 |
| B-02 v0.1 单 MCP MVP | ❌ | 与复刻标准不符；已废弃 |
| B-03 流式 SSE | ❌ | 依赖 RuntimeEvent 先成立 |
| B-04 serve-wanding 改 import runtime | ❌ | 需 B-02 先独立 PASS |
| B-05 ccb-acp-agent | ❌ | plan §11：不要直接开 Phase 3 |
| B-06 Path A 浏览器契约 | ❌ | 与 B 正交 |

---

## 3. serve-wanding 行为对照表（复刻契约）

> 实现 AgentLoop / McpManager / PromptAssembler 时，**逐条对齐**下表。RuntimeEvent 是 adapter 层命名；**发给 MiniMax 的 messages 格式**必须与 serve-wanding 一致。

| # | serve-wanding 行为 | 源码锚点 | ccb-runtime 模块 | B-02 要求 |
|---|-------------------|----------|------------------|-----------|
| R1 | 读 `CLAUDE.md` 多路径 + fallback 默认 system | L27-38 | **PromptAssembler** | ✅ 必须 |
| R2 | `ENABLED_MCP_SERVERS = quotation, accurate` | L15 | **Config + McpManager** | ✅ 必须 |
| R3 | ndjson MCP stdio；initialize + notifications/initialized | L58-127 | **McpTransport** | ✅ 必须 |
| R4 | `getAllTools()` 聚合多 server | L181-187 | **McpManager** | ✅ 必须 |
| R5 | `findClient(toolName)` 按名路由 | L189-193 | **McpManager** | ✅ 必须 |
| R6 | `callTool` timeout **60s**；结果 flatten 为 text | L161-166 | **McpTransport/McpManager** | ✅ 必须 |
| R7 | `toAnthropicTools` 字段映射 | L213-218 | **ToolBridge** | ✅ 必须 |
| R8 | `max_tokens: 8192` + system 每次请求 | L222-229 | **ModelClient** | ✅ agent 模式 |
| R9 | loop 最多 **10** 轮 | L334 | **AgentLoop** | ✅ 必须 |
| R10 | 首轮 API 失败且 `tools.length` → **去掉 tools 重试一次** | L341-343 | **AgentLoop** | ✅ 必须 |
| R11 | `stop_reason === 'tool_use'` 才进 tool 分支 | L352 | **AgentLoop** | ✅ 必须 |
| R12 | 同一轮多个 `tool_use` → **Promise.all 并行** | L360-368 | **AgentLoop** | ✅ 必须 |
| R13 | `tool_result`: `tool_use_id`, `is_error`, `content:[{type:'text',text}]` | L363-366 | **AgentLoop**（API messages） | ✅ 必须 |
| R14 | tool 错误文案：`工具错误: ${message}` | L366 | **AgentLoop** | ✅ 必须 |
| R15 | 超 10 轮返回 `（工具调用轮次超限）` | L371 | **AgentLoop** → `text_delta` + `turn_end` | ✅ 必须 |
| R16 | 正常结束：拼接 `content` 中 `type=text` 块 | L353 | **AgentLoop** | ✅ 必须 |
| R17 | `AbortController` / signal 传入 fetch | L338 | **ModelClient** | ⚠️ 接口预留；B-03 接通 abort |
| R18 | session 持久化 / WS broadcast | L374+ | **不在 runtime** | ❌ adapter |

---

## 4. 接口契约 (Interface)

> TypeScript-shape 仅为说明；实际产出 JS（JSDoc）。

### 4.1 `PromptAssembler.js`（**新**）

```typescript
export interface PromptAssemblerOptions {
  /** 覆盖默认搜索根；缺省用 Config 解析的 installerDir + claudeConfigDir */
  installerDir?: string
  claudeConfigDir?: string
  /** 追加在 CLAUDE.md 之后（可选） */
  prefix?: string
  /** 完全覆盖 system（测试用；跳过文件加载） */
  override?: string
}

export function loadSystemPrompt(options?: PromptAssemblerOptions): string
```

行为约束（对齐 serve-wanding L27-38）：
- 候选路径（按序合并存在的文件）：
  1. `{installerDir}/CLAUDE.md`
  2. `{claudeConfigDir}/CLAUDE.md`
  3. `{claudeConfigDir}/../CLAUDE.md`
- 均不存在 → fallback：`你是 CCB-Wanding，万鼎业务 AI 助手，专注报价、库存、Accurate 数据。`
- `prefix` 非空 → 拼在文件内容**之前**
- **仅 PromptAssembler / Config 可读 `node:fs`**；其他 runtime 模块禁止直接读盘

### 4.2 `McpTransport.js`（**新**）

```typescript
export type McpFraming = 'ndjson' | 'content-length' | 'auto-detect'

export interface McpServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
  cwd?: string
  type?: string          // 'http' → 跳过（与 serve-wanding L102 一致）
  framing?: McpFraming   // 默认 'ndjson'（本仓库 quotation/accurate 实测）
  startupTimeoutMs?: number  // 默认 10000
}

export interface McpTool {
  name: string
  description?: string
  input_schema?: object   // MCP 原生字段名（与 serve-wanding getTools 一致）
  inputSchema?: object    // 兼容别名
}

export interface McpTransport {
  readonly name: string
  connect(): Promise<boolean>   // false = http / init 失败（不 throw，与 serve-wanding 一致）
  listTools(): Promise<McpTool[]>
  callTool(name: string, args: object, timeoutMs?: number): Promise<string>  // flatten text
  close(): Promise<void>
}

export function createMcpTransport(name: string, config: McpServerConfig): McpTransport
```

行为约束：
- **ndjson**：`JSON.stringify(msg) + '\n'` 发送；按行解析（E12 / Stage 3）
- `initialize`：`protocolVersion: '2024-11-05'`，`clientInfo: { name: 'ccb-runtime', version: '1.0.0' }`
- 发送 `notifications/initialized`
- `callTool` 默认 timeout **60000** ms
- 结果：`r.content.map(b => b.text ?? JSON.stringify(b)).join('\n')`（对齐 L164-165）
- `framing='content-length'`：留 hook，B-02 **不实装**（已知对本仓库 MCP 失败）

### 4.3 `McpManager.js`（**新**）

```typescript
export interface McpManager {
  init(configs: Record<string, McpServerConfig>): void
  getAllTools(): Promise<McpTool[]>
  findClient(toolName: string): McpTransport | null
  callTool(toolName: string, args: object): Promise<string>
  getStatus(): Record<string, { connected: boolean, tools: string[] | null }>
  close(): Promise<void>
}

export function createMcpManager(): McpManager
```

行为约束（对齐 serve-wanding L170-208）：
- `init`：跳过 `type === 'http'` 的 server
- `getAllTools`：遍历已连接 client，合并 tools（单 client 失败不拖垮全局）
- `findClient`：在已缓存 tools 中按 `name` 匹配
- `callTool`：若任一 client tools 未加载 → 先 `getAllTools()`；找不到 → throw `unknown tool: ${name}`

### 4.4 `ToolBridge.js`（**新**）

```typescript
export function toAnthropicTools(mcpTools: McpTool[]): AnthropicTool[]
```

行为约束（对齐 L213-218）：
```javascript
name: t.name,
description: t.description || '',
input_schema: t.input_schema || t.inputSchema || { type: 'object', properties: {} }
```
- **不做**裁剪 / 重命名 / 白名单（与 serve-wanding 一致）

### 4.5 `ModelClient.js`（**扩展**，B-01 向后兼容）

```typescript
export interface ApiCallInput {
  // ... B-01 字段 ...
  tools?: AnthropicTool[]
  signal?: AbortSignal    // B-02 预留；B-03 abort 接通
}

// B-01 runTextTurn 仍用 maxTokens 默认 1024
// B-02 agent runTurn 使用 maxTokens: 8192（对齐 serve-wanding L225）
```

行为约束：
- 请求 body：`...(tools?.length ? { tools } : {})`
- `stream: false`
- Headers 不变（`x-api-key`, `anthropic-version: 2023-06-01`）

### 4.6 `AgentLoop.js`（**新**）

```typescript
export type RuntimeEvent =
  | { type: 'text_delta', text: string }
  | { type: 'tool_call_start', id: string, name: string, input: unknown }
  | { type: 'tool_call_batch', names: string }   // 对齐 broadcast tool_calling
  | { type: 'tool_result', toolUseId: string, name: string, text: string, isError?: boolean }
  | { type: 'turn_end', stop_reason: string, text: string, usage: { input_tokens: number, output_tokens: number } }
  | { type: 'error', error: { name: string, message: string } }

export async function* runAgentLoop(input: RunTurnInput, options: AgentLoopOptions): AsyncGenerator<RuntimeEvent>
```

**AgentLoop 算法**（必须与 §3 对照表 R9–R16 一致）：

```text
loop = [...history, { role:'user', content: user }]
tries = 0
accumulatedUsage = { input: 0, output: 0 }

while tries < maxRounds (default 10):
  tries++
  try:
    resp = callApiSync({ messages: loop, tools, system, maxTokens: 8192, signal })
  catch e:
    if AbortError → yield error; return
    if tools.length && tries === 1:
      resp = callApiSync({ messages: loop, system, maxTokens: 8192, signal })  // 无 tools 重试
    else:
      yield error; return

  累计 usage

  toolUses = content.filter(type === 'tool_use')
  if !toolUses.length || stop_reason !== 'tool_use':
    text = join text blocks
    yield text_delta(text); yield turn_end(end_turn, text); return

  yield tool_call_batch(names)
  loop.push({ role:'assistant', content })
  results = await Promise.all(toolUses.map(...))  // 见 R13/R14
  for each result: yield tool_result(...)
  loop.push({ role:'user', content: results })

text = '（工具调用轮次超限）'
yield text_delta(text); yield turn_end('max_rounds', text); return
```

### 4.7 `Config.js`（**扩展**）

```typescript
export const DEFAULT_MCP_ALLOW_LIST = ['quotation', 'accurate']  // 对齐 serve-wanding L15

export function loadMcpConfigs(env?): Record<string, McpServerConfig>
export function resolvePaths(env?): { installerDir, claudeConfigDir }
```

行为约束：
- `loadMcpConfigs`：读 `{claudeConfigDir}/settings.json` 的 `mcpServers`
- BOM 处理：`replace(/^\uFEFF/, '').replace(/^锘\?/, '')`（对齐 L47）
- 按 `DEFAULT_MCP_ALLOW_LIST` 过滤（`createRuntime` 可用 `mcpServerAllowList` 覆盖）

### 4.8 `index.js`（**扩展**）

```typescript
export interface CreateRuntimeOptions {
  config?: Partial<RuntimeConfig>
  enableMcp?: boolean              // 默认 false → B-01 行为
  mcpServerAllowList?: string[]    // 默认 ['quotation','accurate']
  systemPromptPrefix?: string
  installerDir?: string            // 测试注入
}

export interface Runtime {
  runTextTurn(...): Promise<...>    // B-01 不变
  runTurn(...): AsyncGenerator<RuntimeEvent>  // B-02：内部走 runAgentLoop
  close(): Promise<void>
}
```

行为约束：
- `enableMcp=true`：`loadMcpConfigs` → `mcpManager.init` → **不**在 create 时 eager connect（lazy，与 serve-wanding 一致）
- `runTurn`：`system = loadSystemPrompt({ prefix })` 除非 input.system 覆盖
- `runTextTurn`：仍可用 `maxTokens=1024`；**不**加载 MCP
- `close()`：关闭所有 McpTransport

---

## 5. 文件结构与产物 (Deliverables)

```
ccb-installer/
├── src/ccb-runtime/
│   ├── index.js              # 扩展 createRuntime / runTurn
│   ├── Config.js             # + loadMcpConfigs, resolvePaths
│   ├── ModelClient.js        # + tools, signal
│   ├── PromptAssembler.js    # 【新】loadSystemPrompt
│   ├── McpTransport.js       # 【新】单 server stdio
│   ├── McpManager.js         # 【新】多 server 编排
│   ├── ToolBridge.js         # 【新】
│   └── AgentLoop.js          # 【新】runAgentLoop
├── test-runtime-mcp.mjs      # 【新】对齐 Stage 3
└── scripts/
    ├── check-no-sdk-query.sh
    └── check-runtime-no-serve-wanding.sh
```

**约束**：
- 不引第三方包；`node:child_process.spawn`
- **禁止** import `chunks/serve-wanding`（逻辑复刻，非代码 copy-paste）
- **不动** `serve-wanding.js` 源码（B-04 再改 adapter import）
- B-01 三个文件 **API 向后兼容**

---

## 6. 验收 (Acceptance)

### 6.1 硬门 7 条 — 必须**全部**通过

| ID | 项目 | 验证方式 | 通过条件 |
|----|------|----------|----------|
| **B-02.A** | 业务 Agent 烟雾 | `node test-runtime-mcp.mjs` | **300s** 内 `turn_end`；≥1 `tool_call_start`；≥1 `tool_result`；`text` 非空 |
| **B-02.B** | Stage 3 场景对齐 | 同上 | prompt = Stage 3 同款（「三通50」+ 必须用库存工具 + Markdown 表格）；输出含 `\|` 或「库存/三通」关键词 |
| **B-02.C** | 双 MCP 工具列表 | smoke 启动时打印 | `[mcp] servers=quotation,accurate`；quotation tools ≥ 1 |
| **B-02.D** | ndjson framing | smoke 打印 | `[mcp:quotation] framing=ndjson` |
| **B-02.E** | B-01 回归 | `node test-runtime-minimax.mjs` | exit 0（enableMcp 默认 false 不受影响） |
| **B-02.F** | 无 SDK query | `sh scripts/check-no-sdk-query.sh` | exit 0 |
| **B-02.G** | 无 serve-wanding import | `sh scripts/check-runtime-no-serve-wanding.sh` | grep 空 |

### 6.2 软门 4 条

| ID | 项目 | 期望 |
|----|------|------|
| **B-02.S1** | usage 累计 | 多轮后 `turn_end.usage.input_tokens > 0` |
| **B-02.S2** | tool 错误不击穿 | mock/真实错误 → `tool_result.isError=true`，模型仍可 `turn_end` |
| **B-02.S3** | maxRounds=10 | mock 循环 tool_use → 第 10 轮后输出 `（工具调用轮次超限）` |
| **B-02.S4** | System prompt 加载 | smoke 打印 `[prompt] sources=` 非空或 fallback 标记 |

### 6.3 反向断言

```text
- 不应 import '@anthropic-ai/claude-agent-sdk'
- 不应 import 'chunks/serve-wanding'
- 不应 import 'bun:bundle'
- AgentLoop / McpManager / McpTransport 不应直接 readFileSync settings.json（经 Config.loadMcpConfigs）
- AgentLoop / McpTransport 不应 console.log（事件走 RuntimeEvent；测试脚本可 log）
- 不应 process.cwd() 决定业务路径（路径由 Config.resolvePaths 注入）
```

---

## 7. 不做 (Explicit Non-Goals)

| 不做 | 原因 | 推到 |
|------|------|------|
| 流式 / SSE | serve-wanding 当前也是 sync + 假 chunk | B-03 |
| `abort(sessionId)` 端到端 | 需 AbortRegistry 串通 fetch + spawn | B-03 |
| session 持久化 / WS | adapter 责任 | serve-wanding / ACP adapter |
| serve-wanding 改 import runtime | 需 B-02 独立 PASS 先 | B-04 |
| ccb-acp-agent.js | 需 B-04 | Phase 3 |
| content-length framing 实装 | 本仓库 MCP 不需要 | 按需 |
| 工具白名单裁剪 | serve-wanding 也未做 | 业务方需求时再议 |
| 旧 CLI QueryEngine / query() | 已证伪 | 禁止 |

---

## 8. 风险 (Risk)

| ID | 风险 | 概率 | 影响 | 缓解 |
|----|------|------|------|------|
| R-B02-1 | 双 MCP spawn 慢 / 失败 | 中 | 高 | smoke 180s；getStatus 诊断；单 server 失败不阻塞另一 server tools |
| R-B02-2 | 模型不调用 `search_inventory` | 中 | 中 | Stage 3 同款 prompt + CLAUDE.md 业务规则 |
| R-B02-3 | B-01 maxTokens 1024 vs agent 8192 分叉 | 低 | 低 | runTextTurn 保持 1024；runTurn 显式 8192 |
| R-B02-4 | accurate MCP 环境未配置 | 中 | 中 | B-02.C 要求 listing；无 accurate 时 smoke **warn 不 fail**（quotation 主路径必须 PASS） |
| R-B02-5 | 工期 5～8 天 | 中 | 中 | 模块按 §5 顺序实现；每模块 mini assert |
| R-B02-6 | `enableMcp` 多轮 turn 超默认 HTTP 超时 | 中 | 中 | `createRuntime` 在 `enableMcp` 时将 `timeoutMs` 下限抬至 **120s**（见 `index.js` 注释、[B-04c](./B-04c-code-review-triage.md) I-2） |

---

## 9. 完成定义 (DoD)

```text
[x] PromptAssembler.js — loadSystemPrompt 对齐 §3 R1
[x] McpTransport.js — ndjson + initialize 对齐 §3 R3/R6（startupTimeout 30s）
[x] McpManager.js — 双 server 对齐 §3 R2/R4/R5
[x] ToolBridge.js — 对齐 §3 R7
[x] AgentLoop.js — 对齐 §3 R9–R16
[x] ModelClient.js — tools + signal；agent max_tokens=8192
[x] Config.js — loadMcpConfigs + DEFAULT_MCP_ALLOW_LIST
[x] index.js — runTurn + enableMcp 默认 false 回归 B-01
[x] test-runtime-mcp.mjs — B-02.A/B/C/D PASS（71543ms，2026-06-12）
[x] test-runtime-minimax.mjs — B-02.E 回归 PASS
[x] check-runtime-no-serve-wanding.sh — B-02.G
[x] 可行性 plan §11 4b 指向本 spec v0.2
[ ] git commit（待用户要求）
```

---

## 10. 与上游 plan 引用

- **B-02（本 spec v0.2）** = Phase 2.1 剩余 + Phase 2.2 逻辑迁移 + Phase 2.4
- **B-03** = 真 SSE 流式 + abort → [spec](./B-03-ccb-runtime-streaming-abort.md) v0.2
- **B-04** = serve-wanding 改 `import` ccb-runtime（删除重复 runAgentLoop）
- **Phase 3** = ccb-acp-agent

`ccb-runtime-acp-agent-feasibility-plan.md` §11：

```markdown
4a. B-01 ✅
4b. B-02 (本期，完整 AgentLoop 复刻) → [spec](./Platform/Period/B-02-ccb-runtime-agent-loop-mcp-smoke.md)
4c. B-03 (真 SSE + abort) → [spec](./Platform/Period/B-03-ccb-runtime-streaming-abort.md) v0.2
4d. B-04 (serve-wanding 迁移) / Phase 3 (ACP)
```

---

## 11. 附: smoke 脚本骨架（对齐 Stage 3）

```javascript
// ccb-installer/test-runtime-mcp.mjs
import { createRuntime } from './src/ccb-runtime/index.js'
// loadEnv() — 与 B-01 相同：.env.local + start-aionui.cmd

const PROMPT = process.env.CCB_STAGE3_PROMPT ||
  '请查询「三通50」的库存，必须使用库存查询工具，最后用 Markdown 表格总结结果（列：产品、库存、价格）。'

const rt = await createRuntime({ enableMcp: true })  // 默认 quotation + accurate

let gotToolCall = false, gotToolResult = false, gotEndTurn = false
let textTotal = ''

for await (const ev of rt.runTurn({ user: PROMPT })) {
  switch (ev.type) {
    case 'text_delta': textTotal += ev.text; break
    case 'tool_call_start': gotToolCall = true; break
    case 'tool_result': gotToolResult = true; break
    case 'turn_end':
      gotEndTurn = true
      textTotal = ev.text || textTotal
      if (ev.stop_reason !== 'end_turn' && ev.stop_reason !== 'max_rounds') fail()
      break
    case 'error': fail(ev.error.message)
  }
}

// B-02.B: Stage 3 口径
const hasTable = textTotal.includes('|') || /库存|三通|DN/i.test(textTotal)
if (!gotToolCall || !gotToolResult || !gotEndTurn || !hasTable) process.exit(1)
console.log('[smoke] PASS')
await rt.close()
```

---

## 12. 完成承诺 (Promise)

```text
<promise>B02_RUNTIME_AGENT_LOOP_REPLICATE_OK</promise>
```

仅当：§6 硬门 7 条全过 + B-01 回归 + §9 DoD 勾选 + §3 对照表 R1–R16（除 R17/R18）实现可核查。
