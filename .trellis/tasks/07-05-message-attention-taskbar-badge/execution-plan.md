# Execution Plan — `07-05-message-attention-taskbar-badge`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Approved** | 2026-07-05 |
| **Completed** | 2026-07-06 |
| **Active phase** | — |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 — Product lock | done | User: 会话数 / Windows / 07-01 rules |
| P1 — Taskbar badge (Electron main) | done | `appBadgeBridge.ts` + `useTaskbarAttentionBadge.ts` |
| P2 — Unread aggregator | done | `getAttentionUnreadConversationCount` |
| P2b — White screen hotfix | done | export `subscribeConversationListSync` |
| P3 — Spec + smoke | done | User manual smoke PASS 2026-07-06 |
| P4 — Optional polish | deferred | `flashFrame`, tray badge, sound |

---

## Task: 07-05 — 消息提醒（Cursor 式）+ 任务栏未读数

**Repos:** `aionui-src` (primary) · `claude-code-best` (spec/docs only)

**Spec entry:**
- `.trellis/spec/frontend/conversation-attention-notifications.md` (existing P0/P1)
- `.trellis/spec/frontend/index.md` (index link)

**Related completed task:** `.trellis/tasks/07-01-agent-attention-notifications` (2026-07-01)

---

## What already exists (inventory — 2026-07-05)

| Capability | Status | Location |
|------------|--------|----------|
| OS Toast（任务完成 / 权限等待） | ✅ 已实现 | `useConversationAttentionNotifications.ts` → `notificationBridge.ts` |
| 点击 Toast 跳转会话 | ✅ 已实现 | `useNotificationClick.ts` + main `Notification.on('click')` |
| 侧边栏会话蓝点 | ✅ 已实现 | `useConversationListSync.ts` + `ConversationRow.tsx` |
| 设置开关「系统通知」 | ✅ 已实现 | `system.notificationEnabled` |
| 触发规则（不在该会话才提醒） | ✅ 已实现 | `conversationAttention.ts` + activeConversationId |
| **任务栏 / Dock 数字角标 1/2/3** | ❌ **未实现** | PRD P2 deferred；代码库无 `setBadgeCount` / `setOverlayIcon` |
| 窗口闪烁 `flashFrame` | ❌ 未实现 | — |
| Tray 托盘角标 | ❌ 未实现 | tray 已有，无 unread overlay |

**Conclusion:** 用户描述的「弹窗 + 点击跳转」**已有基础**；「底部软件图标显示未读数」是**增量工作**，可复用现有 attention unread store，不必重做 Toast 链路。

---

## Product questions (must lock before P1)

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| Q1 | 角标计数包含哪些来源？ | A) 仅 Agent 注意力（permission ∪ completion） · B) + Cron 未读 · C) + Work Tasks pending · D) 全部未读汇总 | **A** 先对齐 Cursor agent 场景；B/C 可 Phase 2 |
| Q2 | 计数语义 | 按**会话数**（3 个会话有未读 → 3）vs 按**事件数**（5 次完成 → 5） | **按会话数**（与侧边栏蓝点一致） |
| Q3 | 平台 | Windows only · macOS dock · 两者 | **两者**（Electron API 分平台） |
| Q4 | Toast 关闭时角标是否仍更新？ | 是（与现有 spec 一致） / 否 | **是** — 已有 spec 锁定 |
| Q5 | 用户进入会话后 | 清除该会话 unread → 角标减 1 | 复用现有 `markAsRead` 路径 |
| Q6 | 窗口聚焦 / 最小化 | 仅后台才角标+1 · 任何「不在该会话」都 +1 | 保持与 07-01 一致：**不在该会话即 +1**（不要求失焦） |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Product clarification | Main session + user | available | — |
| Spec read | `trellis-before-dev` → frontend | available | Read `conversation-attention-notifications.md` |
| Implementation | `trellis-implement` / inline TDD | available | Main agent after approval |
| Review | `code-reviewer` agent | available | Inline review |
| Test | vitest unit + manual UI smoke | available | `tests/unit/renderer/conversationAttention.test.ts` pattern |
| Spec update | `trellis-update-spec` | available | Edit spec md after PASS |
| Trellis finish | `/trellis:finish-work` | available | Manual journal |

---

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| User approves plan + answers Q1–Q6 | — | `Status: approved` |
| `task.py start 07-05-message-attention-taskbar-badge` | task.py | in_progress |
| Read spec | `trellis-before-dev` | frontend paths noted |
| Confirm 07-01 smoke still passes | manual | baseline OK |

---

## Phase 1 — Unread count aggregator (renderer → main)

| Field | Value |
|-------|-------|
| Priority | P0 |
| Risk | `ui`, `concurrency` |
| Files | `useConversationListSync.ts`, new `useTaskbarUnreadBadge.ts` (or extend attention hook), `ipcBridge` type |
| Required output | Derived `totalAttentionUnreadCount = permissionUnread ∪ completionUnread` (unique conversation ids) |
| Profile | UI |

**Design:**
- Subscribe to existing store snapshot (`permissionUnreadConversationIds`, `completionUnreadConversationIds`).
- Compute `count = size of union of both sets`.
- IPC `app-badge:set-count` (or reuse notification bridge module) → main process.

**TDD:**

| Level | RED | GREEN |
|-------|-----|-------|
| Unit | `getAttentionUnreadConversationCount(sets)` in `conversationAttention.test.ts` | `pnpm test -- conversationAttention` |

---

## Phase 2 — Main process taskbar / dock API

| Field | Value |
|-------|-------|
| Priority | P0 |
| Risk | `ui`, `cross-repo` (aionui only) |
| Files | `process/bridge/notificationBridge.ts` or new `appBadgeBridge.ts`, `process/bridge/index.ts` |
| Required output | Windows: `BrowserWindow.setOverlayIcon` or `app.setBadgeCount` (Electron 28+: prefer `setBadgeCount` on supported platforms); macOS: `app.dock.setBadgeCount(count)` |
| Profile | UI |

**Platform notes:**

| OS | Electron API | Display |
|----|--------------|---------|
| macOS | `app.dock.setBadgeCount(n)` | Dock 红色数字 |
| Windows | `app.setBadgeCount(n)` (Electron ≥8, Windows 10+) 或 overlay icon 生成 | 任务栏图标角标（如 Cursor） |
| Linux | Often no-op or Unity badge | Document as best-effort |

**Edge cases:**
- `count === 0` → clear badge (`setBadgeCount('')` / `setOverlayIcon(null)`)
- App hidden to tray → badge still visible on taskbar icon (desired)
- Multiple windows → set on `app` level, not per-window

---

## Phase 3 — Integration & settings

| Field | Value |
|-------|-------|
| Priority | P1 |
| Risk | `ui` |
| Files | `Layout.tsx` (register hook), optional `SystemModalContent` copy |
| Required output | Badge updates in sync with sidebar dots; no duplicate toast logic |

**Optional:** Setting `system.taskbarBadgeEnabled` (default true) — only if user wants toggle separate from toast.

---

## Phase 4 — Spec, smoke, docs

| Step | Output |
|------|--------|
| Update `conversation-attention-notifications.md` | Remove P2 defer; add file map + smoke rows for taskbar |
| Update `file-map.md` | `appBadgeBridge.ts` entry |
| Manual smoke | See checklist below |

---

## TDD contract (summary)

| Workstream | Test level | RED evidence | GREEN command | Regression |
|------------|------------|--------------|---------------|------------|
| Unread count helper | unit | failing count union test | `pnpm test conversationAttention` | 07-01 attention rules |
| IPC badge bridge | unit/integration | mock `app.setBadgeCount` | vitest in process bridge tests if exist | badge clears on read |
| E2E taskbar | manual | N/A | UI smoke checklist | — |

---

## Verification profile and gate

**Selected:** UI

1. `code-reviewer` agent PASS
2. `pnpm test` (conversationAttention + any new bridge tests)
3. Manual UI smoke (Windows taskbar + macOS if available)
4. `trellis-update-spec` → `conversation-attention-notifications.md`
5. `implement.jsonl` + `check.jsonl`
6. `/trellis:finish-work` — **no git commit unless user asks**

---

## Parallelization

Not applicable (single repo, single vertical slice). **Do not** parallelize renderer store changes with main bridge without serial merge at IPC contract.

---

## Manual steps (human)

```text
[ ] Dev: ccb-installer/scripts/start-dev-full.ps1
[ ] Session A agent running; switch to Guid or session B
[ ] A completes → Toast + sidebar dot + taskbar shows "1"
[ ] Session C also completes → taskbar shows "2"
[ ] Open session A → taskbar decrements to "1"
[ ] All read → taskbar badge cleared
[ ] Settings → disable notifications → no toast; taskbar badge STILL updates (if Q4 = yes)
[ ] Packaged exe smoke (optional): same on CCB-Wanding build
```

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Windows badge API unavailable on target Electron | Phase 2 — fallback overlay icon PNG | yes if UX changes |
| User expands scope to Work Tasks / Cron | Phase 0 — new aggregator design | yes |
| Double-count from stream + turn.completed | Phase 1 — reuse dedup sets | no |

---

## Defer / out of scope (initial slice)

- Tray icon separate badge
- `flashFrame` on completion
- Sound / haptic
- Work Tasks / Cron / Team badge rollup (unless Q1 = D)
- In-app floating toast (non-OS Notification)
- CCB backend new events

---

## Architecture (target)

```
permissionUnread ∪ completionUnread  (existing store)
              │
              ▼
    useTaskbarUnreadBadge (new)
              │ IPC app-badge:set-count
              ▼
    appBadgeBridge (main)
      ├─ macOS: app.dock.setBadgeCount
      └─ win32: app.setBadgeCount / setOverlayIcon fallback
```

Existing toast path unchanged.
