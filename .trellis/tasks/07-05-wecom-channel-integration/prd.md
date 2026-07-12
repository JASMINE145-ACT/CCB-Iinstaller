# PRD — WeCom channel integration (rev 3)

**Status:** draft (P0 gate — external review incorporated)  
**Parked:** 2026-07-04 — P1a recorded; P1b+ deferred (assignee not urgent)  
**Created:** 2026-07-04  
**Revised:** 2026-07-04 rev 3 (ChatGPT review → gap doc + AC expansion)  
**Task:** `07-05-wecom-channel-integration`

## Problem

Users see **WeCom / 企业微信** marked **coming soon** on Channels settings, while substantial groundwork already exists in `aionui-src` but is not production-ready or correctly wired.

## Goal

Enable **Enterprise WeCom AI Bot** conversations with pairing via:

1. **Primary:** extension `ext-wecom-aibot` + `@wecom/aibot-node-sdk` WebSocket long connection (BotID + Secret; optional `wsUrl`)
2. **Compat:** hardened `ext-wecom-bot` HTTP callback (Token + EncodingAESKey) — **not production-labeled until P2 security passes**

## Non-goals (v1)

- Rust `PluginType::Wecom` / `plugins/wecom/` in AionCore
- Corp self-built application (CorpID + AgentID + Secret) as channel
- Group robot webhook-only
- External customer groups (外部客户群)
- Hardcoding WanD / CCB orchestrator or business MCP inside WeCom extension
- Personal WeChat (`weixin`)

## Agent routing boundary

WeCom extension only delivers messages into the **generic agent routing layer**. Business Agent (e.g. WanD orchestrator) is selected via `assistant.{platform}.agent` config — never embedded in extension code. Aligns with `07-03-platform-business-decoupling`.

## Integration modes (by product object)

| Product object | Mode | Credentials | Optional | v1 |
|----------------|------|-------------|----------|-----|
| AI Bot | Long connection | BotID, Secret | `wsUrl` (Advanced) | **Primary** |
| AI Bot | URL callback | Token, EncodingAESKey | Public callback URL | Compat (hardened) |
| Corp self-built app | API receive | CorpID, AgentID, Secret, URL, Token, AESKey | — | Out of v1 |
| Group robot | Webhook | Webhook URL | — | Out of v1 |

**Do not** use one form for BotID/Secret and Token/EncodingAESKey. Separate extensions or explicit mode-specific forms.

### Plugin ids

| id | Role |
|----|------|
| `ext-wecom-aibot` | Primary long connection |
| `ext-wecom-bot` | Compat HTTP callback |
| `wecom` (builtin) | Deprecated stub — hide from UI |

## v1 scope

### In scope

- Internal DM (单聊) + pairing
- Internal group (内部群) — **@bot only** (or explicit reply/thread to bot)

### Group rules

| Scenario | v1 behavior |
|----------|-------------|
| DM first message | Pairing flow |
| Group @bot (unauthorized user) | Pairing / auth guidance only |
| Group @bot (paired user) | Route to bound Agent (**Mode A** — per user session) |
| Group message without @bot | **Ignored** |
| Group-as-shared-session (**Mode B**) | **Out of scope** this task |

### Mode A — per-person group sessions (2026-07-12)

**Decision:** Agent memory is keyed by `(paired WeCom userId, group chatid)`. Replies remain **group-visible** (isolation ≠ private reply).

| Contract | Behavior |
|----------|----------|
| `WANd.WECOM.SESSION.PER_USER.001` | Two group members → two channel sessions / ACP bindings |
| `WANd.WECOM.REPLY.CTX.USER.001` | Concurrent @ cannot overwrite SDK reply frames (key by inbound `streamId`) |
| `WANd.WECOM.REPLY.CTX.OUT.001` | Outbound send/edit correlates via `options.streamId` |
| `WANd.WECOM.SLASH.NEW.SCOPE.001` | `/new` resets only issuer `(user, chat)` |
| `WANd.WECOM.PRIVACY.GROUP.VIS.001` | Mode A isolates memory, not visibility |
| `WANd.WECOM.PAIR.PER_USER.001` | Pairing per platform user id |

**Manual blockers:** M-G1 (dual overlapping @), M-G2 (A `/new` leaves B intact). **M-G3** (unauthorized C) optional / non-blocking.

Research: [`research/wecom-group-per-user-session-2026-07-12.md`](./research/wecom-group-per-user-session-2026-07-12.md)

### Identity namespacing

```text
conversation_id = {pluginId}:{botId}:{chatId}
user_id         = {pluginId}:{botId}:{wecomUserId}
platform_type   = extension id (not builtin wecom)
session key     = (user_id, chat_id)   # Mode A — not chat_id alone
reply context   = streamId             # not chat_id
```

## Acceptance criteria

### P0 — Gap analysis + go/no-go (blocks P1)

- [ ] [`research/gap-analysis-ext-wecom-bot.md`](./research/gap-analysis-ext-wecom-bot.md) complete (inventory, runtime lifecycle, schema, security register)
- [ ] Extension runtime lifecycle **decision** documented (who start/stop/reconnect; enable ≠ metadata-only)
- [ ] Explicit **go/no-go for P1** recorded after runtime spike
- [ ] Integration mode matrix signed off

### P1a — SDK connection spike (before full bridge)

- [ ] `ext-wecom-aibot` starts with test BotID/Secret (+ optional wsUrl)
- [ ] States visible: disconnected / connecting / authenticated / reconnecting / error
- [ ] Enable starts connection; disable closes WebSocket and stops inbound handling
- [ ] Single BotID singleton lock per workspace
- [ ] Credentials in approved secret store; redacted from logs

### P1b — Channel bridge

- [ ] Inbound → unified channel pipeline; outbound stream via SDK
- [ ] Pairing works for DM; group pairing rules per table above
- [ ] Namespaced ids; `@bot`-only group trigger
- [ ] Channel status + last error in UI

### P1e — Outbound file (P0 media; inbound deferred)

Contracts: `WANd.WECOM.MEDIA.OUT.001` / `OUT.SECURITY.001` / `OUT.CTX.001` / `OUT.DEGRADE.001` / `OUT.SYNC.001`

- [x] AionCore `outgoing_to_json` passes `messageType=file` + `file_url`/`file_path`/`file_name`
- [x] Extension allowlist (CCB workspace roots incl. `D:\CCB-Wanding\workspace`), size ≤20MB, ext whitelist
- [x] `uploadMedia` → `replyMedia` **before** `replyStream(finish=true)` clears reply context
- [x] Validation/upload failure → `[文件发送失败]` text; stream still finishes
- [x] `examples-wecom-dev` and `examples/ext-wecom-aibot` stay in sync
- [x] Unit: `cargo test -p aionui-channel outgoing_to_json`; `vitest …/ext-wecom-aibot-outbound-media.test.ts`
- [x] Inbound image/file — **implemented (P1)** — download + attachments + agent `files[]`
- [ ] Manual **M2**: quotation Excel appears as WeCom **file** bubble (not text-only)
- [ ] Manual **M3**: send Excel in WeCom → agent parses (not placeholder-only)

### P2 — Compat security (production label gate)

- [ ] HTTP callback rejects: bad signature, stale timestamp, replay, malformed XML, oversized payload, receiveid mismatch
- [ ] `timingSafeEqual` for signatures (verified by test + code review)
- [ ] XML: XXE off, size limits
- [ ] `response_url`: HTTPS + allowlist + SSRF blocks
- [ ] **If checklist incomplete:** UI labels compat as experimental/dev-only; not bundled as production

### P3 — UI

- [ ] Remove builtin `wecom` coming-soon confusion; primary = `ext-wecom-aibot`
- [ ] Separate credential UX for long-conn vs callback (no mixed Token/BotID copy)
- [ ] Retire or retarget `WecomConfigForm` → `ext-wecom-aibot` (not `plugin_id: 'wecom'`)

### P4 — Tests + packaging

- [ ] Unit tests: signature, decrypt bounds, replay, stream timeout
- [ ] E2E: extension on Channels tab; enable/disable
- [ ] WanD packaging note if first-party (not vertical package — no `wanding`/`ccb` in extension name/path)

### P5 — Spec

- [ ] `.trellis/spec/integration/wecom-channel.md`

### Manual smoke (required)

- [ ] Internal DM: pairing → approve → round-trip + stream
- [ ] Internal group: @bot → reply; **non-@bot ignored**
- [ ] Visibility: in-range user OK; out-of-range blocked
- [ ] Disable channel → no further agent triggers
- [ ] SDK disconnect → auto reconnect
- [ ] Wrong Secret → clear UI error
- [ ] Duplicate enable same BotID → reject or reuse single connection
- [ ] **M2 media:** agent reply with allowlisted `.xlsx` path → WeCom file message

## Open questions

1. AI Bot long-connection available in corp admin?
2. Test BotID + Secret + visibility range screenshot
3. Internal group for @bot test
4. WanD: bundle `ext-wecom-aibot` as first-party vs dev-ext only

## References

- Gap analysis: [`research/gap-analysis-ext-wecom-bot.md`](./research/gap-analysis-ext-wecom-bot.md)
- External review: [`research/external-review-chatgpt-2026-07-04.md`](./research/external-review-chatgpt-2026-07-04.md)
- Example: `D:/Projects/aionui-src/examples/ext-wecom-bot/`
- SDK: https://www.npmjs.com/package/@wecom/aibot-node-sdk
- Platform decoupling: `.trellis/spec/integration/platform-vertical-packages.md`
