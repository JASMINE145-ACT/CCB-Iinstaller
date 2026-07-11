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

---

## Agent routing

Extension delivers unified inbound messages only. Business agent (WanD orchestrator, etc.) is selected via channel
assistant config, never hardcoded in extension code.

`assistant.wecom.agent` must preserve the selected assistant identity, not just the ACP backend. At minimum keep
`agent_type`, `backend`, `id`, `custom_agent_id`, `name`, and `cli_path` when present. Channel-created ACP
conversations must pass `custom_agent_id` as `assistant.id` and mirror `agent_id`, `custom_agent_id`, `agent_name`,
and `cli_path` into `conversation.extra`, matching the normal desktop Claude Code assistant creation path.

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
| Unit | `pnpm test tests/unit/wecom/ext-wecom-aibot-identity.test.ts tests/unit/wecom/ext-wecom-aibot-inbound.test.ts tests/unit/wecom/channelAgentOptions.test.ts` |
| E2E | `ext-lifecycle`, `ext-ipc-queries`, `ext-channels` (with dev-ext) |
| Manual | BotID + Secret smoke after runtime host (8 scenarios in PRD) |

---

## References

- PRD: `.trellis/tasks/07-05-wecom-channel-integration/prd.md`
- Gap analysis: `.trellis/tasks/07-05-wecom-channel-integration/research/gap-analysis-ext-wecom-bot.md`
- SDK: https://www.npmjs.com/package/@wecom/aibot-node-sdk
