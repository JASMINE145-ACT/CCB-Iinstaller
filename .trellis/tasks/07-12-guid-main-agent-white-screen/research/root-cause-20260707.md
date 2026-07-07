# Root cause — Guid 主 agent 会话页白屏 (2026-07-07)

## Symptom

Guid 默认 orchestrator 发消息后进入会话页：**侧栏/标题可见，中间聊天区白屏**；`POST /api/conversations/{id}/messages` 从未发出。

## CDP evidence

Page: `http://localhost:5173/#/conversation/0c256d1b`

```
SyntaxError: The requested module '.../ipcBridge.ts' does not provide an export named 'ipcBridge'
  at conversationContinuity.ts:9
```

DOM probe: `bodyTextLen=0`, `chatLayout=false`, `textarea=true`.

## Root cause

**07-11** 新增 `conversationContinuity.ts`（及 `warmupConversation.ts` 引用）使用了错误 import：

```typescript
// WRONG — ipcBridge.ts has no named export `ipcBridge`
import { ipcBridge, ccbModelService } from '@/common/adapter/ipcBridge';
```

Correct pattern (see `@/common/index.ts`):

```typescript
import { ipcBridge } from '@/common';
import { ccbModelService } from '@/common/adapter/ipcBridge';
```

## Failure chain

```
useAcpInitialMessage → warmupConversation → conversationContinuity (module load 💥)
→ AcpChat/MessageList 未 mount → 白屏 → sendMessage 未调用
```

## Fix

- `packages/desktop/src/common/config/conversationContinuity.ts`
- `packages/desktop/src/renderer/pages/conversation/utils/warmupConversation.ts`

## Related

- 07-12 handoff fix (`acpPendingInitialMessage`) 仍有效，但被此 import 错误阻断在 warmup 之前。
- 非 learn-by-data / knowledge gate 问题。
