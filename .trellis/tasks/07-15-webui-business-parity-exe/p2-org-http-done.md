# Phase 2 — Browser org HTTP (`WANd.WEB.ORG_NAV.001`)

**Status:** done (2026-07-15)

## Delivered

- Same-origin proxy ` /api/webui/org/*` → org server URL from surface
- `orgHttpBridge` browser branch uses `/api/webui/org` + credentials when `isWebUiBrowserMode()`
- Unit: `orgHttpBridge.test.ts`, static-server org proxy tests

## Manual smoke (pending host rebuild)

- [ ] `/org-knowledge` `/price-library` `/suppliers` open under Web login
