# Scenario eval: PPR 图片询价 → 填表交付

> **Scenario ID:** `quotation-ppr-image-sheet-20260619`  
> **Golden data:** [`quotation-ppr-image-sheet-20260619.golden.json`](./quotation-ppr-image-sheet-20260619.golden.json)  
> **Atomic cases:** `eval/agent_eval_cases.jsonl` — filter with `--category quotation_e2e` or run by `--case` id below  
> **Source:** 2026-06-19 real AionUI dev session (直接50 / 三通50 / 图片 5 行 PPR / 库存 / 填表 / 修正)

---

## 1. Purpose

Regression for the **full quotation delivery path**, not just single `match_quotation` calls. Captures failures observed when:

- Selection quality was good, but **fill/regenerate degraded SKUs**
- Output landed outside **项目 → 临时空间** UI panel
- Agent used **keywords `fill_quotation_sheet`** after codes were locked
- **Excel MCP** patched structural columns (B–E, J) instead of quotation fill

---

## 2. Playbook (human or multi-turn judge)

Run as **one scripted conversation** or as isolated atomic cases.

| Step | User message (summary) | Pass criteria |
|------|------------------------|---------------|
| S1 | 「直接50 B档价格」→「阅读知识库帮我选」 | Recommends **8020020755** (D 排水 PVC-U 管箍 dn50); no delegate `Agent` |
| S2 | 「三通50 帮我选」 | Recommends **8020022784** (短型顺水三通 D 排水 DN50) |
| S3 | 「pvc dn50 帮我选」 | **Must ask** category (pipe vs fitting) per KB §9 — must not force one SKU |
| S4 | 图片/文字 5 行 PPR 清单查价 | 5 parallel `match_quotation` (or ≤10/round); golden codes in JSON |
| S5 | 「没问题 直接查库存 填写报价单」 | **One** `get_inventory_by_code_batch` + **one** `fill_quotation_sheet` with **`fill_items`** |
| S6 | 用户确认文件在项目临时空间可见 | `output_path` under session/project workspace; user does **not** need manual copy |
| S7 | 「修正 #4 S3.2、#5 Sealtape」 | `fill_items` with **8010062288** + **GPR-EQ07E01001**; **no** `match_quotation` rematch |
| S8 | O 列库存预警 | Remarks in **column O only**; J/K unit columns unchanged |

---

## 3. Golden selection (after S4)

| # | 询价 | 编码 | 禁止替换为 |
|---|------|------|------------|
| 1 | PPR 四通 25 ×20 | 8010072478 | — |
| 2 | PPR 弯头 25 ×40 | 8010071402 | — |
| 3 | PPR 内丝弯头 25×1/2 ×30 | 8010071394 | — |
| 4 | PPR 热水管 25 ×50m | **8010062288** (S3.2 1.6MPa) | 8010062299 (S2.5) |
| 5 | 生料带 通用 ×200 | **GPR-EQ07E01001** | 8020020643 (PVC 弯头) |

Grand total (B 档): **3,285,210 IDR** (see golden JSON).

---

## 4. Tool contract (must / must not)

### Must (S5–S7)

```text
get_inventory_by_code_batch(codes=[all 5 locked codes])
fill_quotation_sheet(mode=direct_fill, fill_items=[... locked codes + inquiry B-E fields ...])
```

Optional after fill:

```text
mcp__excel__read_data_from_excel   # verify F–N / O
mcp__excel__write_data_to_excel    # O column ONLY, cell-level
```

### Must not

| Anti-pattern | Session symptom |
|--------------|-----------------|
| `fill_quotation_sheet` **keywords-only** after user confirmed codes | Row4/5 SKU drift |
| `match_quotation` again on correction | Wrong pipe grade / wrong category |
| `mcp__excel__write_data_to_excel` bulk B–E or F–N | Column shift; J column overwritten |
| Default output Desktop or conversation-only path | User「没看到你呢」 |
| Stop at inventory warnings **after** claiming complete sheet | Trust break |

---

## 5. Atomic case IDs (machine-assist)

Run schema: `node eval/run-agent-eval.mjs`  
Live ACP (one case): `node eval/run-agent-eval.mjs --run --case <id>`

| Case ID | Covers step | Live-checkable today |
|---------|-------------|----------------------|
| `quote-knowledge-select-direct50-b` | S1 | tools + Read |
| `quote-knowledge-select-tee50-b` | S2 | tools |
| `quote-ambiguous-pvc-dn50-clarify` | S3 | tools; clarify = judge |
| `quote-ppr-5line-parallel-price` | S4 | tool name in log |
| `quote-fill-locked-skus-inventory-then-sheet` | S5 | batch + fill; no match |
| `quote-fill-correction-no-rematch` | S7 | fill only; no match |
| `quote-fill-remarks-o-column-only` | S8 | judge + optional excel read |
| `quote-inventory-code-8020023215` | side thread | single inventory |

Category filter: `--category quotation_e2e`

---

## 6. Scoring rubric (human judge)

| Score | Criteria |
|-------|----------|
| **PASS** | All 5 codes locked through fill; B–E + F–N + O correct; file in workspace UI; no forbidden rematch |
| **PARTIAL** | Prices/codes correct but needed Excel bulk patch or manual file move |
| **FAIL** | Any forbidden substitute code; wrong column writes; keywords rematch after lock; Desktop default |

---

## 7. Future automation

- Parse ACP log for `fill_items[].code` values post `fill_quotation_sheet`
- Open output xlsx: assert F8–F12 codes, B8–E12 inquiry text, O8–O12 remarks
- Assert `output_path` contains workspace pointer path, not `Desktop`
