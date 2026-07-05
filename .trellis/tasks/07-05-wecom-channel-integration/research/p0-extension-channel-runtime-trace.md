# P0 — Extension channel runtime lifecycle trace

**Task:** `07-05-wecom-channel-integration`  
**Date:** 2026-07-04  
**Purpose:** Answer P0 gate questions before P1b bridge / live WeCom credentials.

---

## Summary (go/no-go)

| Question | Answer |
|----------|--------|
| Who starts extension channel JS? | **Nobody today** — AionCore persists metadata only |
| Does enable start WebSocket? | **No** — `enable_extension_plugin` does not load `entryPoint` |
| Does disable stop runtime? | **No runtime to stop** — DB flag only |
| Restore on startup? | Extension plugins **skipped** in `restore_plugins` |
| **P1 go/no-go** | **Conditional NO-GO** for end-to-end messaging; **GO** for scaffold + UI + tests |

**Verdict:** Ship `ext-wecom-aibot` extension code and UI now. **Block P1b production smoke** until AionCore implements extension channel runtime host (Node subprocess executing `entryPoint` JS with `start()`/`stop()`/`onMessage` bridge).

---

## Call chain (enable)

```
Renderer ChannelModalContent
  → channel.enablePlugin.invoke({ plugin_id, config })
  → POST /api/channel/plugins/enable
  → routes.rs enable_plugin()
       ├─ resolve_extension_channel_plugin() → ext-wecom-aibot metadata
       └─ manager.enable_extension_plugin()   ← metadata-only
```

### AionCore: metadata-only enable

File: `AionCore/crates/aionui-channel/src/manager.rs`

- `enable_extension_plugin`: encrypts config, upserts DB row, sets `enabled: true`, status `Stopped`, **does not** insert into `plugins` DashMap or call JS `start()`.
- Log: `"extension plugin enabled (metadata-only mode)"`.

### Builtin channels (contrast)

- `enable_plugin`: creates `Box<dyn ChannelPlugin>` via Rust factory, `initialize()`, **`start().await`**, stores in `plugins` map.

---

## Call chain (restore)

File: `AionCore/crates/aionui-channel/src/manager.rs` — `restore_plugins`

```rust
if PluginType::from_str_opt(&row.r#type).is_none() {
    // extension plugin id (e.g. ext-wecom-aibot)
    "skipping extension plugin runtime restore; metadata-only mode"
    continue;
}
```

Extension channel plugins never auto-start after app restart.

---

## Extension manifest resolution (works)

File: `AionCore/crates/aionui-extension/src/resolvers/channel_plugin.rs`

- Parses `aion-extension.json` → `ResolvedChannelPlugin` with absolute `entry_point` path.
- Exposed via `GET /api/extensions/channel-plugins` and merged into Channels settings list.

**Loader validates manifest; runtime does not execute entryPoint.**

---

## ext-wecom-aibot plugin contract (ready)

File: `aionui-src/examples/ext-wecom-aibot/channels/ext-wecom-aibot-channel.js`

| Method | Purpose |
|--------|---------|
| `constructor(config)` | Receives `{ credentials, config }` from host |
| `start()` | Validates botId/secret, `connectClient()` → `@wecom/aibot-node-sdk` WSClient |
| `stop()` | `disconnectClient()`, clears state |
| `onMessage(handler)` | Unified inbound (`toUnifiedIncomingMessage`) |
| `sendMessage` / `editMessage` | Stream reply via SDK |
| `isRunning()` / `getBotInfo()` | Status for UI |

Aligns with `ext-wecom-bot`, `ext-feishu`, `e2e-test-channel` patterns.

---

## Recommended runtime host (next AionCore workstream)

Minimal host responsibilities:

1. On `enable_extension_plugin` → resolve `entry_point` from `ExtensionRegistry`
2. Spawn managed Node (reuse `aionui-runtime` managed Node) or in-process worker
3. `require(entryPoint)` → `new Plugin(config)` → `await plugin.start()`
4. Wire `onMessage` → existing `ChannelMessageService` / pairing pipeline
5. On disable/shutdown → `plugin.stop()`
6. Surface `connection.status` / `last_error` via plugin status broadcast (extend `PluginStatusResponse`)
7. Restore enabled extension plugins on startup (same as builtin)

**Out of scope for this trace:** WanD packaging path for bundled extensions.

---

## UI honesty (implemented)

`ChannelModalContent` shows connection panel for `ext-wecom-aibot`:

- Displays `connected` / `status` from API
- Warns when enabled but not connected (metadata-only host gap)

---

## References

- Gap analysis §3: [`gap-analysis-ext-wecom-bot.md`](./gap-analysis-ext-wecom-bot.md)
- Extension example: `D:/Projects/aionui-src/examples/ext-wecom-aibot/`
- AionCore manager: `AionCore/crates/aionui-channel/src/manager.rs`
- AionCore routes: `AionCore/crates/aionui-channel/src/routes.rs`
