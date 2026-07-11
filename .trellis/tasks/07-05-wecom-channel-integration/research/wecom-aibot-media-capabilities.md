# Research: WeCom AI Bot media (inbound download + outbound file/image)

- **Query**: Does `@wecom/aibot-node-sdk` / ext-wecom-aibot support inbound image/file download and outbound image/file send? Gaps vs AionCore channels; P0/P1 scope.
- **Scope**: mixed (internal code + SDK/npm docs + GitHub source)
- **Date**: 2026-07-11

## Findings

### Executive summary

| Dimension | Status |
|-----------|--------|
| **SDK capability** | **Yes** — `downloadFile`, `uploadMedia`, `replyMedia`, `sendMediaMessage`, stream `msg_item` images |
| **ext-wecom-aibot today** | **Text-only** — inbound media → text placeholders; outbound → `replyStream` text only |
| **AionCore bridge today** | **Text-only** — `attachments` dropped on parse; `outgoing_to_json` ignores `file_url`/`image_url` |
| **Telegram/Weixin reference** | Inbound metadata partial (Telegram `file_id`); **no channel sends File/Image outbound** in AionCore |

**Verdict:** Media is **not implemented** in the integration layer, but the official SDK fully supports it. Implementation is extension-first (JS SDK calls), with thin Rust bridge extensions.

---

### 1. Current inbound — what happens to image/file today

#### `inbound.js` (text placeholders only)

`extractInboundText()` maps media to human-readable placeholder strings, not real attachments:

| `msgtype` | Placeholder |
|-----------|-------------|
| `image` | `[图片] {url}` or `[图片]` |
| `file` | `[文件] {name}` or `[文件]` |
| `video` | `[视频] {url}` or `[视频]` |
| `mixed` | Joins text + `[图片] url` per image item |

`toUnifiedIncomingMessage()` always emits:

```js
content: {
  type: msgType === 'command' ? 'command' : 'text',  // never 'photo' / 'document'
  text,  // placeholder string
}
```

No `attachments` array. Raw payload preserved in `raw` / `_wecomMeta.responseUrl`.

**Files:** `aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/inbound.js` (lines 3–36, 90–119)

#### `sdk-runtime.js` — event handlers miss media types

`attachClientHandlers()` only wires:

- `message.text` → `onTextFrame`
- `message.voice` → normalized to synthetic text frame

**Not registered:** `message.image`, `message.file`, `message.mixed`, `message.video`.

So even when WeCom pushes media frames, the extension **never dispatches them** to the message handler unless they arrive as `message.text` (they do not).

**Files:** `aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/sdk-runtime.js` (lines 133–152)

#### AionCore `parse_js_incoming` — attachments stripped

Rust host maps JS `content.type` to `MessageContentType` but **always** sets `attachments: None` (lines 95–98).

**Files:** `AionCore/crates/aionui-channel/src/plugins/extension_channel/host.rs`

#### Group @bot + media

`shouldIgnoreGroupMessage()` treats `image|file|video|mixed` as `hasMedia` so empty-text media messages are not dropped as noise. Media still becomes placeholder text only.

---

### 2. Current outbound — text-only `replyStream`

#### Extension `sendMessage` / `editMessage`

`ExtWecomAibotChannel.sendMessage()`:

1. Extracts string from `message.content.text` / `message.text`
2. Calls `replyStreamForChat(chatId, content, finish)`
3. `replyStreamForChat` → `client.replyStream(ctx.frame, streamId, content, finish)`

No branch for `messageType: 'file'|'image'`, no `uploadMedia` / `replyMedia` / `sendMediaMessage`.

**Files:**

- `aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/ext-wecom-aibot-channel.js` (lines 113–137)
- `aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/sdk-runtime.js` (lines 236–247)

#### AionCore extension plugin → bridge

`ExtensionChannelPlugin::outgoing_to_json()` serializes only:

```rust
{ "content": { "text": ... }, "text": ..., "messageType": "text"|"image"|"file"|"buttons" }
```

`file_url`, `file_name`, `image_url` on `UnifiedOutgoingMessage` are **not forwarded** to JS.

**Files:** `AionCore/crates/aionui-channel/src/plugins/extension_channel/plugin.rs` (lines 55–68)

#### Stream relay (WeCom path)

WeCom uses `uses_stream_reply_relay(PluginType::Wecom)` — same as Weixin: accumulate assistant text, send via stream API, **no** file/image relay.

**Files:** `AionCore/crates/aionui-channel/src/stream_relay.rs` (lines 269–275)

---

### 3. SDK / API capabilities (download + send)

**Package:** `@wecom/aibot-node-sdk` — pinned `^1.0.6` in `aionui-src/package.json`; npm latest **1.0.7** (May 2026).

**Not installed** in workspace `node_modules` at research time (no local `dist/` to grep); capabilities verified via npm README + GitHub `src/client.ts`.

#### Inbound events (SDK dispatches)

| Event | Payload fields (per SDK docs) |
|-------|-------------------------------|
| `message.image` | `body.image.url`, `body.image.aeskey` |
| `message.file` | `body.file.url`, `body.file.aeskey`, `body.file.name` |
| `message.mixed` | `mixed.msg_item[]` with text/image sub-items |
| `message.video` | `body.video.url`, `body.video.aeskey` |

#### Download + decrypt

```ts
const { buffer, filename } = await wsClient.downloadFile(url, aesKey);
```

- `aesKey` from `image.aeskey` / `file.aeskey` / `video.aeskey` (per-message, AES-256-CBC)
- HTTP download via internal `WeComApiClient`; decrypt via `decryptFile`
- Without `aesKey`, returns raw encrypted buffer (warns)

#### Outbound — passive (reply to inbound frame)

| Method | Channel | Use |
|--------|---------|-----|
| `replyStream(frame, streamId, content, finish, msgItem?)` | `aibot_respond_msg` | Text/Markdown stream; `msg_item` base64 images on `finish=true` (max 10) |
| `replyMedia(frame, mediaType, mediaId)` | `aibot_respond_msg` | file/image/voice/video via `media_id` |
| `uploadMedia(buffer, { type, filename })` | WS 3-step | Returns `media_id` for `replyMedia` |

#### Outbound — proactive (no inbound frame)

| Method | Use |
|--------|-----|
| `sendMessage(chatid, { msgtype: 'markdown', ... })` | Markdown push |
| `sendMediaMessage(chatid, mediaType, mediaId)` | Media push after `uploadMedia` |

#### Limits (SDK-enforced / documented)

| Limit | Value |
|-------|-------|
| `replyStream` content | max **20480 bytes** |
| `uploadMedia` chunk | 512 KB raw per chunk |
| `uploadMedia` chunks | max **100** (~**50 MB** total) |
| `replyStream` `msg_item` images | max **10** on finish |
| Reply queue | serial per `req_id`; `replyStreamNonBlocking` skips if pending ack |
| Welcome / card update | **5 s** window |

#### References

- [npm @wecom/aibot-node-sdk](https://www.npmjs.com/package/@wecom/aibot-node-sdk)
- [GitHub WecomTeam/aibot-node-sdk `src/client.ts`](https://github.com/WecomTeam/aibot-node-sdk/blob/main/src/client.ts)

---

### 4. Gaps vs Telegram / Weixin (AionCore patterns)

| Capability | Telegram | Weixin | ext-wecom-aibot | AionCore types |
|------------|----------|--------|-----------------|----------------|
| Inbound photo metadata | `UnifiedAttachment.file_id` | detects `has_media`, no attachment | URL/name placeholder text | `attachments` supported |
| Inbound file download | **Not implemented** (file_id only) | **Not implemented** | **Not implemented** | N/A |
| Outbound text stream | editMessage throttle | send-once stream | replyStream | ✓ |
| Outbound image/file | **Not implemented** (send_message text only) | **Not implemented** | **Not implemented** | `OutgoingMessageType::Image/File` + urls |
| `file_url` / `image_url` in relay | Never set | Never set | Never set | Defined in `types.rs` |

**Pattern to copy (inbound metadata):** Telegram `extract_content()` in `plugins/telegram/plugin.rs` — map platform fields → `UnifiedAttachment { file_id, file_name, mime_type, file_size }`.

**Pattern to copy (outbound):** None exists end-to-end in AionCore; WeCom must **lead** with SDK `uploadMedia` + `replyMedia`, then retrofits bridge types.

**WeCom-specific constraint:** Passive replies must reuse inbound `frame` (`req_id`) from `replyContextByChat` in `state.js`. Proactive sends use `sendMediaMessage(chatid, ...)` without frame.

---

### 5. Recommended P0 / P1 scope

#### P0 — Outbound file (Excel) first

**Why:**

- WanD / quotation-agent primary deliverable is **Excel output**, not images
- Fits existing stream-reply flow: finish text summary → `uploadMedia` + `replyMedia(frame, 'file', media_id)`
- Avoids agent multimodal ingestion work on P0
- SDK path is documented and synchronous to one `req_id` reply window

**P0 acceptance:**

- Agent (or action handler) produces local `.xlsx` path
- Extension reads file, `uploadMedia({ type: 'file', filename })`, `replyMedia` on stored frame
- User receives downloadable file in WeCom client
- Size ≤ 50 MB; error surfaced if upload fails

#### P1 — Inbound image/file download

**Why second:**

- Requires `message.image` / `message.file` handlers + `downloadFile`
- Needs temp storage policy + bridge to agent (multimodal message or MCP file path)
- AionCore `parse_js_incoming` + orchestrator have **no attachment→agent** path today (same gap for Telegram file_id)

**P1 acceptance:**

- User sends photo/PDF in DM or @bot group
- Extension downloads/decrypts, populates `content.type: photo|document` + `attachments[]` (or stages file for agent)
- Quotation agent can consume file (product-specific)

#### P2 — Outbound image / stream inline images

- `replyStream` finish with `msg_item` base64 images (≤10, size-sensitive)
- Or `replyMedia(..., 'image', media_id)` after upload

#### P3 — Proactive `sendMediaMessage`

- Follow-up pushes without user message (notifications, scheduled quotes)
- Needs `chatid` only, not reply context

---

### 6. Risks

| Risk | Detail | Mitigation |
|------|--------|------------|
| **Reply context expiry** | `replyContextByChat` cleared on `finish=true`; media must send **before** or **with** final stream frame | Send file via `replyMedia` before final `replyStream(finish=true)`, or use same frame in one reply sequence |
| **Serial ack queue** | SDK serializes replies per `req_id`; large upload blocks stream | Upload first; consider `replyStreamNonBlocking` for mid-stream text |
| **Size limits** | 50 MB upload; 20 KB stream text | Excel within 50 MB; truncate/split summary text |
| **Temp `media_id` TTL** | WeCom temp media expires (SDK returns `created_at`) | Upload immediately before send |
| **Security — inbound files** | Arbitrary user uploads; encrypted URLs | Max size check; scan/quarantine dir; delete after agent ingest; never log `aeskey` |
| **Security — outbound files** | Agent-generated paths | Validate path under workspace; no arbitrary read |
| **Auth** | `downloadFile` HTTP uses bot session context | Same BotID+Secret as WS; TLS default |
| **Multi-tenant** | Files keyed by chat/user | Namespace temp paths: `{pluginId}/{botId}/{chatId}/` |
| **Compat path** | `ext-wecom-bot` HTTP callback also placeholder-only | Keep long-connection primary; compat unchanged in P0 |

---

### 7. Exact files likely to change (implementation planning)

#### aionui-src (extension — primary work)

| File | Change |
|------|--------|
| `examples-wecom-dev/ext-wecom-aibot/channels/sdk-runtime.js` | Register `message.image/file/mixed/video`; add `downloadInboundMedia()`, `uploadAndReplyMedia()`, `uploadAndSendMedia()` |
| `examples-wecom-dev/ext-wecom-aibot/channels/inbound.js` | `toUnifiedIncomingMessage` → `photo`/`document` types + `attachments`; optional download hook |
| `examples-wecom-dev/ext-wecom-aibot/channels/ext-wecom-aibot-channel.js` | `sendMessage` branches: `messageType` file/image; wire upload+reply |
| `examples-wecom-dev/ext-wecom-aibot/channels/state.js` | Optional: persist decrypted file paths with TTL |
| `examples/ext-wecom-aibot/channels/*` | Mirror dev copies |
| `tests/unit/wecom/ext-wecom-aibot-inbound.test.ts` | Media type + attachment tests |
| New: `tests/unit/wecom/ext-wecom-aibot-media.test.ts` | Mock SDK upload/download |

#### AionCore (bridge — secondary)

| File | Change |
|------|--------|
| `crates/aionui-channel/src/plugins/extension_channel/host.rs` | Parse `content.attachments` from JS unified message |
| `crates/aionui-channel/src/plugins/extension_channel/plugin.rs` | `outgoing_to_json` → include `fileUrl`, `fileName`, `imageUrl` |
| `crates/aionui-channel/assets/extension-channel-bridge.mjs` | Pass through extended message fields (if needed) |
| `crates/aionui-channel/src/message_service.rs` | Optional: agent prompt enrichment for attachments |
| `crates/aionui-channel/src/orchestrator.rs` | Optional: route attachment paths to ACP/agent |
| `crates/aionui-channel/src/stream_relay.rs` | Optional: post-finish file hook (prefer extension-side) |

#### Spec / task

| File | Change |
|------|--------|
| `.trellis/spec/integration/wecom-channel.md` | Media section + limits |
| `.trellis/tasks/07-05-wecom-channel-integration/prd.md` | AC for P0 outbound / P1 inbound |
| `.trellis/tasks/07-05-wecom-channel-integration/execution-plan.md` | New workstream rows |

#### Not in scope for WeCom media v1

- `ext-wecom-bot` HTTP callback (separate response_url API)
- Rust builtin `PluginType::Wecom` plugin
- Telegram/Weixin outbound file (orthogonal)

---

### Code Patterns (citations)

**Inbound placeholder (current):**

```26:31:aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/inbound.js
  if (msgType === 'image') {
    return payload?.image?.url ? `[图片] ${payload.image.url}` : '[图片]';
  }
  if (msgType === 'file') {
    return payload?.file?.name ? `[文件] ${payload.file.name}` : '[文件]';
  }
```

**Outbound replyStream only (current):**

```236:247:aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/sdk-runtime.js
async function replyStreamForChat(chatId, content, finish) {
  const client = getWsClient();
  const ctx = require('./state').getReplyContext(chatId);
  // ...
  await client.replyStream(ctx.frame, streamId, content || '', !!finish);
```

**Rust attachments dropped:**

```95:98:AionCore/crates/aionui-channel/src/plugins/extension_channel/host.rs
        content: UnifiedMessageContent {
            content_type,
            text,
            attachments: None,
```

**Telegram inbound attachment pattern (reference):**

```450:473:AionCore/crates/aionui-channel/src/plugins/telegram/plugin.rs
    if let Some(photos) = &msg.photo {
        // ...
        return (MessageContentType::Photo, caption, attachments);
    }
    if let Some(doc) = &msg.document {
        // UnifiedAttachment { file_id, file_name, mime_type, file_size }
```

---

### Related Specs

- `.trellis/spec/integration/wecom-channel.md` — extension-first architecture; no media section yet
- `.trellis/tasks/07-05-wecom-channel-integration/research/gap-analysis-ext-wecom-bot.md` — P1a scaffold; no media
- `.trellis/tasks/07-05-wecom-channel-integration/research/p0-extension-channel-runtime-trace.md` — runtime host (prerequisite for any media in prod)

---

## Caveats / Not Found

- **Local `node_modules/@wecom/aibot-node-sdk`:** not present under `aionui-src` or `ccb-installer` at research time; SDK API confirmed via npm + GitHub source only.
- **Official WeCom enterprise doc pages:** not fetched; npm README + SDK source treated as authoritative for AI Bot long-connection.
- **Agent multimodal bridge:** no existing AionCore path from `UnifiedAttachment` to ACP/Claude Code — P1 inbound requires separate agent-integration design.
- **Excel MIME on WeCom:** SDK uses `type: 'file'` for upload; verify `.xlsx` displays correctly in WeCom client during manual smoke.
- **Active Trellis task:** `task.py current` returned none; report filed under existing task `07-05-wecom-channel-integration`.
