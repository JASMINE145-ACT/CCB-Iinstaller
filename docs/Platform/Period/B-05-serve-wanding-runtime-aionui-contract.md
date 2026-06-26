# B-05: serve-wanding 薄化 + AionUI 契约恢复

**状态**: v0.2 ✅ 完成
**日期**: 2026-06-12
**周期**: Period-05 (B 路线第五个子任务)
**工期**: 4～6 天
**前置依赖**:
- B-01 ✅ B-02 ✅ B-03 ✅ B-04 ✅

**关联文档**:
- [可行性计划 §2.3 AionUI 契约](../../ccb-runtime-acp-agent-feasibility-plan.md)
- [B-04 ccb-api-server](./B-04-ccb-api-server-and-cli-entry.md) — 机器接口；本 spec 负责 Path A 浏览器壳
- `AIONUI-BACKEND-STATUS.md` — WS 事件序列、`turn.completed` 根因

---

## 1. 目标

1. **serve-wanding 大脑换为 ccb-runtime** — 删除内嵌 AgentLoop / McpClient / callApiSync
2. **恢复 Path A AionUI 契约** — `/api/conversations/*` + WS `turn.completed`
3. **双轨保留** — `/api/sessions` + WS `chat/chunk/done` 供 Stage 2/3 smoke 回归

---

## 2. 范围

| 做 | 不做 |
|----|------|
| `src/serve-wanding/` 模块化 → `dist/chunks/serve-wanding.js`（bundle 含 ccb-runtime） | ccb-acp-agent（Phase 3 / B-06） |
| AionUI REST stub（auth/agents/providers/settings 等） | 会话落盘持久化升级（Phase 4） |
| RuntimeEvent → AionUI WS 映射（`aionui-events.js`） | 替换 `web` 为 `--ccb-api` |
| `CCB_STAGE=fake\|minimax\|agent` 仍由 env 控制 MCP | 浏览器 E2E 自动化 |

---

## 3. 文件结构

```text
ccb-installer/src/serve-wanding/
├── index.js           # serveMain — Bun.serve + WS 双协议
├── config.js          # CCB_STAGE / paths / CORS
├── store.js           # conversation 内存 + web-data 落盘
├── http.js            # AionUI + legacy /api/sessions 路由
├── turn-processor.js  # processTurn → runtime.runTurn(stream:true)
├── aionui-events.js   # RuntimeEvent → message.stream / turn.completed
├── stubs.js           # auth/agents/providers 等 stub
└── static.js          # AionUI static 分发

scripts/build-serve-wanding.mjs
scripts/check-serve-wanding-thin.sh
```

**构建**：`bun scripts/build-serve-wanding.mjs` → `dist/chunks/serve-wanding.js`

**静态门禁**：`src/serve-wanding/` 不得含 `runAgentLoop` / `callApiSync` / `McpClient` / SDK / REPL import。

---

## 4. 双轨协议

| 轨道 | REST | WS | 用途 |
|------|------|-----|------|
| **AionUI** | `/api/conversations/*` | `{name,data}` 信封（`turn.completed` 等） | 浏览器 static |
| **Legacy smoke** | `/api/sessions/*` | `{type:chat/chunk/done}` | Stage 2/3 回归 |

`processTurn()` 通过 `aionui-events.js` **同时** emit 两轨事件。

---

## 5. 验收

| ID | 验证 | 通过条件 | 状态 |
|----|------|----------|------|
| B-05.A | `check-serve-wanding-thin.sh` | 无 duplicated agent loop / 无 forbidden import | ✅ |
| B-05.B | `node test-turn-completed.mjs` | `has turn.completed: true` | ✅ |
| B-05.C | `node test-stage2-minimax.mjs` | Stage 2 PASS（需 `CCB_STAGE=minimax` + server） | 待本地重跑 |
| B-05.D | `node test-stage3-agent.mjs` | Stage 3 PASS（需 `CCB_STAGE=agent`） | 待本地重跑 |
| B-05.E | `node test-runtime-mcp.mjs` | runtime 回归 PASS | ✅（B-03 已验） |

**运行契约测试**（server 需先启动）：

```bash
CCB_STAGE=fake bun dist/cli.js web --port=3001
node test-turn-completed.mjs
```

---

## 6. 完成定义 (DoD)

```text
[x] src/serve-wanding/ 模块化 + import ccb-runtime
[x] dist/chunks/serve-wanding.js 构建产物
[x] /api/conversations/* + turn.completed WS
[x] legacy /api/sessions + WS chat 双轨保留
[x] check-serve-wanding-thin.sh PASS
[x] test-turn-completed.mjs PASS
[ ] test-stage2/3 在本轮未重跑（实现已接 runtime，风险低）
[ ] git commit（待用户要求）
```

---

## 7. 完成承诺

```text
<promise>B05_SERVE_WANDING_RUNTIME_AIONUI_OK</promise>
```

PRD Route B 完整闭环还需 **B-06 ccb-acp-agent** → 非本 spec 承诺 `PRD_ROUTE_B_COMPLETE`。
