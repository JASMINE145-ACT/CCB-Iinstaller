# MVP closure — remote shared price library (2026-06-28)

> **Superseded:** Fleet is now **v2 / 3082 / 41 fields** (2026-06-28). See [`full-schema-2026-06-28.md`](./full-schema-2026-06-28.md) and [`delivery-status-2026-06-28.md`](./delivery-status-2026-06-28.md). This file records the **7-column MVP** milestone only.

## Scope closed

**User goal:** 价格查走共同远端数据；中心 publish 后全员下次查价更新。

| Delivered | Evidence |
|-----------|----------|
| AionCore `aionui-price-library` + router + migration 016 | VPS 3-route smoke **401** |
| VPS fleet active library | **v1**, **3082** products (`GET /api/price-library/active`) |
| Import pipeline | `prepare-price-library-import.py` → `import_ready` xlsx |
| VPS ops runbook | CSRF-aware import/publish — `vps-price-library-runbook.md` |
| AionUI read-only `#/price-library` | `aionui-src` + `ipcBridge.priceLibrary.getActive` |
| Quotation org client (code) | `python/admin/org_price_client.py` + matcher `try_remote` |
| Dev vendor sync | `sync-dev-wanding-vendor.ps1` |
| Trellis code-spec | `.trellis/spec/integration/price-library.md` |
| Deploy fix | `deploy-org-aioncore-vps.ps1` extract `&&` + grep gate |

## Deferred (not blocking MVP close)

| Item | Notes |
|------|-------|
| Employee E2E | `#/price-library` + new-session quotation `org_api` — user to verify later |
| AionUI price_admin UI | VPS curl/runbook for mutations |
| Quotation stale metadata in generated output | PRD full DoD |
| Playwright `base: 'org'` for price library | PRD PR4 |
| PR0 legacy `wanding_price_lib` smoke removal | PRD PR0 |
| Multi-client publish → next-quote fleet smoke | PRD PR5 |
| Git commit AionCore + aionui-src wiring | separate hygiene |

## Follow-up task candidates

- `price-library-admin-ui` (optional) — draft/edit/import/publish in AionUI
- `price-library-quotation-stale-output` — persist stale/source in quotation artifacts
- Employee acceptance sign-off doc when E2E done
