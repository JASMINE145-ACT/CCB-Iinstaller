# Agent 注意力通知 — Cursor 式 Toast + 侧边栏角标

## Goal

当用户**不在某会话页面**时，若该会话 Agent **需要权限确认**或**已停止回答**（本轮 turn 结束），AionUI 应像 Cursor 一样给出可发现的注意力信号：

1. **系统 Toast**（Windows/macOS 原生通知，可点击跳回会话）
2. **ChatHistory 侧边栏角标**（同 Cron `unread` 红点模式）

使 CCB 单 Agent 会话（如万鼎报价专家 / learn-by-data 长跑）在后台仍「UI 反映现实」。

## Product decisions（用户确认 2026-07-01）

| 问题 | 决策 |
|------|------|
| **什么时候弹？** | **只要不在该会话就弹** — 与 Cron 一致：`activeConversationId !== conversation_id`。不要求窗口失焦/最小化。 |
| **「任务完成」定义** | **Agent 停止回答** — ACP/stream 的 turn 结束信号（如 `finish` / agent 本轮不再 streaming）。 |
| **权限 vs 完成优先级** | **一样** — 同等对待；角标可合并计数，无需权限压过完成。 |

## Problem

Explore 结论（2026-07-01）：

| 能力 | 现状 |
|------|------|
| `notificationBridge.showNotification()` | ✅ 已实现，**几乎无调用方** |
| `system.notificationEnabled` 设置 | ✅ 已有 |
| `useNotificationClick` 点击跳转 | ✅ renderer 已注册，**main 未 emit `notification.clicked`** |
| `confirmation.add` / `remove` WS 事件 | ✅ 已有 |
| Team tab ‼️ / `useSiderTeamBadges` | ✅ 仅 Team 模式 |
| `ChatHistory` 会话角标 | ❌ 仅有 `CronJobIndicator`，无 permission/complete |
| 任务栏 overlay / dock badge | ❌ 未实现 |

用户切到其他会话或 Guid 时，learn-by-data 等长跑 Agent 完成或等待权限时**无感知**。

## Scope

### In scope

#### P0 — 事件与 Toast

1. **Attention 协调层**（main 或 renderer 单点，择一并在 PRD 实现说明）订阅：
   - `confirmation.add` → 类型 `needs_permission`
   - Agent turn 结束（stream `finish` 或等效「停止回答」）→ 类型 `turn_complete`
2. **触发条件**（硬约束）：
   ```text
   IF event.conversation_id !== activeConversationId
   AND system.notificationEnabled !== false
   THEN showNotification({ title, body, conversation_id })
   ```
3. **通知点击闭环**：main process `Notification.on('click')` → `ipcBridge.notification.clicked.emit({ conversation_id })`（已有 `useNotificationClick` 消费）。
4. **文案**（i18n）示例：
   - 权限：`{agentOrTitle} 需要确认：{description}`
   - 完成：`{conversationName} — Agent 已回复`

#### P1 — ChatHistory 角标（Cron 模式复用）

5. **Attention unread store**（可参考 `useCronJobsMap` + `aionui_cron_unread`）：
   - Key: `conversation_id`
   - Value: `{ permission?: number, complete?: number }` 或合并 count（用户要求同等优先级 → **合并 count 即可**）
6. **`ConversationAttentionIndicator`**（或扩展 `CronJobIndicator` 模式）在 `ChatHistory` 每条会话名旁显示。
7. **清除规则**：
   - 用户 navigate 到该会话（`useParams().id === conversation_id`）→ `markAsRead`
   - `confirmation.remove` 且该会话无其他 pending → 减 permission 计数
8. **进入会话不重复 Toast**：已在该会话时不弹 Toast、不增 unread。

#### P2 — 可选（本 task 可 defer 到 follow-up）

9. macOS `app.dock.setBadgeCount` / Windows `flashFrame` 或 overlay icon — 文档化于 Non-Goals 或 Phase C。

### Out of scope

- 改变权限卡片 `MessagePermission` / `MessageToolGroup` 会话内 UI
- Team 模式已有 ‼️ 逻辑重写（可复用事件，不破坏）
- 桌面宠物 `petEventBridge` 行为变更
- 任务栏 overlay（P2，可另开 task）
- CCB backend 新事件（仅用现有 WS）

## Architecture sketch

```
                    confirmation.add          stream finish
                           │                        │
                           └──────────┬─────────────┘
                                      ▼
                          ┌───────────────────────┐
                          │  AttentionCoordinator │
                          │  activeConv !== id ?  │
                          └───────────┬───────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            showNotification    unread store      (P2 badge)
                    │                 │
                    ▼                 ▼
            notification.clicked   ChatHistory 角标
                    │
                    ▼
            navigate /conversation/:id
```

**参考实现**：`useCronJobsMap`（`aionui-src/.../cron/useCronJobs.ts`）的 `unreadConversations` + `markAsRead` + `CronJobIndicator`。

## Acceptance criteria

1. **权限 — 后台会话**：会话 A 跑 learn-by-data，用户切到会话 B → A 出现 `confirmation.add` → **Toast 弹出**且 **A 在 ChatHistory 有角标**；点击 Toast 进入 A。
2. **完成 — 后台会话**：会话 A Agent 停止回答（turn finish），用户在 B → **Toast** + **角标**；进入 A 后角标清除。
3. **前台同会话不打扰**：用户正在会话 A，A 内权限/完成 → **无 Toast、无 unread 增量**。
4. **设置尊重**：关闭 `system.notificationEnabled` → 无 Toast（角标策略：仍显示 in-app 角标，或同设置一并关闭 — **实现时默认 Toast 关、角标仍开**，与 Cron 分离）。
5. **单 Agent CCB**：万鼎报价专家单会话路径可用（不依赖 Team）。
6. **测试**：Attention 触发条件单测；可选 dom test ChatHistory 角标；`bunx tsc --noEmit` 无新增错误。

## Smoke checklist

```text
[ ] Guid 新建万鼎报价专家 → 发「按数据学习」→ 切到其他会话
[ ] Agent 需要 tool 权限时 → Toast + 侧边栏该会话角标
[ ] 点击 Toast → 跳回正确会话
[ ] Agent 停止回答 → Toast + 角标（若当时不在该会话）
[ ] 回到该会话 → 角标清除
[ ] 设置关闭通知 → 无 Toast
[ ] Team 模式 regression：Team tab ‼️ 仍正常
```

## Implementation phases

| Phase | 内容 | Priority |
|-------|------|----------|
| A | AttentionCoordinator + Toast + click 闭环 | P0 |
| B | unread store + ChatHistory 角标 | P1 |
| C | 任务栏 overlay（可选 defer） | P2 |

## Spec touch

- `.trellis/spec/frontend/index.md` 或新建 `notification-attention.md` — 注意力通知契约（触发条件、与 Cron 对齐）
- `.trellis/spec/integration/agents-unified-model.md` — 可选补「后台 Agent 可观测性」一行

## Related

| Item | Relationship |
|------|--------------|
| Explore 2026-07-01（Cursor 式通知） | 本 task 来源 |
| `07-01-aionui-full-auto-permission-sync` | 全自动模式下 permission Toast 应减少；本 task 仍服务 default 模式 |
| `07-01-quotation-skills-ui-quick` | learn-by-data 长跑场景受益 |
| Cron `useCronJobsMap` | 角标/unread 模式参考 |

## Priority

**P1** — 不阻塞功能，显著改善后台 Agent 可观测性与 Cursor  parity。
