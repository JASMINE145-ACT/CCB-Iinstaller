# Journal — 任务栏角标 + 记忆页 UI + dev 白屏热修

**Date:** 2026-07-06  
**Repos:** `aionui-src` (implementation) · `claude-code-best` (spec/tasks)  
**Tasks:** `07-05-message-attention-taskbar-badge` · memory page UI (ad-hoc, no separate task dir before this journal)

---

## 1. Windows 任务栏未读角标（Cursor 式）

**Product lock (user 2026-07-05):**

- 按**会话数**计数（3 个未读会话 → 显示 3）
- **Windows only**（macOS dock 延后）
- 触发规则与 07-01 一致：不在该会话即标记 unread
- 角标独立于「系统通知」开关

**Implementation (`aionui-src`):**

| File | Change |
|------|--------|
| `utils/conversationAttention.ts` | `getAttentionUnreadConversationCount()` |
| `hooks/useConversationListSync.ts` | `getAttentionUnreadCountSnapshot()`；**export** `subscribeConversationListSync` |
| `process/bridge/appBadgeBridge.ts` | `app.setBadgeCount` (win32) |
| `common/adapter/ipcBridge.ts` | `appBadge.setCount` IPC |
| `hooks/system/useTaskbarAttentionBadge.ts` | renderer → main sync |
| `components/layout/Layout.tsx` | register hook |
| `tests/unit/renderer/conversationAttention.test.ts` | count union tests |

**Verification:**

- Code review: PASS
- Unit: `vitest run tests/unit/renderer/conversationAttention.test.ts` → 10/10
- Manual smoke: **pending** (user dev restart)

**Spec:** `.trellis/spec/frontend/conversation-attention-notifications.md` updated § taskbar (2026-07-05)

---

## 2. Dev 白屏热修（任务栏 hook 引入）

**Symptom:** Electron dev 窗口白屏；esbuild:

```text
No matching export in useConversationListSync.ts for import "subscribeConversationListSync"
```

**Cause:** `useTaskbarAttentionBadge.ts` imported non-exported store subscriber.

**Fix:** `const subscribeConversationListSync` → `export const subscribeConversationListSync`.

**Recovery:** `start-dev-full.ps1 -Clean -SkipBootstrap -SkipVendorSync -BuildAioncore:$false`；日志需见 `Renderer did-finish-load`.

---

## 3. 记忆页 UI 重做（ui-ux-pro-max）

**Scope:** Renderer-only polish for `#/memory` — no IPC/backend change.

**Design system:** ui-ux-pro-max — enterprise productivity, slate/blue accent, skeleton loading, empty states.

**Structure (`pages/memory/MemoryPage/`):**

| Component | Role |
|-----------|------|
| `MemoryPageShell.tsx` | Header + icon + subtitle + actions |
| `MemoryScopeTabs.tsx` | 个人 / 业务 segmented control |
| `MemoryFileSidebar.tsx` | File cards (icon, desc, mtime) |
| `MemoryEditorPanel.tsx` | Path bar, dirty dot, line count, monospace editor |
| `MemoryEmptyPanel.tsx` | Illustrative empty state |
| `memoryPageUtils.ts` | file kind, time format, line count |
| `index.tsx` | SWR + compose |

**i18n:** `locales/{zh-CN,en-US}/memory.json` — subtitle, file descriptions, empty hints; tab labels 个人/业务 (zh).

**View:** Renderer HMR or navigate to `/memory` in running dev.

---

## 4. Open / not in this session

| Item | Status |
|------|--------|
| Guid 首条消息丢失 + 跳转白屏闪烁 | Reported by user; **not investigated** this session |
| Taskbar badge manual smoke on packaged 1.1.6 | Optional — dev smoke PASS (user 2026-07-06) |
| macOS dock badge | Deferred (07-05 P4) |

---

## 5. Dev restart commands (reference)

```powershell
# UI-only fast path
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -SkipVendorSync -BuildAioncore:$false

# White screen recovery
.\ccb-installer\scripts\start-dev-full.ps1 -Clean -SkipBootstrap -SkipVendorSync -BuildAioncore:$false
```

**Do not** Ctrl+R in Electron after main/preload changes.
