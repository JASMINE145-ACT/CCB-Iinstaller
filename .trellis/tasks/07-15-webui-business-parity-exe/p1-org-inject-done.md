# Phase 1 — Web runtime inject (`WANd.WEB.ORG_NAV.001`)

**Status:** done (2026-07-15)

## Delivered

- `GET /api/webui/runtime-config` on web-host (`webUiSurface.readOrgServerUrl` + SSO/JWT fields)
- Renderer `hydrateWebUiRuntimeConfig()` before React mount (`main.tsx`) → `window.__orgServerUrl` / related globals
- Unit: `hydrateWebUiRuntimeConfig.test.ts`, `static-server` runtime-config route

## Deploy note

Requires rebuilt/redeployed AionUI (desktop + web-host) on host — live `D:\CCB-Wanding` does not pick this up until sync.
