## Context

Symptom (2026-07-15): user opens **万鼎共享价格库** as `admin` / 价格管理员 — header + Refresh visible, body stuck on `Spin`. This is Mixing route `#/price-library` (exe WebView or WebUI host), not a separate Org SPA.

Code path:

```
PriceLibraryPage (Spin when isLoading && !data)
  → useSWR → ipcBridge.priceLibrary.getActive
  → GET /api/price-library/active  (full products[])
```

No client-side AbortSignal/timeout on the SWR fetcher. Auth chrome works (admin tag visible), so JWT likely OK — hang is after shell auth while waiting for active payload.

Live probe (same VPS `ORG_CENTER_URL`):

| Check | Result |
|-------|--------|
| `GET /api/auth/status` | 200 |
| `GET /api/price-library/active` (no token) | 401 |
| `POST /login` (admin) | success + token |
| `GET /active` with Bearer | **still downloading after >180s** from workstation (request aborted) |

That matches **full-catalog JSON stall** (user reported ~3765 rows / 42 cols) rather than CSRF/CORS/JWT as the hang root (those fail → Alert).

## Goals / Non-Goals

**Goals:**

1. Confirm root cause with reproducible size/time numbers (VPS localhost vs workstation vs WebUI proxy).
2. Stop infinite spinner (timeout + error UI) as **P0 safety**.
3. Make UI first paint scalable (pagination or slim fields) as **P0/P1**.
4. Keep quotation full-active path working (compat).

**Non-Goals:**

- Accurate item dump / gap-fill import
- Changing SSO login UX
- Auto-publish draft
- Fixing Python LKG pollution (different surface)

## Decisions

### D1 — Root cause working theory
**Choice:** Primary = multi‑MB `/active` + unbounded client/proxy wait; secondary = Electron IPC / WebUI proxy buffering without timeout.  
**Alts:** JWT hang — rejected (would 401 → Alert); CSRF — rejected (GET); CORS — rejected on WebUI same-origin proxy / would throw.  
**Confirm:** Run probe on VPS `127.0.0.1:13401` vs public IP; measure bytes.

### D2 — P0 UX bound
**Choice:** Add ~15–30s timeout on `getActive` (renderer fetch or bridge) + surface error + Retry.  
**Alts:** Infinite wait with progress bar — still blocks ops without server fix.  
**Why:** Restores operability even before API pagination lands.

### D3 — Scalable load strategy
**Choice (preferred):** Add `GET /api/price-library/active/items?page=&pageSize=&q=` returning slim columns for table; keep `/active` for MCP/export (or add `?fields=slim`). UI switches to paged API.  
**Alt A:** Strip `raw_json` from `/active` response only — faster win, still grows O(n).  
**Alt B:** Server-side gzip only — helps less if proxy buffers whole body before flush.  
**Implementation order:** measure → P0 timeout → slim/page API → wire UI.

### D4 — Surfaces in scope
Exe (`orgHttpProxy`) **and** WebUI (`/api/webui/org/...`) both must honor timeout; same React page.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking MCP that expects full `/active` | Keep `/active` unchanged; UI migrates to new endpoint |
| Partial page falsely looks “empty catalog” | Show version header + total count even on page 1 |
| WebUI proxy still buffers huge body | Timeout on both browser fetch and host forwarder |
| False “timeout” on slow Tailscale | Make timeout configurable; show elapsed hint |

## Migration Plan

1. Land P0 timeout + Alert (desktop package).
2. Deploy AionCore list/slim endpoint (VPS).
3. Point `usePriceLibraryActive` (or new hook) at paged API; keep mutation cache keys coherent.
4. Smoke exe + WebUI: open page <5s to first rows with ≥3k products.
5. Rollback: revert UI to `/active` behind flag if needed; timeout alone remains useful.

## Open Questions

1. Exact active JSON size from VPS localhost? (confirm after SSH curl)
2. Prefer pagination endpoint vs `fields=slim` query on `/active` for MVP effort?
3. Is user hitting **exe** or **WebUI Tailscale**? (both in scope; path differs for proxy timeout)
