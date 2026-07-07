# Quotation Matching Engine（万鼎询价领域匹配引擎）

> **What this is:** The domain-specific recall + scoring system behind `match_quotation`.  
> **What this is not:** A generic fuzzy-search library or an internal LLM selector (retired from MCP surface).

**Related:** MCP tool contracts → [`mcp-business.md`](./mcp-business.md) · Agent 选型 SOP → [`../integration/agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation multi-candidate reply · Org price library hook → [`../integration/price-library.md`](../integration/price-library.md)

---

## 1. Positioning — is this the “core algorithm”?

Yes, in **business terms**. The product moat is a **domain matching engine** (expert-system retrieval), not a single scoring formula.

| Layer | Role | Replaceability |
|-------|------|----------------|
| **Domain rules & hard filters** | Material / usage / fitting / brand gates; DN↔inch↔分↔寸; 日标 OD↔DN; PN↔MPa | Low — accumulated industry knowledge |
| **Token expansion & synonym groups** | 直接↔直通、印尼语→中文、业务知识 md 动态扩展 | Low — tied to Wanding catalog + ops feedback |
| **Weighted score (`search_fuzzy`)** | `hit_weight / total_weight + compat_bonus` | Medium — formula is simple; tuning is empirical |
| **Dual recall (mapping + price lib)** | 历史报价 + 字段匹配并集 | Medium — architecture choice |
| **Final selection** | Claude Code reads `wanding_business_knowledge.md` | High — LLM is swappable; rules doc is the contract |

**Lineage:** `wanding_fuzzy_matcher.py` header cites DataBase- `search_with_keywords(strict=False, return_score=True)`. Early agent-jk TS `scoreTokens()` in `quotation-server/dist/services/fuzzy_matcher.js` is a **legacy stub** — live MCP does **not** use it (see §8).

---

## 2. End-to-end call chain (authoritative path)

```
User / Agent keywords
        │
        ▼
quotation-server/dist/index.js
  callPythonTool("match_quotation", …)
        │
        ▼
python/quotation/match_dispatch.py
  handle_match_quotation()
        │
        ▼
python/inventory/services/match_and_inventory.py
  match_quotation_union()          ← orchestration entry
        │
        ├─ parallel ─┬─ mapping_table_matcher.match_mapping_top_candidates()
        │            └─ wanding_fuzzy_matcher.match_fuzzy_candidates()
        │
        ├─ _merge_candidates_by_code()     source: 历史报价 | 字段匹配 | 共同
        ├─ enrich (price by code, description_english, supplier)
        └─ _rank_compatible_candidates()   re-apply hard-filter compat on merged set
        │
        ▼
python/quotation/selection_payloads.py
  build_selection_payload()
  selection_owner = "claude_code"
        │
        ▼
Agent applies wanding_business_knowledge → ONE recommended line (+ bullets)
```

**Batch:** `match_quotation_batch` loops `match_quotation_union` per keyword (limit `MATCH_QUOTATION_BATCH_MAX_ITEMS`, default 10).

---

## 3. Source files (edit map)

| File | Responsibility |
|------|----------------|
| `python/inventory/services/wanding_fuzzy_matcher.py` | **Core engine** — tokenize, expand, hard filter, `search_fuzzy`, price-level normalization, org-remote load |
| `python/inventory/services/mapping_table_matcher.py` | 历史报价映射表 — reuses token/score primitives from wanding matcher |
| `python/inventory/services/match_and_inventory.py` | `match_quotation_union`, merge, compat re-rank, `enrich_quotation_candidate` |
| `python/quotation/match_dispatch.py` | MCP dispatch → union + selection payload |
| `python/quotation/selection_payloads.py` | Candidate limits, `selection_context`, price-library meta |
| `python/inventory/price_loader.py` | DataFrame schema + `norm_text` / `spec_tokens` precompute for `search_fuzzy` |
| `data/wanding_business_knowledge.md` | **Runtime knowledge** — field-match expansion rules + LLM selection SOP (org VPS copy is authoritative in prod) |
| `mcp_servers/quotation-server/dist/index.js` | MCP shell — **all tools delegate to Python** via `python/main.py` |

---

## 4. Dual recall — mapping vs price library

`match_quotation_union` runs two paths in parallel:

```
                    keywords
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
   mapping_table_matcher     wanding_fuzzy_matcher
   (历史报价 / Neon / xlsx)   (万鼎价格库字段匹配)
           │                       │
           │  top_k=5              │  max_score_tiers=2
           │  score on             │  score on
           │  inquiry_name+spec    │  Describrition (+ rules)
           └───────────┬───────────┘
                       ▼
              merge by Material code
              source priority: 共同 > 历史报价 > 字段匹配
```

| `source` | Meaning |
|----------|---------|
| `历史报价` | Hit mapping table only |
| `字段匹配` | Hit price library fuzzy only |
| `共同` | Same code in both — prefer wanding `unit_price` + `matched_name` |

Mapping rows often have `unit_price=0`; merge backfills price via `get_wanding_price_by_code`.

---

## 5. Query preprocessing pipeline

Before `search_fuzzy` scans rows, `match_fuzzy_candidates` applies (in order):

1. **Material code fast path** — 8–14 digit or patterned code → exact `get_wanding_price_by_code` (score `1.0`, single candidate).
2. **`_apply_knowledge_expansion`** — parse `wanding_business_knowledge.md` §【字段匹配同义与规格】→ append target terms.
3. **`_apply_pressure_expansion`** — bidirectional PN ↔ MPa (e.g. PN16 → 1.6MPa).
4. **`_normalize_unicode_fractions`** — `½`/`¼`/`¾` → `1/2`/`1/4`/`3/4` (e.g. VANTSING `½"` inch).
5. **`_normalize_keyword_terms`** — `QUERY_TERM_TO_CHINESE` (印尼语/英语口语 → 中文品名, e.g. `conduit`→电线管, `热熔器`→焊接机).
6. **`_apply_drat_thread_expansion`** — fitting context: `Elbow drat` = **丝扣弯头 / 螺纹弯头** (`内螺纹`); excludes ceiling `stelldrat` / `steel drat`.
7. **`_strip_query_intent_terms`** — remove 报价/B级/代理价等非品名词.

Inside `search_fuzzy`, keywords may fan out via **`_expand_keyword_with_synonyms`** (`SYNONYM_GROUPS` replacement variants).

---

## 6. Tokenization & spec equivalence

### 6.1 `_split_tokens`

Special handling (order matters):

- Inch fractions: `3/4"`, `1-1/4"`
- 口语: `4分`→DN15, `2寸`→DN50
- `dn50` / bare `50` as spec tokens
- Chinese character runs; single-char tokens scored at half weight (`_SINGLE_CHAR_WEIGHT = 0.5`)

### 6.2 `_expand_token_with_synonyms_and_units`

Per size token, expands equivalents:

| Input pattern | Expands to (examples) |
|---------------|----------------------|
| `dn50` | `50`, `2"` |
| `50` (digit) | `dn50`, `2"` |
| `de50` | treated ≈ `dn50` |
| `4分` | `dn15`, `15` |
| `2寸` | `dn50`, `50`, `2"` |
| `63` (日标 OD) | `50`, `dn50` (+ keeps `63` for 国标 OD 行) |
| `1-1/2"` | `40`, `dn40` |

Static synonym groups (excerpt): 直接↔直通、变径↔异径、内丝↔内螺纹、堵头↔管帽 …

---

## 7. Hard filter + soft score (`search_fuzzy`)

### 7.1 Hard filter — `_hard_filter_and_bonus`

**Philosophy:** reject incompatible rows before ranking; add small `compat_bonus` for aligned semantics.

| Dimension | Example rule |
|-----------|--------------|
| Material | PPR / PVC / PE / HDPE must not cross-match (PE↔HDPE exception) |
| Usage | 给水 / 排水 / 穿线 — mismatch → drop |
| Fitting category | Query「三通」→ product must be tee, not pipe |
| Brand line | Query mentions RUCIKA → only RUCIKA Product_Type rows |
| Ceiling (印尼) | `ceiling` / `dynabolt` / `stelldrat` category pairing |
| Compound specs | 主径×副径（内外丝）must align |

Returns `(keep: bool, bonus: float)`. `keep=False` → row skipped entirely.

### 7.2 Soft score

For each surviving row:

```
size_hits   = count of query spec equiv sets ∩ product spec_tokens
text_hits   = multi_char token substring hits (weight 1.0)
            + single_char hits (weight 0.5)
hit_weight  = size_hits + multi_hits + single_hits * 0.5
score       = hit_weight / total_weight + compat_bonus
```

**Gates within row loop:**

- If query has size tokens but `size_hits == 0` → skip (unless glue-only special case).
- If query has text tokens but no text hit → skip.

**Inch exact priority:** When query contains explicit inch tokens and DN/inch are consistent, if any candidate has exact inch token in `product_specs`, drop candidates without inch exact hit (prevents DN expansion false positives).

### 7.3 Post-score candidate shaping (`match_fuzzy_candidates`)

| Parameter | Default / union usage | Effect |
|-----------|----------------------|--------|
| `max_score_tiers` | `2` in `match_quotation_union` | Return all candidates in top 2 score bands |
| `min_score` | `config.INVENTORY_MIN_SCORE` | Top score below threshold → empty (unmatched) |
| `min_score_gap` | `config.INVENTORY_MIN_SCORE_GAP` | Large gap top1−top2 → truncate to single high-confidence candidate |
| `max_candidates` | 20 | Cap when not using score tiers |

### 7.4 Union re-rank (`_rank_compatible_candidates`)

After merge, compatible candidates sort by `_compat_sort_key`:

```
(penalty, source_rank, -compat_bonus)
```

| Key | Meaning |
|-----|---------|
| `penalty` | `0` = passed hard-filter compat; `1` = dropped unless all fail |
| `source_rank` | `共同(0) > 历史报价(1) > 字段匹配(2)` — **before** semantic bonus |
| `-compat_bonus` | Tie-break within same source tier |

**Effect:** `candidates[0]` on MCP / learn-by-data respects dual-path consensus (`共同`) over single-path fuzzy hits. Row-level category fixes (波纹管 vs 给水) remain in hard-filter / knowledge — not in this sort key alone.

**Tests:** `python/tests/test_quotation_match_ranking_fix.py` (rows 8–9); row 10 corrugated deferred (字段-only correct vs 历史 noise).

---

## 8. Legacy / non-authoritative paths

| Artifact | Status |
|----------|--------|
| `mcp_servers/quotation-server/dist/services/fuzzy_matcher.js` | Legacy TS `scoreTokens()` — **not called** by `index.js` |
| `mcp_servers/quotation-server/dist/tools/match_quotation.js` | Legacy orchestration + `llmSelectBest` — **not called** |
| `mcp_servers/quotation-server/dist/services/llm_selector.js` | Internal LLM selector — **retired** from agent surface |
| `match_fuzzy()` single-result API | Still used by fill flow / inventory tools; MCP uses `match_quotation_union` (multi-candidate) |

Do not extend legacy JS matchers for new features — change Python `wanding_fuzzy_matcher.py` instead.

---

## 9. Agent selection layer (outside the engine)

The engine **recalls and ranks**; it does **not** pick the final SKU for the user.

| Concern | Owner |
|---------|-------|
| Candidate list + scores + `source` | Matching engine |
| Business disambiguation (国标 vs 日标, AW给水 vs 排水, 青山价含义…) | `wanding_business_knowledge.md` + Claude Code |
| Session Read gate | `pre-match-knowledge-gate.py` — first `match_quotation` per session requires Read |
| Reply shape | 1 recommended price line + ≤4 bullet alternatives — [`agents-unified-model.md`](../integration/agents-unified-model.md) |

`selection_payloads.build_selection_payload` sets `selection_owner: "claude_code"` and embeds `selection_context.instructions`.

---

## 10. Data sources & cache

| Mode | Loader | Invalidation |
|------|--------|--------------|
| Local xlsx | `config.PRICE_LIBRARY_PATH` | File replace / dev sync |
| Org API (default when `price_library_path` omitted) | `wanding_fuzzy_matcher._try_load_from_org_remote` | `invalidate_wanding_cache()` on publish |
| Mapping table | Neon `product_mapping` or custom library name patterns | `invalidate_mapping_cache()` |

**Learn-by-data write-back (2026-07-06, updated):** Section D appends rows to `mapping_import_pending.jsonl` via MCP `append_quotation_mapping_pending`. **Eligibility:** **D-mismatch** (`agent_pick ≠ sheet F col`) **or D-gap** (aligned but mapping table lacks `norm_text + code`); skip when M2 already satisfied. Fields from VANTSING B/C/F/G. Python: `section_d_trigger()` / `is_section_d_eligible()` in `learn_by_data_mapping.py`. Merge: `python python/scripts/merge_mapping_import.py` → `MAPPING_TABLE_PATH`; honors `allow_overwrite` for keyword conflicts. Task `07-06-learn-by-data-price-library-enrich` Phase 2.2.

Precomputed columns on load: `norm_text`, `spec_tokens` — required for performant `search_fuzzy` over full catalog.

---

## 11. Configuration knobs

| Knob | Location | Notes |
|------|----------|-------|
| `INVENTORY_MIN_SCORE` | `inventory/config` | Global unmatched threshold |
| `INVENTORY_MIN_SCORE_GAP` | `inventory/config` | Auto single-candidate when gap large |
| `MATCH_QUOTATION_BATCH_MAX_ITEMS` | env, default `10` | Batch cap |
| `DEFAULT_SELECTION_CANDIDATE_LIMIT` | `selection_payloads` | 10 to agent; 15 when `show_candidates=true` |
| `WANDING_BUSINESS_KNOWLEDGE_PATH` | env / `data/` | Field-match expansion + agent SOP |
| `customer_level` | MCP param | Normalized via `_normalize_price_level` → price column |

---

## 12. Tests & regression anchors

| Test / script | Covers |
|---------------|--------|
| `python/tests/test_quotation_match_ranking_fix.py` | `match_quotation_union` source-rank order (rows 8–9) |
| `python/tests/test_drat_elbow_aw.py` | `Elbow drat` → Faucet Elbow `8010024875` over plain 90° elbow (P0 2026-07-07) |
| `python/test_wanding_matcher_compat.py` | Tokenization, `search_fuzzy` scenarios, `_rank_compatible_candidates` |
| `python/tests/test_lesso_dn_spec_fix.py` | End-to-end `match_quotation_union` DN spec |
| `python/tests/test_price_library_supplier.py` | `supplier` through `match_fuzzy_candidates` |
| `python/tests/test_dispatch_error_codes.py` | MCP dispatch + mocked union |
| `python/scripts/generate_learn_by_data_smoke_fixture.py` | Learn-by-data fixture generation |

When fixing a match bug: add a **minimal row fixture** to `test_wanding_matcher_compat.py` or a focused unittest before tuning production rules.

---

## 13. Change guidelines

1. **Prefer rules over LLM** for deterministic catalog constraints (材质/口径/用途).
2. **Extend `wanding_business_knowledge.md`** for ops-discoverable synonyms; mirror critical rules in code only when needed for hard-filter speed.
3. **Keep mapping and wanding scoring aligned** — `mapping_table_matcher` imports primitives from `wanding_fuzzy_matcher`; diverging copies cause recall skew.
4. **Do not re-enable internal LLM selector** in MCP without updating [`agents-unified-model.md`](../integration/agents-unified-model.md) and quotation-agent SOP.
5. After Python matcher changes: run targeted tests → `sync-dev-wanding-vendor.ps1` → MCP health `-Probe` (`match_quotation`) per [`mcp-health.md`](../integration/mcp-health.md).

---

## 14. Changelog

| Date | Note |
|------|------|
| 2026-07-06 | P1 rank fix — `_compat_sort_key` source before compat_bonus; task `07-06-quotation-match-ranking-fix` |
| 2026-07-03 | Initial spec — documents Python authoritative path, engine layers, legacy JS stubs, agent selection boundary |
