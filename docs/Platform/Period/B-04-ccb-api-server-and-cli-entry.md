# B-04: 路线 B 实现 — ccb-api-server + cli.js `--ccb-api` 入口

**状态**: v0.2 ✅ 完成（B-04a + B-04b + [B-04c 复审修补](./B-04c-code-review-triage.md)）
**日期**: 2026-06-12
**周期**: Period-04 (B 路线第四个子任务)
**工期**: 3～5 天（B-04a 同步版，依赖 B-02）+ 2～3 天（B-04b 流式，依赖 B-03）
**所属路线**: 新 B（CCB Runtime + ACP Agent + AionUI Client）
**前置依赖**:
- B-01 ✅（ccb-runtime 骨架）
- B-02 ✅（ccb-runtime 完整 AgentLoop + 双 MCP + PromptAssembler）
- B-03 ✅（v0.2 真 SSE + abort）

---

## 0. 关联文档

| 文档 | 角色 |
|------|------|
| [B-01 spec](./B-01-ccb-runtime-skeleton-minimax-smoke.md) | runtime 骨架 + 同步 ModelClient |
| [B-02 spec](./B-02-ccb-runtime-agent-loop-mcp-smoke.md) | runtime 完整 AgentLoop + 双 MCP |
| [B-03 spec (v0.2)](./B-03-ccb-runtime-streaming-abort.md) | 流式 + abort（Phase 0 spike → 分叉） |
| [B-04c spec](./B-04c-code-review-triage.md) | WS pong 实现 + 复审注释/测试修补 |
| [可行性计划 v1.5](../../ccb-runtime-acp-agent-feasibility-plan.md) | §3.1.1 模块契约、§2.2 双接入面、§2.4 新旧 B 对比 |
| [架构评估 §2.6 终极方案](../../ccb-wanding-aionui-architecture-evaluation.md) | 路线 B 原始设计依据 |

---

## 1. 路线 B 探索 (Feasibility Analysis)

### 1.1 核心命题

> **B 做内部架构，A 只做启动入口**

即 `ccb-runtime` 是大脑，`ccb-api-server` 是 HTTP/WS 机器接口，`cli.js --ccb-api` 只负责启动 — 不进 REPL，不碰 `query.next()`，不绕 `verifyAutoModeGateAccess`。

### 1.2 可行性结论：✅ 落地成立

| 维度 | 评分 | 依据 |
|------|------|------|
| 架构清晰度 | 9/10 | 大脑 / 机器接口 / 入口 三层职责互不污染 |
| 与既有工作衔接 | 9/10 | B-01/B-02 已交付 ccb-runtime；本 spec 只需 ccb-api-server + cli.js fast-path |
| 与旧 CLI 隔离 | 10/10 | 不进 `main()`，不调 `query()`，不依赖 QueryEngine |
| 与未来 ACP 兼容 | 9/10 | `ccb-api-server` 与 `ccb-acp-agent` 是同一层的不同 adapter；本 spec 为 ACP 铺路 |
| 工期可控 | 8/10 | 3-5 天 (sync) + 2-3 天 (stream) = 5-8 天；无新基础设施 |
| 风险 | 6/10 | 旧 serve-wandering 处置、Stage 2 hang 残余需在 B-04 验证 |

**总评**：8.5/10 — 推荐作为 B 路线**下一个**子任务（而非 B-03 的 abort/streaming）。

### 1.3 与 B-03 顺序的决策

**问题**：是先做 B-03（runtime 流式 + abort）还是 B-04（adapter）？

**结论**：B-04a（sync 版）**优先** B-03。理由：

| 顺序 | 优劣 |
|------|------|
| **B-04a → B-03 → B-04b**（推荐） | B-04a 立即验证 runtime 可被 HTTP/WS adapter 正确消费；流式后置；不让 runtime 阻塞 adapter 验证 |
| B-03 → B-04a → B-04b | 流式 + abort 先成；但 B-04a 才能验证 runtime 在真实 adapter 路径下工作（避免 runtime 漂亮、adapter 不通） |

**B-04a 范围**：sync `runTurn`，server 收消息 → 跑完 → 推 events。**无 SSE**。**无 abort**（用 timeout 兜底）。

**B-04b 范围**：B-03 通过后，ccb-api-server 加 `stream:true` 透传 + `runtime.abort(sessionId)` 接入 `/api/sessions/:id/cancel`。

### 1.4 与旧 serve-wandering 关系

**问题**：B-04 上线后，`serve-wandering.js` 怎么办？

**方案对比**：

| 方案 | 说明 | 选/不选 |
|------|------|---------|
| **A：保留双轨** | `web` → serve-wandering；`--ccb-api` → ccb-api-server | ✅ 短期过渡 |
| B：替换 | 删除 serve-wandering；`web` 直接 alias 到 `--ccb-api` | ❌ 风险高；需先充分验证 ccb-api-server |
| C：并行退役 | serve-wandering 标 deprecated；3 个月后删 | ⚠️ 视 B-04 稳定性 |

**B-04 选 A**：保留 `web` fast-path（→ serve-wandering），新增 `--ccb-api`（→ ccb-api-server）。两个 server 不同时跑（端口可不同）。serve-wandering 上的 Stage 2/3 测试可继续作为旧路径回归基线。

---

## 2. 目标 (Goal)

落地"路线 B 探索"决策：

1. **新建 `ccb-api-server.js`**：HTTP/WS 机器接口，转发 ccb-runtime 事件
2. **cli.js 加 `--ccb-api` fast-path**：启动 ccb-api-server；不进 `main()`
3. **保留旧 `web` → serve-wandering**：作为回归基线，不删除
4. **业务命令可跑**：`ccb-wanding --ccb-api --port=3001` 启动后，发"三通50 库存"得到与 Stage 3 同样质量的回答

---

## 3. 设计决策与理由

### 3.1 文件命名（与 B-01/B-02/B-03 风格一致）

```text
ccb-installer/src/
├── ccb-runtime/          # B-01/B-02/B-03 已交付
│   ├── index.js
│   ├── Config.js
│   ├── ModelClient.js
│   ├── PromptAssembler.js
│   ├── McpTransport.js
│   ├── McpManager.js
│   ├── ToolBridge.js
│   ├── AgentLoop.js
│   └── AbortRegistry.js  (B-03)
├── ccb-api-server/       # 【新】B-04
│   ├── index.js          # startCcbApiServer({port, runtime?})
│   ├── Session.js        # 单 session 状态 + 消息历史
│   ├── SessionManager.js # 多 session 索引
│   ├── http.js           # HTTP 路由
│   ├── ws.js             # WebSocket handler
│   └── health.js         # /api/health + /api/tools
└── ccb-acp-agent/        # 【未来】Phase 3
    └── (待写)
```

构建产物路径：`dist/chunks/ccb-runtime.js` + `dist/chunks/ccb-api-server.js`（与 B-02 v0.2 既有规划一致）。

### 3.2 ccb-api-server 边界（**严格不重复** runtime 逻辑）

ccb-api-server **只**做：
- HTTP 路由分发
- WebSocket 会话管理
- RuntimeEvent → WS message 序列化
- sessionId 分配与索引
- **不**做 AgentLoop / McpManager / PromptAssembler / ModelClient

ccb-api-server **不做**：
- ❌ 业务逻辑
- ❌ tool 路由
- ❌ system prompt 加载（runtime.loadSystemPrompt 负责）
- ❌ MCP 启停（runtime.close 负责）
- ❌ MiniMax API 直调（runtime.runTurn 负责）

### 3.3 Session 生命周期

```text
client POST /api/sessions
  → server: sessionId = uuid()
  → server: 存 Session {id, messages: [], abortController: null, createdAt, lastActiveAt}
  → 200 {sessionId, createdAt}

client POST /api/sessions/:id/messages {user}
  → server: 取 Session；构造 input
  → server: for-await (ev of runtime.runTurn(input, {sessionId, stream: false})) { ws.send(ev) }
  → 200 (B-04a); 或 200 + WS events (B-04b)

client DELETE /api/sessions/:id
  → server: 删 Session
  → 204

client GET /api/sessions
  → server: 列出所有 sessionId + lastActiveAt
  → 200 [...]

client GET /api/health
  → server: {ok: true, version, runtime: 'ccb-runtime', sessions: N}
  → 200

client GET /api/tools
  → server: runtime.getAllTools() via McpManager
  → 200 [{name, description, input_schema}, ...]
```

### 3.4 WebSocket 协议

```text
ws://host:port/ws?sessionId=xxx

server → client:
  { type: 'event', sessionId, event: <RuntimeEvent> }
  { type: 'error', sessionId, error: {name, message} }
  { type: 'ping' }
  { type: 'close', sessionId, reason }

client → server:
  { type: 'subscribe', sessionId }   // 订阅某 session
  { type: 'unsubscribe', sessionId }
  { type: 'send', sessionId, user, stream }   // B-04a 可选
  { type: 'cancel', sessionId }      // B-04b 接 abort
  { type: 'pong' }
```

**B-04a 实现**：仅 subscribe / unsubscribe / event / ping。**send/cancel 走 REST，不走 WS**（简化首版）。

**B-04b 扩展**：加 send / cancel WS 消息，复用 runtime。

### 3.5 serve-wandering vs ccb-api-server 差异

| 维度 | serve-wandering | ccb-api-server (B-04) |
|------|-----------------|------------------------|
| 来源 | B-02 v0.2 §0.1.1 「**不复刻**」 | B-04 新写 |
| 入口 | `web` fast-path | `--ccb-api` fast-path |
| 大脑 | 内嵌 AgentLoop | import ccb-runtime |
| 默认 stage | `minimax` / `agent` | 走 runtime 配置（默认 enableMcp=true） |
| API 路径 | `/api/sessions`（与 AionUI 契约漂移） | **重新设计**（不沿用 serve-wandering 路径） |
| 验证基线 | Stage 2/3 ✅ | B-04 新 smoke |
| 未来 | 标 deprecated | 主路径 |

**为什么不用 serve-wandering 的 `/api/sessions`**：避免重复 B-02 v0.2 §E14 「实现与 AionUI 契约漂移」问题；新接口是干净的，可被未来 AionUI / 企微 / Web 多端复用。

---

## 4. 接口契约 (Interface)

### 4.1 `ccb-api-server/index.js`

```typescript
export interface StartServerOptions {
  port: number                          // 必填；--port 解析
  host?: string                         // 默认 '127.0.0.1'
  runtime?: Runtime                     // 测试注入；缺省 createRuntime({enableMcp:true})
  enableMcp?: boolean                   // 默认 true
  log?: (line: string) => void          // 适配现有 logger
}

export interface RunningServer {
  port: number
  url: string                           // 'http://127.0.0.1:3001'
  wsUrl: string                         // 'ws://127.0.0.1:3001/ws'
  close(): Promise<void>
  activeSessionCount(): number
}

export async function startCcbApiServer(options: StartServerOptions): Promise<RunningServer>
```

行为约束：
- `runtime` 缺省 → `await createRuntime({enableMcp: options.enableMcp})`
- 启动失败（端口占用 / runtime init 失败）→ throw，exit 1
- `RunningServer.close()` → 关 HTTP + WS + 调 `runtime.close()`
- 进程信号（SIGINT / SIGTERM）→ 优雅 close

### 4.2 `ccb-api-server/Session.js`

```typescript
import type { RuntimeEvent } from '../ccb-runtime/index.js'

export interface Session {
  readonly id: string
  readonly createdAt: number
  lastActiveAt: number
  messages: Array<{role: 'user' | 'assistant', content: string}>
  isRunning: boolean
}

export interface SessionRunner {
  /** 同步（B-04a）/ 流式（B-04b）跑一轮；产出推给 sink */
  runTurn(input: {user: string, stream: boolean}, sink: (ev: RuntimeEvent) => void): Promise<void>
  abort(): boolean                       // B-04b
}

export function createSession(id: string): { session: Session, runner: SessionRunner }
```

### 4.3 `ccb-api-server/http.js`

```typescript
export interface HttpDeps {
  runtime: Runtime
  sessionManager: SessionManager
  health: () => {ok: boolean, version: string, runtime: string, sessions: number}
  tools: () => Promise<Array<{name: string, description: string, input_schema: object}>>
}

export function handleHttp(req: IncomingMessage, res: ServerResponse, deps: HttpDeps): Promise<void>
```

路由表（B-04a）：

| Method | Path | 行为 |
|--------|------|------|
| GET | `/api/health` | `{ok, version, runtime:'ccb-runtime', sessions}` |
| GET | `/api/tools` | `runtime.getAllTools()` |
| GET | `/api/sessions` | `sessionManager.list()` |
| POST | `/api/sessions` | `sessionManager.create()` → `{sessionId, createdAt}` |
| GET | `/api/sessions/:id` | `sessionManager.get(id)` |
| DELETE | `/api/sessions/:id` | `sessionManager.delete(id)` |
| POST | `/api/sessions/:id/messages` | `runner.runTurn({user, stream:false})`；同步返回 `{text, usage, stop_reason}` |
| 其他 | `*` | 404 `{error: 'not_found', path}` |

### 4.4 `ccb-api-server/ws.js`

```typescript
export interface WsDeps {
  sessionManager: SessionManager
}

export function attachWsServer(httpServer: HttpServer, deps: WsDeps): WsServer
```

行为约束（B-04a，**B-04c 已实现**）：
- `ws://host/ws?sessionId=xxx` 仅订阅该 session 的 events
- 多 client 可订阅同一 session（broadcast）
- 30s 心跳：server 发 `{type:'ping'}`；`lastPongAt` 超过 60s 未刷新则 `close(1000,'pong timeout')`
- 客户端须回复 `{type:'pong'}`（`serve-wanding` 与 smoke 测试已接）
- session 删除 → server 推 `close` 后断开

### 4.5 cli.js `--ccb-api` fast-path

```javascript
// 在 dist/cli.js fast-path 链中插入（参考现有 --acp / web 模式）
if (e[0] === '--ccb-api' || e[0]?.startsWith('--ccb-api=')) {
  t('cli_ccb_api_path');
  let port = 3001;
  const portIdx = e.indexOf('--port');
  if (portIdx >= 0 && e[portIdx + 1]) port = Number(e[portIdx + 1]);
  const { startCcbApiServer } = await import('./chunks/ccb-api-server.js');
  await startCcbApiServer({ port });
  return;
}
```

**位置**：放在 `if (e[0] === 'web-serve' || e[0] === 'web')` **之后**（与现有 web 顺序保持）。

**行为**：
- `--ccb-api` → 用默认 3001
- `--ccb-api --port=3002` → 用 3002
- `--ccb-api --port 3002` → 用 3002（兼容两种语法）
- 启动失败 → 打印错误到 stderr，exit 1
- 启动成功 → 打印 `[ccb-api] listening on http://127.0.0.1:3001` 后**不退出**

---

## 5. 文件结构与产物

```
ccb-installer/
├── src/
│   ├── ccb-runtime/             # B-01/B-02/B-03 既有
│   └── ccb-api-server/          # 【新】B-04
│       ├── index.js
│       ├── Session.js
│       ├── SessionManager.js
│       ├── http.js
│       ├── ws.js
│       └── health.js
├── dist/cli.js                  # 【改】+ --ccb-api fast-path
├── dist/chunks/
│   ├── ccb-runtime.js           # 构建产物
│   └── ccb-api-server.js        # 【新】构建产物
├── test-ccb-api-server.mjs      # 【新】smoke
└── scripts/
    ├── check-no-sdk-query.sh    # 既有
    └── check-runtime-no-serve-wandering.sh  # 既有
```

构建：
- `ccb-api-server/*` 走现有 Bun.build()（与 `ccb-runtime/*` 同 pipeline）
- 单 chunk 文件 `< 50KB`（目标；与 serve-wandering.js 626 行对照）

---

## 6. 验收 (Acceptance)

### 6.1 B-04a 硬门 6 条（sync 版）— 必须**全部**通过

| ID | 项目 | 验证 | 通过条件 |
|----|------|------|----------|
| **B-04a.A** | 启动 | `ccb-wanding --ccb-api --port=3099` | 退出码 0；`[ccb-api] listening on http://127.0.0.1:3099` |
| **B-04a.B** | health | `GET /api/health` | 200 `{ok:true, runtime:'ccb-runtime', sessions:0}` |
| **B-04a.C** | 工具列表 | `GET /api/tools` | 200 非空；至少含 `get_inventory_by_code` |
| **B-04a.D** | session CRUD | `POST/GET/DELETE /api/sessions/:id` | 三步全过；session 数动态变化 |
| **B-04a.E** | 业务消息 | `POST /api/sessions/:id/messages` body `{user:"三通50 库存"}` | 60s 内 200；`text` 非空；含 `\|` 表格 |
| **B-04a.F** | 旧路径回归 | `ccb-wanding web --port=3098` + Stage 2/3 测试 | 仍 PASS（serve-wandering 保留） |

### 6.2 B-04b 硬门 3 条（流式 + abort，B-03 通过后做）— 必须**全部**通过

| ID | 项目 | 验证 | 通过条件 |
|----|------|------|----------|
| **B-04b.A** | WS event 实时 | `ws://host/ws?sessionId=xxx` + POST message | 收到 ≥2 `event` 消息（text_delta + turn_end） |
| **B-04b.B** | cancel | `POST /api/sessions/:id/cancel` | 1s 内 generator 结束；返回 200 `{aborted:true}` |
| **B-04b.C** | 流式首字 | 同 B-03.A | 首个 `event` 消息距 POST 开始 < 5s |

### 6.3 反向断言

```text
- ccb-api-server 不得 import '@anthropic-ai/claude-agent-sdk'
- ccb-api-server 不得 import 'chunks/serve-wandering'
- ccb-api-server 不得 import 'chunks/main-Dj9buWt1' (REPL)
- ccb-api-server 不得 import 'chunks/entry-WG7IeDEv' (旧 --acp)
- ccb-api-server 不得在 http.js / ws.js 中调 MiniMax API（仅 runtime 调）
- ccb-api-server 不得写 system prompt（runtime.loadSystemPrompt 负责）
- cli.js --ccb-api fast-path 不得 import 'chunks/main-Dj9buWt1' (REPL 入口)
```

### 6.4 软门 2 条

| ID | 项目 | 期望 |
|----|------|------|
| **B-04.S1** | session 持久化 | 进程重启后 session 列表清空；不持久化（Phase 4 再说） |
| **B-04.S2** | 多 client 订阅 | 同一 session 可被 2+ WS client 订阅；events broadcast |

---

## 7. 不做 (Explicit Non-Goals)

| 不做 | 原因 | 推到 |
|------|------|------|
| 流式 + abort | 依赖 B-03；B-04a 不阻塞 | B-04b（B-03 通过后） |
| session 持久化（落盘） | adapter 关注点；先 in-memory | Phase 4 |
| AionUI `/api/conversations` 契约 | 浏览器契约独立工作 | Phase 1 / 思路5 |
| 鉴权 / OAuth | 内部工具，先信任 | Phase 5 生产化 |
| 多用户并发 / 限流 | 单进程；测试通过即可 | Phase 5 |
| ccb-acp-agent | 需 B-04 先稳 | Phase 3 |
| 替换 serve-wandering | 风险高；先双轨 | B-05 (后续) |
| 业务白名单 / 工具裁剪 | 业务方需求 | 按需 |
| 旧 TUI / REPL 任何改造 | 已证伪 | 禁止 |

---

## 8. 风险 (Risk)

| ID | 风险 | 概率 | 影响 | 缓解 |
|----|------|------|------|------|
| R-B04-1 | 端口 3001 被 serve-wandering 占用 | 中 | 低 | 默认端口改 3099（与 3001 区分）；启动时端口冲突报错清晰 |
| R-B04-2 | `runtime.enableMcp=true` 启动慢（spawn 双 MCP） | 中 | 中 | smoke 120s；B-04a smoke 验证 |
| R-B04-3 | Stage 2 hang 在 ccb-api-server 路径下复现 | 中 | 高 | B-04a.E 业务消息 smoke 必须 PASS；B-02 已通过独立 smoke 证明 runtime 本身 OK |
| R-B04-4 | `runtime.getAllTools()` API 不存在 | 中 | 中 | B-04 需在 ccb-runtime/index.js 暴露 `getAllTools()`（B-02 v0.2 未声明；本 spec 触发新增） |
| R-B04-5 | HTTP server 库选择（`node:http` vs `bun:serve`） | 低 | 低 | 用 `node:http`（与 serve-wandering 风格一致；Bun 兼容） |
| R-B04-6 | WS 库选择（`ws` vs `bun:websocket`） | 低 | 低 | 用 `ws` npm 包（与 serve-wandering 一致）；后续可换 `bun:websocket` |
| R-B04-7 | 双轨（serve-wandering + ccb-api-server）维护负担 | 中 | 中 | 文档明确两路径；`web` 标 deprecated；2-3 个月后看 B-04 稳定性再决定 |
| R-B04-8 | B-04a 先于 B-03 可能让流式重做 | 中 | 中 | ccb-api-server 内部用 AsyncGenerator 消费 runtime；流式仅 sink 频率变化，handler 不变 |

---

## 9. 完成定义 (DoD)

### 9.1 B-04a

```text
[x] ccb-installer/src/ccb-api-server/{index,Session,SessionManager,http,ws,health}.js 存在
[x] dist/chunks/ccb-api-server.js 构建产物存在
[x] dist/cli.js 包含 --ccb-api fast-path
[x] ccb-installer/test-ccb-api-server.mjs 存在并 PASS（§6.1 B-04a.A–E）
[x] check-no-sdk-query.sh + check-api-server-gates.sh 仍 PASS
[ ] 旧 web 路径 Stage 2/3 回归 PASS（B-04a.F，未在本轮重跑）
[ ] git commit message: "feat(api-server): B-04a ccb-api-server + cli.js --ccb-api"
```

### 9.2 B-04b

```text
[x] ccb-api-server/http.js 加 POST /api/sessions/:id/cancel
[x] ccb-api-server/ws.js WS subscribe + event broadcast（send/cancel 走 REST）
[x] ccb-installer/test-ccb-api-server-streaming.mjs PASS（§6.2 3 条）
[ ] git commit message: "feat(api-server): B-04b streaming + abort wiring"
```

### 9.3 B-04c（复审修补）

见 [B-04c spec](./B-04c-code-review-triage.md)。

```text
[x] ws.js PING_INTERVAL_MS / PONG_TIMEOUT_MS 实现
[x] runtime / McpTransport / http.js 设计注释
[x] smoke dead import 清理 + streaming 测试 pong + cancel 诊断
[x] test-ccb-api-server-streaming.mjs PASS
```

---

## 10. 与上游 plan / 前序 spec 引用更新

`ccb-runtime-acp-agent-feasibility-plan.md` §11「一周内」第 4 条更新：

```markdown
4a. B-01 ✅ → [spec](./Platform/Period/B-01-ccb-runtime-skeleton-minimax-smoke.md)
4b. B-02 ✅ → [spec](./Platform/Period/B-02-ccb-runtime-agent-loop-mcp-smoke.md)
4c. B-03 (审核修订) → [spec](./Platform/Period/B-03-ccb-runtime-streaming-abort.md)
4d. B-04 (本期：路线 B 落地) → [spec](./Platform/Period/B-04-ccb-api-server-and-cli-entry.md)
4e. Phase 3 ccb-acp-agent (待 B-04 稳定)
```

`B-02 spec` §10 更新：

```markdown
- B-02 ✅ (v0.2)
- B-03 (审核修订) → spec
- B-04 (本期) → [spec](./Platform/Period/B-04-ccb-api-server-and-cli-entry.md)
- Phase 3 (ccb-acp-agent) 待 B-04 后
```

`B-03 spec` §0 关联文档补充：

```markdown
| [B-04 spec](./B-04-ccb-api-server-and-cli-entry.md) | 后续：ccb-api-server 消费 runtime |
```

---

## 11. 附: smoke 脚本骨架

```javascript
// ccb-installer/test-ccb-api-server.mjs
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 3099
const cli = spawn('bun', ['run', 'dist/cli.js', '--ccb-api', '--port', String(PORT)], {
  env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
})

// wait for [ccb-api] listening
let ready = false
for await (const line of readlines(cli.stderr)) {
  if (line.includes('listening on')) { ready = true; break }
}
if (!ready) { cli.kill(); process.exit(1) }

try {
  // B-04a.B
  const h = await fetch(`http://127.0.0.1:${PORT}/api/health`).then(r => r.json())
  assert(h.ok && h.runtime === 'ccb-runtime')

  // B-04a.C
  const tools = await fetch(`http://127.0.0.1:${PORT}/api/tools`).then(r => r.json())
  assert(tools.some(t => t.name === 'get_inventory_by_code'))

  // B-04a.D
  const { sessionId } = await fetch(`http://127.0.0.1:${PORT}/api/sessions`, { method: 'POST' }).then(r => r.json())
  const get1 = await fetch(`http://127.0.0.1:${PORT}/api/sessions/${sessionId}`).then(r => r.status)
  assert(get1 === 200)

  // B-04a.E
  const r = await fetch(`http://127.0.0.1:${PORT}/api/sessions/${sessionId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: '查"三通 DN50"库存，用 get_inventory_by_code，最后 Markdown 表格' }),
  }).then(r => r.json())
  assert(r.text && r.text.includes('|'))

  // DELETE
  const del = await fetch(`http://127.0.0.1:${PORT}/api/sessions/${sessionId}`, { method: 'DELETE' }).then(r => r.status)
  assert(del === 204)

  console.log('[smoke] PASS')
  cli.kill()
  process.exit(0)
} catch (e) {
  console.error('[smoke] FAIL', e)
  cli.kill()
  process.exit(1)
}
```

---

## 12. 完成承诺 (Promise)

```text
<promise>B04_CCB_API_SERVER_OK</promise>     // B-04a
<promise>B04_CCB_API_SERVER_STREAMING_OK</promise>  // B-04b
```

**B-04a 仅当**：§6.1 6 条硬门全过 + §9.1 DoD 全部勾选 + 旧 `web` 路径 Stage 2/3 仍 PASS。
**B-04b 仅当**：B-04a 仍 PASS + B-03 PASS + §6.2 3 条硬门全过 + §9.2 DoD 全部勾选。
