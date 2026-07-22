## Why

Admin opens **万鼎共享价格库** (`#/price-library`) and the page stays on an infinite spinner after login as `admin` / 价格管理员. Ops cannot browse or edit the live catalog (now ~3.7k rows). Login and shell chrome work; only the active-data fetch never completes, so Refresh does nothing useful.

## What Changes

- Diagnose and fix the hang on `GET /api/price-library/active` → Mixing UI spinner path (no client timeout).
- Add **bounded fetch timeout** + visible error (not endless `Spin`) when org/proxy stalls.
- Prefer a **paginated / light active list API** (or strip heavy fields like `raw_json`) so WebUI/exe can render large catalogs without multi‑MB full-table JSON over the wire.
- Optional: keep full dump for export/admin tools; table UI uses page/query endpoints.
- Document reproduce probes (timed curl size/time) in Trellis price-library triage.

## Capabilities

### New Capabilities

- `price-library-load`: Reliable active price-library page load — bounded wait, failure UI, and scalable fetch (pagination or slim payload) so `#/price-library` never hangs forever on full-catalog JSON.

### Modified Capabilities

- _(none — `openspec/specs/` has no prior capability contracts)_

## Impact

- **UI:** `aionui-src` `PriceLibraryPage` / `usePriceLibrary` / org HTTP bridge & WebUI org proxy
- **API:** Org AionCore `aionui-price-library` `GET /api/price-library/active` (and likely new list/page endpoint)
- **Ops:** VPS payload size/time; WebUI Tailscale latency; Electron IPC size
- **Not in scope:** Quotation LKG pollution; Accurate item dump; auto-publish of price drafts
