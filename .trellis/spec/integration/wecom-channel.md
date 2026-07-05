# WeCom channel integration (extension-first)

**Status:** draft — **parked** after P1a (2026-07-04); P1b deferred until AionCore runtime host  
**Task:** `.trellis/tasks/07-05-wecom-channel-integration/`  
**Packages:** `aionui-src` (extension + UI), `AionCore` (channel API + future runtime host)

---

## Architecture

| Path | Plugin id | Mode | v1 role |
|------|-----------|------|---------|
| Primary | `ext-wecom-aibot` | WebSocket long connection (BotID + Secret) | Production target |
| Compat | `ext-wecom-bot` | HTTP callback (Token + EncodingAESKey) | Dev/example until P2 security |
| Deprecated | `wecom` (builtin) | Rust stub | Hidden when extensions loaded |

**Do not** implement Rust `PluginType::Wecom` for v1.

---

## Identity

```text
conversation_id = ext-wecom-aibot:{botId}:{chatId}
user_id         = ext-wecom-aibot:{botId}:{wecomUserId}
platform_type   = ext-wecom-aibot
```

Group v1: internal groups only; ignore non-@bot when `strictGroupAt` config enabled; default trusts WeCom platform @bot delivery filter.

---

## Agent routing

Extension delivers unified inbound messages only. Business agent (WanD orchestrator, etc.) selected via `assistant.{platform}.agent` — never hardcoded in extension.

See: `.trellis/spec/integration/platform-vertical-packages.md`

---

## P0 blocker: extension channel runtime host

AionCore `enable_extension_plugin` is **metadata-only** (config persist, no JS `start()`).

Trace: `.trellis/tasks/07-05-wecom-channel-integration/research/p0-extension-channel-runtime-trace.md`

**P1b blocked** until host executes `entryPoint` and bridges `onMessage` to channel pipeline.

---

## Source layout

| Location | Contents |
|----------|----------|
| `aionui-src/examples/ext-wecom-aibot/` | Primary extension (SDK wrapper, inbound, identity) |
| `aionui-src/examples/ext-wecom-bot/` | HTTP callback compat example |
| `aionui-src/.../ChannelModalContent.tsx` | Dynamic extension forms; hide builtin wecom |
| `AionCore/crates/aionui-channel/` | Enable/disable API, builtin Rust plugins |
| `AionCore/crates/aionui-extension/` | Manifest load, channel plugin metadata |

---

## Verification

| Layer | Command / check |
|-------|-----------------|
| Unit | `pnpm exec vitest run tests/unit/wecom/ext-wecom-aibot-*.test.ts` |
| E2E | `ext-lifecycle`, `ext-ipc-queries`, `ext-channels` (with dev-ext) |
| Manual | BotID + Secret smoke after runtime host (8 scenarios in PRD) |

---

## References

- PRD: `.trellis/tasks/07-05-wecom-channel-integration/prd.md`
- Gap analysis: `.trellis/tasks/07-05-wecom-channel-integration/research/gap-analysis-ext-wecom-bot.md`
- SDK: https://www.npmjs.com/package/@wecom/aibot-node-sdk
