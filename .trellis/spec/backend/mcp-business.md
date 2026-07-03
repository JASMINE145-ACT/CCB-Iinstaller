# MCP Business Layer (Quotation + Inventory)

> Wanding quotation/inventory logic — **not** ACP wiring (see [`acp-session-flow.md`](./acp-session-flow.md)) and **not** AionUI UI (see [`../frontend/index.md`](../frontend/index.md)).

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| `mcp_servers/quotation-server/` | `D:\claude-code-B` ACP session |
| `python/inventory/`, `python/quotation/` | route-b patch |
| Wanding `*.xlsx` / markdown data | Official Claude config |

---

## Quotation MCP tools (verified from `dist/index.js` — 2026-06-29)

| Tool | Purpose |
|------|---------|
| `match_quotation` | Natural-language product → candidates (`keywords`, `customer_level`) |
| `match_quotation_batch` | Multiple keywords in one call (≤50) |
| `get_inventory_by_code` | Stock by product code |
| `get_inventory_by_code_batch` | Up to 50 codes |
| `fill_quotation_sheet` | Write matched lines to Excel | Default: VANTSING blank template, IDR, today; inherit session match — see [`agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation sheet fill defaults; **>10 rows + formulas** — § VANTSING fill insert-rows & Excel formulas below |
| `parse_excel_smart` | Parse uploaded quotation sheet |
| `ask_clarification` | Multi-match disambiguation payload (agent uses assistant text, not AskUserQuestion) |
| `get_product_price_tiers` | All non-zero price tiers for one code (org price library) |
| `append_business_rule` | Append confirmed rule to org `wanding_business_knowledge` (not local shadow) |

**Not MCP-exposed (agent must not call):**

| Name | Status |
|------|--------|
| `match_price_and_get_inventory` | **Retired from agent surface 2026-06-29** — never in `index.js`; L1 routes price+stock via `match_quotation` → `get_inventory_by_code`. Internal Python still used by fill flow. See [`agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation price+stock routing. |
| `search_inventory` | Not in current `index.js`; maint may reference for legacy — use `match_quotation` → `get_inventory_by_code` until re-registered. |

Model-facing names in session: `mcp__quotation__<tool>` (e.g. `mcp__quotation__match_quotation`).

### Matching engine (domain core)

`match_quotation` recall + scoring is **not** implemented in `quotation-server` JS. Live path: MCP → `python/main.py` → `match_quotation_union` → `wanding_fuzzy_matcher.search_fuzzy` (+ mapping table parallel recall). Final SKU selection is **Claude Code** + `wanding_business_knowledge.md`, not an internal LLM selector.

**Full architecture:** [`quotation-matching-engine.md`](./quotation-matching-engine.md) — token expansion, hard filters, score formula, legacy stub warning, test map.

### `fill_quotation_sheet` Path routing & MCP schema (2026-06-30)

**Problem:** Agent post-match fill failed with `file_path is required` or `FILE_NOT_FOUND` on `blank` / `Wanding-Quotation_*.xlsx` because `quotation-server/dist/index.js` required `file_path` and did not expose `fill_items`, while Python Path C already supported direct fill via bundled VANTSING blank template.

**Contract (agent + MCP + Python must agree):**

| Path | When | MCP / tool params | Server behavior |
|------|------|-------------------|-----------------|
| **C** (default after match) | User says fill/generate quote; session already matched | `fill_items` + `require_exact_codes=true`; **omit** `file_path` | `resolve_direct_template_path()` → bundled `空白标准报价单.xlsx`; output via `workspace_path` or absolute `output_path` |
| **A** | User supplied **existing** inquiry Excel on disk | `file_path` only (no `fill_items`) | `run_quotation_fill_flow` extract → match → fill |
| **B** | Cold-start keyword list | `items: [{keywords, quantity}]` | Direct-fill branch + auto-match |

**Forbidden:** `file_path: "blank"` / `template` / future `Wanding-Quotation_*.xlsx` output names as input. Python `fill_path_guard.guard_path_a_file_path` rejects placeholders with Path C hint; Path C with `fill_items` ignores invented `file_path` and uses bundled template.

**Schema surfaces (keep in sync on every fill contract change):**

| Surface | File | `file_path` required? | `fill_items` exposed? |
|---------|------|----------------------|----------------------|
| MCP ListTools | `mcp_servers/quotation-server/dist/index.js` | No | Yes |
| OpenAI adapter | `python/quotation/tool_schema.py` | No | Yes |
| L1 SOP | `ccb-installer/config/agents/quotation-agent.md` §Path 路由 | Path C: omit | Yes |
| ROE retry hint | `ccb-subagent-gate/.../roe-judge-profiles/quotation-agent.json` | Path C: omit | Yes |

**Tests:** `test_fill_path_guard.py`, `test_quotation_mcp_tool_registry.py::test_fill_quotation_sheet_exposes_path_c_fill_items`, `test_dispatch_error_codes.py::test_fill_path_a_rejects_placeholder_file_path`.

**Deploy:** rebuild/sync `quotation-server` dist → `sync-dev-wanding-vendor.ps1` → `deploy-subagent-gate-skill.ps1` → **new Guid session**.

---

## Supplier remark contract (VANTSING O / Catatan)

### 1. Scope / trigger

Use this contract when quotation data carries an optional supplier mapping from a local `price_library` workbook or a future org price-library schema. The business goal is narrow: if the matched material code has a supplier, `fill_quotation_sheet` writes that supplier into VANTSING column O (`Catatan`); if no supplier exists, column O stays blank.

### 2. Signatures

| Surface | Contract |
|---------|----------|
| price library row | Optional `supplier` field/column; absence is valid |
| `match_quotation` / matcher candidates | May include `supplier` when the price source has it |
| `fill_items[]` | Accepts optional `supplier`, `remark`, or `catatan` |
| `VANTSING_LAYOUT` | `remark_col=15` |
| non-VANTSING layouts | `remark_col=None` unless explicitly mapped |

### 3. Contracts

- Matchers must preserve `supplier` across exact-code hits, fuzzy candidates, English candidates, price lookup by code, and inventory+price candidate merge.
- The bundled-seed fallback (`admin.org_price_client._load_bundled_seed`) must also preserve `supplier`; otherwise temporary local mode loses supplier before the matcher sees it.
- `normalize_fill_items` must not drop `supplier`, `remark`, or `catatan`.
- `enrich_fill_item` uses `supplier` as `remark` only when no explicit `remark` already exists.
- `fill_quotation_sheet` writes `remark`/`catatan` to `layout.remark_col` only when the layout declares that column and the value is non-empty.
- Multi-supplier values are data, not a conflict at fill time. Preserve the returned joined value such as `A / B`.

### 4. Validation & error matrix

| Condition | Expected behavior |
|-----------|-------------------|
| `supplier` present on matched row | Output VANTSING O has supplier text |
| `supplier` absent or blank | Output O remains blank |
| `remark` explicitly supplied | Use explicit `remark`; do not overwrite with `supplier` |
| `supplier` present but price blank/0 | Preserve supplier; do not invent a price |
| non-VANTSING template | Do not write remark unless `remark_col` is configured |

### 5. Good / base / bad cases

Good: `8010012697` carries `supplier="HENG XIN INTERNATIONAL INDONESIA"` and generated VANTSING row 8 column O contains that text.

Base: a normal price row without supplier fills code/name/spec/price as before and leaves O blank.

Bad: agent uses Excel MCP to batch rewrite O after fill, or invents a supplier when the matcher returned none.

### 6. Tests required

- `python/tests/test_price_library_supplier.py` verifies optional `supplier` survives local price-library load, fuzzy candidates, and code lookup.
- `python/tests/test_quote_tools_insert_rows.py::test_vantsing_fill_writes_remark_to_catatan_column` verifies VANTSING O receives `remark`.
- Existing fill regressions must still pass for rows without supplier.

### 7. Wrong vs correct

| Wrong | Correct |
|-------|---------|
| Add an ad-hoc Excel MCP write after every quote to fill O | Pass `supplier`/`remark` through `fill_items`; let `fill_quotation_sheet` write O |
| Treat supplier-only rows as priced SKUs | Keep supplier data, but blank/0 price remains blank/0 |
| Collapse multi-supplier rows to one without user/business rule | Preserve joined supplier value |
| Add `supplier` to only one matcher path | Preserve it in exact-code, fuzzy, English, code lookup, and merged candidates |

---

## VANTSING fill insert-rows & Excel formulas (2026-06-30)

### 1. Scope / trigger

`fill_quotation_sheet` on the built-in **VANTSING** blank template (`data/空白标准报价单.xlsx`). Covers (a) automatic row expansion when `fill_items` exceed 10 data lines, and (b) Excel formulas for line totals and footer aggregates so users can edit qty/price in Excel without agent recalc.

Task: `.trellis/tasks/06-30-quotation-template-insert-rows-merge-fix`

### 2. Layout reference (`python/quotation/layout.py`)

| Field | VANTSING (1-based col) |
|-------|------------------------|
| `data_start_row` | 8 |
| `quote_qty_col` | 11 (K) |
| `unit_price_col` | 13 (M) |
| `total_col` / `totals_value_col` | 14 (N) |
| Default data capacity | 10 rows (8–17); Total row 18 in blank template |

### 3. Contracts

**Insert rows (>10 lines):**

- Before `insert_rows(total_row)`, unmerge all footer merges from `total_row` downward; after insert, unmerge stray merges on new data rows, copy styles from last template data row, restore footer merges with `row_offset=insert_count`.
- New data rows must remain normal cells (not `MergedCell`) in product_no / quote_name / spec / price / qty / total columns.

**Formulas (VANTSING only — `_use_excel_line_total_formulas`):**

| Cell | Formula / value |
|------|-----------------|
| Row N (matched line) | `=M{row}*K{row}` |
| Row N (无货) | `0` |
| Total excl. PPN | `=SUM(N{data_start}:N{last_filled_row})` |
| PPN 11% | `=N{total_row}*0.11` |
| Freight | numeric (`freight` param, default 0) |
| Total incl. PPN | `=SUM(N{total_row}:N{total_row+2})` |

- `last_filled_row = max(filled data row numbers)` from `fill_items`.
- Lingwei and other layouts: keep static numeric totals (no formula path).
- openpyxl does **not** evaluate formulas; automated tests assert formula **strings**. Excel/WPS recalc on open.

### 4. Validation & error matrix

| Condition | Expected |
|-----------|----------|
| ≤10 `fill_items` | No insert; Total stays row 18 on blank template |
| 12 `fill_items` rows 8–19 | Total row 20; rows 18–19 full F/G/I/N; footer `=SUM(N8:N19)` |
| User edits K or M in Excel | Row N and footer recalc in Excel |
| 无货 row | N column `0`, not a formula |
| Agent excel MCP batch overwrite N/footer | **Forbidden** (see `quotation-agent.md`) |

### 5. Tests required

- `python/tests/test_quote_tools_insert_rows.py` — insert + merge + formula footer range
- `python/tests/test_quote_tools_formulas.py` — 10-row baseline formulas, 无货 zero
- Regression: `test_fill_row_guard.py`, `test_inquiry_backfill.py`

### 6. Wrong vs correct

| Wrong | Correct |
|-------|---------|
| excel MCP insert rows or rewrite table for >10 SKUs | `fill_quotation_sheet` with `fill_items` row numbers through 19+ |
| Static Python sum in footer after fill | Dynamic `SUM` formula spanning inserted rows |
| Agent recalculates totals after user edits sheet | User edits qty/price in Excel; formulas handle totals |

---

## File map

Path lookup: [`file-map.md`](./file-map.md) §3 (MCP business servers). **Currently shipped as prebuilt `quotation-server/dist/`** — no `src/` sibling in this repo.

---

## Config (how MCP is spawned)

Live spawn config: `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` → `mcpServers.quotation`.

Installer default: `ccb-installer/scripts/ensure-wanding-settings.ps1`.

See [`config-layer.md`](./config-layer.md).

---

## Dev / test loop

### 1. MCP-only smoke (no AionUI)

```powershell
cd D:\Projects\claude-code-best\ccb-installer
node test-runtime-mcp.mjs
# Expect: quotation connected, tools.length > 0
```

### 2. Full ACP + quotation tool loop

```powershell
$env:CCB_TEST_PROMPT = "查询直接50价格"
node ccb-installer/test-native-acp-agent.mjs
# Any non-empty prompt works; longer "…必须使用报价工具" also OK (explicit tool nudge)
```

### 3. Python unit tests

```powershell
cd D:\Projects\claude-code-best\python
python -m pytest inventory/ -q
```

### 4. Wanding E2E (install + data)

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\smoke-wanding-e2e.ps1 -InstallDir D:\CCB-Wanding
```

---

## Symptom → layer

| Symptom | Likely layer | Fix |
|---------|--------------|-----|
| `No such tool available: match_price_and_get_inventory` | L1 / maint prompt drift | Agent prompt recommends unregistered tool — see [`agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation price+stock routing; `deploy-seed-agents.ps1 -ForceMd`; new Guid session |
| Tool returns wrong candidates | MCP / Python / data xlsx | This doc + `python/inventory` |
| Tool not in model's tool list | ACP / `$buildMcp` | [`route-b-status.md`](./route-b-status.md), [`source-migration-mcp.md`](./source-migration-mcp.md) |
| Tool runs but UI doesn't show result | AionUI renderer | [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) |
| `accurate` pricing wrong | `D:\CCB-Wanding\vendor\mcp-servers\accurate-mcp\` | settings + Accurate server |

---

## Related

- Backend entry: [`index.md`](./index.md)
- File lookup: [`file-map.md`](./file-map.md) §3
- Live MCP registration: [`route-b-status.md`](./route-b-status.md)
