# B-04c: Code Review Triage — Route B 实现复审修补

**状态**: v0.1 ✅ 完成
**日期**: 2026-06-11
**周期**: Period-04c（B-04 后续修补，非独立架构阶段）
**前置依赖**:
- B-04a ✅ B-04b ✅
- B-03 ✅（abort / streaming 语义基准）

**关联文档**:
- [B-04 ccb-api-server](./B-04-ccb-api-server-and-cli-entry.md)
- [B-03 streaming + abort](./B-03-ccb-runtime-streaming-abort.md) — MCP abort 范围 §3.2
- [B-02 AgentLoop + MCP](./B-02-ccb-runtime-agent-loop-mcp-smoke.md)

---

## 1. 背景

B-01～B-06b 首轮落地后做实现复审，产出 **I-1～I-7** 七项。本 spec 记录处置结论与代码落点，避免与 B-03/B-04 主 spec 行为漂移。

**原则**：能注释澄清设计意图的不改行为；确属 spec 缺口且实现成本低的补实现；与 B-03 已验语义冲突的不改。

---

## 2. 处置表

| ID | 问题 | 严重性 | 处置 | 落点 |
|----|------|--------|------|------|
| **I-1** | WS 60s pong 超时未实现（B-04 §4.4 写了约束） | 中 | **已实现** — 30s `ping`、60s 无 `pong` 关闭；超时前 `clearInterval` | `ccb-api-server/ws.js` |
| **I-2** | `enableMcp` 时 `timeoutMs` 静默抬到 120s | 低（有意） | **保留行为** + 注释 | `ccb-runtime/index.js` |
| **I-3** | MCP 子进程 exit 不 abort 进行中的 turn | 低（设计） | **保留** + 注释引用 B-03 §3.2 | `ccb-runtime/McpTransport.js` |
| **I-4** | `DELETE /sessions/:id` abort 与 in-flight `POST /messages` 竞态 | 低 | **保留** + 注释（best-effort） | `ccb-api-server/http.js` |
| **I-5** | `asAbortEvent` 超时 yield `error` 而非 `turn_aborted` | — | **不改** — 与 B-03 验收一致；改会回归 | （无变更） |
| **I-6** | smoke 测试 dead import | 低 | **删除** `readFileSync` / `existsSync` | `test-runtime-minimax.mjs`, `test-runtime-mcp.mjs` |
| **I-7** | cancel 测试失败时无 event 诊断 | 低 | **增强** — 超时消息列出已收 event；WS 客户端回复 `pong` | `test-ccb-api-server-streaming.mjs` |

---

## 3. WS 心跳实现（I-1）

与 B-04 §4.4 一致；JSON `{type:'ping'/'pong'}` 格式与 serve-wanding 客户端回复方式一致（serve-wanding 无服务端 60s 超时循环，仅 ccb-api-server 实现完整心跳）：

```text
打开 WS     → lastPongAt = now
每 30s      → 若 (now - lastPongAt) >= 60s → close('pong timeout')（第 2 个 tick ≈60s）
            → 否则 send { type: 'ping' }
收到 pong   → lastPongAt = now
subscribe   → 刷新 lastPongAt
```

**客户端契约**：应用层 JSON `{ type: 'ping' }` / `{ type: 'pong' }`（非 WebSocket 协议帧）。

| 消费者 | pong 回复 |
|--------|-----------|
| `serve-wanding/index.js` | ✅ 已有 |
| `test-ccb-api-server-streaming.mjs` | ✅ `handleWsControl()` |
| 长连接外部 client | 必须自行回复，否则约 60s（下一 ping tick）内断开 |

---

## 4. 刻意保留的行为（I-2 / I-3 / I-4 / I-5）

### I-2 — MCP 120s 超时下限

`createRuntime({ enableMcp: true })` 且 `timeoutMs < 120000` 时提升至 120s：双 MCP 冷启动 + 多轮 agent 需要更长 HTTP 空闲窗口（与 B-04 R-B04-2 smoke 120s 一致）。

### I-3 — MCP exit 不接 AbortRegistry

B-03 §3.2 表：MCP `tools/call` in-flight **不**随 `runtime.abort` 中断；子进程 exit 仅 reject pending RPC，不 kill 已提交的 tool 或 abort turn generator。

### I-4 — DELETE abort 竞态

`DELETE` 触发 `runtime.abort` 后立即 `sessionManager.delete`；同一 session 上并发的 `POST /messages` 仍可能完成并返回 200。调用方应先发 cancel 或等 turn 结束再删 session。

### I-5 — API 超时事件类型

`AgentLoop` 内 `asAbortEvent` 对 **HTTP 超时** yield `{ type: 'error' }`；**用户 cancel** yield `{ type: 'turn_aborted' }`。B-04b.B 验收针对后者。

---

## 5. 验收

| ID | 验证 | 通过条件 | 状态 |
|----|------|----------|------|
| B-04c.A | `bun scripts/build-ccb-api-server.mjs` | 构建 OK | ✅ |
| B-04c.B | `bun test-ccb-api-server-streaming.mjs` | `[smoke] PASS stream+cancel` | ✅ 2026-06-11 |
| B-04c.C | code-review | ws pong 逻辑无 healthy-client 误杀；smoke 已回 pong | ✅ |
| B-04c.D | `node --check` | 改动测试文件语法 OK | ✅ |

---

## 6. 完成定义 (DoD)

```text
[x] ws.js: PING_INTERVAL_MS=30000, PONG_TIMEOUT_MS=60000
[x] I-2/I-3/I-4 注释落盘
[x] I-6 dead import 清理
[x] I-7 cancel 诊断 + smoke pong 回复
[x] dist/chunks/ccb-api-server.js 重建
[ ] git commit（待用户要求）
```

---

## 7. 完成承诺

本修补不单独发 promise；归入 B-04 维护：

```text
<promise>B04_CCB_API_SERVER_OK</promise>           // 仍有效
<promise>B04_CCB_API_SERVER_STREAMING_OK</promise> // 仍有效
```

Route B 全闭环仍依赖 [B-06b 人工 E2E](./B-06b-aionui-registry-e2e.md) → `PRD_ROUTE_B_COMPLETE`。
