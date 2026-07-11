# Research — WeCom enable error passthrough (2026-07-10)

**Prior state (P1c):** False-success toast fixed; credential merge works; manual smoke fails at WeCom SDK.

**23:12 log root cause:** `errcode=853000 errmsg=invalid bot_id or secret` — not runtime missing.

**UX gap:** Panel shows generic `Enable failed — check credentials and extension runtime` because:
1. SDK logs auth failure to stderr; bridge does not emit `HostEvent::Error` until 45s init timeout
2. `PluginStatusResponse` / `ChannelPluginStatusView` omit `error` field on status API
3. `waitForAuthenticated` never sees `status=error` because logger.error does not update state

**Fix strategy (rev 5):**
- `sdk-runtime.js`: auth failure in logger → `setConnectionStatus('error', msg)` → fast throw
- `host.rs`: stderr auth pattern → `HostEvent::Error` (fallback)
- `manager.rs`: in-memory `plugin_status_errors` surfaced via status API `error` field
- Frontend already maps `raw.error` in `toPluginStatus`
