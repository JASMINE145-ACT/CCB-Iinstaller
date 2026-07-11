# Research — WeCom enable false-success (2026-07-09)

**Symptom:** Toast「渠道已启用」but panel shows「未启用」, toggle OFF.

**Root cause class:** Layer A5 — UI success feedback disconnected from backend contract.

## Trace

1. User enables `ext-wecom-aibot` → `POST /api/channel/plugins/enable`
2. AionCore on failure returns **HTTP 200** with `{ data: { success: false, error: "..." } }` (`routes.rs` enable_plugin)
3. `enable_extension_plugin` calls `update_extension_plugin_enable_error` → `enabled: false`, `status: error`
4. Frontend `httpPost<void>` unwraps `data` and **discards** `BridgeResponse`; `ChannelModalContent` shows `Message.success` on no throw
5. `loadPluginStatus()` reflects `enabled: false` → panel「未启用」

## Secondary hypothesis (re-enable)

When `hasToken` and Secret field left blank (saved-secret UX), `enableConfig` filters empty secret → extension `validateConfig()` fails with missing secret.

## Contracts to fix

| ID | Behavior |
|----|----------|
| `WANd.WECOM.ENABLE.001` | `success: false` must surface as error toast, never success toast |
| `WANd.WECOM.ENABLE.002` | Re-enable with saved secret must merge stored credentials before `enablePlugin` |
| `WANd.WECOM.ENABLE.003` | Panel shows `status.error` when enable fails (connected vs enabled labels) |

## Evidence to collect on manual retry

- Network tab: `POST /api/channel/plugins/enable` response body
- aioncore log: `enable extension plugin failed`
