# Organization Price Library (center aioncore)

> Shared product/price authority on org AionCore (`67.216.206.3:13401`). Pattern mirrors [`org-knowledge.md`](./org-knowledge.md).

**Status (verified 2026-06-28):**

| Layer | State |
|-------|--------|
| AionCore crate + migration `016` + **`017` full schema** | ✅ Deployed VPS |
| Route smoke (unauthenticated) | ✅ **401** on `/api/price-library/active` |
| VPS published active | ✅ **v2 / 3082** — full 41-field products |
| API `GET /active` product shape | ✅ per `data/data.Md` (flatten JSON) |
| AionUI `#/price-library` read-only | ✅ **41-column** table |
| Python `org_price_client` + matcher `try_remote` | ✅ In repo |
| AionUI price_admin UI | ❌ Out of scope — VPS curl/runbook |

**Task:** `.trellis/tasks/06-27-remote-shared-price-library/` — **completed (full schema v2, 2026-06-28)**.  
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
| Import workbook | `data/price_library_import_ready.xlsx` (from `prepare-price-library-import.py`) | Raw `price_library_cleaned_2026_05_15.xlsx` (581 empty-price rows → import fail) |
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

## AionUI (read-only — full schema)

| Item | Path |
|------|------|
| Route | `#/price-library` |
| Types / columns | `aionui-src/.../priceLibraryTypes.ts` — **41 columns** (`PRICE_LIBRARY_COLUMNS`) |
| IPC | `ipcBridge.priceLibrary.getActive` → `GET /api/price-library/active` (flatten JSON) |
| Delivery | NSIS; dev via `start-dev-full.ps1` |

**Canonical field list:** `data/data.Md` + migration `017`. VPS **v2** (2026-06-28) ships all 41 fields; legacy v1 snapshots showed `—` on extended columns.

---

## Python quotation (PR3 — in repo)

| Item | Path |
|------|------|
| Client | `python/admin/org_price_client.py` |
| Tests | `python/tests/test_org_price_client.py` |
| Matcher hook | `wanding_fuzzy_matcher._try_load_from_org_remote` when `price_library_path is None` |
| All tiers per code | `get_product_price_tiers` MCP — org product dict → factory/A–E/LOCAL/RUCIKA/PE; agent **must Read** `vendor/wanding/data/data.Md` same turn for per-source labels |
| LKG store | `%APPDATA%/AionUi/aionui/price-library/` |
| LKG min products | `LKG_MIN_PRODUCTS` env (default **50**); snapshots below this are ignored → bundled seed |
| Dev sync | `ccb-installer/scripts/sync-dev-wanding-vendor.ps1` |

### Org JWT for quotation MCP (dual AppData roots)

AionUI `#/price-library` and quotation MCP both call `GET /api/price-library/active`, but **different runtimes read the JWT**:

| Consumer | Token source |
|----------|----------------|
| AionUI renderer | Electron session / `AionUi-Dev` or `AionUi` store after login |
| Quotation MCP Python | `admin/org_price_client._org_session_token_candidates()` → disk files |

**Token file candidates (priority order):** `ORG_SESSION_TOKEN` env → `ORG_SESSION_TOKEN_FILE` → `%APPDATA%/AionUi/aionui/org-session.token` → `%APPDATA%/AionUi-Dev/aionui/org-session.token` (deduped).

**2026-06-29 fix:** `_api_get` tries **each unique candidate** on HTTP 401 until one succeeds. Fixes dev where **stale Prod token** (271 B, 401) blocked **fresh Dev token** while UI still showed v2.

**Packaged install:** typically one `AionUi` token file — first candidate succeeds; behaviour unchanged.

**Wrong vs correct**

| Wrong | Correct |
|-------|---------|
| `#/price-library` works → assume `get_price_data()` is `org_api` | After login, verify Python: `get_price_data()` → `source=org_api`, `products≈3082` |
| Delete Dev token manually every time | `sync-dev-wanding-vendor.ps1` + vendor python with multi-candidate auth |
| `price_source=bundled_seed` with UI logged in | Check both token files; stale Prod file no longer blocks if Dev token valid |

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

**PostToolUse enforcement (2026-06-29):** `post-price-tiers-nudge.py` on `mcp__quotation__get_product_price_tiers` success — injects Read `data_md_path` + markdown tier table requirement; forbids「没有内容」deflection. Wired in `quotation-agent.md` frontmatter with `post-match-knowledge-nudge.py`.

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
