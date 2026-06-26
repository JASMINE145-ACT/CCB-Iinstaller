# B-03: ccb-runtime 真 SSE 流式 + abort 端到端

**状态**: v0.2 ✅ 完成
**日期**: 2026-06-12
**周期**: Period-03 (B 路线第三个子任务)
**工期**: 5～9 天（含 **Phase 0 SSE spike** + buffer；纯 abort 子集 B-03a 约 2 天）
**所属路线**: 新 B（CCB Runtime + ACP Agent + AionUI Client）
**前置依赖**:
- B-01 ✅（骨架 + 同步 MiniMax）
- B-02 ✅（完整 AgentLoop + 双 MCP + PromptAssembler；`signal` 已接入 `callApiSync`）

**与 serve-wanding 的关系（重要）**：

| 能力 | serve-wanding 现状 | B-03 目标 |
|------|-------------------|-----------|
| 文本输出 | sync API + **假 chunk**（30 字切片 + 6ms 延迟） | **真 SSE** `stream: true` |
| 取消 | `activeAborts` + `AbortController` → WS `interrupted` | `AbortRegistry` + **`turn_aborted`** 事件 |
| MCP in-flight abort | ❌ 未接 signal | ❌ 同上（与现网一致；plan §3.1.1 全量 AbortRegistry 推 B-03b/B-04） |

> B-03 **不是**复刻 serve-wanding 的假流式，而是 **runtime 层真 SSE + 可取消**；B-04 adapter 迁移后再替换假 chunk。

---

## 0. 关联文档

| 文档 | 角色 |
|------|------|
| [B-02 spec](./B-02-ccb-runtime-agent-loop-mcp-smoke.md) | 前置：AgentLoop；R17 signal 已预留 |
| [可行性计划 v1.4](../../ccb-runtime-acp-agent-feasibility-plan.md) | §3.1.1 AbortRegistry / RuntimeEvent |
| `AIONUI-BACKEND-STATUS.md` | Stage 2 ~5s / Stage 3 ~90s sync；流式降首字延迟 |
| `ccb-installer/lib/load-smoke-env.mjs` | B-02 共用 env 加载（含 `%LOCALAPPDATA%` 展开） |

---

## 1. 目标 (Goal)

在 B-02 sync runtime 之上加入：

1. **真 SSE 流式**：`ModelClient.callApiStream()`；`AgentLoop` 在 `stream:true` 下逐块 `yield text_delta`
2. **abort 端到端（API 层）**：`AbortRegistry` + `runtime.abort(sessionId)` 切断 in-flight fetch/stream；yield **`turn_aborted`**

完成后 runtime 支持 **sync（默认）** 与 **stream** 两种模式；adapter（serve-wanding / ccb-acp-agent）在 B-04/Phase 3 选用。

---

## 2. Phase 0 — SSE Spike（实施前必做，≤ 0.5 天）

**目的**：验证 MiniMax Anthropic 兼容层是否支持 `stream: true` 及 SSE 行格式；避免 B-03 全量实现后才发现格式不符。

| 步骤 | 产出 | 通过条件 |
|------|------|----------|
| 0.1 | `test-minimax-sse-raw.mjs` | `POST /v1/messages` + `stream:true`；打印前 10 行 raw；含 `event:` + `data:` |
| 0.2 | 记录到本 spec §12 或 STATUS | 格式 = Anthropic SSE **或**  documented 差异 + 解析策略 |

**分叉策略**：

| Spike 结果 | 后续 |
|------------|------|
| ✅ Anthropic SSE 可用 | 执行完整 B-03（流式 + abort） |
| ❌ 格式不可用 / 不稳定 | **B-03a** 仅 abort（2 天）→ **B-03b** 流式（等 MiniMax 文档或 adapter 假 chunk） |

Spike **不阻塞** B-03a abort 开发（abort 仅依赖 B-02 `signal`）。

---

## 3. 为什么排第三 (Why Third)

### 3.1 与上游 plan

| 上游 | 本 spec |
|------|---------|
| Phase 2.3 `callApiStream` | ModelClient + AgentLoop |
| §3.1.1 AbortRegistry | **API/stream 层**（MCP in-flight 见 §3.2 范围表） |
| serve-wanding import runtime | B-04 |
| ccb-acp-agent | Phase 3 |

### 3.2 AbortRegistry 范围（与 plan / serve-wanding 对齐说明）

| 子系统 | B-03 | plan §3.1.1 愿景 | serve-wanding |
|--------|------|------------------|---------------|
| `callApiSync` / `callApiStream` | ✅ signal + abort | ✅ | ✅ |
| `runtime.abort(sessionId)` | ✅ | ✅ | ✅（WS cancel） |
| MCP `tools/call` in-flight | ❌ 仍跑至 timeout | ✅ 分别超时 | ❌ |
| MCP spawn 子进程 kill | ❌ | 可选 | ❌ |

B-03 与 **现网 serve-wanding 取消语义一致**；plan 全量 AbortRegistry 留 **B-03b 或 B-04**。

---

## 4. RuntimeEvent 扩展（B-03 唯一 schema 变更）

在 B-02 事件基础上 **仅新增**：

```typescript
| { type: 'turn_aborted', sessionId: string, usage?: { input_tokens: number, output_tokens: number } }
```

行为约束：
- `runtime.abort(sessionId)` 成功 → AgentLoop **必须** yield `turn_aborted` 后结束 generator（**不** throw）
- adapter 映射：serve-wanding WS `{type:'interrupted'}`；ACP `session/cancel` 完成
- 仍保留 B-02 `{type:'error', error:{name:'AbortError',...}}` 仅用于 **未注册 sessionId** 的内部 fetch abort（不应在正常 abort 路径出现）

其余 B-02 事件（`text_delta` / `tool_call_*` / `turn_end`）**不变**；stream 模式仅提高 `text_delta` 频率。

---

## 5. 接口契约 (Interface)

### 5.1 `ModelClient.callApiStream()`（**新**）

```typescript
export interface StreamEvent =
  | { type: 'message_start', message: { id: string, model: string, usage?: object } }
  | { type: 'content_block_start', index: number, content_block: { type: string, [k: string]: unknown } }
  | { type: 'content_block_delta', index: number, delta: { type: 'text_delta' | 'input_json_delta', text?: string, partial_json?: string } }
  | { type: 'content_block_stop', index: number }
  | { type: 'message_delta', delta: { stop_reason?: string }, usage?: { output_tokens: number } }
  | { type: 'message_stop' }
  | { type: 'ping' }
  | { type: 'error', error: { type: string, message: string } }

export async function* callApiStream(input: ApiCallInput): AsyncGenerator<StreamEvent>
```

行为约束：
- body：`stream: true`；headers 同 B-02（`x-api-key`, `anthropic-version: 2023-06-01`）
- SSE 解析：`event: <type>\ndata: <json>\n\n`；跳过 `ping` / `[DONE]` / 空行
- `signal` 接入 fetch；AbortError → throw `ApiError(0, 'aborted by session')`
- 非 2xx → `ApiError`（同 sync）
- 单行 JSON 解析失败 → yield `StreamEvent.error`，**继续读**（不终止整个 stream）
- **`callApiSync` 行为不得改变**（B-02 回归）

`onEvent` 回调：**不实现**（§8 非目标）；仅 AsyncGenerator。

### 5.2 `AgentLoop` 扩展

```typescript
export interface RunAgentLoopOptions extends AgentLoopOptions {
  stream?: boolean          // 默认 false
  sessionId?: string        // 非空 → 注册 AbortRegistry
  abortRegistry?: AbortRegistry
}

export async function* runAgentLoop(...): AsyncGenerator<RuntimeEvent>
```

| `stream` | 行为 |
|----------|------|
| `false` | **等同 B-02**（`callApiSync`；末轮一次 `text_delta`） |
| `true` | `callApiStream`；每个 `content_block_delta.text` → `yield text_delta` |

流式 tool_use 还原（S1 / G 硬门）：
- 累积 `input_json_delta.partial_json` 至 `content_block_stop`
- `JSON.parse` 得 `tool_use.input`；失败 → yield `error` 并结束 turn
- tool 轮仍走 B-02 并行 MCP / 10 轮 / 超限文案

**abort 路径**：
- `runTurn` 开始时 `register(sessionId, controller)`；`finally` **必须** `unregister`
- `signal.aborted` → yield `turn_aborted` + return
- 未传 `sessionId` → 不注册；`runtime.abort(id)` 对未知 id 返回 **false**

### 5.3 `AbortRegistry.js`（**新**）

```typescript
export interface AbortRegistry {
  register(sessionId: string, controller: AbortController): void
  abort(sessionId: string): boolean
  unregister(sessionId: string): void
  activeCount(): number
  abortAll(): void
}
export function createAbortRegistry(): AbortRegistry
```

- 单进程 `Map`；无持久化
- 重复 register → 后者覆盖（先 abort 旧 controller 可选，默认覆盖）
- `runtime.close()` → `abortAll()` + MCP close

### 5.4 `index.js` 扩展

```typescript
export interface Runtime {
  runTextTurn(...): Promise<...>                    // 不变；无 sessionId
  runTurn(input: {
    user: string
    history?: Message[]
    system?: string
    maxRounds?: number
    stream?: boolean      // 默认 false
    sessionId?: string
  }): AsyncGenerator<RuntimeEvent>
  abort(sessionId: string): boolean                 // 未知 id → false
  activeAbortCount(): number                        // 测试 / 诊断（wrap registry.activeCount）
  close(): Promise<void>
}
```

---

## 6. 文件结构与产物

```
ccb-installer/
├── src/ccb-runtime/
│   ├── AbortRegistry.js       # 【新】
│   ├── ModelClient.js         # + callApiStream
│   ├── AgentLoop.js           # + stream / turn_aborted
│   ├── Config.js              # + STREAM_FIRST_DELTA_TIMEOUT_MS = 5000
│   └── index.js               # + abort / activeAbortCount
├── test-minimax-sse-raw.mjs   # 【新】Phase 0 spike
├── test-runtime-streaming.mjs # 【新】
├── test-runtime-abort.mjs     # 【新】
├── test-runtime-stream-mcp.mjs # 【新】B-03.G 流式 + MCP
└── lib/load-smoke-env.mjs     # 沿用 B-02
```

---

## 7. 验收 (Acceptance)

### 7.1 硬门 8 条 — 必须**全部**通过

| ID | 项目 | 验证 | 通过条件 |
|----|------|------|----------|
| **B-03.0** | SSE spike | `node test-minimax-sse-raw.mjs` | 退出码 0；日志含 ≥1 条 `event:` + `data:` |
| **B-03.A** | 流式首字 | `node test-runtime-streaming.mjs` | 首个 `text_delta` **< 5s**；`text_delta` 次数 **≥ 2** |
| **B-03.B** | 流式结束 | 同上 | `turn_end.stop_reason === 'end_turn'`；`usage.input_tokens > 0` |
| **B-03.C** | abort | `node test-runtime-abort.mjs` | 首个 `text_delta` 后**同步** `rt.abort(sessionId)` → **abort 调用后 1s 内**收到 `turn_aborted`；`rt.activeAbortCount() === 0` |
| **B-03.D** | B-01 回归 | `node test-runtime-minimax.mjs` | exit 0 |
| **B-03.E** | B-02 回归 | `node test-runtime-mcp.mjs` | exit 0（默认 `stream:false`） |
| **B-03.F** | 静态门禁 | `check-no-sdk-query.sh` + `check-runtime-no-serve-wanding.sh` | exit 0 |
| **B-03.G** | 流式 + MCP | `node test-runtime-stream-mcp.mjs` | `enableMcp:true, stream:true`；≥1 `tool_call_start`；`turn_end`；180s 内 |

> 若 **B-03.0 FAIL**：仅强制 B-03.C/D/E/F（B-03a abort）；B-03.A/B/G 标记 BLOCKED，另开 B-03b。

### 7.2 软门 4 条

| ID | 项目 | 期望 |
|----|------|------|
| **B-03.S1** | 流式 tool input 还原 | G 脚本中 `tool_call_start.input` 为 object |
| **B-03.S2** | abort 后新 turn | abort 后 `runTextTurn({user:'OK'})` 含 OK |
| **B-03.S3** | `close()` 清理 | `rt.close()` 后 `activeAbortCount() === 0` |
| **B-03.S4** | 无 sessionId abort | `rt.abort('unknown')` → false；generator 不受影响 |

### 7.3 反向断言

```text
- 不应 import eventsource-parser 等第三方
- 不应 import chunks/serve-wanding
- runtime 模块不应 console.log（smoke 脚本可 log）
- 不应改 callApiSync 语义
- AbortRegistry 不应跨进程
```

---

## 8. 不做 (Non-Goals)

| 不做 | 推到 |
|------|------|
| serve-wanding 改 import runtime | B-04 |
| ccb-acp-agent.js | Phase 3 |
| MCP in-flight abort / spawn kill | B-03b / B-04 |
| 流式 MCP 工具事件 | — |
| session 持久化 | adapter |
| `onEvent` 回调 | B-04 评估 |

---

## 9. 风险

| ID | 风险 | 缓解 |
|----|------|------|
| R-B03-1 | MiniMax SSE 格式不符 | **Phase 0 spike**；FAIL → B-03a abort-only |
| R-B03-2 | `input_json_delta` 不完整 | 累积到 `content_block_stop` 再 parse |
| R-B03-3 | 服务端 abort 后仍计费 | 本地 stop consume；与 industry 一致 |
| R-B03-4 | registry 泄漏 | `finally unregister` + `close.abortAll` |
| R-B03-5 | 5s 首字 CI 抖动 | 常量 `STREAM_FIRST_DELTA_TIMEOUT_MS`；失败打印 timing |
| R-B03-6 | B-03.E 慢 (~90s) | 允许 CI 单独 job；本地全量跑 |

---

## 10. 完成定义 (DoD)

```text
[x] test-minimax-sse-raw.mjs PASS（B-03.0）
[x] AbortRegistry.js + callApiStream + AgentLoop stream + index abort
[x] test-runtime-streaming.mjs PASS（B-03.A/B）
[x] test-runtime-abort.mjs PASS（B-03.C）
[x] test-runtime-stream-mcp.mjs PASS（B-03.G）
[x] B-01 / B-02 smoke 回归 PASS
[x] 静态门禁 PASS
[x] 可行性 plan §11 4c 指向本 spec v0.2
[ ] git commit（待用户要求）
```

---

## 11. 上游 plan 引用

```markdown
4a. B-01 ✅
4b. B-02 ✅
4c. B-03 (本期：真 SSE + abort) → [spec](./Platform/Period/B-03-ccb-runtime-streaming-abort.md) v0.2
4d. B-04 (serve-wanding 迁移) / Phase 3 (ACP)
```

---

## 12. smoke 脚本骨架

### 12.0 `test-minimax-sse-raw.mjs`（Phase 0）

```javascript
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { loadConfig } from './src/ccb-runtime/Config.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

loadSmokeEnv(dirname(fileURLToPath(import.meta.url)))
const cfg = loadConfig()
const res = await fetch(`${cfg.apiBase.replace(/\/$/, '')}/v1/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': cfg.apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: cfg.model,
    max_tokens: 256,
    stream: true,
    messages: [{ role: 'user', content: 'Say hi in 3 words' }],
  }),
})
const text = await res.text()
const lines = text.split('\n').slice(0, 15)
console.log(lines.join('\n'))
const ok = lines.some(l => l.startsWith('event:')) && lines.some(l => l.startsWith('data:'))
if (!ok) process.exit(1)
console.log('[spike] PASS SSE format detected')
```

### 12.1 `test-runtime-streaming.mjs`

```javascript
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

loadSmokeEnv(dirname(fileURLToPath(import.meta.url)))
const rt = await createRuntime()
const sessionId = `sess-${Date.now()}`
let firstDeltaAt = 0, deltaCount = 0, finalStop = '', finalUsage = null
const t0 = Date.now()

for await (const ev of rt.runTurn({
  user: '用三句话介绍万鼎业务',
  stream: true,
  sessionId,
})) {
  if (ev.type === 'text_delta') {
    deltaCount++
    if (!firstDeltaAt) firstDeltaAt = Date.now() - t0
  }
  if (ev.type === 'turn_end') {
    finalStop = ev.stop_reason
    finalUsage = ev.usage
  }
}

if (!firstDeltaAt || firstDeltaAt > 5000) process.exit(1)
if (deltaCount < 2) process.exit(1)
if (finalStop !== 'end_turn' || !finalUsage?.input_tokens) process.exit(1)
console.log(`[smoke] PASS first=${firstDeltaAt}ms chunks=${deltaCount}`)
await rt.close()
```

### 12.2 `test-runtime-abort.mjs`

```javascript
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

loadSmokeEnv(dirname(fileURLToPath(import.meta.url)))
const rt = await createRuntime()
const sessionId = `sess-abort-${Date.now()}`
let gotAborted = false
let abortAt = 0

for await (const ev of rt.runTurn({
  user: '详细介绍万鼎的报价、库存、Accurate 三条业务线（每条 500 字）',
  stream: true,
  sessionId,
})) {
  if (ev.type === 'text_delta' && !abortAt) {
    abortAt = Date.now()
    rt.abort(sessionId)   // 同步 abort，不用 setTimeout
  }
  if (ev.type === 'turn_aborted') {
    gotAborted = true
    if (!abortAt || Date.now() - abortAt > 1000) process.exit(1)
    break
  }
}

if (!gotAborted || rt.activeAbortCount() !== 0) process.exit(1)
const out = await rt.runTextTurn({ user: 'Reply with exactly: OK' })
if (!out.text.includes('OK')) process.exit(1)
console.log('[smoke] PASS abort + post-abort OK')
await rt.close()
```

### 12.3 `test-runtime-stream-mcp.mjs`（B-03.G）

```javascript
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

loadSmokeEnv(dirname(fileURLToPath(import.meta.url)))
const PROMPT = '请用一句话查「三通50」库存并调用库存工具'
const rt = await createRuntime({ enableMcp: true })
let toolCall = false, endTurn = false
const deadline = Date.now() + 180000

for await (const ev of rt.runTurn({ user: PROMPT, stream: true, sessionId: 'mcp-stream' })) {
  if (Date.now() > deadline) process.exit(1)
  if (ev.type === 'tool_call_start') toolCall = true
  if (ev.type === 'turn_end') endTurn = true
}
if (!toolCall || !endTurn) process.exit(1)
console.log('[smoke] PASS stream+mcp')
await rt.close()
```

---

## 13. 完成承诺

```text
<promise>B03_RUNTIME_STREAMING_ABORT_OK</promise>
```

仅当：§7 硬门 8 条全过（或 B-03.0 FAIL 时 B-03a 子集：C/D/E/F 全过且 A/B/G 文档标记 BLOCKED）+ §10 DoD 勾选 + B-01/B-02 回归 PASS。
