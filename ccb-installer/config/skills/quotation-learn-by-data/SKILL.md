---
name: quotation-learn-by-data
description: >
  Quotation quality learning from human-filled VANTSING Excel. Re-match each inquiry line,
  compare agent top candidate vs human material code, output knowledge snippets or severe flags.
  Use when user types /learn-by-data, learn-by-data, 按数据学习, or 复盘报价.
---

# Quotation Learn-by-Data / 报价复盘学习

> **Scope (MVP):** Human-filled **VANTSING** quote Excel only. Compare **material codes** — not unit prices.
> **Tools:** `quotation` MCP for match/compare/write; **excel** MCP optional for precise column range read in Step 1; optional `parse_excel_smart` preview. **No Bash.**

## When to run

User invokes `/learn-by-data`, says「按数据学习」or「复盘报价」, and provides (or already uploaded) a **filled** VANTSING quotation `.xlsx`.

**First action:** `Skill(quotation-learn-by-data)` or Read this file, then execute Steps 1–4 serially.

## Hard rules

1. **SERIAL** — Complete Step 1 → all Step 2 batches → Step 3 per batch → Step 4 summary. Do not skip batches.
2. **BATCH TABLE FIRST** — After each `match_quotation_batch`, output the comparison table for that batch **before** the next batch call or deep reasoning.
3. **`show_candidates=true`** on every `match_quotation_batch` and fallback `match_quotation` (need up to 15 candidates for membership check).
4. **VANTSING fixed columns** — Do not guess columns via LLM on MVP path (see Step 1).
5. **No `product_type`** in match payload — use `matched_name`, `description_english`, `source` only.
6. **ROE** — Finish all batches and Section A/B tables before ending turn; no empty replies after tool success.

---

## Step 1 — Parse (VANTSING)

### Detect template

VANTSING when active sheet contains `Total Excluding PPN` and data starts at **row 8**.

If not VANTSING → stop and tell user MVP supports VANTSING only; LINGWEI/custom formats are Phase 2.

### Fixed column map (1-based)

| Field | Col | Excel | Usage |
|-------|-----|-------|--------|
| `inquiry_name` | 2 | B | keywords part 1 |
| `inquiry_spec` | 3 | C | keywords part 2 |
| `actual_code` | 6 | F | human material code |
| `data_start_row` | — | 8 | first data row |
| data end | — | row before `Total Excluding PPN` | exclude footer |

Per row:

- `keywords` = trim(`B` + ` ` + `C`)
- `actual_code` = trim(`F`)
- Skip rows with empty `keywords`

Read cells via **excel** MCP (`read_data_from_excel` / range read) or user-provided absolute `file_path`. Prefer excel MCP for precise column extraction over re-parsing full sheet.

### Optional sanity check

Once per file: `parse_excel_smart` with `max_rows=25` to show preview. If extracted row count ≠ fixed-map row count → **one** blocking ask: user confirms column map.

---

## Step 2 — Re-quote

Before **first** `match_quotation_batch`: Read `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` once (PreToolUse gate).

### Batch loop

```json
{
  "keywords_list": ["<row1 keywords>", "..."],
  "customer_level": "B",
  "show_candidates": true
}
```

- Max **10** keywords per call (`remaining_keywords` for continuation).
- `customer_level`: from user/sheet context (青山→`D`, 大唐→`E`, …); default **`B`**. Do not infer from unit price.
- Re-match uses current price library (`bundled_seed` possible) — compare codes only.

---

## Step 3 — Compare (per row)

Let `top = results[i].candidates[0].code` (empty if `unmatched` or `candidate_count == 0`).

### Membership (`actual_code ∈ candidates`)

1. Scan all `candidates[].code` in batch result (up to 15).
2. If no hit and `candidates_truncated == true` → single `match_quotation` with same `keywords`, `show_candidates=true`.
3. If still no hit → `get_inventory_by_code(actual_code)`:
   - found → **not-in-candidates** (remark: `人工核查`)
   - not found → **not-in-candidates** (remark: `实际料号无效`)

### Classification

| Condition | Action |
|-----------|--------|
| `top == actual_code` (both non-empty) | **match** — omit from mismatch tables |
| mismatch + actual in candidates | **in-candidates** → Section A |
| mismatch + actual not in candidates (or 0 candidates) | **not-in-candidates** → Section B |

### Per-batch comparison table (required)

Output **before** next batch:

```markdown
### 批次对比表（行 x–y）

| 行 | 关键词 | 实际料号 | Agent首位 | 分类 |
|----|--------|----------|-----------|------|
| 8 | 直接50 | 8020020755 | 8020020755 | match |
| 9 | 直接50 | 8010071381 | 8020020755 | in-candidates |
```

---

## Step 4 — Output

### Section A: 知识片段建议（in-candidates）

**Auto-draft** rule text when **any**:

1. Brand token differs in `matched_name` / `description_english` between actual vs top candidate.
2. ≥2 DN/PN/spec number tokens differ (regex on names, or `get_product_price_tiers` for **names only**).
3. `source` differs materially (e.g. 历史报价 vs 字段匹配) and names share same product family.

**Ambiguous** → comparison table; ask user to write rule.

**Write routing:**

| Rule scope | Action |
|------------|--------|
| Fleet-wide selection | `append_business_rule` |
| Customer/project only | Suggest `memory/business/customers.md` — do **not** auto org-append |

### Section B: ⚠️ 严重标记（料号未在候选中）

After all batches:

```markdown
### ⚠️ 严重标记（料号未在候选中）

| 关键词 | 实际料号 | Agent最佳候选 | 备注 |
|--------|----------|---------------|------|
| … | … | 无候选 | 人工核查 |
```

`0` candidates → Agent最佳候选 = `无候选`.

Section B does **not** end session if Section A has pending confirmations.

### append_business_rule

Per draft:

1. `append_business_rule` with `confirmed=false`
2. **Same turn:** full markdown preview of `rule_text` + ask 是否确认落库
3. `confirmed=true` only after user says 确认/同意 (needs org session)

---

## Smoke fixture (dev)

`data/smoke/learn-by-data-vantsing-filled.xlsx` — ≥15 rows, 2 batches. Regenerate: `python python/scripts/generate_learn_by_data_smoke_fixture.py`.
