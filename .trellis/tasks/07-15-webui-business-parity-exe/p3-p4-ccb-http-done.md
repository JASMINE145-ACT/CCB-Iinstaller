# Phase 3–4 — Assistants + CCB authority HTTP (`WANd.WEB.ASSISTANTS.001` / `CCB_AUTH.001`)

**Status:** done (2026-07-15) — code-reviewer **PASS** after HTTP-first + Guid→send hang gates

## Delivered

- `GET /api/webui/ccb/authority` · `GET /api/webui/ccb/agents` via `webUiSurface`
- `fetchAssistantsCatalog` / `resolveCcbAuthorityActive`: **HTTP-first** when `isWebUiBrowserMode()` (never await never-settling platform invoke)
- Guid→send hang gates: startup readiness `WEBUI_READY`, skip `ensureStartupReadiness`, warmup skips CCB identity/profile staging, `prepareConversationContinuity` / `stageCcbAssistantProfileForSession` early-return on Web, detail via HTTP agent list
- Memory nav **hidden** on Web (Phase 5 deferred)

## Evidence

| Check | Result |
|-------|--------|
| code-reviewer (3rd pass) | **PASS** — Layer A PASS · Layer B PASS |
| vitest catalog + org + hydrate | 15/15 PASS |
| web-host static-server | 16/16 PASS (earlier + reconfirm) |
| smoke-renderer-imports | PASS (5 files) |

## Manual smoke (pending rebuild)

- [ ] Guid picker ids ≡ exe WanD agents
- [ ] Org sider visible when org configured
