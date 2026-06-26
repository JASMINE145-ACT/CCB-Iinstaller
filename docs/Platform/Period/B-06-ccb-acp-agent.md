# B-06: ccb-acp-agent — ACP stdio adapter + runtime

**状态**: v0.1 ✅ Phase 3.0 完成（mock client）
**日期**: 2026-06-12
**周期**: Period-06 (B 路线第六个子任务)
**工期**: 2～3 周（含 mock client；AionUI E2E 另计）
**前置依赖**: B-01 ✅ ~ B-05 ✅

---

## 1. 目标

新建 `ccb-acp-agent`：ACP stdio JSON-RPC adapter，**只**调 `ccb-runtime`，不调用 SDK `query()`。

| 层级 | 模块 |
|------|------|
| 入口 | `cli.js --ccb-acp` |
| Adapter | `dist/chunks/ccb-acp-agent.js` |
| 大脑 | `ccb-runtime` |

---

## 2. MVP ACP 方法（P0）

| 方法 | 行为 |
|------|------|
| `initialize` | 返回 capabilities（对齐 golden shape） |
| `session/new` | 创建 sessionId + modes/models |
| `prompt` | `runtime.runTurn({ stream:true })` → `sessionUpdate` |
| `session/cancel` | `runtime.abort(sessionId)` |
| `authenticate` | gateway stub / noop |

---

## 3. 验收

| ID | 验证 | 通过条件 |
|----|------|----------|
| B-06.A | 静态门禁 | 无 SDK query / 无 duplicated loop | ✅ |
| B-06.B | `test-acp-agent-mock-client.mjs` | initialize + session/new + prompt → `stopReason=end_turn` + ≥1 chunk | ✅ |
| B-06.C | runtime 回归 | `test-runtime-mcp.mjs` PASS | ✅（B-03 已验） |

AionUI E2E → B-06b / `CCB_RUNTIME_ACP_E2E_OK`（非本 spec 首版硬门）

---

## 5. DoD

```text
[x] src/ccb-acp-agent/ + dist/chunks/ccb-acp-agent.js
[x] cli.js --ccb-acp fast-path
[x] test-acp-agent-mock-client.mjs PASS
[x] 静态门禁（grep：无 SDK query / duplicated loop）
[ ] AionUI registry 接入（B-06b）→ [spec](./B-06b-aionui-registry-e2e.md) ✅ mock PASS
[ ] git commit（待用户要求）
```

---

## 6. 完成承诺

```text
<promise>CCB_ACP_MOCK_OK</promise>
```

Route B 全闭环（含 AionUI registry）→ `PRD_ROUTE_B_COMPLETE` / `CCB_RUNTIME_ACP_E2E_OK`
