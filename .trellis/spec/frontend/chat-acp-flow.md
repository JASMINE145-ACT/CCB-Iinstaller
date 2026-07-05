# Chat Event Flow (ACP)

> Deep-dive on how a chat message travels from aioncore to a React component, and how to add a new chat message type.

---

## 1. End-to-end flow

```
aioncore.exe  ──HTTP/SSE──▶  process/services/  ──IPC──▶  renderer/services/
                                                          │
                                                          ▼
                              renderer/pages/conversation/platforms/acp/
                              useAcpMessage.ts (ACP main state: greeting, streaming, history)
                              + useAcpInitialMessage.ts (initial handshake)
                                                          │
                                                          ▼
                              renderer/pages/conversation/Messages/hooks.ts
                              (useAddOrUpdateMessage:
                                 for tool_group → calls chatLib.composeMessage
                                 for everything else → calls local composeMessageWithIndex)
                                                          │
                                                          ▼
                                            renderer/pages/conversation/
                                            Messages/<MessageType>.tsx
                                                          │
                                                          ▼
                                            common/chat/chatLib.ts
                                            (composeMessage: the base dedup / merge
                                             function, used by tool_group path)
```

When a chat message arrives:

1. aioncore forwards a JSON event over HTTP
2. The main process bridges it to the renderer via IPC
3. `useAcpMessage` (or platform-specific equivalent) ingests the event and updates platform state
4. The platform hook calls `Messages/hooks.ts#useAddOrUpdateMessage`
5. `useAddOrUpdateMessage` (in `hooks.ts`) dispatches: for `tool_group` messages it calls `chatLib.composeMessage` directly; for everything else it calls the local `composeMessageWithIndex` (O(1)-indexed). Either way the result is the merged/updated message list.
6. The component (`MessageBubble`, `MessageThinking`, `MessageAcpPermission`, `MessageAcpToolCall`, …) renders

---

## 2. Where to make changes for each concern

| Concern | Where |
|---|---|
| New chat event type from backend | type: `common/types/platform/acpTypes.ts`; normalizer: `renderer/services/`; UI: `renderer/pages/conversation/Messages/<NewMessageType>.tsx` |
| Message dedup / merge logic | `common/chat/chatLib.ts#composeMessage` (base) + `Messages/hooks.ts#composeMessageWithIndex` (indexed, local) — **change both for consistent merge semantics**; entry: `hooks.ts#useAddOrUpdateMessage` |
| Per-message component | `renderer/pages/conversation/Messages/<name>.tsx` |
| Conversation page layout | `renderer/pages/conversation/` |
| Cross-page message state | `platforms/acp/useAcpMessage.ts` (platform state) → `Messages/hooks.ts` (list operations) → `chatLib.ts` (merge) — three layers, change the right one |

---

## 3. Real ACP event shapes (illustrative)

These are the shapes the renderer should be prepared to handle. If the backend emits something materially different, **fix the backend**, do not patch the renderer defensively. See `../integration/defensive-fix-policy.md`.

### 3.1 Assistant text message

```json
{
  "type": "assistant_message",
  "msg_id": "msg-abc-123",
  "content": {
    "type": "text",
    "content": "你好！有什么可以帮你的？"
  }
}
```

Renders as: `MessageBubble` (or equivalent) with text content.

### 3.2 Streaming text chunk

```json
{
  "type": "assistant_message_delta",
  "msg_id": "msg-abc-123",
  "content_delta": "你"
}
```

Same `msg_id` as the originating message — `chatLib.composeMessage` recognizes the same `msg_id` and appends the delta. **If the backend changes the `msg_id` for each delta, the dedup logic will misfire** — this is one of the common symptoms of broken ACP contracts.

### 3.3 Tool call (running)

```json
{
  "type": "tool_call",
  "tool_call_id": "tc-001",
  "tool_name": "quotation",
  "status": "running",
  "input": { "sku": "三通50" }
}
```

Renders as: `MessageAcpToolCall.tsx` with running indicator.

### 3.4 Tool call (done)

```json
{
  "type": "tool_call",
  "tool_call_id": "tc-001",
  "tool_name": "quotation",
  "status": "done",
  "output": { "price": 12.5 }
}
```

Same `tool_call_id` as the running event — `MessageAcpToolCall` updates the same component.

### 3.4b View Steps (`tool_summary`) — title merge (2026-07-04)

**View Steps** (`MessageToolGroupSummary`) normalizes `acp_tool_call` via `normalizeAcpToolCall` → `resolveAcpToolDisplayName`.

aioncore **omits** `title` on `tool_call_update` (see `AionCore` test `session_tool_call_update_omits_missing_fields_for_frontend_merge`). Contract:

| Layer | Rule |
|-------|------|
| Merge | `mergeAcpToolCallContent` — empty/missing incoming `title` must **not** clobber prior non-empty title |
| Display | Fallback order: `title` → `_meta.claudeCode.toolName` → param summary → `Agent(subagent_type)` → kind label → `"Tool"` |
| UI | `MessageToolGroupSummary` uses `name \|\| description \|\| kind \|\| "Tool"` as belt-and-suspenders |

Task: `.trellis/tasks/07-04-acp-view-steps-empty-tool-title/`

### 3.5 Permission request (with tool_call)

```json
{
  "type": "ask_user_permission",
  "request_id": "perm-007",
  "tool_call": {
    "tool_call_id": "tc-002",
    "tool_name": "bash",
    "input": { "cmd": "rm -rf ./tmp" }
  }
}
```

Renders as: `MessageAcpPermission.tsx` with allow/deny buttons.

**MCP tool permission (2026-06-27):** WanD quotation flow may call `mcp__excel__read_data_from_excel` after fill. Backend `permissions.ts` auto-allows `mcp__quotation__*`, `mcp__accurate__*`, and `mcp__excel__*` without UI. If a prompt still appears, check (1) live `dist` includes #18, (2) UI is not 1.1.2 `app.asar` missing #17 — retro theme + `size='mini'` caused overlapping Always/Allow/Reject radios. Fix: `MessageAcpPermission.css` scoped Arco radio reset; ship via **NSIS 1.1.3** (`internal-update.md` §12.9 #17–#18).

**全自动 / bypassPermissions mode sync (2026-07-01, shipped in `aionui-src`):** UI label「全自动」= `bypassPermissions`. **Product contract:** user-selected mode must apply to the live CCP session before any tool runs; sync failure **blocks** `sendMessage` (no silent fallback to `default`).

| Layer | Mechanism |
|-------|-----------|
| Store (authority) | `common/config/ccbSessionPreferredModeStore.ts` — `seed` / `get` / `set` / `persist` / `clear` per `conversation_id` |
| Resolve | `resolveEffectiveAcpSessionMode(store, extra.session_mode)` — store wins over create-time snapshot |
| Ensure | `ensureCcbSessionPreferredMode` after warmup |
| Gate | `assertCcbSessionPreferredModeApplied` — `failed` / `not_applicable` / backend mismatch → throw, no send |
| Initial send | `useAcpInitialMessage`: readiness → warmup → ensure → assert → `sendMessage` |
| Subsequent send | `AcpSendBox.executeCommand`: force warmup → ensure → assert → `sendMessage` |
| UI selector | `AgentModeSelector` / mobile sheet: `setMode` success → `set` + `persistCcbSessionPreferredMode` |
| Mount `getMode` | **UI only** (`setCurrentMode`) — **must not** `setCcbSessionPreferredMode` (would overwrite Guid seed with stale backend `default`) |

**Files:** `ccbSessionPreferredModeStore.ts`, `resolveEffectiveAcpSessionMode.ts`, `ensureCcbSessionPreferredMode.ts` (`assertCcbSessionPreferredModeApplied`), `ensureCcbSessionPreferredModel.ts`, `acpConfigOptionsAdapter.ts`, `useAcpInitialMessage.ts`, `AcpSendBox.tsx`, `AgentModeSelector.tsx`.

**aioncore 0.1.29+ route contract (2026-07-02):** Mode/model reads and writes for send-time sync **must** use `acpConfigOptionsAdapter` (`/api/conversations/{id}/config-options`), not `ipcBridge` legacy `/mode` or `/model` (removed → `404 Route not found.` → send blocked). Incident: [`.trellis/tasks/07-01-aionui-full-auto-permission-sync/research/route-not-found-config-options-2026-07-02.md`](../../tasks/07-01-aionui-full-auto-permission-sync/research/route-not-found-config-options-2026-07-02.md).

**Common mistake:** UI shows `AIONUI_INTERNAL_ERROR` / `Route not found.` right after warmup → check dev log for `GET .../mode` 404; fix adapter path, not org JWT.

**Out of scope (explicit):** CCB `permissions.ts` Temp `Read` auto-allow — do not mask mode-sync bugs; fix store + ensure instead.

**Smoke:** Guid 万鼎报价专家 + 全自动 + 截图询价 → no `MessageAcpPermission` for `Read` on `%Temp%\aionui\` path; `default` mode still prompts for out-of-workspace Read.

**Tests:** `tests/unit/common-config/resolveEffectiveAcpSessionMode.test.ts`, `ensureCcbSessionPreferredMode.test.ts`, `ensureCcbSessionPreferredModel.test.ts` (incl. assert throws; adapter mocks).

Task: `.trellis/tasks/07-01-aionui-full-auto-permission-sync/`

### 3.5b AskUserQuestion (candidate selection — not Allow/Reject)

> **CCB-Wanding production (2026-07-02): AUQ disabled.** Backend `permissions.ts` calls `denyAskUserQuestionUseChat()` — the model must clarify in **normal chat text**. No `auq:`/`auqm:` permission rounds reach the renderer on Route B `--acp`. Align with [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) § AskUserQuestion.
>
> **Frontend:** `MessageAskUserQuestionCard` / `AskUserQuestionNavBar` exist but are **not mounted** (`MessageList.tsx` only renders `MessageAcpPermission`). Helpers + unit tests retained for future re-enable. **Do not** debug AUQ spinner/multi-question flows on CCB until Backend restores `handleAskUserQuestion`.

**Historical design (2026-06-12, not active on CCB):**

```json
{
  "type": "acp_permission",
  "content": {
    "options": [
      { "option_id": "auq:0:Direct%20DN50", "name": "Direct DN50 — Direct connection", "kind": "allow_once" },
      { "option_id": "reject", "name": "Cancel", "kind": "reject_once" }
    ],
    "tool_call": {
      "tool_call_id": "tu-123",
      "title": "Which DN50 product?",
      "raw_input": {
        "questions": [{
          "question": "Which DN50 product?",
          "header": "Product",
          "options": [
            { "label": "Direct DN50", "description": "Direct connection" },
            { "label": "Elbow DN50", "description": "90 degree" }
          ]
        }]
      }
    }
  }
}
```

Producer (historical): `permissions.ts` `handleAskUserQuestion`. Consumer (dormant): `MessageAskUserQuestionCard.tsx` (was via `MessageAcpPermission.tsx`) — table/radio UI, not generic Allow/Reject.

#### Multi-question flow (2026-06-13)

Backend loops `questions[]` sequentially: **one `requestPermission` per unanswered question**. Each round sends options with `auq:{qIdx}:{encodeURIComponent(label)}` where `qIdx` is the current question index.

Frontend behavior:

| Feature | Implementation |
|---------|----------------|
| Progress `1/3` | `AskUserQuestionNavBar.tsx` — hidden when `questions.length <= 1` |
| Nav chips | One chip per question; active = primary; answered = checkmark (from `localAnswers` merged with `raw_input.answers`) |
| Auto-advance | After confirm on non-final question → spinner「已提交，正在加载下一题…」; next question arrives as updated `acp_permission` (same `msg_id`, new `auq:N:*` options) |
| Awaiting timeout | 30s without next permission → warning banner (`ask-user-question-awaiting-timeout`); cleared when next phase arrives |
| Phase reset | `permissionPhaseKey` = `{activeIndex}:{option_ids}` — change clears selection; `localAnswers` **persists** across phases |
| Partial answers in payload | Backend sets `toolCall.rawInput = { ...input, answers }` before each round — nav can read `raw_input.answers` after remount |
| Cancel | `confirm_key: reject` → terminal「已取消」; **must not** set awaiting-next (backend denies, no follow-up permission) |

Files: `MessageAcpPermission.tsx`, `MessageAskUserQuestionCard.tsx`, `AskUserQuestionNavBar.tsx`, `askUserQuestionIds.ts`, `askUserQuestionFormat.ts`.

#### multiSelect (2026-06-13)

When `questions[i].multiSelect === true`:

- UI: checkbox rows (not radio); confirm enabled when ≥1 candidate selected
- `confirm_key` format: `auqm:{qIdx}:{enc(label1)}|{enc(label2)}|…` — shared encode/decode in `askUserQuestionIds.ts` (frontend) and `permissions.ts` (backend)
- Backend resolves to `answers[questionText] = "label1, label2"` (comma-separated, matches native CLI)

Tests: `tests/unit/renderer/askUserQuestionIds.test.ts`; backend `permissions.test.ts` — "AskUserQuestion accepts multi-select auqm optionId".

#### Single-question example `content.options` is `AcpPermissionOption[]` (`acpTypes.ts`). In `MessageAcpPermission.tsx`:

- `normalizePermissionOptions` must accept `readonly AcpPermissionOption[]` — do **not** cast to `Record<string, unknown>[]` (TS2352 under strict).
- `buildAskUserChoices` fallback Cancel row uses `kind: 'reject_once'` — annotate `choices` as `NormalizedOption[]` or the array narrows to `allow_once` only (TS2322 on `push`).

Verify: `cd D:\Projects\aionui-src && bunx tsc --noEmit -p tsconfig.json`.

### 3.6 Permission request (missing tool_call — known backend bug)

```json
{
  "type": "ask_user_permission",
  "request_id": "perm-008",
  "tool_call": null
}
```

**This is the `Issue 3` bug from `tasks/06-12-aionui-exe/prd.md`.** The defensive fix removes the `if (!tool_call) return null` guard. The root-cause fix is in `D:\claude-code-B\src/` — once it ships, the desktop guard is removed per `../integration/defensive-fix-policy.md` § 5.

### 3.7 Thinking block

```json
{
  "type": "thinking",
  "msg_id": "think-001",
  "content": "用户问三通50的价格。我需要先调用 quotation MCP..."
}
```

Renders as: `MessageThinking.tsx`. Default collapsed (`useState(false)`); user expands via header click. No auto-collapse on `isDone`.

---

## 4. Task template: adding a new chat message type

```
1. Define ACP event type
   - Add to common/types/platform/acpTypes.ts
   - Match the shape the backend actually emits — do not invent fields

2. Add normalizer (if shape differs from Message type)
   - In renderer/services/<newNormalizer>.ts
   - Keep it pure: (ACP event) -> Message
   - Add fallback for unknown fields, never throw

3. Add component
   - In renderer/pages/conversation/Messages/<NewMessageType>.tsx
   - Mostly presentational — keep business logic out (see coding-rules.md §2)

4. Register rendering branch
   - In renderer/pages/conversation/Messages/<Dispatcher>.tsx (or wherever the switch is)
   - One switch case, no special-casing outside

5. Add fallback display for unknown fields
   - JSON.stringify the unknown payload into a <details> block
   - This makes future backend changes debuggable without a hotfix

6. Test with mocked ACP event
   - Add a fixture in tests/fixtures/acp/
   - Add a unit test in renderer/pages/conversation/Messages/__tests__/

7. Verify in dev
   - See dev-test-ship.md § minimal modify+test loop
   - bun test, bun run lint, bun run dev — click through the new message type
```

If your new type crosses any layer boundary (e.g., introduces a new backend event that doesn't exist yet), **stop and coordinate with the backend PR** before merging. See `../integration/aionui-ccb-boundary.md` §3.

---

## Slash Command Flow (2026-06-13, Phase 2 capability manifest)

```text
CCB-Wanding capabilities.ts
  buildCcbCapabilities(getCommands(cwd))
  toAvailableCommandsUpdatePayload()
      |
      v
agent.ts session/update available_commands_update
  availableCommands[] + per-command _meta.capability
  update._meta.capabilities (full manifest)
      |
      v
aioncore /api/conversations/{id}/slash-commands
      |
      v
AionUI useAcpMessage/useSlashCommands
  mapAcpCommandsToSlashCommands() — reads capability status
  mergeSlashCommands(agentCommands, shellCommands)
      |
      v
SendBox slash menu
  ready → insert/execute
  needs_mapping → visible, disabled, reason badge
  aionui-shell → shell badge (/open, /btw, /copy when not shadowed)
```

Rules:

- Do not maintain a second executable command registry in AionUI.
- If a command executes in CCB-Wanding, expose/fix it in `D:\claude-code-B\src\services\acp\`.
- Shell-only commands use `source: aionui-shell`; CCB names always win on collision.
- Non-executable CCB capabilities (`needs_mapping`) must stay visible but blocked (menu + manual send guard via `findLeadingSlashCommand`).
- After backend command changes, rebuild/deploy CCB-Wanding, sync route-b, restart aioncore, and start a new conversation.

**Implementation (Phase 2):**

| Piece | Path |
|---|---|
| Capability types + guards | `packages/desktop/src/common/chat/slash/types.ts` |
| ACP → slash mapping | `packages/desktop/src/common/chat/slash/acpMapping.ts` |
| Union merge (CCB first) | `packages/desktop/src/common/chat/slash/merge.ts` |
| Disabled menu + send guard | `SendBox/index.tsx`, `SlashCommandMenu.tsx`, `useSlashCommandController.ts` |
| Unit tests | `tests/unit/renderer/slashCommandsMerge.test.ts` (4 tests) |

**Load timing:** `useAcpMessage` fetches slash commands after warmup (`GET /api/conversations/{id}/slash-commands`). `available_commands_update` may arrive slightly later on the WebSocket. If the menu shows only shell builtins (`/btw`, `/copy`, `/open`), restart dev and **open a new conversation** — old sessions do not refresh the full command manifest.

**Multi-conversation:** Switching to another chat does **not** stop the previous agent turn. Sidebar shows a spinner while generating; a blue dot when finished off-screen. Permission / AskUserQuestion prompts still require returning to that conversation to confirm.

---

## Warmup / First Message Timing (2026-06-13)

New ACP/CCB conversations have two distinct phases:

1. `POST /api/conversations` creates the AionUI conversation row. This should be fast (observed 29-39ms).
2. `POST /api/conversations/{id}/warmup` opens the real ACP runtime session. This can be slow on CCB cold start (observed 10-12s, dominated by `session/new`).

Do not confuse these in diagnosis. If the UI "takes seconds to open" but the create request is fast, inspect warmup/session-new, not the conversation create path.

Current frontend control points:

| Concern | Path |
|---|---|
| Guid create + navigate timings | `pages/guid/hooks/useGuidSend.ts` |
| Shared warmup promise + timing | `pages/conversation/utils/warmupConversation.ts` |
| Page mount auto-warmup + slash command fetch | `platforms/acp/useAcpMessage.ts` |
| Guid initial message send | `platforms/acp/useAcpInitialMessage.ts` |

Rules:

- `warmupConversation(conversation_id)` is the single renderer-side warmup coordination point. Reuse its promise instead of starting parallel initialization.
- Guid initial-message send must wait on `warmupConversation()` first. If page auto-warmup is already in flight, this reuses the same promise and avoids racing `session/new`.
- **Subsequent user sends** (not Guid initial): `AcpSendBox` calls `warmupConversation(conversation_id, { force: true })` before `POST .../messages` so idle-killed agents do not reuse a stale `acp_session_id`. Do **not** add `{ force: true }` to `useAcpInitialMessage` — that races page auto-warmup.

### Post-idle replay backflow guard (2026-06-29, task `06-19-quotation-behavior-backflow`)

Warmup/resume can push **historical** assistant chunks over WS (`replaySessionHistory` / `loadSession`). Without filtering, `composeMessage` merges them into the current bubble (greeting + prior table + new reply).

| Piece | Path |
|---|---|
| Wake window state | `runtime/postIdleWakeWindow.ts` |
| Stale stream filter | `runtime/staleTurnStreamFilter.ts` |
| Consumer | `platforms/acp/useAcpMessage.ts` — drop at `handleResponseMessage` entry |
| Send path producer | `AcpSendBox.tsx` — `beginPostIdleWakeWindow` → `acceptPostIdleWakeTurn` |
| Mount warmup guard | `useAcpMessage.ts` — `beginPostIdleWakeWindow` before auto-warmup; `scheduleWarmupReplayGuardEnd(8s)` |
| Merge guard | `Messages/hooks.ts` — refuse text merge when `turn_id` differs |
| `turn_id` on messages | `chatLib.ts#transformMessage` via `attachStreamTurnId` |

Lifecycle on send:

```text
beginPostIdleWakeWindow()     → drop turn-scoped WS (pre-accept)
warmupConversation(force)     → replay may arrive; still dropped
sendMessage → turn_id
acceptPostIdleWakeTurn(id)    → accept matching turn_id; allow missing turn_id live chunks
finish / error                → clearPostIdleWakeWindow()
```

Log marker: `[useAcpMessage] dropped stale turn stream message`.

SDK optional: `loadSession` skips client replay when `_meta.aionui.suppressSessionReplay === true` (`ccb-installer/patches/aionui-acp/acp-agent.js`). Renderer filter remains primary until aioncore wires meta.

#### Deploy record (2026-06-29, local dev slot)

| Layer | Source | Live target | Verified |
|---|---|---|---|
| Renderer filter | `aionui-src` (`staleTurnStreamFilter`, `useAcpMessage`, `hooks.ts`, `chatLib.ts`) | Vite HMR `localhost:5173` | unit tests 14/14; **restart dev** after structural import |
| CCB transcript trim | `D:\claude-code-B\src\services\acp\sessionTranscript.ts` | `D:\CCB-Wanding\dist\chunk-*.js` | `trimMessagesToCompleteTurnBoundary` in dist chunk |
| acp-agent patch | `ccb-installer/patches/aionui-acp/acp-agent.js` | bundled + `%APPDATA%\AionUi{,-Dev}\...\acp-agent.js` | markers + hash `A0F72FAF87061BEE` |

Deploy commands (see [`../integration/dev-sync-playbook.md`](../integration/dev-sync-playbook.md) §4.1.1):

```powershell
cd D:\claude-code-B; bun run build
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1
# force acp-agent (sync alone may keep stale bundled copy)
# ... §4.1.1 block ...
Get-Process aioncore,aionui-web -ErrorAction SilentlyContinue | Stop-Process -Force
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
```

Operator smoke (**new conversation**): `你好` → `查询直接50报价` → `很好` — third bubble must not concatenate greeting + prior table.

**Verified (2026-06-30):** Operator dev smoke — user report fix likely holds after full dev restart. Fleet ship still requires full NSIS repack (§ Deploy record above).
- **Specialist profile on resume (2026-06-29):** Every `warmupConversation` (including `{ force: true }`) calls `stageCcbAssistantProfileFromConversation` first. That resolves profile id from `conversation.extra` (`ccb_assistant_profile_id`, `preset_assistant_id`, `ccb_agent_id`, `acp_meta` aliases) and, when empty, infers from recent `acp_tool_call` history (`mcp__quotation__*` → `quotation-agent`). Stages to `.aionui-next-assistant-profile.json` (300s TTL) before `/warmup`. Without this, idle reopen of 万鼎报价专家 drifts to `wande-orchestrator` and CCB blocks business MCP. See [`../integration/agents-unified-model.md`](../integration/agents-unified-model.md) § Specialist session resume.
- Slash commands are secondary readiness. The page can render while warmup is `preparing`; commands may arrive later through HTTP fetch / `available_commands_update`.
- For CCB-Wanding, first-message latency is expected to include ACP process spawn, `initialize`, `session/new`, mode/config reconciliation, and command manifest update unless prewarmed.

**App startup readiness (2026-06-28, task `06-28-app-startup-readiness-gate`):** MCP/config warm now runs at **app open** (main process `ccbStartupReadiness.ts`), before any conversation exists. Guid send is gated via `useCcbStartupReadiness` + `CcbStartupReadinessBanner` until Layer 1 (config health, no probe) + Layer 2 (`warm-wanding-mcp.mjs`) complete. `useAcpInitialMessage` / `useGuidSend` also await `ensureStartupReadiness` so first send does not race cold MCP. This is **separate from** per-conversation `warmupConversation()` — both may run; app warm reduces first-send `Failed to fetch`. Spec: [`../integration/mcp-health.md`](../integration/mcp-health.md) § App startup readiness gate.

Timing markers to look for in renderer logs:

- `[useGuidSend] conversation_create_done`
- `[useGuidSend] conversation_navigate_done`
- `[warmupConversation] start`
- `[warmupConversation] ready`
- `[useAcpInitialMessage] warmup_before_initial_send_ready`
- `[useAcpInitialMessage] send_accepted`

Backend/aioncore logs should be compared against renderer timings. The key backend line is `/api/conversations/{id}/warmup` `latency_ms`; if this is high, inspect ACP `initialize` and `session/new` in CCB/aioncore, not local React render time.
