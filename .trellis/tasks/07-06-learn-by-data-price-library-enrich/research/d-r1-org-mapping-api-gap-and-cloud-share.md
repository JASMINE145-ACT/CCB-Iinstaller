# Research: Section D mapping write path vs org price-library (D-R1)

- **Query**: Current Section D write path (pending vs cloud); price-library org pattern mapping lacks; Route 1 org `product_mapping` API gap; operational gaps (merge discoverability, MCP merge tool, dedup query); P0/P1/P2 task split
- **Scope**: mixed (internal vendor Python + Trellis spec + prior explore doc)
- **Date**: 2026-07-07

## Findings

### 1. Current Section D write path (pending vs cloud)

**Implemented (Route 2 MVP) — local pending, not cloud.**

| Stage | Path / mechanism | Cloud? |
|-------|------------------|--------|
| Agent write | MCP `append_quotation_mapping_pending` (`confirmed=false/true`) | No |
| Dispatch | `quotation/mapping_pending_dispatch.py` → `learn_by_data_mapping.append_mapping_pending_row` | No |
| Pending store | `resolve_mapping_pending_path()` → **`%LOCALAPPDATA%/CCB-Wanding/data/mapping_import_pending.jsonl`** (or `DATA_DIR/mapping_import_pending.jsonl`, else sibling of `MAPPING_TABLE_PATH`) | **Per-machine** |
| Merge (canonical) | `python/scripts/merge_mapping_import.py` → appends to **`MAPPING_TABLE_PATH`** (default `vendor/wanding/data/mapping_table.xlsx`) | **Local xlsx** |
| Match read order | Neon `product_mapping` → custom lib → `mapping_table.xlsx` | Neon stub empty today |

**PT. JINSE row 10 ("Elbow drat ½" AW"):** If `confirmed=true` succeeded, row is in **local pending jsonl only**. It does **not** appear in org/VPS or other machines until someone runs merge on **that machine** (or copies pending + merges elsewhere).

**Merge command (from vendor root `D:\CCB-Wanding\vendor\wanding`):**

```powershell
python python/scripts/merge_mapping_import.py
# optional: --dry-run, --pending-path, --mapping-path
```

After merge: script marks entries `status: merged`, rewrites xlsx, calls `invalidate_mapping_cache()`.

**SKILL reference:** `ccb-installer/.../quotation-learn-by-data/SKILL.md` § Section D step 5 — tells user to run merge script; path is relative to vendor `python/` tree, not repo root.

**Spec reference:** `.trellis/spec/backend/quotation-matching-engine.md` §10 — documents pending + merge path.

---

### 2. What org price library has that mapping lacks

Pattern source: `.trellis/spec/integration/price-library.md`

| Capability | Price library | Historical mapping (Section D) |
|------------|---------------|--------------------------------|
| Org HTTP API | `GET /api/price-library/active`, draft, import, publish | **None** — no `/api/.../mapping` routes in AionCore (repo grep) |
| Shared authority | VPS SQLite active v3 / 3299 products, fleet org-primary | Local pending + local `mapping_table.xlsx` seed |
| Python org client | `admin/org_price_client.py` (org → LKG → bundled) | **None** — only `admin/cache.get_product_mapping_rows()` **stub `[]`** |
| Admin write MCP | Separate `price-library` MCP, 11 tools, `org_price_admin_client.py` + CSRF | Single `append_quotation_mapping_pending` on **quotation** MCP (pending only) |
| Draft / publish / revision | Yes (`revision`, 409 conflict) | No |
| AionUI surface | `#/price-library` read-only 42-col table | **None** |
| LKG offline fallback | `%APPDATA%/AionUi/aionui/price-library/` | No mapping LKG |
| Permission model | `price_admin` for writes; read any org user | **All learn-by-data users** — no admin gate (by design ADR) |
| Runbooks / smoke | VPS runbook, `get_price_data()` diagnostic | Section D smoke doc + offline script; **no VPS merge runbook** |
| Fleet sync | `sync-dev-wanding-vendor.ps1` + org login | Vendor xlsx sync only; pending not synced |
| Invalidate cache hook | `invalidate_wanding_cache()` on publish | `invalidate_mapping_cache()` after merge |

**Read-path asymmetry:** `mapping_table_matcher.load_mapping_df` tries Neon first (`get_product_mapping_rows`), but stub always empty → falls through to custom Neon library or xlsx. **Write never touches Neon.**

---

### 3. Gap for Route 1 (org Neon `product_mapping` write API)

**Status: not implemented — full greenfield for backend + MCP.**

| Layer | Price library (exists) | Mapping Route 1 (missing) |
|-------|------------------------|---------------------------|
| AionCore crate / migrations | `aionui-price-library` migrations 016–018 | No `product_mapping` table/API crate in repo `AionCore/` |
| REST routes | `/api/price-library/*` | No `/api/quotation-mapping/*` or `/api/product-mapping/*` |
| Neon read | N/A (org SQLite) | `admin/cache.py` returns `[]` in MCP standalone |
| Neon write | N/A | No client, no draft/publish |
| MCP tools | `upsert_price_library_item`, import, publish, … | Only `append_quotation_mapping_pending` → local file |
| Org session / CSRF | `org_session.py` + admin client | Would need `org_mapping_client.py` + optional admin MCP |
| Matcher integration | `wanding_fuzzy_matcher._try_load_from_org_remote` when path omitted | `_try_load_mapping_from_db` exists but **dead** until real rows |
| Spec | `price-library.md` | `quotation-matching-engine.md` §10 documents Route 2 only |

**Minimum Route 1 slice (mirror price-library):**

1. AionCore: `product_mapping` schema (inquiry_name, spec, product_code, quotation_name, provenance?, version)
2. `GET /active` (fleet read) + draft items CRUD or import/apply
3. `POST` publish with revision / 409
4. Python `org_mapping_client` + optional LKG
5. MCP: `append_quotation_mapping_item` (org) replacing or alongside pending
6. `mapping_table_matcher`: org-primary when `mapping_path` omitted (symmetric to price)

**Neon vs org SQLite:** Explore doc says "Neon `product_mapping`"; matcher code calls `admin.cache.get_product_mapping_rows()` (legacy Neon admin path). Org price library uses **VPS SQLite**, not Neon. Route 1 should **pick one authority** — recommend **org SQLite on VPS** (same as price-library) unless Neon admin is revived.

---

### 4. Operational gaps

#### 4.1 Merge script discoverability

| Issue | Detail |
|-------|--------|
| Script exists | `vendor/wanding/python/scripts/merge_mapping_import.py` — functional (`--dry-run`, dedup, overwrite) |
| Discovery | Only in SKILL step 5 + `quotation-matching-engine.md`; **not** in MCP tool list, runbook, or installer shortcut |
| Path confusion | User on PT. JINSE likely has pending at `%LOCALAPPDATA%\CCB-Wanding\data\mapping_import_pending.jsonl` but merge target is `vendor/wanding/data/mapping_table.xlsx` — two different roots |
| No post-append nudge | Unlike price-library Stop hook ("draft without publish"), Section D has **no hook** reminding merge |
| Fleet | Machine A pending ≠ Machine B until merge + vendor sync / shared xlsx deploy |

#### 4.2 MCP tool for merge?

**Does not exist.** Only write tool: `append_quotation_mapping_pending`. Merge is CLI-only.

Options for P1:
- `merge_quotation_mapping_pending` MCP (admin or all users, `confirmed` + `--dry-run` preview)
- Or ops script wrapper in `ccb-installer/scripts/merge-mapping-pending.ps1` with logged path

#### 4.3 Dedup query API

**No remote dedup API.** Guards M1–M5 in `learn_by_data_mapping.check_learn_by_data_mapping_guards`:

| Guard | Data source |
|-------|-------------|
| M1 session | In-process `session_processed_keys` (agent responsibility) |
| M2 existing mapping | `load_mapping_df(MAPPING_TABLE_PATH)` **local snapshot** |
| M3 pending provenance | `load_mapping_pending_entries()` **local file** |
| M4 keyword conflict | Same local `mapping_df` |
| M5 code validity | `get_wanding_price_by_code` (org/bundled price — OK) |

**Gap:** Another user's pending or org-wide mapping state is invisible → duplicate pending rows across machines possible; M2 misses rows only on other machines until xlsx synced.

**Section C contrast:** Price upsert hits org draft API — fleet-visible dedup before apply.

**D-gap check in SKILL:** "query mapping table" — implemented as local `load_mapping_df`, not MCP query tool. No `lookup_quotation_mapping` MCP.

---

### 5. Recommended task split P0 / P1 / P2

#### P0 — Unblock PT. JINSE + fleet Route 2 ops (no AionCore)

| ID | Work | Rationale |
|----|------|-----------|
| **D-OPS-01** | Runbook: pending path, merge command, dry-run, verify recall (`match_mapping_top_candidates`) | User confusion on merge path |
| **D-OPS-02** | `ccb-installer/scripts/merge-mapping-pending.ps1` — resolves vendor python, prints paths, supports `-DryRun` | One-click discoverability |
| **D-OPS-03** | SKILL tweak: absolute merge example + "pending is local until merge" callout | Prevent cloud assumption |
| **D-04 verify** | Confirm `merge_mapping_import.py` + tests shipped in vendor sync | D-04 marked done in plan but user hit gap |

#### P1 — Route 2 hardening (still local, better UX)

| ID | Work | Rationale |
|----|------|-----------|
| **D-07** | MCP `merge_quotation_mapping_pending` (`confirmed`, `dry_run`) wrapping script | Agent/ops callable merge |
| **D-08** | MCP `lookup_quotation_mapping` (keyword → hits from `load_mapping_df`) | D-gap/M2 without re-parsing xlsx in agent |
| **D-09** | PostToolUse or Stop nudge after `append_quotation_mapping_pending` success | "Run merge to activate" |
| **D-10** | pytest for merge + guards (if missing in vendor) | Regression |

#### P2 — Route 1 cloud-shared (org parity with price-library)

| ID | Work | Rationale |
|----|------|-----------|
| **D-R1a** | AionCore spec + migrations: `quotation_mapping` tables, `GET /active`, draft CRUD | Backend foundation |
| **D-R1b** | `org_mapping_client.py` + matcher org-primary + LKG optional | Read path fleet-wide |
| **D-R1c** | MCP `append_quotation_mapping_item` → org API (`confirmed`, CSRF); deprecate pending or sync pending→org | Write path cloud-shared |
| **D-R1d** | AionUI read-only mapping browser (optional) | Parity with `#/price-library` |
| **D-R1e** | Import/merge from historical xlsx seed → org publish | Bootstrap fleet from `mapping_table.xlsx` |

**Dependency:** P2 blocked on AionCore work; P0/P1 can ship independently.

---

### Files Found

| File Path | Description |
|-----------|-------------|
| `D:/CCB-Wanding/vendor/wanding/python/quotation/learn_by_data_mapping.py` | Pending path, guards M1–M5, append |
| `D:/CCB-Wanding/vendor/wanding/python/quotation/mapping_pending_dispatch.py` | MCP dispatch |
| `D:/CCB-Wanding/vendor/wanding/python/scripts/merge_mapping_import.py` | Merge pending → xlsx |
| `D:/CCB-Wanding/vendor/wanding/python/inventory/services/mapping_table_matcher.py` | Read order Neon→lib→xlsx |
| `D:/CCB-Wanding/vendor/wanding/python/admin/cache.py` | `get_product_mapping_rows()` stub `[]` |
| `D:/CCB-Wanding/vendor/wanding/python/admin/org_price_client.py` | Price org pattern to mirror |
| `D:/CCB-Wanding/vendor/wanding/python/system/tool_dispatch.py` | Registers `append_quotation_mapping_pending` |
| `ccb-installer/.../quotation-learn-by-data/SKILL.md` | Section D SOP + merge instruction |
| `.trellis/spec/integration/price-library.md` | Org API reference pattern |
| `.trellis/spec/backend/quotation-matching-engine.md` §10 | Mapping write-back doc |
| `.trellis/tasks/07-06-learn-by-data-price-library-enrich/research/section-d-historical-mapping-import-explore.md` | ADR Route 2 |

### Code Patterns

**Pending path resolution** (`learn_by_data_mapping.py:136-143`):

```python
def resolve_mapping_pending_path() -> Path:
    data_dir = os.environ.get("DATA_DIR", "").strip()
    if data_dir:
        return Path(data_dir) / "mapping_import_pending.jsonl"
    local = os.getenv("LOCALAPPDATA", "").strip()
    if local:
        return Path(local) / "CCB-Wanding" / "data" / "mapping_import_pending.jsonl"
    return Path(config.MAPPING_TABLE_PATH).parent / "mapping_import_pending.jsonl"
```

**Neon stub** (`admin/cache.py:7-8`):

```python
def get_product_mapping_rows() -> list[dict[str, Any]]:
    return []
```

**Matcher load order** (`mapping_table_matcher.py:157-161`): DB/custom first, else xlsx.

### External References

- N/A — internal architecture only

### Related Specs

- `.trellis/spec/integration/price-library.md` — org shared authority pattern
- `.trellis/spec/integration/org-knowledge.md` — append + version conflict pattern (lighter than price draft)
- `.trellis/spec/backend/quotation-matching-engine.md` — dual recall, Section D write-back

## Caveats / Not Found

- **No AionCore `product_mapping` routes** in this repo — Route 1 requires new backend work (may exist only in legacy Neon admin outside vendor tree; not verified live).
- **Active Trellis task unset** — output written to `07-06-learn-by-data-price-library-enrich/research/` per user context.
- **PT. JINSE pending file not inspected** on disk — path inference from code only.
- **`smoke_learn_by_data_section_d.py`** referenced in test-records but not found at expected vendor path in glob (may be unsynced or renamed).
- **Cloud-shared mapping** is a **product gap**, not a bug: ADR explicitly chose Route 2 pending for Phase 2.2.
