# Gap analysis — WeCom extension channel v1 (rev 3)

**Task:** `07-05-wecom-channel-integration`  
**Updated:** 2026-07-04 (incorporates external review)  
**Scope:** Extension-first; no Rust `PluginType::Wecom`

## Executive summary

| Dimension | Finding |
|-----------|---------|
| Technical feasibility | **High** |
| Reuse | **High** — `ext-wecom-bot` + SDK dep + partial UI |
| Production readiness | **Low** — runtime host unproven; example untested |
| **P0 go/no-go blocker** | Extension runtime lifecycle must be decided before P1 |

**Verdict:** Architecture direction approved (extension + SDK primary). **Do not approve P1 until P0 outputs explicit go/no-go on extension runtime host.**

---

## 1. Code path inventory

| Path | File(s) | Role today |
|------|---------|------------|
| HTTP callback example | `aionui-src/examples/ext-wecom-bot/` | Compat: Token + EncodingAESKey, webhook, stream poll |
| SDK dependency | `aionui-src/package.json` → `@wecom/aibot-node-sdk` | **Not imported** |
| Long-conn UI (unwired) | `WecomConfigForm.tsx` | BotID + Secret form; wrongly uses `plugin_id: 'wecom'` |
| Channels list | `ChannelModalContent.tsx` | Builtin `wecom` = `coming_soon`; form not mounted |
| Extension channel UI | `ChannelModalContent.tsx` `extensionChannels` | Dynamic fields from `extensionMeta` |
| AionCore metadata | `AionCore/.../manager.rs` `enable_extension_plugin` | Persist config only — **no JS execution** |
| Builtin stub | `AionCore/.../routes.rs` `("wecom", "WeCom")` | Placeholder — **do not implement Rust plugin** |
| E2E baseline | `ext-ipc-queries.e2e.ts`, `ext-channels.e2e.ts` | Extension manifest + Channels page |

---

## 2. Integration mode matrix (by product object — do not mix)

| Product object | Mode | Credentials | Optional | v1 |
|----------------|------|-------------|----------|-----|
| **智能机器人 AI Bot** | Long connection (recommended) | BotID, Secret | `wsUrl` (private deploy override; default `wss://openws.work.weixin.qq.com`) | **Primary** |
| **智能机器人 AI Bot** | URL callback | Token, EncodingAESKey | Public callback URL | **Compat** (harden before prod) |
| **企业微信自建应用** | API message receive | CorpID, AgentID, Secret, URL, Token, EncodingAESKey | — | **Out of v1** |
| **群机器人** | Webhook push | Webhook URL | — | **Out of v1** (no full pairing) |

Note: AI Bot URL callback and corp self-built app callback both use Token + EncodingAESKey at the wire level, but **product semantics, identity fields, and routing differ**. Implement and document as separate extensions — do not merge forms.

### Plugin naming (avoid UI confusion)

| id | Role |
|----|------|
| `ext-wecom-aibot` | Primary — long connection (BotID + Secret [+ optional wsUrl]) |
| `ext-wecom-bot` | Compat — HTTP callback (Token + EncodingAESKey) |
| `wecom` (builtin) | **Deprecated stub** — remove coming-soon card or hide; never enable |

---

## 3. Extension runtime lifecycle gap (P0 hard blocker)

AionCore `enable_extension_plugin` only persists metadata. P0 must answer:

| Question | Must document in P0 |
|----------|---------------------|
| Who starts the extension? | Desktop main process / Node host / `just dev-ext` / installer service? |
| Who stores credentials? | AionCore encrypted store vs extension local vs UI-only? |
| Does enable actually start WebSocket? | Not metadata-only toggle |
| Does disable stop connection + drop inbound? | Verified behavior |
| Crash recovery | Backoff reconnect + status surfaced to UI |
| Single BotID policy | One active connection per workspace |
| Observability | `last_error`, `last_connected`, reconnecting state in Channels UI |
| Log location | Where ops/user reads connection failures |

**If no runtime host exists today:** P1a spike implemented extension JS; **AionCore host is the remaining P0 deliverable** before P1b bridge. See [`p0-extension-channel-runtime-trace.md`](./p0-extension-channel-runtime-trace.md).

---

## 4. v1 scope — internal group rules

### In scope

- Internal DM (单聊)
- Internal group (内部群) with strict triggers

### Out of scope

- External customer groups (外部客户群)
- Corp self-built application channel
- Group webhook-only
- Per-group-as-shared-session (optional defer)

### Group behavior (PRD must enforce)

| Rule | v1 |
|------|-----|
| Trigger | Only `@bot` or explicit reply/thread to bot |
| Non-trigger group messages | Ignored — no agent routing |
| DM first message | Standard pairing flow |
| Group first @bot | Pairing / auth guidance; optional admin gate |
| Unauthorized member @bot | Pairing prompt only — no agent |
| Paired user @bot in group | Route to bound Agent |

### Identity namespacing

Do not use bare `chatId`:

```text
conversation_id = {pluginId}:{botId}:{chatId}
user_id         = {pluginId}:{botId}:{wecomUserId}
platform_type   = ext-wecom-aibot | ext-wecom-bot (not builtin wecom)
```

### Manual acceptance — visibility

- User inside bot visibility range can interact
- User outside visibility range cannot add/trigger bot
- Non-authorized group members cannot越权 trigger Agent

---

## 5. Security risk register

### Compat path (`ext-wecom-bot`) — required before production label

| ID | Category | Current | Required |
|----|----------|---------|----------|
| S1 | Signature | `===` hex compare | `timingSafeEqual`; length mismatch safe branch |
| S2 | Replay | Partial dedup | Timestamp window (e.g. ±5 min); nonce/signature TTL cache; msgid dedup |
| S3 | AES decrypt | Basic PKCS7 | Key length/format check; msg_len bounds; max plaintext size |
| S4 | receiveid | Not checked | Decrypted receiveid matches configured bot/corp identity |
| S5 | XML | Plain parse | XXE disabled; body size limit; expected content-type/method |
| S6 | response_url | Unrestricted fetch | HTTPS only; allowlist; block private IP / localhost (SSRF) |
| S7 | Stream state | In-memory | Timeout; concurrency cap; cleanup on stop; req_id idempotency |
| S8 | Credentials | In extension config | Encrypted at rest; log redaction; no plaintext in renderer persistence |
| S9 | Logging | May log payloads | No full message body / secrets in logs by default |
| S10 | Multi-tenant | Weak | Namespace by pluginId + botId + workspace |
| S11 | Audit | None | pairing approve, enable/disable, credential update events |
| S12 | Supply chain | SDK pinned in lockfile | CI audit; upgrade policy for `@wecom/aibot-node-sdk` |

### Primary path (SDK long connection)

| ID | Requirement |
|----|-------------|
| P1 | TLS validation on WebSocket |
| P2 | Reconnect with exponential backoff + max attempts |
| P3 | Auth failure — no infinite retry |
| P4 | Single BotID singleton lock per workspace |
| P5 | Stream backpressure + user interrupt handling |

**Release rule:** Compat path **cannot** be labeled production-ready unless S1–S12 (compat-relevant subset) pass. If deferred, UI must show **experimental / dev-only / not bundled**.

---

## 6. Primary path gaps (long connection)

| Item | Status |
|------|--------|
| `ext-wecom-aibot` extension scaffold | **Done** (P1a) |
| SDK wrapper (connect, auth, reconnect, stream) | **Done** (scaffold; live WS pending credentials + runtime host) |
| Unified inbound (`inbound.js`) | **Done** |
| Bridge → AionCore channel pipeline | **Blocked** — metadata-only enable |
| Pairing (`platformType` = extension id) | Design ready; host wiring pending |
| Optional `wsUrl` + `strictGroupAt` in manifest | **Done** |
| Runtime host wiring | **NO-GO** — see [`p0-extension-channel-runtime-trace.md`](./p0-extension-channel-runtime-trace.md) |

---

## 7. UI / product gaps

| Issue | Fix | Status |
|-------|-----|--------|
| `wecom` builtin `coming_soon` | Hide when ext loaded | **Done** |
| `WecomConfigForm` → `plugin_id: 'wecom'` | Deprecated; use extension dynamic form | **Deprecated comment** |
| Token/AESKey copy on toggle | Separate forms per mode | **Done** (ext-wecom-bot vs ext-wecom-aibot) |
| Two WeCom cards (builtin + ext) | Single primary + compat ext | **Done** |
| Connection status in UI | Panel + runtime-host warning | **Done** (P1a) |

### Agent routing boundary (platform decoupling)

WeCom extension delivers messages into **generic agent routing only**. WanD orchestrator / CCB MCP is selected via Agent config (`assistant.{platform}.agent`), never hardcoded in extension.

---

## 8. P0 required outputs (go/no-go gate)

P0 is **not** complete until this doc includes filled sections:

1. [x] Code path inventory (§1)
2. [x] Extension runtime lifecycle decision (§3 + [`p0-extension-channel-runtime-trace.md`](./p0-extension-channel-runtime-trace.md))
3. [x] Credential schema decision (§2 — botId, secret, optional wsUrl, strictGroupAt)
4. [x] Primary/compat mode matrix (§2)
5. [x] Security risk register (§5)
6. [x] **Explicit go/no-go for P1** — **Conditional NO-GO** for E2E messaging until AionCore extension channel runtime host; **GO** for P1a scaffold/UI/tests

### Go/no-go detail (2026-07-04)

| Milestone | Decision |
|-----------|----------|
| P1a scaffold + SDK wrapper + unified inbound | **GO** |
| P1b bridge + live WS smoke | **NO-GO** until runtime host |
| P2 compat production label | **NO-GO** until security checklist |
| Full P1–P5 | **NO-GO** until P0 host + credentials smoke |

---

## 9. User evidence still needed

- [ ] AI Bot admin screenshot (long-connection mode)
- [ ] Test BotID + Secret (redacted OK)
- [ ] Internal group for @bot test
- [ ] Visibility range configuration screenshot
- [ ] WanD: bundled first-party extension vs `just dev-ext` only

---

## References

- SDK: https://www.npmjs.com/package/@wecom/aibot-node-sdk
- Example: `D:/Projects/aionui-src/examples/ext-wecom-bot/`
- External review archive: [`external-review-chatgpt-2026-07-04.md`](./external-review-chatgpt-2026-07-04.md)
