# Research — WeCom 截图后 `mode: yolo` 不可选（2026-07-12）

> **Attached to:** `07-11-knowledge-vs-price-library-routing`（用户要求「添加到现有 task 探索」）  
> **Ownership note:** **不是**知识库/价格库路由缺陷；主归属应为 `07-01-aionui-full-auto-permission-sync`（mode sync）+ WeCom 会话创建路径。本文件仅作相邻 incident 落盘。

## Symptom (user screenshot)

1. 企微截图 PNG 发进会话。
2. Agent 回复：自称「没有读取图片的能力」。
3. 随后 UI：**应用处理失败** / `AIONUI_INTERNAL_ERROR`  
   **Message:** `Value 'yolo' is not selectable for config option 'mode'`（可重试）。

## Two stacked issues

| # | Issue | Layer |
|---|-------|-------|
| A | Claude/CCB 会话被 `setMode('yolo')`，但可选值不含 `yolo` | AionUI preferred mode → AionCore config-options |
| B | Agent 否认读图（与 `quotation-agent` L1「可直接读图」冲突） | Agent/WeCom 入站 / 模型能力 / 错误 agent |

Issue A **阻塞发送链**（07-01 send gate：ensure → assert → throw → `AIONUI_INTERNAL_ERROR`）。Issue B 可能是委派错 agent、WeCom 未注入图片、或模型无 vision。

## Root cause (Issue A) — high confidence

Claude ACP modes（`agentModes.ts`）:

```text
default | acceptEdits | plan | bypassPermissions | dontAsk
```

「全自动 / YOLO」对 **claude** 的正确 **value** 是 `bypassPermissions`（label 才叫 YOLO）。

```ts
// aionui-src/.../common/types/agent/agentModes.ts
FULL_AUTO_MODE.claude = 'bypassPermissions'
getFullAutoMode(undefined) → 默认回落 'yolo'  // 危险
```

AionCore 校验：

```text
aionui-ai-agent/.../acp/agent.rs
"Value '{value}' is not selectable for config option '{option_id}'"
```

发送前 `ensureCcbSessionPreferredMode` → `acpAdapterSetMode(conversation_id, preferredMode)`  
若 store / `extra.session_mode` / 助手默认权限仍是字面量 **`yolo`**（非 Claude 可选项）→ 精确命中本错误。

```text
企微/会话 seed session_mode 或 preferredMode = "yolo"
        │
        ▼
ensureCcbSessionPreferredMode(preferredMode="yolo")
        │
        ▼
PUT config-options mode=yolo
        │
        ▼
Claude selectable 无 yolo → AionCore reject
        │
        ▼
assertCcbSessionPreferredModeApplied → throw
        │
        ▼
AIONUI_INTERNAL_ERROR（用户可见）
```

历史相近：[`07-01/.../route-not-found-config-options-2026-07-02.md`](../07-01-aionui-full-auto-permission-sync/research/route-not-found-config-options-2026-07-02.md)（当时是 legacy `/mode` 404）；本次是 **value 映射** 错误，不是路由缺失。

## Likely seed sources (to confirm in impl)

| Source | Risk |
|--------|------|
| `getFullAutoMode(undefined)` → `'yolo'` | backend 未识别时 |
| Assistant `permission.value: 'yolo'` / Guid 默认 | 未走 `getFullAutoMode('claude')` |
| WeCom / extension 创建会话 `session_mode: yolo` | 跨后端字面量 |
| i18n「全自动」↔ UI 写死 value `yolo` | 与 Claude `bypassPermissions` 脱节 |
| `conversationContinuity` seed `extra.session_mode` 旧值 | 恢复会话带回 yolo |

## Issue B — 读图（待证实）

- L1：`quotation-agent.md` §图片 — **禁止**说无法读图。
- 若主入口 / WeCom 绑定 orchestrator：orchestrator **不读业务图**、只委派 — 可能误说「我不能读图」。
- 若图片未进 ACP messages（WeCom 只传文件名）：模型确实看不到像素。

需下轮：该会话 `agent_id`、消息里是否有 image part、是否企微入站。

## Recommended next task (not this KB task)

| Option | When |
|--------|------|
| **Extend `07-01-aionui-full-auto-permission-sync`** | Mode alias：`yolo` → backend `yolo_id` / `getFullAutoMode(backend)` before setMode；RED test setMode yolo on claude |
| **WeCom follow-on on `07-05-wecom-channel-integration`** | 入站图片 part + 默认 agent + session_mode seed |
| **Do not expand KB routing AC** | 与 `WANd.ROUTING.KB_*` 无关 |

## Provisional contracts (if spun to 07-01)

| ID | Behavior |
|----|----------|
| `WANd.MODE.ALIAS.001` | UI/legacy `yolo` must map to backend-selectable id (`bypassPermissions` for claude) before config-options write |
| `WANd.MODE.SEND_GATE.001` | setMode failure still blocks send with actionable message（已有 gate；修 alias 后不再因 yolo 误伤） |

## Explore verdict

- **Scenario:** C（mode sync bug）+ 可能 WeCom 媒体路径；**E 本轮仅探索**。
- **Not in scope for** `07-11-knowledge-vs-price-library-routing` implementation.
- **User action:** 确认是否新建/续开 `07-01` execution plan 修 `yolo`→`bypassPermissions` 映射；企微读图另开或并入 `07-05`。

## Skills invoked (this explore)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-plan-execution / Scenario E | Read: | explore only；挂现有 task research |
| systematic-debugging Phase 1 | Read: | error string → AionCore agent.rs + Claude mode list |
| chat-acp-flow §3.5 | Read: | ensure/assert send gate |
| aionui agentModes / getFullAutoMode | Read: | claude=bypassPermissions；fallback yolo |
