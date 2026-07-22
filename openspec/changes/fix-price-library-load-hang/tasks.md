## 1. Reproduce & measure

- [ ] 1.1 Script probe: `POST /login` + timed `GET /api/price-library/active` → status, elapsed, bytes, product count (timeout clear)
- [ ] 1.2 Compare VPS localhost vs public IP vs WebUI `/api/webui/org/...` timings; record in design/notes
- [ ] 1.3 Confirm UI Network tab: pending forever on active (exe or WebUI)

## 2. P0 — stop infinite spinner

- [ ] 2.1 Add client AbortSignal/timeout (≤30s) on `priceLibrary.getActive` path (renderer and/or orgHttpBridge)
- [ ] 2.2 Ensure WebUI org forwarder also has request timeout
- [ ] 2.3 On timeout/network fail: leave Spin, show Alert + Retry (`mutate`)
- [ ] 2.4 Manual smoke: force timeout → error UI; Refresh recovers when API healthy

## 3. P1 — scalable catalog load

- [ ] 3.1 Choose MVP: slim `fields=` on `/active` **or** new paged `/active/items` (lock in design Open Question)
- [ ] 3.2 Implement AionCore endpoint + deploy to VPS
- [ ] 3.3 Wire `PriceLibraryPage` / `usePriceLibrary` to paged/slim API for first paint (keep total count + version)
- [ ] 3.4 Preserve full `/active` for quotation MCP/export (compat check)

## 4. Verify & docs

- [ ] 4.1 Smoke with ≥3k products: table usable within a few seconds (exe + WebUI if applicable)
- [ ] 4.2 Update `.trellis/spec/integration/price-library.md` triage (hang vs 401 vs LKG)
- [ ] 4.3 code-reviewer → targeted tests → mark OpenSpec tasks complete
