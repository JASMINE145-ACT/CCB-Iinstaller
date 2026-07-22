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
> **Tools:** `quotation` MCP (`parse_excel_smart`, match/compare)；**price-library** MCP for Section C draft upsert (`price_admin` only)。**Section D 硬跳过**（禁映射写入）。**Step 1 forbids excel MCP.** **No Bash.**

## When to run

User invokes `/learn-by-data`, says「按数据学习」or「复盘报价」, and provides (or already uploaded) a **filled** VANTSING quotation `.xlsx`.

**First action:** `Skill(quotation-learn-by-data)` or Read this file, then execute Steps 1–4 serially.

## Hard rules

1. **SERIAL** — Complete Step 1 → all Step 2 batches（每批：match → **select** → 对比表）→ Step 3/4 summary. Do not skip batches.
2. **SELECT THEN TABLE** — After each successful `match_quotation_batch`, call **`select_quotation_candidates` once** with that batch’s full `results`, then output the comparison table **before** the next batch or deep reasoning.
3. **`show_candidates=true`** on every `match_quotation_batch` and fallback `match_quotation` (need up to 15 candidates for membership check).
4. **VANTSING fixed columns** — Do not guess columns via LLM on MVP path (see Step 1).
5. **No `product_type`** in match payload — use `matched_name`, `description_english`, `source` only.
6. **ROE** — Finish all batches and Section A/B/C before ending turn; no empty replies after tool success. **Skip Section D** (no mapping writes).
7. **Section C prices** — Do **not** set `price_a`…`price_e` on learn-by-data upsert; metadata + descriptions only unless user explicitly asks to fill tiers later.
8. **Section C price-library tools (whitelist)** — Allowed: `get_price_library_active`, `get_price_library_draft`, `upsert_price_library_item`. **Forbidden:** `publish_price_library_draft`, `apply_price_library_import`, `delete_price_library_item`, `revert_price_library_draft`, and any bulk import/publish path.
9. **Section C dedup (L1–L3)** — Before each upsert preview, run guards **in order**; on `skip`/`reject` output reason in Section C table — **do not** call `upsert_price_library_item`.
10. **选型与报价助手绝对一致（硬约束）** — 见下方 §选型一致性；**禁止**用 `candidates[0]`、列表顺序或引擎排序代替选型。
11. **Step 1 读表（硬约束）** — **必须** `mcp__quotation__parse_excel_smart`；**禁止** excel MCP `read_data_from_excel` 及任何 bulk range 读表（含 `A1:Q*`）。
12. **Section A 模板** — append 前必须有规则 + 原因 + 来源；缺原因禁止落库。
13. **Section D** — **硬跳过**；禁止 `append_quotation_mapping_pending`。
14. **No Bash / No DIY path probe（WANd.LEARN.KB_PATH.001 / WANd.QUOTE.NO_DIY.001）** — **禁止** Bash、`find`、`dir`、`ls`、探测 `%LOCALAPPDATA%\CCB-Wanding\.claude\vendor\**`。知识库路径见下方固定绝对路径。

---

## 选型一致性（与 quotation-agent **绝对一致** · `WANd.LEARN.SELECT_FIRST.001`）

learn-by-data 的「Agent 选了哪条」**必须**与 Guid **万鼎报价专家**正常查价会话相同（`WANd.QUOTE.SELECT_WIRE.001`），不得出现第二条逻辑。

| 报价助手（normative） | learn-by-data（必须相同） |
|----------------------|---------------------------|
| `match` / batch → **`select_quotation_candidates`**（主流） | 每批 `match_quotation_batch` 成功后 → **一次** `select_quotation_candidates`，传入该批完整 **`results`** |
| `status: ok` → 锁 select 返回的 `code` | `agent_pick_code` = 该行 select 的 `code`（写入复盘表「Agent推荐料号」） |
| `unable_to_select` / 工具不可用 → **才** Read 知识库自选 | **同**：仅此时 Read；路径固定见下 |
| **禁止**默认 `candidates[0]` | **禁止** `candidates[0]` / `results[i].candidates[0].code` 作为 Agent 料号 |
| 1 推荐 + ≤4 bullet | 复盘表只比较 **推荐料号**；bullet 可选记入备注 |

### 知识库路径（fallback only · `WANd.LEARN.KB_PATH.001`）

Agent `Read` **仅**在 `select_quotation_candidates` 返回 `unable_to_select`（或工具不可用/超时）时允许，且路径必须是下面之一：

1. **`D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md`**（canonical shadow）
2. 或 match/select 返回的 **`selection_context.knowledge_source`**（若为绝对路径且指向同一文件）

**FORBIDDEN paths / probes：**

- `%LOCALAPPDATA%\CCB-Wanding\.claude\vendor\**` 或任何在 `.claude\` 下拼接的 `vendor\...\wanding_business_knowledge.md`
- Bash / `find` / `dir` / `ls` 搜寻知识库
- 把 skill 目录、命令目录或工作区相对路径当成知识库

Read 失败时：用上表路径 **再试一次 Read**；仍失败则按已有候选给最可能默认码并在备注写「知识库 Read 失败」，**禁止** DIY 搜盘。

### 每行选型算法（查后，与报价助手相同）

对每个成功 batch：

1. **一次**调用 `select_quotation_candidates`，参数优先传该批 **完整 `results`**（或等价 `items`）。**禁止**拆成残缺/半截 payload；**禁止**用多个残缺 select 代替一次完整 select。
2. 对 `results[i]`（`candidate_count ≥ 1`）：
   - `status: ok` → `agent_pick_code` = 该行 selection 的 `code`；`selection_reason` = 返回的 `reason`。
   - `unable_to_select`（整批或该行）→ **Read** 上方固定路径知识库 → 按 `quotation-agent.md` §选型与澄清 自选 → 设 `agent_pick_code` / `selection_reason`。
3. 设 `agent_pick_row` = `candidates` 中 `code == agent_pick_code` 的那条（用于名称/source/英文描述）。
4. **Tie-breaker（仅 fallback 自选且知识库仍无法区分时）**：`source` 权重 共同 > 历史报价 > 字段匹配 — 与 `ccb-wanding-quotation.md` / `selection_context` 一致。

**FORBIDDEN：**

- 因 `show_candidates=true` 而把列表第一项当 Agent 推荐。
- 未调用 select、也未走 unable→Read fallback，就写「根据知识库」或产出 `agent_pick_code`。
- batch 成功后跳过 select 直接凭感觉锁码，或反复 `match_quotation` / 残缺 select 代替一次完整 select。
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

**Order (hard):** `match_quotation_batch`（`show_candidates=true`）→ **一次** `select_quotation_candidates`（传入该批完整 `results`）→ 对比表。Agent `Read` of `wanding_business_knowledge.md` **only** if select returns `unable_to_select`（路径见 §知识库路径）。**禁止** batch 前抢先 Read。

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

对每一行先完成 **§选型一致性** 的 `agent_pick_code`（select `ok` 的 code，或 unable→Read fallback；**不是**列表第一项）。

Let `agent_pick_code` = select/fallback pick per §选型一致性 (empty if `unmatched` or `candidate_count == 0`).

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

Output **before** next batch. Column **Agent推荐料号** = `agent_pick_code`（select/fallback 结果，**非** `candidates[0]`）。

```markdown
### 批次对比表（行 x–y）

| 行 | 关键词 | 实际料号 | Agent推荐料号 | 选型理由 | 分类 |
|----|--------|----------|---------------|----------|------|
| 8 | PVC线管 20 | 8030050068 | 8030050068 | 线管→PVC电线管B管 dn20 | match |
| 9 | PVC直接 20 | 8030020288 | 8030020288 | 电工套管直通，非AW给水直接头 | match |
| 10 | 50卷波纹管 DN20 | 8030020808 | 8030020808 | 50M卷波纹管→PVC电工套管 | match |
```

若 `agent_pick_code ≠ actual_code` 但 actual 在 candidates 内 → **in-candidates**，选型理由栏说明为何 Agent 推荐与人工表不一致。

---

## Step 4 — Output

### Section A: 知识片段建议（in-candidates）— **唯一可写业务知识库**

**Auto-draft** rule text when **any**:

1. Brand token differs in `matched_name` / `description_english` between **actual** vs **`agent_pick_row`**.
2. ≥2 DN/PN/spec number tokens differ (regex on names, or `get_product_price_tiers` for **names only**).
3. `source` differs materially between actual row vs `agent_pick_row` when names share same product family.

**Ambiguous** → comparison table; ask user to write rule.

**Write routing:**

| Rule scope | Action |
|------------|--------|
| Fleet-wide selection | `append_business_rule`（须过模板校验） |
| Customer/project only | Suggest `memory/business/customers.md` — do **not** auto org-append |

**模板校验（硬 — 缺一不可，否则禁止 `confirmed=false` 以外的 append）：**

```markdown
## 业务规则补充

- <询价词 → 应选/勿选，一句话>
  - 原因：<人工为何这么选 / Agent 错在哪，一行>
  - 来源：learn-by-data 确认，YYYY-MM-DD
```

- `rule_text` = 规则句；`reason` = 原因行。
- 预览同轮必须完整展示规则 + 原因 + 来源。
- **禁止** B/C/D 段落写入业务知识库。

### Section B: ⚠️ 严重标记（料号未在候选中）

After all batches:

```markdown
### ⚠️ 严重标记（料号未在候选中）

| 关键词 | 实际料号 | Agent推荐料号 | 备注 |
|--------|----------|---------------|------|
| … | … | 无候选 | 人工核查 |
```

`0` candidates → Agent推荐料号 = `无候选`.

表后**固定一句**（硬）：

> 请祐嘉诚核查下列料号异常。

**禁止** Section B 写知识库或价库。Section B does **not** end session if Section A or Section C has pending confirmations.

### Section C: 价格库补全（Agent 推荐料号不在价格库）→ **仅 draft**

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

**Upsert（仅 `price_admin` + org session）：**

0. Run L1 → L2 → L3. If skip/reject, show status and continue next row.
1. `get_price_library_draft` — note `revision` (optional sanity).
2. `upsert_price_library_item` with `confirmed=false`（fields 同前：metadata，**不填** price_a…e）。
3. **Same turn:** show preview；问是否确认写入 **draft**。
4. `confirmed=true` only after 确认 — **one row at a time**。
5. **禁止**本 skill 调用 `publish_price_library_draft`（除非用户另说发布）。
6. HTTP **403**：如实说明无权限；**不换 JWT 硬试**。HTTP **409**：get draft 刷新 revision；**不自动重试写**。

**非 `price_admin` / 无 token：** 只出表，**禁止**调用写工具。  
**禁止** Section C 写业务知识库。

**0 candidates:** no Section C (Section B only).

### Section D: **本任务硬跳过**

**禁止**调用 `append_quotation_mapping_pending`、`publish_quotation_mapping_draft`、本地 `merge_mapping_import.py`，以及任何「历史报价映射库补全」写入流程。

跑完 A/B/C 后直接结束复盘输出；不要输出 Section D 待确认表或诱导用户写映射。

### append_business_rule（仅 Section A）

Per draft:

1. 模板三要素齐全后 `append_business_rule` with `confirmed=false`（传 `reason`）
2. **Same turn:** full markdown 规则+原因+来源 + 问是否确认落库
3. `confirmed=true` only after 确认/同意 (needs org session)

---

## Smoke fixture (dev)

`data/smoke/learn-by-data-vantsing-filled.xlsx` — ≥15 rows, 2 batches. Regenerate: `python python/scripts/generate_learn_by_data_smoke_fixture.py`.
