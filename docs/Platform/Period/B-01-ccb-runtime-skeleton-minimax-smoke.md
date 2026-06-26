# B-01: ccb-runtime 骨架 + ModelClient 同步烟雾测试

**状态**: v0.2 spec — ✅ 已完成（2026-06-12）
**日期**: 2026-06-12
**周期**: Period-01 (B 路线第一个可执行子任务)
**工期**: 1～2 天
**所属路线**: 新 B（CCB Runtime + ACP Agent + AionUI Client）

---

## 0. 关联文档

| 文档 | 角色 |
|------|------|
| [ccb-runtime-acp-agent-feasibility-plan.md](../../ccb-runtime-acp-agent-feasibility-plan.md) | 上游 v1.4 计划（§3.1, §3.1.1, Phase 2.1/2.4） |
| [ccb-wanding-aionui-architecture-evaluation.md](../../ccb-wanding-aionui-architecture-evaluation.md) | 旧 B 挂起链路证据（5 层） |
| `AIONUI-BACKEND-STATUS.md` | Stage 2/3 实测日志（ccb-installer/） |

---

## 1. 目标 (Goal)

在 `ccb-installer/src/ccb-runtime/` 下建立最小可验证的 runtime 库，**不依赖** `serve-wanding.js`、**不依赖** SDK `query()`、**不依赖** QueryEngine，能独立完成一次 MiniMax 同步调用并返回纯文本。

完成后产物 = 3 个 JS 文件 + 1 个 smoke 脚本 + 1 个静态门禁，全部 PASS。

---

## 2. 为什么这个子任务排第一 (Why First)

### 2.1 与上游 plan 阶段的关系

上游 plan 给出 Phase 2.1（创建目录 + 4 文件）和 Phase 2.4（单测），本 spec **合并并拆分**：

| 上游步骤 | 本 spec 处理 |
|----------|--------------|
| Phase 2.1 创建目录 + `index.js` + `mcp.js` + `api.js` + `loop.js` | **拆**：`mcp.js` / `loop.js` 推迟到 B-02；本 spec 只做 `index.js` + `Config.js` + `ModelClient.js` |
| Phase 2.2 从 serve-wanding 迁移 | **推**到 B-02（B-01 骨架先行，再迁 loop/MCP） |
| Phase 2.4 `test-runtime-minimax.mjs` | **并**入 B-01.A |
| Phase 2.3 流式 SSE | **不在** B-01，留 B-02/B-03 |

### 2.2 四个决策理由

1. **隔离 adapter 层**：直接 `fetch` MiniMax，绕开 serve-wanding HTTP/WS 框架，变量最小化
2. **API surface 定型**：runtime 还没被任何 adapter 消费，此时改接口零成本
3. **天然充当 hang 诊断**：B-01.C 强制打印 env 长度，揭示进程是否真的拿到了 `ANTHROPIC_AUTH_TOKEN`
4. **解锁后续**：B-02（Loop + MCP）、B-03（流式）、Phase 3（ACP agent）全部依赖此骨架

### 2.3 候选子任务对比（备查）

| 候选 | 选/不选 | 理由 |
|------|--------|------|
| B-01 ccb-runtime 骨架 + MiniMax 烟雾 | ✅ | 见 §2.2 |
| B-00 Phase 0 商标 / NOTICE 收尾 | ❌ | 法务/合规路径，1-2 天内不会有结论，不阻塞工程 |
| B-02 写 `ccb-acp-agent.js` 完整 adapter | ❌ | plan §11 明文「不要直接开 Phase 3」 |
| B-03 Path A 浏览器契约恢复（`/api/conversations`） | ❌ | 与 B 正交；属于 Phase 1 短期路径，独立推进 |
| B-04 单独 env 传播排查 | ❌ | 已被 B-01.C 覆盖；不需要单独子任务 |

---

## 3. 接口契约 (Interface)

> 写成 TypeScript-shape 仅为说明，实际产出 JS（JSDoc 注释）。

### 3.1 `Config.js`

```typescript
// 输入: process.env（或测试注入的 env）
// 输出: normalized config object
export interface RuntimeConfig {
  apiBase: string         // 来自 ANTHROPIC_BASE_URL
  apiKey: string          // 来自 ANTHROPIC_AUTH_TOKEN
  model: string           // 来自 ANTHROPIC_DEFAULT_SONNET_MODEL（默认 'minimax-m3'）
  maxTokens: number       // 默认 1024
  timeoutMs: number       // 默认 30000
}

export function loadConfig(env?: NodeJS.ProcessEnv): RuntimeConfig
export function loadConfig(env: Record<string, string | undefined>): RuntimeConfig
```

行为约束（与 `serve-wanding.js` L18-20 对齐）：
- `apiKey` 长度 < 20 → 抛 `ConfigError("ANTHROPIC_AUTH_TOKEN missing or too short")`
- `apiBase` 不以 `http://` 或 `https://` 开头 → 抛 `ConfigError("ANTHROPIC_BASE_URL must be absolute")`
- 缺 `ANTHROPIC_BASE_URL` → 默认 `https://api.minimaxi.com/anthropic`
- 缺 `ANTHROPIC_DEFAULT_SONNET_MODEL` → 默认 `minimax-m3`

### 3.2 `ModelClient.js`

```typescript
export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ApiCallInput {
  apiBase: string
  apiKey: string
  model: string
  maxTokens: number
  system?: string
  messages: Message[]
  timeoutMs?: number       // 默认 30000
}

export interface ApiCallOutput {
  content: Array<{type: 'text'; text: string}>
  usage: {input_tokens: number; output_tokens: number}
  stop_reason: 'end_turn' | 'max_tokens' | string
  model: string
}

export async function callApiSync(input: ApiCallInput): Promise<ApiCallOutput>
```

行为约束：
- `POST {apiBase}/v1/messages`，`Content-Type: application/json`
- Headers: `x-api-key: {apiKey}`、`anthropic-version: 2023-06-01`（与 serve-wanding 一致）
- 响应非 2xx → 抛 `ApiError(status, body)`
- 超时（默认 30s）→ 抛 `ApiError(0, "timeout after {ms}ms")`
- **不**做流式；**不**重试；**不**做指数退避

### 3.3 `index.js`

```typescript
export interface CreateRuntimeOptions {
  config?: Partial<RuntimeConfig>    // 缺省时调用 loadConfig()
}

export interface Runtime {
  /** 单轮纯文本 turn（不调用工具） */
  runTextTurn(input: {user: string; history?: Message[]; system?: string}): Promise<{
    text: string
    usage: {input_tokens: number; output_tokens: number}
    stop_reason: string
  }>
  /** 释放资源（当前 noop，预留给 B-02 abort 句柄） */
  close(): Promise<void>
}

export async function createRuntime(options?: CreateRuntimeOptions): Promise<Runtime>
```

行为约束：
- `runTextTurn` 内部构造 `messages = [...(history || []), {role:'user', content:user}]` → 调 `callApiSync`
- `close()` 当前实现 `Promise.resolve()`，但**接口必须存在**（adapter 必调）
- 不开 `AbortController`（B-02 才接）

---

## 4. 文件结构与产物 (Deliverables)

```
ccb-installer/
├── src/
│   └── ccb-runtime/
│       ├── index.js              # createRuntime
│       ├── Config.js             # loadConfig
│       └── ModelClient.js        # callApiSync
├── test-runtime-minimax.mjs      # 烟雾测试
└── scripts/
    └── check-no-sdk-query.sh     # 静态门禁（git-track）
```

**约束**：
- 不开 `package.json`、不开 `tsconfig.json`、不开 `README.md`（除非验收要求）
- 不引第三方包；用 `fetch`（Bun/Node 18+ 内置）
- 不做 sourcemap、不做 minify（与现有 `dist/chunks/*.js` 风格保持一致即可）

---

## 5. 验收 (Acceptance)

### 5.1 硬门 4 条 — 必须**全部**通过

| ID | 项目 | 验证方式 | 通过条件 |
|----|------|----------|----------|
| **B-01.A** | MiniMax 烟雾测试 | `bun run test-runtime-minimax.mjs` | 30s 内收到非空 text；`usage.input_tokens > 0`；`stop_reason === 'end_turn'`；退出码 0 |
| **B-01.B** | 无 SDK query 依赖 | `grep -rn "from '@anthropic-ai/claude-agent-sdk'" ccb-installer/src/ccb-runtime/` | 输出为空 |
| **B-01.C** | env 传播可见 | smoke 脚本头部打印 `process.env.ANTHROPIC_AUTH_TOKEN.length`（脱敏 8 字符） | 长度 ≥ 20；< 20 立即报错「env 未传播到进程」并退出码 2 |
| **B-01.D** | 文件结构 | `ls ccb-installer/src/ccb-runtime/` | 恰好 3 个文件（`index.js` / `Config.js` / `ModelClient.js`），无 `MCP.js` / `Loop.js` / `Tools.js` |

### 5.2 软门 2 条 — 应该通过；不通过需在 PR 注释解释

| ID | 项目 | 期望 |
|----|------|------|
| **B-01.S1** | MiniMax 响应字段完整性 | `content[0].text` 非空且 `usage` 包含 `input_tokens` + `output_tokens` |
| **B-01.S2** | Config 缺字段时报错清晰 | 缺 `ANTHROPIC_AUTH_TOKEN` 时抛错信息含「ANTHROPIC_AUTH_TOKEN」字样（不泄漏 token 值） |

### 5.3 反向断言（不应出现）

```text
- 不应 import 'bun:bundle'（runtime 是纯库，不依赖 feature flag）
- 不应 import 任何 'chunks/serve-wanding'（避免循环依赖）
- 不应 import 'src/utils/log'（runtime 当前不写日志；B-02 再加可选 logger）
- 不应调用 process.cwd()（runtime 应不依赖当前工作目录；纯库）
```

---

## 6. 不做 (Explicit Non-Goals)

| 不做 | 原因 | 推到 |
|------|------|------|
| 流式 / SSE | API surface 简化 | B-03 |
| MCP / 工具调用 | 需 `McpTransport` 设计 | B-02 |
| 多轮 AgentLoop | 需 `RuntimeEvent` 设计 | B-02 |
| session 持久化 | adapter 责任 | Phase 3 adapter 层 |
| abort / cancel | 需 AbortController 串通 fetch | B-02 |
| serve-wanding 改造 | 需先有 runtime 库 | B-02 |
| ccb-acp-agent.js | 需先有完整 runtime | Phase 3 |

---

## 7. 风险 (Risk)

| ID | 风险 | 概率 | 影响 | 缓解 |
|----|------|------|------|------|
| R-B01-1 | API 选错未来改造成本大 | 中 | 中 | spec 评审先行；接口留 `close()` 钩子 |
| R-B01-2 | MiniMax 与 Anthropic 同步响应差异 | 低 | 中 | 先 raw response 透传；`content[0].text` 用 `[].find(b=>b.type==='text')?.text` 容错 |
| R-B01-3 | `src/` 路径在 dist 构建后能否 import | 中 | 高 | 先在 `src/` 写，smoke 脚本用相对路径 `../src/ccb-runtime/index.js` 验证；build 集成留 Phase 5 |
| R-B01-4 | Bun fetch 与 Node fetch 差异 | 低 | 低 | 仅用标准 `fetch` + `AbortController`（即便未用 abort）；避免 Bun-only API |
| R-B01-5 | smoke 脚本在 CI 环境下无 env | 高 | 中 | smoke 脚本必须从 `.env.local` 读取（不进 git），CI 用 secret 注入；本地用 `start-aionui.cmd` 的同款 env 块 |

---

## 8. 完成定义 (DoD)

```text
[x] ccb-installer/src/ccb-runtime/index.js 存在且 export { createRuntime }
[x] ccb-installer/src/ccb-runtime/Config.js 存在且 export { loadConfig }
[x] ccb-installer/src/ccb-runtime/ModelClient.js 存在且 export { callApiSync }
[x] ccb-installer/test-runtime-minimax.mjs 存在，node 跑通（B-01.A，3393ms，PONG）
[x] ccb-installer/scripts/check-no-sdk-query.sh 存在且 grep 验证通过（B-01.B）
[x] smoke 脚本头部打印 env 长度 ≥ 20（B-01.C，length=125）
[x] 目录仅 3 个 JS 文件，无 MCP/Loop/Tools（B-01.D）
[x] 可行性计划 §11 已插入 B-01/B-02 引用
[ ] git commit（待用户要求）
```

---

## 9. 与上游 plan 的引用更新（建议）

在 `ccb-runtime-acp-agent-feasibility-plan.md` §11「一周内」第 4 条后插入：

```markdown
4a. **B-01** = Phase 2.1 (子集) + 2.4 (合并) → 见 [B-01 spec](./Platform/Period/B-01-ccb-runtime-skeleton-minimax-smoke.md)
4b. **B-02** = Phase 2.1 (剩余 Loop/MCP) + 2.2 (迁移) + 2.3 (流式) + 2.5 (回归) → 待 B-01 完成后再写 spec
```

理由：让 plan 与 Period/ 子 spec 互链，避免后续读者在两套文档间跳跃。

---

## 10. 附: smoke 脚本骨架（仅参考，不是最终代码）

```javascript
// ccb-installer/test-runtime-minimax.mjs
import { createRuntime } from './src/ccb-runtime/index.js'

// B-01.C: env 传播可见
const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
console.log(`[env] ANTHROPIC_AUTH_TOKEN.length = ${token.length}`)
if (token.length < 20) {
  console.error('[env] FAIL: ANTHROPIC_AUTH_TOKEN missing or too short')
  process.exit(2)
}

const rt = await createRuntime()

const t0 = Date.now()
const out = await rt.runTextTurn({ user: 'Reply with exactly: PONG' })
const dt = Date.now() - t0

// B-01.A: 验收
if (!out.text || out.text.trim() === '') {
  console.error('[smoke] FAIL: empty text')
  process.exit(1)
}
if (!out.usage || out.usage.input_tokens <= 0) {
  console.error('[smoke] FAIL: usage.input_tokens <= 0')
  process.exit(1)
}
if (out.stop_reason !== 'end_turn') {
  console.error(`[smoke] FAIL: stop_reason = ${out.stop_reason}`)
  process.exit(1)
}
if (dt > 30_000) {
  console.error(`[smoke] FAIL: took ${dt}ms > 30000ms`)
  process.exit(1)
}

console.log(`[smoke] PASS in ${dt}ms`)
console.log(`  text:        ${out.text.slice(0, 80)}`)
console.log(`  usage:       ${JSON.stringify(out.usage)}`)
console.log(`  stop_reason: ${out.stop_reason}`)

await rt.close()
process.exit(0)
```

---

## 11. 完成承诺 (Promise)

```text
<promise>B01_RUNTIME_SKELETON_OK</promise>
```

仅当：smoke 脚本退出码 0 + 静态门禁退出码 0 + 文件结构符合 §4 + §8 DoD 全部勾选。
