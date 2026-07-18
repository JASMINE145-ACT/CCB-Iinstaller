# Research — existing web / Apple access assets (2026-07-14)

## Question

Has this repo already started a 「网页版给苹果用户」Trellis task? What path matches 「和 1.1.9 一模一样」?

## Finding

**No finished / active Trellis task** for productized Web-for-Apple. Closest artifacts:

| Path | Status | Relation |
|------|--------|----------|
| `.trellis/spec/integration/web-version-ios-access-todo.md` | Todo since 2026-06-24 (1.1.1 era) | **Canonical recommended MVP**: host Windows + AionCore WebUI `:25808` for browser (iOS then; extends to Mac Safari) |
| `docs/mac-support-plan.md` | Design only | Native Mac `.pkg` — different product, ~4 day estimate, CI macOS runners |
| `ccb-wanding-web/` | Prototype | Wrong API contract (`localhost:3000` sessions/ws); **not** production |
| `07-12-release-1.1.9` | Done | Ships Windows Full NSIS; does not include Web rollout checklist |
| AionUI `webuiConfig.ts` / Settings WebUI | Exists in aionui-src | Keys: `webui.desktop.enabled`, `webui.desktop.allowRemote`, `webui.desktop.port`; hosted via `@aionui/web-host` |

## Recommendation (architecture)

Reuse the 2026-06-24 decision, rebase baseline to **1.1.9**:

```text
Apple browser → host:25808 WebUI → Windows 1.1.9 install (full four-layer + MCP)
```

Do **not** default to Mac native installer for "can't install Windows exe" unless user explicitly rejects the WebUI-host path.

## Caveats ("一模一样" gaps)

- Browser sessions use **host** MCP/data/credentials — Excel/local files behave as on that Windows machine.
- Safari mobile upload/download / PWA install need smoke evidence.
- Public internet exposure of `:25808` is security-sensitive; prefer Tailscale MVP.
- Desktop Setting toggle historically had SQLite vs file preference bugs (see comment in `webuiConfig.ts`) — verify enable persists after restart on 1.1.9 host.

## Sources

- `.trellis/spec/integration/web-version-ios-access-todo.md`
- `.trellis/spec/index.md` (doc map row)
- `docs/mac-support-plan.md`
- `aionui-src/packages/desktop/src/process/utils/webuiConfig.ts`
- `07-12-release-1.1.9` delivery
