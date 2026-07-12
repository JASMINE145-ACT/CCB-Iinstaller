# WeCom channel integration (extension-first)

**Status:** draft; P1b runtime host landed, manual WeCom credential smoke still pending
**Task:** `.trellis/tasks/07-05-wecom-channel-integration/`
**Packages:** `aionui-src` (extension + UI), `AionCore` (channel API + extension runtime host)

---

## Architecture

| Path | Plugin id | Mode | v1 role |
|------|-----------|------|---------|
| Primary | `ext-wecom-aibot` | WebSocket long connection (BotID + Secret) | Production target |
| Compat | `ext-wecom-bot` | HTTP callback (Token + EncodingAESKey) | Dev/example until P2 security |
| Deprecated | `wecom` (builtin) | Rust stub | Hidden when extensions loaded |

Do not add a builtin Rust WeCom channel implementation for v1. The JS extension host may map `ext-wecom-*`
messages to the existing `PluginType::Wecom` platform enum for formatter/session compatibility, but must preserve
`routing_plugin_id = ext-wecom-aibot` for pairing/outbound routing isolation.

---

## Identity

```text
conversation_id = ext-wecom-aibot:{botId}:{chatId}
user_id         = ext-wecom-aibot:{botId}:{wecomUserId}
platform_type   = ext-wecom-aibot
```

Group v1: internal groups only; ignore non-@bot when `strictGroupAt` config enabled. Prefer structured WeCom bot
mention fields over raw string `@` matching.

### Mode A — per-user sessions + reply-context isolation (2026-07-12)

| Contract | Rule |
|----------|------|
| `WANd.WECOM.SESSION.PER_USER.001` | Channel session / ACP binding key = `(user_id, chat_id)`; group `chatid` shared, memory not |
| `WANd.WECOM.REPLY.CTX.USER.001` | Extension `replyContext` Map keyed by inbound `streamId`, never by group `chatId` alone |
| `WANd.WECOM.REPLY.CTX.OUT.001` | Stream relay / `sendMessage` options must carry `streamId` so JS resolves the correct SDK frame |
| `WANd.WECOM.SLASH.NEW.SCOPE.001` | `/new` / `/reset` only clears the issuer’s `(user, chat)` session |
| `WANd.WECOM.PRIVACY.GROUP.VIS.001` | Memory isolation; replies stay group-visible |
| `WANd.WECOM.PAIR.PER_USER.001` | Pairing is per WeCom userid |

**Out of scope:** Mode B group-as-shared-session. Dual-tree sync for reply-context changes remains under `WANd.WECOM.MEDIA.OUT.SYNC.001`.

Trace: `.trellis/tasks/07-05-wecom-channel-integration/research/wecom-group-per-user-session-2026-07-12.md`

---

## Agent routing

Extension delivers unified inbound messages only. Business agent (WanD orchestrator, etc.) is selected via channel
assistant config, never hardcoded in extension code.

`assistant.wecom.agent` must preserve the selected assistant identity, not just the ACP backend. At minimum keep
`agent_type`, `backend`, `id`, `custom_agent_id`, `name`, and `cli_path` when present. Channel-created ACP
conversations must pass `custom_agent_id` as `assistant.id` and mirror `agent_id`, `custom_agent_id`, `agent_name`,
and `cli_path` into `conversation.extra`, matching the normal desktop Claude Code assistant creation path.

**CCB profile bind (hard requirement — 2026-07-12):** On ACP `session/new`, AionCore must put the configured
specialist id into `_meta.ccbAgentId` / `_meta.acp_meta` (from `extra.preset_assistant_id` or
`extra.custom_agent_id`). Do **not** rely only on the shared
`%LOCALAPPDATA%/CCB-Wanding/.claude/.aionui-next-assistant-profile.json` handoff — desktop Guid and WeCom race that
file; last writer wins and can silently bind `wande-orchestrator` while Settings still show `quotation-agent`.

**Slash reset:** Channel text `/new` (and `/reset`) must map to `session.new` so users can drop a mis-bound ACP
session after changing Agent. Trace:
`.trellis/tasks/07-05-wecom-channel-integration/research/wecom-agent-profile-handoff-race-2026-07-12.md`

See: `.trellis/spec/integration/platform-vertical-packages.md`

---

## Runtime host

AionCore `enable_extension_plugin` starts a managed Node bridge for extension channel `entryPoint` scripts when the
runtime is available. Enable failures must be persisted as `status=error, enabled=false` so startup restore does not
retry a broken extension forever.

The WeCom AI Bot extension must not report bridge `ready` until the SDK reaches authenticated state. Wrong credentials
or SDK errors should fail enable with visible error state.

Trace: `.trellis/tasks/07-05-wecom-channel-integration/research/p0-extension-channel-runtime-trace.md`

---

## Source layout

| Location | Contents |
|----------|----------|
| `aionui-src/examples/ext-wecom-aibot/` | Primary extension (SDK wrapper, inbound, identity) |
| `aionui-src/examples/ext-wecom-bot/` | HTTP callback compat example |
| `aionui-src/.../ChannelModalContent.tsx` | Dynamic extension forms; hide builtin wecom |
| `AionCore/crates/aionui-channel/` | Enable/disable API and extension channel runtime host |
| `AionCore/crates/aionui-extension/` | Manifest load, channel plugin metadata |

---

## Dev setup (main line — 2026-07-09)

**Default:** `start-dev-full.ps1` loads `aionui-src/examples-wecom-dev/ext-wecom-aibot` on every dev launch.
No extra flags. Opt out with `-NoExtensions`.

### UI workflow

1. Start dev: `.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap`
2. Settings → Channels → **ext-企业微信 AI Bot (长连接)** (not the builtin `企业微信` fallback card)
3. Enter **Bot ID** + **Secret** (WeCom admin → AI Bot long-connection)
4. Select **Agent** (e.g. 万鼎报价专家 / `quotation-agent`) — saved to `assistant.wecom.agent` with `custom_agent_id`
5. Toggle channel **on** → WebSocket connects; status shows Connected / Error

### Launcher flags

| Flag | Effect |
|------|--------|
| *(default)* | `AIONUI_EXTENSIONS_PATH=examples-wecom-dev` + `dev-bootstrap launch start --extensions` |
| `-NoExtensions` | Legacy path: `bun run dev` only; clears `AIONUI_EXTENSIONS_PATH`; Channels shows fallback hint |
| `-WithExtensions` | Deprecated alias (wins over `-NoExtensions` if both passed) |

### Paths

| Item | Location |
|------|----------|
| Extension | `D:/Projects/aionui-src/examples-wecom-dev/ext-wecom-aibot/` |
| UI panel | `aionui-src/.../WecomAibotExtensionPanel.tsx` |
| Agent picker helper | `aionui-src/.../channels/channelAgentOptions.ts` — merges `fetchAssistantsCatalog` + `/api/agents` |
| Launcher | `ccb-installer/scripts/start-dev-full.ps1` |

---

## Verification

| Layer | Command / check |
|-------|-----------------|
| AionCore | `cargo test -p aionui-channel` |
| Outbound media | `cargo test -p aionui-channel outgoing_to_json`; `pnpm exec vitest run tests/unit/wecom/ext-wecom-aibot-outbound-media.test.ts` |
| Unit | `pnpm test tests/unit/wecom/ext-wecom-aibot-identity.test.ts tests/unit/wecom/ext-wecom-aibot-inbound.test.ts tests/unit/wecom/channelAgentOptions.test.ts` |
| E2E | `ext-lifecycle`, `ext-ipc-queries`, `ext-channels` (with dev-ext) |
| Manual | BotID + Secret smoke after runtime host (8 scenarios in PRD) + **M2** file bubble |

---

## Outbound media (P0 file)

| Contract | Rule |
|----------|------|
| OUT.001 | File JSON fields from AionCore; JS may auto-attach allowlisted absolute paths in final text |
| OUT.SECURITY.001 | CCB workspace/artifacts roots only (incl. `D:\CCB-Wanding\workspace`); ≤20MB; quotation-centric extensions |
| OUT.CTX.001 | `uploadMedia` + `replyMedia` before `replyStream(finish=true)` |
| OUT.DEGRADE.001 | Fail → `[文件发送失败] …`; stream still finishes |
| **STREAM.TURN.001** | Channel relay **arms on agent `Start`**; drop Text / ignore Finish before Start (blocks warmup/resume history stitch into WeCom bubble). AionCore `stream_relay.rs` — parity intent with desktop `staleTurnStreamFilter` (`06-19`). |
| IN.001 | SDK `downloadFile` → temp dir → `attachments` → agent `files[]` |
| IN.SECURITY.001 | Inbound ext allowlist + 20MB + TTL cleanup under `wecom-inbound/` |

Inbound image/file: **implemented (P1)** — `inbound-media.js` downloads to `%LOCALAPPDATA%/CCB-Wanding/wecom-inbound`, attachments → `SendMessageRequest.files`.

**History stitch / 倒灌 (2026-07-12, `WANd.CHANNEL.STREAM.TURN.001`):** WeCom outbound used to concatenate warmup/resume replay Text into the live `replyStream` bubble. Fix: `ChannelStreamRelay` ignores Text until `AgentStreamEvent::Start` for the current send (also ignores pre-Start `Finish`). Tests: `aionui-channel` `--test stream_relay_test` (`wecom_drops_pre_start_replay_text`). Task: `07-12-yolo-mode-alias-vision-regression` P1; related desktop: `06-19-quotation-behavior-backflow`.

---

## References

- PRD: `.trellis/tasks/07-05-wecom-channel-integration/prd.md`
- Gap analysis: `.trellis/tasks/07-05-wecom-channel-integration/research/gap-analysis-ext-wecom-bot.md`
- SDK: https://www.npmjs.com/package/@wecom/aibot-node-sdk
