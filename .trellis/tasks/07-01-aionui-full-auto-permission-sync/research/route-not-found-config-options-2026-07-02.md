# Incident — send blocked: `Route not found.` (2026-07-02)

## Symptom

万鼎报价专家 / 按数据学习会话发送首条或后续消息时，UI 显示：

```text
应用处理失败
错误码: AIONUI_INTERNAL_ERROR
Message: Route not found.
```

可重试；重试仍失败。与 org knowledge 401 **无关**。

## Evidence (dev log `start-dev-full`, conversation `b9b26685`)

```text
POST /api/conversations/b9b26685/warmup → 200  (Agent warmed up)
GET  /api/conversations/b9b26685/mode    → 404
local_send_failed reason: 'Route not found.'
```

同会话另有 `GET .../model → 404`（非致命，UI fallback）。

## Root cause

| Layer | Mechanism |
|-------|-----------|
| **aioncore 0.1.29** | ACP mode/model 迁移至 `GET/PUT /api/conversations/{id}/config-options[/{option_id}]`；**legacy** `/mode`、`/model` 路由已移除 |
| **AionUI `ipcBridge.acpConversation`** | `getMode` / `setMode` / `getModel` / `setModel` 仍直连 legacy 路径 |
| **`acpConfigOptionsAdapter.ts`** | 已实现 dual-path（config-options → legacy fallback），但 **未被** `ensureCcbSessionPreferredMode` / `ensureCcbSessionPreferredModel` 使用 |
| **07-01 send gate** | `AcpSendBox.executeCommand` → `ensureCcbSessionPreferredMode` → `assertCcbSessionPreferredModeApplied`；`getMode` 404 被当作失败 → **阻止 `sendMessage`** |

```
发送链（失败点）
──────────────────
warmup OK
    │
    ▼
ensureCcbSessionPreferredMode
    │
    ├─ ipcBridge.getMode → GET /mode → 404 "Route not found."
    │
    ▼
assertCcbSessionPreferredModeApplied → throw
    │
    ▼
local_send_failed（用户看到「应用处理失败」）
```

## Fix (2026-07-02, `aionui-src`)

| File | Change |
|------|--------|
| `ensureCcbSessionPreferredMode.ts` | `acpAdapterGetMode` / `acpAdapterSetMode` |
| `ensureCcbSessionPreferredModel.ts` | `acpAdapterGetModel` / `acpAdapterSetModel` |
| `tests/unit/common-config/ensureCcbSessionPreferred*.test.ts` | mock adapter 而非 ipcBridge |

**Verify:** `bunx vitest run tests/unit/common-config/ensureCcbSessionPreferred*.test.ts` → 7/7 pass.

**User action after fix:** 刷新或重启 dev；**新开 Guid 会话**再发送（旧会话可能已卡在失败状态）。

## Wrong vs correct triage

| Wrong | Correct |
|-------|---------|
| 当作 org JWT / `append_business_rule` 401 | 查 dev log 是否在 warmup 后立即 `GET .../mode` 404 |
| 重登 org SSO | aioncore 路由契约问题，非 token |
| 只 sync vendor python | 修 `aionui-src` renderer/common 层 |

## Follow-up (optional)

- 将 `ipcBridge.acpConversation.getMode/setMode/getModel/setModel` 全面委托给 `acpConfigOptionsAdapter`（避免其他调用点再踩 legacy 404）
- `dev-sync-playbook`：aioncore 0.1.29+ 与 AionUI adapter 版本对齐检查

## Cross-refs

- Task [`07-01`](../prd.md) — 全自动 mode sync 发送前强校验
- Spec [`.trellis/spec/frontend/chat-acp-flow.md`](../../../spec/frontend/chat-acp-flow.md) §3.5
- Adapter: `aionui-src/packages/desktop/src/common/adapter/acpConfigOptionsAdapter.ts`
- aioncore routes: `AionCore/crates/aionui-conversation/src/routes_aux.rs`
