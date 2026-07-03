# Conversation attention notifications (Cursor-style)

> **Task:** `.trellis/tasks/07-01-agent-attention-notifications`  
> **Status:** Implemented 2026-07-01 (aionui-src)  
> **Integration pointer:** `../integration/agents-unified-model.md` § learn-by-data UI observability

When the user is **not on a conversation route** (`/conversation/:id`), background agent activity must be observable outside the chat stream:

1. **OS toast** — Electron `Notification` (respects `system.notificationEnabled`)
2. **Sidebar blue dot** — on `GroupedHistory` conversation rows (permission ∪ completion)

This is **UI truth** for long-running CCB sessions (e.g. 万鼎报价 / `learn-by-data`) when the user switches to Guid or another chat.

---

## Product contract (locked 2026-07-01)

| Decision | Rule |
|----------|------|
| **When to notify** | `activeConversationId !== event.conversation_id` — same as Cron unread. **No** window-focus requirement. On `/guid`, `/`, `/team/:id`, etc. → `activeConversationId` is `null` → notify. |
| **Task complete** | Agent **stops responding** for the turn: stream terminal (`finish`, `error`, `agent_status` disconnected/error) or `turn.completed` with terminal state (`ai_waiting_input`, `error`, `stopped`). |
| **Permission** | `confirmation.add` WS event. |
| **Priority** | Permission and completion are **equal** — one merged blue dot (`hasAttentionUnread`), not separate badges. |
| **Toast vs badge** | Toast gated by **Settings → Notifications**. Badge updates **independently** (in-app attention still visible when toast is off). |
| **Clear badge** | User navigates to `/conversation/:id` for that session → clear both permission and completion unread. |
| **Click toast** | Main `Notification.on('click')` → `notification.clicked` → `useNotificationClick` → `navigate(/conversation/:id)`. |

### Out of scope (defer)

- macOS dock badge / Windows taskbar overlay (`P2`)
- Changing in-conversation permission cards (`MessagePermission`, `MessageToolGroup`)
- New CCB backend events (reuse existing WS only)
- Team tab ‼️ rewrite (Team badges remain; this feature covers **single-agent** sidebar)

---

## Architecture

```
confirmation.add          responseStream terminal / turn.completed
        │                              │
        └──────────────┬───────────────┘
                       ▼
         useConversationListSync (module store)
           • activeConversationIdState
           • permissionUnreadConversationIds (+ pending count map)
           • completionUnreadConversationIds
           • subscribeConversationAttentionEvents()
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
  useConversationAttentionNotifications   ConversationRow blue dot
  (Layout) → notification.show IPC        (hasAttentionUnread)
           │
           ▼
  notificationBridge.ts → Notification + click emit
```

### Active conversation ID (critical)

**Do not** use raw `useParams().id` — `/team/:id` shares the param name and breaks suppression.

Use `parseActiveConversationIdFromPath(pathname)`:

- `/conversation/abc` → `abc`
- everything else → `null`

**Cold start:** `initializeConversationListSyncStore()` runs **synchronously** in `ConversationHistoryProvider` render and seeds `activeConversationIdState` from `window.location.pathname` to avoid false toasts before the first `useEffect`.

---

## File map (aionui-src)

Paths relative to `packages/desktop/src/`.

| Concern | File |
|---------|------|
| Attention store + IPC subscriptions | `renderer/pages/conversation/GroupedHistory/hooks/useConversationListSync.ts` |
| Trigger helper + path parse | `renderer/pages/conversation/GroupedHistory/utils/conversationAttention.ts` |
| OS toast hook | `renderer/hooks/system/useConversationAttentionNotifications.ts` |
| Toast click → navigate | `renderer/hooks/system/useNotificationClick.ts` |
| Register toast hook | `renderer/components/layout/Layout.tsx` |
| Sync init on boot | `renderer/hooks/context/ConversationHistoryContext.tsx` |
| Clear unread on enter | `renderer/pages/conversation/GroupedHistory/hooks/useConversations.ts` |
| Sidebar blue dot | `renderer/pages/conversation/GroupedHistory/ConversationRow.tsx` |
| Main-process notification + click | `process/bridge/notificationBridge.ts` |
| i18n | `renderer/services/i18n/locales/{en-US,zh-CN}/conversation.json` → `attention.*` |
| Unit tests | `tests/unit/renderer/conversationAttention.test.ts` |

### Related (do not duplicate logic)

| Surface | Existing mechanism |
|---------|-------------------|
| Cron job unread (red alarm icon) | `renderer/pages/cron/useCronJobs.ts` → `CronJobIndicator` |
| Team permission ‼️ | `renderer/pages/team/hooks/useSiderTeamBadges.ts` |
| In-chat permission UI | `Messages/components/MessagePermission.tsx`, `MessageToolGroup.tsx` |

Cron leading icon takes visual precedence when both cron and attention apply.

---

## Event → behavior matrix

| Event | Condition | Badge | Toast |
|-------|-----------|-------|-------|
| `confirmation.add` | not active conv | `permissionUnread` +1 | permission title/body |
| `confirmation.remove` | — | pending count −1; clear if 0 | — |
| `responseStream` terminal | was generating ∧ not active conv | `completionUnread` | completion (deduped) |
| `turn.completed` | terminal state ∧ not active conv | `completionUnread` | completion (deduped) |
| Same conv foreground | any | **no** | **no** |

**Completion toast dedup:** 3s window per `conversation_id` (`ATTENTION_COMPLETION_DEDUP_MS`) — avoids double fire from stream + `turn.completed`.

---

## Settings keys

| Key | Effect |
|-----|--------|
| `system.notificationEnabled` | When `false`, `showNotification()` no-ops; sidebar badge still updates |

Configured in **Settings → System → Notifications** (`SystemModalContent`).

---

## Smoke checklist

```text
[ ] Session A running; user on Guid or session B
[ ] A needs permission → toast + blue dot on A in sidebar
[ ] Click toast → lands on /conversation/A; dot clears
[ ] A agent finishes turn → toast + dot (if not on A)
[ ] User on A → no toast/dot increment for A events
[ ] Disable notifications in settings → no toast; dot still works
[ ] Direct load /conversation/A with pending events → no false toast (cold-start path)
```

**Dev restart required** after aionui-src changes: `ccb-installer/scripts/start-dev-full.ps1` (see `dev-test-ship.md`).

---

## Known gaps / follow-ups

| Gap | Notes |
|-----|-------|
| Permission arrives while user is on session, then leaves without resolving | No badge until next event (PRD-compliant; usability follow-up possible) |
| Error/disconnect stream treated as “completion” attention | Same copy as finish; confirm product intent if misleading |
| Taskbar overlay | `P2` — separate task if Cursor parity needed on Windows/macOS dock |
