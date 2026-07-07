# learn-by-data Phase 2 — 价格库补全（Section C）

## Goal

Extend `quotation-learn-by-data` after MVP (06-30): when a row is **not-in-candidates**, split handling by **org price library** presence (not just inventory), and when the **agent top candidate** is missing from the price library, propose a structured **draft upsert** with provenance fields from the source Excel row.

## Background (MVP recap)

| Path | Current behavior |
|------|------------------|
| **match** | Skip |
| **in-candidates** mismatch | Section A — knowledge snippet / `append_business_rule` |
| **not-in-candidates** | Section B — ⚠️ table; `get_inventory_by_code(actual_code)` → 人工核查 vs 实际料号无效 |

## New requirements

### R1 — 实际料号不在候选，但在价格库 → 正常警告

When `actual_code ∉ candidates`:

- If `actual_code` **exists in org price library** (`get_product_price_tiers` returns product) → Section B row, remark **`人工核查`** (normal warning — no upsert, no severe escalation beyond existing Section B).
- If `actual_code` **not in price library** → Section B remark **`实际料号无效`** (keep MVP semantics).

> **Clarification vs MVP:** MVP used `get_inventory_by_code` (AOL stock). Phase 2 uses **price library** as “数据库” for this branch. Inventory may remain optional secondary note in remark.

### R2 — Agent 首位候选不在价格库 → 补全价格库 draft

When `actual_code ∉ candidates` **and** `top_code = candidates[0].code` is non-empty **and** `top_code` **not in org price library**:

- Build upsert payload (minimum fields):

| 用户字段 | Org / draft field | 来源 |
|----------|-------------------|------|
| 来源文件 | `source_file` | Excel 文件名（或绝对路径 basename） |
| 来源Sheet | `source_sheet` | 活动 sheet 名 |
| 来源行 | `source_row` | Step 1 解析行号 |
| 首选价 | `is_preferred_price` | `true`（learn-by-data 入库默认主价格行） |
| 被替代 | `superseded_by_source` | `""` when preferred; 若业务需标记历史行再填 |
| 物料编码 | `material_code` | `top_code` |
| 描述 | `description` | `candidates[0].matched_name` |
| 中文描述 | `description_cn` | 行 keywords（B+C）或 sidecar |
| 英文描述 | `description_english` | `candidates[0].description_english` |
| 档位价 | `price_{level}` | **Phase 2: omit** — do not set on learn-by-data upsert unless user explicitly requests |

- Output **Section C: 价格库补全建议** — markdown diff table per row (same two-phase pattern as `price-library-edit` skill).
- Call `upsert_price_library_item(material_code, fields, confirmed=false)` → user confirms → `confirmed=true`.
- **Requires** `price_admin` org session; non-admin users see preview table only (no draft mutation).

### R3 — 0 候选

When `candidate_count == 0`: Section B only (`无候选`); **no** Section C upsert.

## Acceptance Criteria

- [x] SKILL.md Step 3 classification matrix documents R1/R2; Step 4 adds Section C template + upsert two-phase flow.
- [x] `quotation-agent.md` §工具决策表 references Section C + `price-library` MCP.
- [x] Price library existence oracle: `get_product_price_tiers(code)` (quotation MCP — already registered).
- [x] `upsert_price_library_item` accepts `source_file`, `source_sheet`, `source_row`, `superseded_by_source` in MCP schema (Python already supports via `UPDATABLE_FIELD_NAMES`).
- [x] `quotation-agent` session can invoke price-library write tools when user is `price_admin` (MCP allowlist + package.json + registry).
- [ ] Smoke fixture gains ≥1 row: not-in-candidates + top_code missing from org active (deferred — manual smoke).
- [ ] Eval case updated for Section C preview (`confirmed=false`) — deferred.
- [x] Spec: `agents-unified-model.md` § learn-by-data Phase 2.

## Out of Scope

- LINGWEI / non-VANTSING templates (still Phase 2 layout).
- Auto-publish price library draft without user confirm.
- Bulk import xlsx path (use existing `apply_price_library_import` for mass ingest).
- Changing fuzzy matcher scoring.

## Parent task

Extends `.trellis/tasks/06-30-quotation-learn-by-data-skill/` (completed MVP).
