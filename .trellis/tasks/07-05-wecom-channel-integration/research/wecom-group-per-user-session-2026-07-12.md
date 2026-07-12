# Research: WeCom group Mode A — per-(userid, groupId) sessions + reply-context isolation

- **Query**: Mode A group sessions (different people @bot → different agent sessions) + concurrent reply-context isolation; map exact JS/Rust paths; propose contract IDs; Phase 0–N workstreams (planning only).
- **Scope**: mixed (internal code + prior task research/specs)
- **Date**: 2026-07-12

## Verdict (one line)

AionCore **already** isolates agent sessions by `(internal_user_id, chat_id)` — Mode A for **memory/ACP** is largely done; the **blocking gap** is extension `replyContextByChat` / `getLatestStreamByChatId` keyed by **group `chatId` only**, so concurrent @mentions in one group race outbound `replyStream`/`replyMedia` frames.

---

## Findings

### Files Found

| File Path | Description |
|---|---|
| `D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/state.js` | `replyContextByChat`, `streamStore`, `getWsClient`, set/get/clear reply context |
| `D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/ext-wecom-aibot-channel.js` | Inbound `setReplyContext(chatId)`, outbound `sendMessage`/`editMessage`/`getStreamStatus` |
| `D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/sdk-runtime.js` | `replyStreamForChat` / `uploadAndReplyFileForChat` lookup by `chatId` |
| `D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/identity.js` | `resolveChatId`, `buildUserId`, `buildConversationId` |
| `D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/inbound.js` | Unified inbound: `user.id` = namespaced wecom user; `chatId` = group or `dm:{userid}` |
| `D:/Projects/aionui-src/examples/ext-wecom-aibot/channels/*` | **Byte-identical** mirror of `examples-wecom-dev` (7 channel `.js` hashes match 2026-07-12) |
| `AionCore/crates/aionui-channel/src/session.rs` | `SessionManager`: one session per `(user_id, chat_id)` |
| `AionCore/crates/aionui-channel/src/action.rs` | Auth → session get/create; `/new`→`session.new` resets **that** pair |
| `AionCore/crates/aionui-channel/src/orchestrator.rs` | Outbound relay keyed by `plugin_id` + `chat_id` only (no userId) |
| `AionCore/crates/aionui-channel/src/stream_relay.rs` | `RelayConfig { plugin_id, chat_id }`; send/edit by chat |
| `AionCore/crates/aionui-channel/src/message_service.rs` | Creates conversation with `channel_chat_id = session.chat_id`; `extra` = agent profile fields |
| `AionCore/crates/aionui-channel/src/plugins/extension_channel/plugin.rs` | Host `send_message(chat_id, …)` / `edit_message(chat_id, messageId, …)` — empty options `{}` on send |
| `AionCore/crates/aionui-db/src/repository/sqlite_channel.rs` | SQL `WHERE user_id = ? AND chat_id = ?` |
| `.trellis/spec/integration/wecom-channel.md` | Identity + dual-tree paths; Group-as-shared deferred in PRD |
| `.trellis/tasks/07-05-wecom-channel-integration/prd.md` | Group-as-shared-session **Defer**; identity namespacing |

### Identity (confirmed)

```text
Group chat_id     = body.chatid                          # shared across members
DM chat_id        = dm:{wecomUserId}
user.id (platform)= ext-wecom-aibot:{botId}:{wecomUserId}
conversationId    = ext-wecom-aibot:{botId}:{chatId}      # NOT per-user today
```

Source: `identity.js` `resolveChatId` / `buildUserId` / `buildConversationId`; inbound assembly in `inbound.js` ~L90–133.

### Exact reply-context / stream / setReplyContext / getWsClient paths

Both trees (`examples-wecom-dev` and `examples`) share the same module graph:

```text
ext-wecom-aibot-channel.js
  ├─ start → connectClient / getWsClient (sdk-runtime) → setWsClient (state)
  ├─ inbound frame:
  │     chatId = resolveChatId(body)
  │     streamId = generateReqId('stream')          # unique per inbound
  │     setReplyContext(chatId, { frame, streamId }) # ★ KEY = chatId ONLY
  │     upsertStream(streamId, { chatId, … })
  │     unified.raw.__streamId = streamId
  │     messageHandler(unified)
  └─ sendMessage(chatId, message, options):
        streamId = options.streamId || generateReqId('stream')
        upsertStream(streamId, { chatId: resolvedChatId, … })
        replyStreamForChat(resolvedChatId, …)       # ★ lookup by chatId
        uploadAndReplyFileForChat(resolvedChatId, …)

sdk-runtime.js
  replyStreamForChat(chatId, content, finish):
    ctx = state.getReplyContext(chatId)             # ★ Map.get(chatId)
    client.replyStream(ctx.frame, ctx.streamId, …)
    if finish → clearReplyContext(chatId)

state.js
  wsClient                 # singleton bot WS
  replyContextByChat       # Map chatId → { frame, streamId }
  streamStore              # Map streamId → { streamId, chatId, visibleContent, finished, updatedAt }
  getLatestStreamByChatId  # scans streamStore; latest by chatId only
```

**Dual-tree sync:** 2026-07-12 hash compare of all seven `channels/*.js` files — **identical** between `examples-wecom-dev` and `examples` (aligns with existing `WANd.WECOM.MEDIA.OUT.SYNC.001`).

### Can outbound key by `(chatId, userId)` or is `streamId` already enough?

| Mechanism | Unique today? | Used as lookup key? | Enough for Mode A concurrency? |
|---|---|---|---|
| `streamId` (`generateReqId('stream')` per inbound) | Yes | **No** — only stored inside context value / streamStore | **Would be enough** if reply context Map keyed by `streamId` (or composite) and outbound/edit passed that id |
| `chatId` (group id) | Shared by all members | **Yes** — sole reply-context key | **No** — concurrent @mentions overwrite |
| `(chatId, userId)` | Yes for Mode A person identity | Not used in JS | Sufficient for **session** identity; for **reply frame** must still bind the inbound `frame`/`req_id` (prefer `streamId` or `(chatId, userId, streamId)`) |

**Critical outbound gap (Rust → JS):**

- `ChannelStreamRelay` / `ChannelSender` only pass `plugin_id` + `chat_id`.
- Extension `plugin.rs` `send_message` uses `options: {}` — does **not** forward `userId` or inbound `streamId`.
- `edit_message` does pass `messageId` (= prior `streamId` return), and channel `editMessage` sets `options.streamId`, but `replyStreamForChat` **still ignores** that id for context lookup — it always `getReplyContext(chatId)`.

**Conclusion:** `streamId` is already unique enough as a **reply-context primary key**; `(chatId, userId)` is the right key for **agent sessions** (already in AionCore). Concurrent isolation needs JS Map rekey + plumbing so outbound/edit resolves the correct inbound `frame`.

### What AionCore already persists

#### Session row (`assistant_sessions`)

- Key: `(user_id, chat_id)` — documented in `session.rs` L10–15; SQL in `sqlite_channel.rs` L221–222.
- `user_id` here is **internal** paired id from `PairingService.get_internal_user_id(platform_user_id, …)`.
- `chat_id` for groups = WeCom `body.chatid` (shared).
- **Mode A session semantics already hold:** Alice and Bob in group `G` → different sessions; each can bind a different `conversation_id`.

#### Conversation (`conversations`)

- Created via `ChannelMessageService::create_conversation_for_session`.
- `channel_chat_id` = `session.chat_id` (group id or `dm:…`) — **not** per-user.
- Ownership: all channel conversations use `ChannelMessageService.owner_user_id` (desktop/app owner), **not** the WeCom person.
- Isolation of agent memory is via **session → conversation_id binding**, not via unique `channel_chat_id` alone.
- `extra` (agent profile) currently includes: `session_mode`, `backend`, `agent_name`, `agent_id`, `cli_path`, `custom_agent_id`, `ccb_assistant_profile_id`, `ccb_agent_id`, `preset_assistant_id`, `acp_meta` — **no** `wecom_user_id` / platform user stored in extra today.

#### Slash `/new` / `/reset`

- Mapped to `session.new` → `reset_session(internal_user_id, chat_id)` (`action.rs`).
- Scope is already **per (user, chat)** — Alice `/new` does not wipe Bob’s session in the same group.

#### `AlreadyProcessing`

- Enum variant exists; orchestrator logs it; **ActionExecutor never returns it** (dead path as of this research). No chat-level concurrency gate in Rust today — both users can dispatch in parallel (good for Mode A sessions; bad for shared reply context).

### PRD alignment

| Item | Status |
|---|---|
| Group-as-shared-session | **Deferred** (PRD) |
| Mode A (per person in group) | **Recommended / user request** — matches SessionManager design |
| Group @bot only | In scope; `shouldIgnoreGroupMessage` |
| Pairing unauthorized in group | Pairing guidance (code may appear **in the group**) |

---

## Proposed contract IDs (minimal)

Namespace prefix consistent with existing `WANd.WECOM.*`:

| Contract ID | Rule (draft) |
|---|---|
| `WANd.WECOM.SESSION.PER_USER.001` | Group agent session key = `(paired_internal_user_id, group_chat_id)`; two members → two ACP/conversation bindings. (Assert existing SessionManager behavior; add WeCom-focused test.) |
| `WANd.WECOM.REPLY.CTX.USER.001` | Active WeCom passive-reply context must be addressable without cross-user overwrite under concurrent @mentions in the same `chatid`. Preferred key: inbound `streamId` (or composite `chatId+userId+streamId`); must retain SDK `frame`/`req_id`. |
| `WANd.WECOM.REPLY.CTX.OUT.001` | Outbound `sendMessage`/`editMessage` (and stream relay) must resolve reply context by the **inbound correlation id** (streamId), not solely by group `chatId`. |
| `WANd.WECOM.SLASH.NEW.SCOPE.001` | `/new`/`/reset` resets only the issuer’s `(user, chat)` session — never other members’ sessions in the same group. (Document + test; behavior already matches.) |
| `WANd.WECOM.PRIVACY.GROUP.VIS.001` | Mode A isolates **agent memory**, not **message visibility**: replies remain group-visible unless product later adds DM-only or ephemeral UX. Document as accepted risk for v1. |
| `WANd.WECOM.PAIR.PER_USER.001` | Pairing remains per platform `user.id` (`ext-wecom-aibot:{botId}:{wecomUserId}`), independent of group membership; unauthorized group @bot → pairing text only. |
| `WANd.WECOM.MEDIA.OUT.SYNC.001` | **Existing** — keep dual-tree sync gate for any reply-context change. |
| `WANd.WECOM.MEDIA.OUT.CTX.001` | **Existing** — still requires media before `finish=true`; must hold **per streamId context**, not per chat overwrite. |

Optional later (not Mode A MVP):

| ID | Note |
|---|---|
| `WANd.WECOM.SESSION.SHARED.001` | Group-as-shared-session (explicitly deferred) |
| `WANd.WECOM.CONV.EXTRA.USER.001` | Persist platform user / display name into `conversation.extra` for audit UI |

---

## Risks

### 1. Concurrent reply-context race (P0 for Mode A UX)

Two members @bot in group `G` while both streams active:

1. Alice inbound → `replyContextByChat[G] = frameA`
2. Bob inbound → overwrites `replyContextByChat[G] = frameB`
3. Alice’s relay `sendMessage(G, …)` → `replyStream(frameB, …)` **or** loses context if Bob finishes first → `no active reply context`

Same race for `uploadAndReplyFileForChat` / OUT.CTX.001 file send.

### 2. Pairing per user vs group surface

- Pairing identity is already per person (`PAIR.PER_USER.001` satisfied at auth layer).
- **Risk:** pairing code / “waiting for approval” text is still sent into the **group** chat (outbound uses group `chatId`) → other members see codes. Product may want DM-only pairing replies later.

### 3. Privacy (session ≠ visibility)

Mode A gives each person a private **agent transcript/session**. Replies still appear as bot messages in the shared group. Sensitive quotation content remains visible to the whole group — call this out in AC; do not claim “private chat in group.”

### 4. Slash `/new` scope

Already per `(user, chat)`. Residual UX risk: users may **expect** group-wide reset (shared-session mental model). Document Mode A semantics in bot help text.

### 5. Dual-tree sync

Any `state.js` / `sdk-runtime.js` / channel change must land in **both** `examples-wecom-dev` and `examples` (or shared module). Existing SYNC.001 gate.

### 6. conversationId / channel_chat_id not per-user

`buildConversationId(botId, chatId)` and `channel_chat_id` omit user. Today this is OK because session binding carries isolation; changing conversationId shape is **optional** and would touch identity + host parse — avoid unless UI needs it.

### 7. Stream relay edit path

Relay stores `thinking_msg_id` from first `send_message` return (`streamId`), then `edit_message(chat_id, message_id, …)`. Even with correct messageId, JS ignores it for frame lookup today — fixing REPLY.CTX without fixing OUT correlation leaves edit/stream chunks on wrong frames.

### 8. Profile handoff race (related, separate)

See `research/wecom-agent-profile-handoff-race-2026-07-12.md`. Concurrent Mode A sessions increase pressure on shared `.aionui-next-assistant-profile.json` — `_meta.ccbAgentId` path remains mandatory.

---

## Recommended Phase 0–N workstreams (planning only)

### Phase 0 — Spec + contract lock (docs / tests RED)

- Lock Mode A vs deferred shared-session in PRD + `wecom-channel.md`.
- Add contract stubs `SESSION.PER_USER.001`, `REPLY.CTX.USER.001`, `REPLY.CTX.OUT.001`, `SLASH.NEW.SCOPE.001`, `PRIVACY.GROUP.VIS.001`, `PAIR.PER_USER.001`.
- RED tests (no product code yet):
  - Unit: two `setReplyContext` for same `chatId` different `streamId` must not clobber (will fail today).
  - Rust: two platform users same `chat_id` → two `assistant_sessions` (likely already green).
  - `/new` for user A does not delete user B session (likely already green).

### Phase 1 — Reply-context isolation (extension JS, both trees)

- Rekey `replyContextByChat` → by `streamId` (or composite); keep optional secondary index `(chatId, userId)` if useful for debugging.
- Store `userId` on stream records.
- `replyStreamForChat` / `uploadAndReplyFileForChat`: resolve context by `streamId` (from options), fall back carefully.
- `getLatestStreamByChatId` → prefer `getStreamById` / `getLatestStreamByChatUser`.
- Preserve OUT.CTX.001 ordering per stream.
- Dual-tree sync + vitest.

### Phase 2 — Outbound correlation plumbing (AionCore + bridge)

- Thread inbound `streamId` (and optionally `user.id`) through orchestrator → `RelayConfig` → `send_message`/`edit_message` options (not empty `{}`).
- Ensure first send returns streamId; subsequent edits reuse it for context lookup.
- Extension host bridge options passthrough.

### Phase 3 — Hardening + observability

- Concurrency integration test: two simulated group @mentions overlapping streams.
- Metrics: reply-context miss / overwrite counters.
- Help text: Mode A + `/new` scope + “replies visible in group.”
- Optional: pairing replies prefer DM when SDK allows (product decision).

### Phase 4 — Explicit non-goals / defer

- Group-as-shared-session (`SESSION.SHARED.001`) — only if product reverses Mode A.
- Per-user `conversationId` rename / `channel_chat_id` encoding of user — only if UI/audit needs it.
- Private group replies / ephemeral messages — out of WeCom AI Bot long-connection v1 unless SDK supports.

---

## Code Patterns (citations)

### Reply context keyed by chatId only

```75:86:D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/state.js
function setReplyContext(chatId, context) {
  if (!chatId) return;
  replyContextByChat.set(String(chatId), context);
}

function getReplyContext(chatId) {
  return replyContextByChat.get(String(chatId)) || null;
}
```

### Inbound sets context before dispatch

```108:112:D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/ext-wecom-aibot-channel.js
    const chatId = resolveChatId(body);
    const streamId = generateReqId('stream');

    setReplyContext(chatId, { frame, streamId });
    upsertStream(streamId, { chatId, visibleContent: '', finished: false });
```

### Outbound lookup ignores streamId uniqueness

```239:250:D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/sdk-runtime.js
async function replyStreamForChat(chatId, content, finish) {
  const client = getWsClient();
  const ctx = require('./state').getReplyContext(chatId);
  if (!client || !ctx?.frame) {
    throw new Error('ext-wecom-aibot: no active reply context for chat');
  }
  const streamId = ctx.streamId || generateReqId('stream');
  await client.replyStream(ctx.frame, streamId, content || '', !!finish);
  if (finish) {
    require('./state').clearReplyContext(chatId);
  }
```

### SessionManager Mode A already

```10:15:AionCore/crates/aionui-channel/src/session.rs
/// Manages per-chat session isolation for channel users.
///
/// Each (user_id, chat_id) pair maps to exactly one session. This ensures
/// that the same user chatting in different groups/DMs gets independent
/// conversation contexts, while repeated messages in the same chat reuse
/// the existing session.
```

### Relay config: chat only

```206:211:AionCore/crates/aionui-channel/src/orchestrator.rs
        let relay_config = RelayConfig {
            platform,
            plugin_id: plugin_id.to_owned(),
            chat_id: chat_id.to_owned(),
            throttle_ms: 500,
        };
```

### Related Specs

- `.trellis/spec/integration/wecom-channel.md` — identity, dual-tree, agent routing / CCB profile
- `.trellis/tasks/07-05-wecom-channel-integration/prd.md` — Group-as-shared deferred
- `.trellis/tasks/07-05-wecom-channel-integration/execution-plan.md` — MEDIA.OUT.* / ENABLE.* contracts
- `.trellis/tasks/07-05-wecom-channel-integration/research/wecom-agent-profile-handoff-race-2026-07-12.md` — concurrent ACP profile bind

## Caveats / Not Found

- Extension sources live under **`D:/Projects/aionui-src/`**, not inside `claude-code-best` workspace clone.
- `MessageResult::AlreadyProcessing` is unused — no evidence of chat-level “busy” gate in current ActionExecutor.
- Did not run live WeCom dual-@mention repro in this research pass (static code + prior facts).
- WeCom SDK proactive `sendMessage(chatid)` vs passive `replyStream(frame)` semantics for pairing-in-group DM preference **not** fully audited against latest `@wecom/aibot-node-sdk` docs in this pass.
