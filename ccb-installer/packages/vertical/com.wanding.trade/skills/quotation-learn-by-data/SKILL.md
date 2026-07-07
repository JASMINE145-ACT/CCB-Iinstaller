---
name: quotation-learn-by-data
description: >
  Quotation quality learning from human-filled VANTSING Excel. Re-match each inquiry line,
  compare agent knowledge-based pick (same as quotation-agent §选型) vs human material code,
  output knowledge snippets or severe flags. Phase 2: price library enrich for agent pick missing from PL.
  Use when user types /learn-by-data, learn-by-data, 按数据学习, or 复盘报价.
---

# Quotation Learn-by-Data / 报价复盘学习

> **Scope (MVP):** Human-filled **VANTSING** quote Excel only. Compare **material codes** — not unit prices.
> **Tools:** `quotation` MCP (`parse_excel_smart`, match/compare, Section D pending); **price-library** MCP for Section C draft upsert (`price_admin` only). **Step 1 forbids excel MCP.** **No Bash.**

## When to run

User invokes `/learn-by-data`, says「按数据学习」or「复盘报价」, and provides (or already uploaded) a **filled** VANTSING quotation `.xlsx`.

**First action:** `Skill(quotation-learn-by-data)` or Read this file, then execute Steps 1–4 serially.

## Hard rules

1. **SERIAL** — Complete Step 1 → all Step 2 batches → Step 3 per batch → Step 4 summary. Do not skip batches.
2. **BATCH TABLE FIRST** — After each `match_quotation_batch`, output the comparison table for that batch **before** the next batch call or deep reasoning.
3. **`show_candidates=true`** on every `match_quotation_batch` and fallback `match_quotation` (need up to 15 candidates for membership check).
4. **VANTSING fixed columns** — Do not guess columns via LLM on MVP path (see Step 1).
5. **No `product_type`** in match payload — use `matched_name`, `description_english`, `source` only.
6. **ROE** — Finish all batches and Section A/B/C before ending turn; no empty replies after tool success.
7. **Section C prices** — Do **not** set `price_a`…`price_e` on learn-by-data upsert; metadata + descriptions only unless user explicitly asks to fill tiers later.
8. **Section C price-library tools (whitelist)** — Allowed: `get_price_library_active`, `get_price_library_draft`, `upsert_price_library_item`. **Forbidden:** `publish_price_library_draft`, `apply_price_library_import`, `delete_price_library_item`, `revert_price_library_draft`, and any bulk import/publish path.
9. **Section C dedup (L1–L3)** — Before each upsert preview, run guards **in order**; on `skip`/`reject` output reason in Section C table — **do not** call `upsert_price_library_item`.
10. **选型与报价助手绝对一致（硬约束）** — 见下方 §选型一致性；**禁止**用 `candidates[0]`、列表顺序或引擎排序代替选型。
11. **Step 1 读表（硬约束）** — **必须** `mcp__quotation__parse_excel_smart`；**禁止** excel MCP `read_data_from_excel` 及任何 bulk range 读表（含 `A1:Q*`）。

---

## 选型一致性（与 quotation-agent **绝对一致**）

learn-by-data 的「Agent 选了哪条」**必须**与 Guid **万鼎报价专家**正常查价会话相同，不得出现第二条逻辑。

| 报价助手（normative） | learn-by-data（必须相同） |
|----------------------|---------------------------|
| Read `wanding_business_knowledge.md` 本会话一次 | Step 2 第一次 batch 前 Read（同文件） |
| `match_quotation` / batch → 得 `candidates` | 同工具、`show_candidates=true`（仅多返回条数供 membership） |
| 按 `quotation-agent.md` **§选型与澄清** + 知识库正文选型 | **同规则** — 输出你会在正常查价里写的那条「推荐（B档）」 |
| 1 推荐 + ≤4 bullet「其他可能」 | 复盘表只比较 **推荐料号**；bullet 可选记入备注 |
| **禁止**默认 `candidates[0]` | **禁止** `candidates[0]` / `results[i].candidates[0].code` 作为 Agent 料号 |

### 每行选型算法（查后，与报价助手相同）

对 `results[i]`（`candidate_count ≥ 1`）：

1. 在 **已 Read 知识库** 前提下，对 `results[i].candidates` **全文列表**（≤15）应用 `wanding_business_knowledge.md` 选型规则（材质/用途/口径/§9 澄清例外 — 与 `quotation-agent.md` §选型与澄清 一致）。
2. 设 `agent_pick_code` = 你在正常查价回复中会写进 **「推荐（B档）」** 的那一行的 `code`。
3. 设 `agent_pick_row` = `candidates` 中 `code == agent_pick_code` 的那条（用于名称/source/英文描述）。
4. 写一句 `selection_reason`（与正常会话「选型理由」同风格，可写入对比表备注）。
5. **Tie-breaker（仅当知识库仍无法区分时）**：`source` 权重 共同 > 历史报价 > 字段匹配 — 与 `ccb-wanding-quotation.md` / `selection_context` 一致；**不得**用 tie-breaker 跳过知识库规则。

**FORBIDDEN：**

- 因 `show_candidates=true` 而把列表第一项当 Agent 推荐。
- 未 Read 知识库就写「根据知识库」或产出 `agent_pick_code`。
- 查后甩锅「用途 A/B/C / 请选序号」而不先给出你的推荐料号（与报价助手 BAD 示例相同）。

**`show_candidates=true` 的唯一用途：** 暴露最多 15 条供 **membership**（`actual_code ∈ candidates`）与人工核对；**不是**选型快捷方式。

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
| `actual_code` | 6 | F | human material code (`sheet_product_code`) |
| `quote_name` | 7 | G | filled quote name (Section D col D) |
| `data_start_row` | — | 8 | first data row |
| data end | — | row before `Total Excluding PPN` | exclude footer |

Per row:

- `keywords` = trim(`B` + ` ` + `C`)
- `actual_code` = trim(`F`)
- `quote_name` = trim(`G`) when present
- Skip rows with empty `keywords`

Per row, also capture for Section C/D:

- `source_file` = Excel **basename only** (strip path; reject `..` and UNC)
- `source_sheet` = active sheet name from parse result
- `source_row` = Excel 1-based row number (same as table row index in `parse_excel_smart` output)

### Read sheet (primary — quotation MCP only)

**One call per file** — do **not** re-read via excel MCP or `Read` on tool-result spill files.

```json
{
  "file_path": "<absolute path to .xlsx>",
  "max_rows": 30
}
```

Tool: `mcp__quotation__parse_excel_smart`. Use `max_rows=30` (not 500) unless user sheet clearly has more data rows before Total.

**Parse algorithm (apply fixed map to Markdown table):**

1. Confirm sheet contains `Total Excluding PPN` and VANTSING layout (data from row 8).
2. From parse result Markdown: skip the column-index header row and separator; each following **data line** = one Excel row; **line index = `excel_row`** (row 1 in file = first data line).
3. Split cells by `|`; use **column index** from header row (1-based): col **2**→`inquiry_name`, **3**→`inquiry_spec`, **6**→`actual_code`, **7**→`quote_name`.
4. Process only rows where `excel_row >= 8` and before the row where **any cell** contains `Total Excluding PPN` (same rule as `VANTSING_LAYOUT` / Python smoke).
5. Build in-memory row list for Step 2 batches.

**FORBIDDEN in Step 1:**

- `mcp__excel__read_data_from_excel` (any range, including narrow `B8:F17`)
- Reading spilled `tool-results/*.txt` from a prior excel MCP call
- Guessing columns from LLM when fixed map applies

### Sanity check

If parsed data-row count (rows 8…before Total) ≠ user-visible inquiry lines → **one** blocking ask: user confirms column map or template variant.

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

对每一行先完成 **§选型一致性** 的 `agent_pick_code`（不是列表第一项）。

Let `agent_pick_code` = knowledge-based pick per §选型一致性 (empty if `unmatched` or `candidate_count == 0`).

**Legacy name ban:** do not use `top`, `top_code`, or `Agent首位` to mean `candidates[0]` — only `agent_pick_code`.

### Membership (`actual_code ∈ candidates`)

1. Scan all `candidates[].code` in batch result (up to 15).
2. If no hit and `candidates_truncated == true` → single `match_quotation` with same `keywords`, `show_candidates=true`.
3. If still no hit → **price library check** `get_product_price_tiers(actual_code)`:
   - **in price library** (`tier_count > 0` or `found !== false` and `price_source !== "none"`) → **not-in-candidates**, remark **`人工核查`**
   - **not in price library** → **not-in-candidates**, remark **`实际料号无效`**

### Price library check for agent pick (`agent_pick_code`)

When `agent_pick_code` is non-empty (not `unmatched` / not 0-candidate):

- Call `get_product_price_tiers(agent_pick_code)`.
- If **not in price library** → queue row for **Section C** (upsert metadata draft).
- If in price library → no Section C action for that row.

### Classification

| Condition | Action |
|-----------|--------|
| `agent_pick_code == actual_code` (both non-empty) | **match** — omit from mismatch tables |
| mismatch + actual in candidates | **in-candidates** → Section A |
| mismatch + actual not in candidates (or 0 candidates) | **not-in-candidates** → Section B (+ Section C if agent pick missing from PL) |

### Per-batch comparison table (required)

Output **before** next batch. Column **Agent推荐料号** = `agent_pick_code`（知识库选型结果，**非** `candidates[0]`）。

```markdown
### 批次对比表（行 x–y）

| 行 | 关键词 | 实际料号 | Agent推荐料号 | 选型理由 | 分类 |
|----|--------|----------|---------------|----------|------|
| 8 | PVC线管 20 | 8030050068 | 8030050068 | 线管→PVC电线管B管 dn20 | match |
| 9 | PVC直接 20 | 8030020288 | 8030020288 | 电工套管直通，非AW给水直接头 | match |
| 10 | 50卷波纹管 DN20 | 8030020808 | 8030020808 | 50M卷波纹管→PVC电工套管 | match |
```

若 `agent_pick_code ≠ actual_code` 但 actual 在 candidates 内 → **in-candidates**，选型理由栏说明为何知识库选型与人工表不一致。

---

## Step 4 — Output

### Section A: 知识片段建议（in-candidates）

**Auto-draft** rule text when **any**:

1. Brand token differs in `matched_name` / `description_english` between **actual** vs **`agent_pick_row`**.
2. ≥2 DN/PN/spec number tokens differ (regex on names, or `get_product_price_tiers` for **names only**).
3. `source` differs materially between actual row vs `agent_pick_row` when names share same product family.

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

| 关键词 | 实际料号 | Agent推荐料号 | 备注 |
|--------|----------|---------------|------|
| … | … | 无候选 | 人工核查 |
```

`0` candidates → Agent推荐料号 = `无候选`.

Section B does **not** end session if Section A or Section C has pending confirmations.

### Section C: 价格库补全建议（Agent 推荐料号不在价格库）

After all batches, for each queued row (`agent_pick_code` missing from org/local price library):

**Dedup guards (run before upsert preview, per row):**

| Guard | Check | On hit |
|-------|-------|--------|
| **L1** | Same `agent_pick_code` already processed in this `/learn-by-data` session | **Skip** — note「本会话已处理」 |
| **L2** | Re-call `get_product_price_tiers(agent_pick_code)` immediately before upsert | **Skip** if hit — note「料号已在价格库」 |
| **L3** | `get_price_library_active` (+ optional `get_price_library_draft`) scan for same `source_file` + `source_sheet` + `source_row` | **Reject** — note「重复来源行」; do **not** upsert |

Track L1: maintain a session set of `agent_pick_code` values that reached `confirmed=true` or were skipped with reason.

**≥5 rows** needing Section C → suggest bulk path (`export` / price-library-agent) instead of serial upsert.

```markdown
### 价格库补全建议（learn-by-data）

| 来源文件 | 来源Sheet | 来源行 | 物料编码 | 描述 | 中文描述 | 英文描述 | 首选价 | 状态 |
|----------|-----------|--------|----------|------|----------|----------|--------|------|
| quote.xlsx | Sheet1 | 16 | 8020020755 | … | 直接50 | … | TRUE | 待补价 |
```

Status column: `待补价` (metadata-only), `跳过`, `拒绝`, `已写入draft`, or `待确认`.

**Upsert (price_admin + org session only):**

0. Run L1 → L2 → L3. If skip/reject, show status and continue next row.
1. `get_price_library_draft` — note `revision` (optional sanity).
2. `upsert_price_library_item` with `confirmed=false`:

```json
{
  "material_code": "<agent_pick_code>",
  "confirmed": false,
  "fields": {
    "source_file": "<basename>",
    "source_sheet": "<sheet>",
    "source_row": 16,
    "is_preferred_price": true,
    "superseded_by_source": "",
    "description": "<agent_pick_row.matched_name>",
    "description_cn": "<keywords>",
    "description_english": "<agent_pick_row.description_english>"
  }
}
```

3. **Same turn:** show tool preview / diff table (`creates_new` vs update); ask 是否确认写入 draft.
4. `confirmed=true` only after user says 确认/同意 — **one row at a time**; re-read draft revision between rows.
5. **Do not** call `publish_price_library_draft` in this skill unless user explicitly asks to publish. Warn: metadata-only rows need tier prices before publish affects quoting.
6. On HTTP **409 revision conflict**: `get_price_library_draft` to refresh revision; **do not** auto-retry upsert — ask user.

Non-`price_admin` users: output Section C table only — no draft mutation.

**0 candidates:** no Section C (Section B only, Agent推荐料号 = `无候选`).

### Section D: 历史报价库补全（D-mismatch ∪ D-gap → 映射表 pending）

After Section A/B/C, import eligible rows into the **historical quote mapping library** (`mapping_table` / 历史报价 recall path).

**Eligibility (per row, F 列非空):**

| Trigger | 条件 | 入库原因 |
|---------|------|----------|
| **D-mismatch** | `sheet_product_code` ≠ `agent_pick_code` | **纠错** — Agent 与人工成单料号不一致 |
| **D-gap** | `sheet_product_code` == `agent_pick_code` **且** 映射表尚无「询价关键词 → 该 F 列料号」 | **补映射** — 成单证据，历史库缺这条 recall |
| **Skip** | F 列为空；或已对齐且 M2 命中（映射表已有同关键词 + 同料号） | 无需重复入库 |

**Check D-gap:** normalize `inquiry_name` + `inquiry_spec` → `norm_text`; query mapping table — if no row with same `norm_text` **and** `code == sheet_product_code`, row is **D-gap**.

**Field source — read from the filled VANTSING sheet (not re-typed by user):**

| Mapping col | VANTSING col | Field |
|-------------|--------------|-------|
| A 询价货物名称 | B | `inquiry_name` |
| B 询价规格型号 | C | `inquiry_spec` |
| C 产品编号 | **F** | **`sheet_product_code`（报价单成单料号）** |
| D 报价名称 | **G** | `quote_name` |

Also pass audit: `source_file` (basename), `source_sheet`, `source_row`, `agent_pick_code`.

**Dedup guards (before append preview, per row):**

| Guard | Check | On hit |
|-------|-------|--------|
| **M1** | Same `(keywords, sheet_product_code)` already processed this session | **Skip** |
| **M2** | Mapping table already has same keyword + same F col code | **Skip** |
| **M3** | Same `source_file+sheet+row` already in pending | **Reject** |
| **M4** | Same keyword, different F col code vs existing mapping | **Preview conflict** → user confirms → `allow_overwrite=true` |
| **M5** | F 列 empty | **Reject** |

**Tool (all learn-by-data users — no price_admin):** `append_quotation_mapping_pending` on **quotation** MCP only. **Forbidden:** editing `mapping_table.xlsx` directly, Bash file writes.

```markdown
### 历史报价库补全建议（learn-by-data）

| 来源文件 | Sheet | 行 | 询价关键词 | 成单料号(F) | 报价名称(G) | Agent推荐 | 入库原因 | 状态 |
|----------|-------|-----|------------|-------------|-------------|-----------|----------|------|
| PO…xlsx | Sheet1 | 10 | 50卷波纹管 DN20 | 8030020808 | … | 8010062265 | 纠错 | 待确认 |
| PO…xlsx | Sheet1 | 12 | PVC线管 20 | 8030050068 | … | 8030050068 | 补映射 | 待确认 |
```

入库原因：`纠错` = D-mismatch；`补映射` = D-gap（Agent 与人工一致但历史库缺该关键词映射）。

1. `append_quotation_mapping_pending` with `confirmed=false` (fields from table above).
2. **Same turn:** show preview + guard result; ask 是否确认写入 pending.
3. If M4 conflict: show 旧码→新码; after user agrees, call with `confirmed=true` **and** `allow_overwrite=true`.
4. `confirmed=true` — one row at a time.
5. Tell user: run `python python/scripts/merge_mapping_import.py` to merge pending → `mapping_table.xlsx` (invalidates mapping cache).

Section D does **not** end session if Section A/C still has pending confirmations. Run Section D **after** batch tables; serial with Section C confirmed writes.

### append_business_rule

Per draft:

1. `append_business_rule` with `confirmed=false`
2. **Same turn:** full markdown preview of `rule_text` + ask 是否确认落库
3. `confirmed=true` only after user says 确认/同意 (needs org session)

---

## Smoke fixture (dev)

`data/smoke/learn-by-data-vantsing-filled.xlsx` — ≥15 rows, 2 batches. Regenerate: `python python/scripts/generate_learn_by_data_smoke_fixture.py`.
