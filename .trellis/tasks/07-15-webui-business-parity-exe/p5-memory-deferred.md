# Phase 5 — Memory (`WANd.WEB.MEMORY.001`) — **DEFERRED**

**Status:** deferred (AC updated 2026-07-15)

## Decision

Memory / precipitation HTTP surfaces are **not** in Web v1.

## Product behavior

- Sider **Memory** entry: `visible = ccbAuthorityActive && !isWebUiBrowserMode()` — explicitly **exe-only**
- Conversation precipitation / personal-memory polling disabled on WebUI
- Runbook states: Web deferred; use Windows exe for Memory

Re-open when `/api/webui/ccb/memory/*` (or equivalent) lands.
