# Organization Price Library (center aioncore)

> Shared product/price authority on org AionCore (`67.216.206.3:13401`). Pattern mirrors [`org-knowledge.md`](./org-knowledge.md).

**Status (verified 2026-07-01):**

| Layer | State |
|-------|--------|
| AionCore crate + migrations `016`–`017` + **`018` supplier** | ✅ Deployed VPS |
| Route smoke (unauthenticated) | ✅ **401** on `/api/price-library/active` |
| VPS published active | ✅ **v3 / 3299** — 42-field products (294 rows with `supplier`) |
| API `GET /active` product shape | ✅ per `data/data.Md` (flatten JSON) |
| AionUI `#/price-library` read-only | ✅ **42-column** table (incl. `supplier` after `volume`) |
| AionUI L2 row edit (P4) | ✅ Admin drawer + draft/publish IPC (2026-07-11; P3 publish smoke waived) |
| Python `org_price_client` + matcher `try_remote` | ✅ org-primary (no fleet `PRICE_USE_BUNDLED_FIRST`) |
| price-library MCP write path (10 tools) | ✅ P0B–P1 landed; deploy-seed + vendor sync 2026-07-02 |
| AionUI price_admin full-table UI | ❌ Out of scope — L2 drawer only; bulk stays Agent/Excel |

**Task:** `.trellis/tasks/06-27-remote-shared-price-library/` — completed (full schema v2).  
**P-1 fleet revert:** `.trellis/tasks/07-01-price-library-admin-agent/p1-fleet-org-primary-done.md` (2026-07-01).  
**P0B price-library MCP:** `.trellis/tasks/07-01-price-library-admin-agent/p0b-mcp-read-preview-done.md` (2026-07-02).  
**P0C–P1 agent write path:** `.trellis/tasks/07-01-price-library-admin-agent/` — publish, import/revert, Guid agent (2026-07-02); active P3 E2E.  
**UI supplier column:** `.trellis/tasks/07-03-price-library-supplier-ui-column/` (2026-07-02).  
**Ops runbooks:** [`minimal-shared-price-closure.md`](../../../scripts/org-phase0/minimal-shared-price-closure.md) · [`vps-price-library-runbook.md`](../../../scripts/org-phase0/vps-price-library-runbook.md)

---

## Scope / trigger

Use this spec when:

- Wiring or deploying org price APIs on VPS
- Debugging empty `#/price-library` or quotation still using local xlsx
- Adding VPS curl/admin procedures (import, publish, price changes)

**User goal (minimal):** 价格查走共同远端数据；中心 publish 后全员下次查价更新。Admin UI optional.

---

## Canonical paths (do not deviate)

| What | Correct path | Wrong path (seen in prod debug) |
|------|----------------|----------------------------------|
| VPS aioncore binary | `/opt/aionorg/AionCore/target/release/aioncore` (systemd `ExecStart`) | `/opt/aionorg/bin/aioncore` (does not exist) |
| Deploy upload | `scripts/deploy-org-aioncore-vps.ps1 -ExtractOnRemote` | Manual `cp` after build |
| Post-extract gate | `grep org_knowledge_routes …/aionui-app/.../routes.rs` must match | `cargo build` in 0.5s with empty grep |
| Import workbook | `data/price_library_import_ready.xlsx` (from `prepare-price-library-import.py`) | Raw `price_library_cleaned_2026_05_15.xlsx` direct import (581 empty-price rows fail on **old** parser; use `import_ready`) |
| Dev launcher | `ccb-installer/scripts/start-dev-full.ps1` only | Retired `start-aionui-dev*.ps1` |
| Quotation python (dev) | `D:\CCB-Wanding\vendor\wanding\python` after `sync-dev-wanding-vendor.ps1` | Repo `python/` only (MCP subprocess uses vendor) |
| Org token file | `%APPDATA%\AionUi\aionui\org-session.token` | Local `aionui-session-token` only |

---

## Architecture

```
                    ┌─────────────────────────┐
                    │ VPS org SQLite active   │
                    │ GET /api/price-library/ │
                    │      active (v2, 3082)  │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   AionUI #/price-library   org_price_client      price_admin curl
   orgHttpBridge + JWT      (quotation MCP)       import/publish
```

| Layer | Role |
|-------|------|
| **Org aioncore** | Draft / publish / active; `PRICE_ADMIN_USERNAMES` env |
| **AionUI** | Read-only active table |
| **Quotation Python** | `admin/org_price_client.py` → org API → LKG → bundled seed fallback |
| **Bundled xlsx** | Bootstrap seed only — [`wanding-first-ship.md`](./wanding-first-ship.md) |

Matcher uses org remote when **`price_library_path` argument is None** (default MCP path). Explicit path in tool params skips remote.

---

## HTTP contract (org)

Base: `{ORG_SERVER_URL}` → `http://67.216.206.3:13401` (dev default in `start-dev-full.ps1`).

| Method | Path | Access | CSRF on VPS curl |
|--------|------|--------|------------------|
| GET | `/api/price-library/active` | Any authenticated org user | No |
| GET | `/api/price-library/draft` | `price_admin` | No |
| POST | `/api/price-library/import/preview` | `price_admin` | **Yes** |
| POST | `/api/price-library/import/apply` | `price_admin` | **Yes** |
| POST | `/api/price-library/draft/publish` | `price_admin` | **Yes** |

**Env:** `/etc/aionorg/env` — `JWT_SECRET` (match employee `sso.env`), `PRICE_ADMIN_USERNAMES=admin`.

**Smoke (no JWT):** `curl -w "%{http_code}" http://127.0.0.1:13401/api/price-library/active` → **401** (not 404).

**Active response shape:**

```json
{
  "success": true,
  "data": {
    "version": { "version_number": 1, "...": "..." },
    "products": [ { "material_code": "...", "price_b": 1.23, "...": "..." } ]
  }
}
```

`version: null` and `products: []` = **never published** or invalid/empty `TOKEN` (re-login; check `TOKEN len`).

---

## VPS CSRF contract (curl)

Org aioncore uses **Double Submit Cookie** for POST/PUT/PATCH (`aionui-auth` `csrf_middleware`). Bearer JWT alone is **not** enough.

**Pattern:**

```bash
CJ=/tmp/aionorg.cookies
curl -s -c "$CJ" http://127.0.0.1:13401/api/auth/status -o /dev/null
CSRF=$(grep aionui-csrf-token "$CJ" | awk '{print $NF}')

# login → TOKEN (password in single-quoted JSON)

curl -s -X POST http://127.0.0.1:13401/api/price-library/import/apply \
  -b "$CJ" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-csrf-token: ${CSRF}" \
  -F "file=@/opt/aionorg/data/price_library_import_ready.xlsx"
```

Exempt: `/login` only. `GET /active` needs JWT, not CSRF.

---

## Validation & error matrix

| Condition | HTTP / body | Meaning |
|-----------|-------------|---------|
| No JWT | 401 | Route exists; login required |
| Route missing (old binary) | 404 | Redeploy wired `aionui-app` + rebuild |
| POST without CSRF | `CSRF_INVALID` | Add cookie jar + `x-csrf-token` |
| `TOKEN len=0` | 200 with empty `data` or 401 | Re-login; use single quotes around JSON password (`#` etc.) |
| `skipped_unchanged_count: 3082` on apply | 200 | Rows already in draft/active; not an error |
| `draft has no items` on publish | 422 | Draft empty — often **already published**; check `GET /active` |
| `403 price_admin` | 403 | Set `PRICE_ADMIN_USERNAMES=admin`; restart aionorg |
| Import raw cleaned xlsx | 422 validation | Use `import_ready` workbook |

**Acceptance (fleet):** `version_number >= 2` and `len(products) == 3082` (or current import_ready row count); spot-check extended fields (e.g. RUCIKA `product_type`, `factory_inc_tax`).

---

## Wrong vs correct

### VPS binary deploy

**Wrong:** `cp target/release/aioncore /opt/aionorg/bin/aioncore`  
**Correct:** `cargo build` in `/opt/aionorg/AionCore`; systemd already points at `target/release/aioncore`.

### Tarball extract (pre-2026-06-27 script)

**Wrong:** Assume `deploy-org-aioncore-vps.ps1 -ExtractOnRemote` replaced `AionCore` without grep check.  
**Correct:** After deploy, `grep org_knowledge_routes …/routes.rs`; if empty, manual:

```bash
cd /opt/aionorg && rm -rf AionCore && mkdir -p AionCore && tar -xzf aioncore-upload.tgz -C AionCore
```

Script fixed 2026-06-27: single `&&` chain + post-grep gate.

### Crate directory vs router

**Wrong:** `ls crates/aionui-org-knowledge` exists → assume API works.  
**Correct:** Grep `org_knowledge_routes` in `aionui-app/src/router/routes.rs`; 404 until merged + rebuild.

### Import + publish curl

**Wrong:** `POST` with only `Authorization: Bearer` → `CSRF_INVALID`; interpret random `3082` from wrong parser as success.  
**Correct:** CSRF cookie + header; validate with:

```bash
curl -s …/active -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import json,sys; d=json.load(sys.stdin).get('data') or {}
v=d.get('version') or {}
print('version_number', v.get('version_number'))
print('products', len(d.get('products') or []))
"
```

### Shared remote quotation

**Wrong:** `#/price-library` shows data → assume quotation uses org without vendor sync or new MCP session.  
**Correct:** `sync-dev-wanding-vendor.ps1`; org login; **new conversation**; optional `get_price_data()` → `source=org_api`.

---

## AionUI (read-only — full schema + supplier UI)

| Item | Path |
|------|------|
| Route | `#/price-library` |
| Types / columns | `aionui-src/.../priceLibraryTypes.ts` — **42 columns** (`PRICE_LIBRARY_COLUMNS`, incl. `supplier`) |
| Column order (tail) | … → `unit` → `volume` → **`supplier`** → `raw_json` |
| i18n (zh-CN) | `priceLibrary.column.supplier` = **供应商** |
| Search | `filterProducts.ts` — material / description / **supplier** |
| IPC | `ipcBridge.priceLibrary.getActive` → `GET /api/price-library/active` (flatten JSON) |
| Delivery | NSIS; dev via `start-dev-full.ps1` (UI-only: `-SkipVendorSync`) |

**UI smoke (post v3):**

1. Open `#/price-library` — header shows **42 列**, version **v3+**
2. Scroll right past **体积** — column **供应商** appears
3. Search `8010012697` or `HENG XIN` — row shows non-empty supplier (~294 products have supplier; catalog-only rows stay `—`)

### AionUI row edit (P4 L2 drawer — 2026-07-11)

| Item | Value |
|------|--------|
| Task | `.trellis/tasks/07-11-price-library-row-edit-ui/` |
| Gate | Parent P3 publish smoke **waived** by user; upsert two-phase already PASS |
| Visibility | `resolveIsOrgPriceAdmin()` — Edit column + drawer only when draft GET returns 200 |
| IPC | `priceLibrary.getDraft` / `upsertItem` / `publishDraft` via `orgHttp*` (CSRF in main `orgHttpProxy`) |
| Confirm | Diff modal → POST `/draft/items`; optional publish → bind `revision` → POST `/draft/publish` |
| P0 fields | `price_a`–`price_e`, `description`, `description_cn`, `supplier`, `unit` |
| Files | `PriceLibraryRowDrawer.tsx`, `priceLibraryEdit.ts`, `usePriceLibrary.ts`, `ipcBridge.priceLibrary` |
| Tests | `bun test tests/unit/priceLibrary/` — **15 pass** |

**Wrong:** Expect non-admin to see Edit — column hidden; server still 403.  
**Wrong:** Skip diff confirm and POST immediately — UI requires Modal.confirm.  
**Wrong:** Auto-retry publish on 409 — show conflict message; user must refresh.

**Wrong:** Expect supplier on every row — only ~294/3299 have non-empty supplier.  
**Wrong:** UI shows 41 cols after API v3 — rebuild dev / hard refresh; column def is in `aionui-src`, not CCB vendor sync.

**Canonical field list:** `data/data.Md` + migrations `017` (41 fields) + `018` (optional `supplier`, 42nd column). VPS **v3** (2026-07-01) publishes 3299 products; **294** rows carry non-empty `supplier`.

**VPS deploy + import record:** see `.trellis/tasks/07-01-price-library-admin-agent/p1-fleet-org-primary-done.md`.

---

## Optional supplier extension for quotation remarks

Migration **018** adds optional `supplier TEXT` to `price_products`, `price_draft_items`, and `price_version_items`. Excel import/export accepts **41 or 42** columns (`supplier` optional at parse time).

**VPS status (2026-07-01):** migration **018** applied; active **v3** with `supplier` on 294 products. Quotation MCP uses org API (no fleet bundled-first override).

Contract:

- Python quotation matchers preserve `supplier` when the active price source contains it.
- `supplier` is fill metadata, not a pricing authority. Rows with supplier but no price must keep price blank/0.
- Multi-supplier values are preserved as returned by the import/merge step, e.g. `A / B`.
- VANTSING output uses the backend contract in [`../backend/mcp-business.md`](../backend/mcp-business.md) § Supplier remark contract.

Wrong vs correct:

| Wrong | Correct |
|-------|---------|
| Publish a 42-column workbook to org without migration **018** deployed | Deploy AionCore with 018, then import `data/price_library_import_ready.xlsx` |
| Assume `supplier` must exist on every product | Treat it as optional metadata |
| Use supplier data to infer or override prices | Use price fields only for pricing; supplier only feeds Catatan/remark |

### Fleet org-primary mode (post P-1, 2026-07-01)

Quotation MCP reads org API first; bundled xlsx remains **seed/LKG fallback only**.

| Layer | Contract |
|-------|----------|
| Quotation MCP env | **No** `PRICE_USE_BUNDLED_FIRST` in `ensure-wanding-settings.ps1` |
| Python | `get_price_data()` → `source=org_api` when logged in + VPS published |
| Bundled xlsx | Bootstrap / offline fallback only — not primary |
| UI `#/price-library` | Org API (same source as quotation when online) |

**Verify after settings refresh:**

```powershell
python -c "from admin.org_price_client import get_price_data; d=get_price_data(force_refresh=True); print(d.get('source'), len(d.get('products') or []))"
```

Expect `org_api` and product count matching VPS `GET /active`.

**Emergency local override (dev only):** set env `PRICE_USE_BUNDLED_FIRST=1` — skips org + LKG. Do not ship in fleet MCP env.

**Wrong:** Leave `PRICE_USE_BUNDLED_FIRST=1` in fleet after VPS v3+ publish — agent/UI changes invisible to quotation.

**Legacy dev-only bundled override** (emergency): set `PRICE_USE_BUNDLED_FIRST=1` or unreachable `ORG_SERVER_URL` + high `LKG_MIN_PRODUCTS` — do not use after P-1; org v3 is live.

---

## Python quotation (PR3 — in repo)

| Item | Path |
|------|------|
| Client | `python/admin/org_price_client.py` |
| Tests | `python/tests/test_org_price_client.py` |
| Matcher hook | `wanding_fuzzy_matcher._try_load_from_org_remote` when `price_library_path is None` — engine spec: [`../backend/quotation-matching-engine.md`](../backend/quotation-matching-engine.md) |
| All tiers per code | `get_product_price_tiers` MCP — org product dict → factory/A–E/LOCAL/RUCIKA/PE; agent **must Read** `vendor/wanding/data/data.Md` same turn for per-source labels |
| LKG store | `%APPDATA%/AionUi/aionui/price-library/` |
| LKG min products | `LKG_MIN_PRODUCTS` env (default **50**); snapshots below this are ignored → bundled seed |
| Dev sync | `ccb-installer/scripts/sync-dev-wanding-vendor.ps1` |

### Org JWT for quotation MCP (dual AppData roots)

AionUI `#/price-library` and quotation MCP both call `GET /api/price-library/active`, but **different runtimes read the JWT**:

| Consumer | Token source |
|----------|----------------|
| AionUI renderer | Electron session / `AionUi-Dev` or `AionUi` store after login |
| Quotation MCP Python | `admin/org_session.get_auth_candidates()` (used by `org_price_client` + `org_knowledge_client`) |

**Shared module (2026-07-02):** `python/admin/org_session.py` — profile resolution, STRICT vs LEGACY_SCAN policy, typed HTTP errors. See [`org-knowledge.md`](./org-knowledge.md) § MCP `org_session` profile contract.

**MCP env (recommended dev):**

| Env | Dev (`start-dev-full`) | Packaged prod |
|-----|------------------------|---------------|
| `AIONUI_APPDATA_PROFILE` | `AionUi-Dev` | unset → `AionUi` |
| `ORG_SESSION_TOKEN_FILE` | `%APPDATA%\AionUi-Dev\aionui\org-session.token` | `%APPDATA%\AionUi\aionui\org-session.token` |

**Candidate resolution:**

| Mode | When | Order |
|------|------|-------|
| **STRICT** | `AIONUI_APPDATA_PROFILE` or `ORG_SESSION_TOKEN(_FILE)` set | Single profile/file only |
| **LEGACY_SCAN** | No profile env (deprecated) | `ORG_SESSION_TOKEN` → `ORG_SESSION_TOKEN_FILE` → `AionUi` token → `AionUi-Dev` token (deduped) |

**2026-06-29 fix:** `_api_get` tries **each unique candidate** on HTTP 401 until one succeeds (LEGACY_SCAN). Fixes dev where **stale Prod token** (401) blocked **fresh Dev token** while UI still showed v2.

**2026-07-02 fix (v2):** Explicit `AIONUI_APPDATA_PROFILE=AionUi-Dev` from `start-dev-full` + `ensure-wanding-settings` — **preferred** over blind dual-file scan. Task [`07-02-org-knowledge-dev-token-alignment`](../../tasks/07-02-org-knowledge-dev-token-alignment/prd.md).

**Packaged install:** typically one `AionUi` token file — first candidate succeeds; behaviour unchanged.

**Wrong vs correct**

| Wrong | Correct |
|-------|---------|
| `#/price-library` works → assume `get_price_data()` is `org_api` | After login, verify Python: `get_price_data()` → `source=org_api`, `products≈3082` |
| Delete Dev token manually every time | `start-dev-full` sets `AIONUI_APPDATA_PROFILE=AionUi-Dev` + `sync-dev-wanding-vendor -UpdateSettings` |
| `price_source=bundled_seed` with UI logged in | Check `AIONUI_APPDATA_PROFILE` + token file path in `ccb-mcp.json`; stale Prod file under STRICT should not be used |

**Diagnostic:**

```powershell
D:\CCB-Wanding\vendor\python-wanding\python.exe -c "
import sys; sys.path.insert(0, r'D:\CCB-Wanding\vendor\wanding\python')
from admin.org_price_client import get_price_data
d = get_price_data(force_refresh=True)
print('source=', d.get('source'), 'products=', len(d.get('products') or []))
"
```

Expect `source= org_api` when org JWT valid. Task: [`06-29-price-tiers-synthesis-and-seed-fallback`](../../tasks/06-29-price-tiers-synthesis-and-seed-fallback/) (B1).

### Multi-tier query + `data.Md` read hook (quotation-agent)

When an employee asks **all price types**, compares tiers, or questions what a column means, use MCP `get_product_price_tiers` — **not** `match_quotation` alone (single `unit_price`).

**Design:** Same pattern as `wanding_business_knowledge.md` on-demand Read — tool returns **numbers**; `data.Md` provides **per-source semantics** (one standard field can mean different things by `product_type` / `source_sheet`).

```
User: 「有哪些价」「各档位多少」「青山价在这款产品上指哪列」
        │
        ├─ ① Read  D:\CCB-Wanding\vendor\wanding\data\data.Md   (same turn, before or with tool)
        └─ ② MCP   get_product_price_tiers(code)
        │
        ▼
Agent: tiers[] prices + data.Md §来源映射 for product_type (e.g. §RUCIKA, §国标管件)
```

| Item | Value |
|------|--------|
| MCP tool | `get_product_price_tiers` — `python/quotation/price_tiers.py` |
| Contract doc (shadow) | `D:\CCB-Wanding\vendor\wanding\data\data.Md` (repo maint: `data/data.Md`) |
| Tool returns | `tiers[]`, `product_type`, `source_sheet`, `data_md_path`, `tier_guide_summary` (nudge only — **not** a substitute for Read) |
| Agent SOP | `ccb-installer/config/agents/quotation-agent.md` §价格字段契约 data.Md |
| Single-tier path | `match_quotation` only — **do not** Read data.Md |

**Per-source semantics (why Read is mandatory):**

| Source | `price_b` means | `price_d` means | Common mistake |
|--------|-----------------|-----------------|----------------|
| LESSO管材 | B档 / 默认 | 青山 D档 | — |
| RUCIKA | 第一组报单价 | 第二组报单价 | Calling `price_d` 「青山价」 |
| CEILING | GENERAL PRICE | 孔总 MR KONG | Calling `price_d` 「青山价」 |
| 国标管件 | 「其他」 | *(usually absent)* | `price_e` = 大唐 |
| PE PIPA | 出厂价/条 | *(usually absent)* | `pe_nominal_price` = 面价 |

**Wrong vs correct**

| Wrong | Correct |
|-------|---------|
| Explain tiers from static `tier_guide_summary` or agent §价格口径映射 table alone | Read data.Md; map tool `product_type` → §来源映射 |
| `get_product_price_tiers` without Read when user asks tier **meaning** | Read + tool same turn |
| Read data.Md on every `match_quotation` (single known level) | Read only on multi-tier / tier-meaning queries |
| Edit repo `data/data.Md` expecting runtime change without vendor sync | `sync-dev-wanding-vendor.ps1` copies `data.Md` into vendor shadow |

**Tasks:** [`06-28-product-price-tiers-tool`](../../tasks/06-28-product-price-tiers-tool/) (tool) · [`06-28-price-tiers-data-md-read-hook`](../../tasks/06-28-price-tiers-data-md-read-hook/) (Read hook) · [`06-29-price-tiers-synthesis-and-seed-fallback`](../../tasks/06-29-price-tiers-synthesis-and-seed-fallback/) (synthesis + seed supplement).

**PostToolUse enforcement (2026-06-29):** `post-price-tiers-nudge.py` on `get_product_price_tiers` success — injects Read `data_md_path` + markdown tier table requirement. **Knowledge Read (updated 2026-07-19):** Selection is API-first via `select_quotation_candidates` (tool loads knowledge). PreToolUse force-Read before match **removed**; Stop `:knowledge` = **off**. See [`agents-unified-model.md`](./agents-unified-model.md) § Selection + knowledge.

**Bundled_seed tier supplement (B2, 2026-06-29):** When `price_source` is `bundled_seed` / `lkg_snapshot`, or org dict yields `tier_count < 2`, `get_product_price_tiers` merges non-zero tiers from full `price_library` xlsx (`tier_supplemented_from=local_xlsx`). Org API full dict unchanged.

### LKG snapshot pollution (dev / smoke)

When org API is unreachable (no JWT, 401, offline), `get_price_data()` falls through to **LKG** before **bundled seed**. A leftover dev snapshot (e.g. `ver-001` with **2** test PVC rows from 2026-06-27) is treated as valid LKG and **blocks** the ~3082-row bundled xlsx — HDPE and most SKUs return no match.

**Symptoms:** `source=lkg_snapshot`, `products=2`, quotation misses common materials; `data.json` may show GBK-mangled Chinese.

**Fix (immediate):**

```powershell
Remove-Item "$env:APPDATA\AionUi\aionui\price-library\ver-001" -Recurse -Force
```

**Fix (code, 2026-06-29):** `org_price_client` ignores LKG when `len(products) < LKG_MIN_PRODUCTS` (default 50) and falls back to bundled seed. Override with env `LKG_MIN_PRODUCTS` if needed.

**Prevent:** Do not save toy LKG snapshots to `%APPDATA%` during manual API tests; use a temp dir or delete after smoke.

### Dev / smoke: expected degradations vs real bugs (2026-06-29)

When debugging quotation in dev or smoke, three warnings often appear together. **Only LKG pollution is a real data bug**; the other two are intentional degradations.

```
quotation MCP (match_fuzzy, try_remote=True)
│
├─ PRICE (must work offline)     org_price_client
│     Tier 1 org API ──401/no token──┐
│     Tier 2 LKG ──2 test rows──► BUG │ blocks bundled seed
│     Tier 3 bundled seed ~3082 ──OK──┘
│
├─ KNOWLEDGE (optional enrich)     org_knowledge_client
│     org API ──401──► file fallback (shadow md)
│     match_fuzzy does NOT depend on this path
│
└─ INVENTORY (optional enrich)     AOL Accurate Online
      no AOL_* creds ──► inventory_unavailable
      price match does NOT depend on AOL
```

| Signal | Expected in dev/smoke? | Blocks price match? | Action |
|--------|------------------------|---------------------|--------|
| **LKG `ver-001` / `products=2`** | No — leftover test snapshot | **Yes** (used wrong Tier 2 data) | Delete dir and/or rely on `LKG_MIN_PRODUCTS`; see § LKG snapshot pollution |
| **`org_knowledge` API 401** | **Yes** — no/expired org JWT | **No** — `load_doc_content()` falls back to local shadow md; chat + matching continue | To get center-latest: dev login AionUI → refresh `org-session.token`. See [`org-knowledge.md`](./org-knowledge.md) § Dev smoke 401 |
| **`inventory_unavailable` / AOL 未配置** | **Yes** — smoke/CI has no Accurate secrets | **No** — `match_fuzzy` / tiers use price library only | To enable stock: `ensure-wanding-settings.ps1`. See [`mcp-health.md`](./mcp-health.md) § AOL expected vs misconfig |

**Why 401 is not a bug:** Org routes (`/api/org-knowledge`, `/api/price-library/active`, work-tasks) **require JWT by design**. Unauthenticated smoke expects **401** (not 404/500) — see § Tests / smoke assertion points. Fixing 401 in code would mean bypassing auth (security regression) or forcing login in every smoke run (wrong test target).

**Why AOL missing is not a bug:** Accurate Online credentials are per-install secrets (`AOL_ACCESS_TOKEN`, `AOL_SIGNATURE_SECRET`, `AOL_DATABASE_ID`). `inventory_payloads.aol_configured()` returns false → explicit `inventory_unavailable` instead of fake stock or MCP crash. **Do not** conflate with the 2026-06-28 BOM/spawner bug where health passed but Guid failed — that was mis-wiring, not intentional absence.

---

## Tests / smoke assertion points

| Check | Command / location | Pass |
|-------|-------------------|------|
| Local aioncore routes | `sync-dev-aioncore.ps1 -Build` smoke | work-tasks / org-knowledge / price-library → **401** |
| VPS routes | curl without JWT | three endpoints **401** |
| VPS active data | `GET /active` + JWT | `version_number >= 1`, `products > 0`; spot-check `factory_inc_tax` / `product_type` non-null after v2 |
| AionCore unit | `cargo test -p aionui-price-library` | 21 pass (full schema) |
| Dev org client | `get_price_data()` after login | `source=org_api`, `products > 0` |
| Price admin MCP (P0B) | `python -m pytest python/tests/test_org_price_admin_client.py` | 10 pass |
| Price admin MCP live | `get_price_library_active` via dispatch | `version_number >= 3`, `products >= 3299` |
| Price tiers tool | `python -m unittest tests.test_price_tiers` | tiers from org product dict; `data_md_path` present |
| Tier E2E (manual) | New quotation session; ask multi-tier for RUCIKA code | Read data.Md + tool; 第一组/第二组 not 青山 |
| Unit | `python -m unittest tests.test_org_price_client` | pass |

---

## Related

| Doc | Topic |
|-----|--------|
| [`org-knowledge.md`](./org-knowledge.md) | Dual JWT, org HTTP IPC |
| [`dev-sync-playbook.md`](./dev-sync-playbook.md) | Rule 0, vendor §4.3 |
| [`vps-org-api-deploy-checklist.md`](../../../scripts/org-phase0/vps-org-api-deploy-checklist.md) | Org API deploy |
| PRD | `.trellis/tasks/06-27-remote-shared-price-library/prd.md` |

**Recorded:** 2026-06-28 — VPS **v2** full schema (3082 products, RUCIKA extended fields verified); migration 017; CSRF on admin POST.

**Recorded:** 2026-06-28 — Quotation MCP `get_product_price_tiers` lists all non-zero price fields per `material_code` from org active API (factory/A–E/LOCAL/RUCIKA/PE); agent Read `data.Md` hook for per-source tier semantics; task [`06-28-product-price-tiers-tool`](../../tasks/06-28-product-price-tiers-tool/) + [`06-28-price-tiers-data-md-read-hook`](../../tasks/06-28-price-tiers-data-md-read-hook/).

**Recorded:** 2026-06-29 — `org_price_client` tries all `org-session.token` candidates on 401 (Prod+Dev dual AppData); fixes UI org_api vs MCP `bundled_seed` split. Task [`06-29-price-tiers-synthesis-and-seed-fallback`](../../tasks/06-29-price-tiers-synthesis-and-seed-fallback/) B1.

**Recorded:** 2026-06-29 — Task **06-29 complete** (B1+A+B2): `post-price-tiers-nudge.py` PostToolUse + `quotation-agent.md` L1 synthesis rules; `price_tiers.py` bundled_seed/lkg xlsx tier supplement (`tier_supplemented_from=local_xlsx`). **Deployed** (JASMINE145-ACT machine): `sync-dev-wanding-vendor.ps1`, `deploy-subagent-gate-skill.ps1`, `deploy-seed-agents.ps1 -ForceMd` → live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md` has PostToolUse (match + tiers); `post-price-tiers-nudge.py` on disk. **E2E pending:** restart dev + new quotation session →「8020020755 全部价格」.

**Recorded:** 2026-07-02 — `org_price_client` migrated to shared `admin/org_session.py`; profile-strict MCP env (`AIONUI_APPDATA_PROFILE`) supersedes blind dual-file scan as dev default. Cross-ref [`org-knowledge.md`](./org-knowledge.md) § MCP `org_session` profile contract; task [`07-02-org-knowledge-dev-token-alignment`](../../tasks/07-02-org-knowledge-dev-token-alignment/prd.md).

**Recorded:** 2026-07-01 — **P-1 fleet org-primary:** VPS migration **018** + publish **v3/3299** (294 supplier); removed `PRICE_USE_BUNDLED_FIRST` from fleet MCP. Runbook: [`07-01/.../p1-fleet-org-primary-done.md`](../../tasks/07-01-price-library-admin-agent/p1-fleet-org-primary-done.md).

**Recorded:** 2026-07-11 — **P4 L2 row edit UI** in aionui-src: admin-gated Edit column + drawer; IPC `getDraft`/`upsertItem`/`publishDraft`; two-phase confirm; `bun test tests/unit/priceLibrary/` 15 pass; code-review Layer A/B PASS. Parent P3 publish smoke waived. Task [`07-11-price-library-row-edit-ui`](../../tasks/07-11-price-library-row-edit-ui/prd.md).

---

## Agent write path (price-library MCP — P0B–P1)

| Item | Path |
|------|------|
| MCP server | `mcp_servers/price-library-server` (separate from `quotation-server`) |
| Python entry | `python/price_library_main.py` → `system/price_library_tool_dispatch.py` |
| Admin client | `python/admin/org_price_admin_client.py` (GET + CSRF POST + multipart import) |
| Dispatch / preview | `python/admin/org_price_admin_dispatch.py`, `org_price_admin_preview.py` |
| Import guard | `python/admin/price_library_import_guard.py` (workspace whitelist, `.xlsx`, ≤10MB) |
| Tests | `python/tests/test_org_price_admin_client.py` (unittest **19/19**) |
| MCP registry | `ccb-mcp.json` / `ensure-wanding-settings.ps1` → `price-library` |
| Agent | `ccb-installer/config/agents/price-library-agent.md` + `.aionui.json` |
| Catalog gate | `aionui-src` — `ccbAgentCatalog.ts`, `resolveIsOrgPriceAdmin()` |
| Health | `ccb-installer/config/mcp-health-manifest.json` — `price-library` probe |

**MCP tools (11):**

| Tool | Phase |
|------|-------|
| `get_price_library_active` | P0B |
| `get_price_library_draft` | P0B |
| `list_price_library_versions` | P2-Edit |
| `export_price_library` | P0B |
| `upsert_price_library_item` | P0B |
| `delete_price_library_item` | P0B |
| `restore_price_library_item` | P0B |
| `publish_price_library_draft` | P0C |
| `preview_price_library_import` | P0D |
| `apply_price_library_import` | P0D |
| `revert_price_library_version` | P0D |

**Write contract (mirror org-knowledge):**

- `confirmed=false` → local diff from GET active + GET draft; **no POST**
- `confirmed=true` → `POST /api/price-library/draft/items` (+ CSRF cookie/header)
- Publish / import / revert → separate tools, two-phase confirm + `revision` on publish
- **P0C:** `publish_price_library_draft` — `confirmed=false` preview (revision + pending count); `confirmed=true` binds revision; HTTP 409 → `REVISION_CONFLICT`
- **P0D:** import preview/apply (multipart); revert by version id; import path fail-closed if no workspace roots
- Final authority: AionCore **403** when caller is not `price_admin`

**Guid visibility (P1):**

- Sidecar `requires_price_admin: true`, `delegatable: true`（2026-07-11：默认会话可 `Agent(price-library-agent)`；仍须 price_admin）
- Skill `price-library-edit` — bulk 三分法 + prepare script SOP (P2-Edit)
- Hooks (P2-Edit): PreToolUse `data.Md` gate on upsert/apply; PostToolUse `post-data-md-read-mark.py` on Read (subagent + flush race, 2026-07-05); confirm nudge; Stop warn if draft applied without publish
- AionUI catalog probes `GET /api/price-library/draft` — non-admin **no**「价格库管理」card
- `guidOnlyAgentIds` **empty** for price-library（2026-07-11）— 允许进入 orchestrator delegation index；与「知识库≠价格库」路由配套（`WANd.ROUTING.KB_PRICE.001`）
- Deploy: `deploy-seed-agents.ps1 -ForceMd` → `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`

**Wrong vs correct**

| Wrong | Correct |
|-------|---------|
| 「知识库更新」走价库 upsert | 知识库 = 业务知识库 → `append_business_rule` |
| Extend `quotation-server` with write tools | Independent `price-library` MCP + agent |
| Upsert without `confirmed=true` | Preview first; user confirms; replay with `confirmed=true` |
| Rely on hidden Guid card for security | AionCore 403 on non-admin JWT |
| Import arbitrary path | `price_library_import_guard` workspace whitelist only |

Task: [`07-01-price-library-admin-agent`](../../tasks/07-01-price-library-admin-agent/prd.md).

**Recorded:** 2026-07-02 — P0B landed: read tools + confirmed preview + draft/items apply; vendor sync via `sync-dev-wanding-vendor.ps1`. Delivery: [`p0b-mcp-read-preview-done.md`](../../tasks/07-01-price-library-admin-agent/p0b-mcp-read-preview-done.md).

**Recorded:** 2026-07-02 — P0C: `publish_price_library_draft` + `REVISION_CONFLICT` on 409. Delivery: [`p0c-publish-done.md`](../../tasks/07-01-price-library-admin-agent/p0c-publish-done.md). Tests: unittest **14/14**.

**Recorded:** 2026-07-02 — P0D: `preview_price_library_import` / `apply_price_library_import` / `revert_price_library_version` + import path guard + MCP health manifest entry. Delivery: [`p0d-import-revert-done.md`](../../tasks/07-01-price-library-admin-agent/p0d-import-revert-done.md). Tests: unittest **19/19**.

**Recorded:** 2026-07-02 — P1: `price-library-agent` sidecar + AionUI `requires_price_admin` catalog gate + deploy-seed + MCP health PASS. Delivery: [`p1-guid-agent-catalog-done.md`](../../tasks/07-01-price-library-admin-agent/p1-guid-agent-catalog-done.md). Bun catalog **3/3**. **Active:** P3 E2E smoke (admin Guid upsert → publish → `version_number++`).

**Recorded:** 2026-07-03 — **P2-Edit:** `list_price_library_versions` MCP; `price-library-edit` skill; agent hooks (data.Md PreToolUse, confirm PostToolUse, unpublished Stop warn); sidecar SOP + diff table. Delivery: [`p2-edit-done.md`](../../tasks/07-01-price-library-admin-agent/p2-edit-done.md). Tests: unittest **23/23** + gate **4/4**.

**Recorded:** 2026-07-11 — **P4 L2 row edit UI** (aionui-src): admin Edit column + `PriceLibraryRowDrawer`; IPC `getDraft`/`upsertItem`/`publishDraft`; two-phase confirm; tests **15/15**; code-review Layer A/B PASS. Parent P3 publish smoke waived. Task [`07-11-price-library-row-edit-ui`](../../tasks/07-11-price-library-row-edit-ui/prd.md).
