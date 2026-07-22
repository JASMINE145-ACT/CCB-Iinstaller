# Root cause — Elbow 3" AW → 0 candidates (code in PL)

**Symptom:** learn-by-data Section B — keywords `Elbow 3" AW 3"`, actual `8010024354` in price library (11 tiers), Agent推荐=`无候选`.

**Repro (2026-07-20):**
```text
get_wanding_price_by_code(8010024354) → 90°弯头…DN75 (3") LESSO  ✅
match_quotation_union('Elbow 3" AW 3"') → count=0  ❌
search_fuzzy after expansions → hard_filter False on target row
Chinese alt '弯头 3" AW' → top includes 8010024354  ✅
```

## Causal chain

1. Knowledge §7 line: `elbow drat / drat → 丝扣弯头 螺纹弯头`
2. Parser `_parse_field_matching_rules_from_content` does `left.split()` → sources `['elbow', 'drat', '/', 'drat']`
3. `_apply_knowledge_expansion`: **any** source substring match → plain `Elbow …` hits source `elbow` → appends `丝扣弯头 螺纹弯头`
4. `_apply_drat_thread_expansion` sees 丝扣 → appends `内螺纹`
5. `_hard_filter_and_bonus`: `_thread_gender(query)=female`, product plain 90° elbow has no female thread → **reject**
6. At DN75/3" there is no (or few) female threaded elbow SKUs → **0 candidates**
7. Half-inch may still “look OK” in learn-by-data if **mapping/历史报价** still injects the plain code; field-match alone is already polluted (`union('Elbow 1/2"…')` → threaded codes only in local repro)

## Non-causes

- Code missing from PL (present)
- Select API / learn-by-data select-first (post-match; no candidates to select)
- Inch/DN size mismatch (`3"` ∩ product specs `{3",75,dn75}` nonempty; hard_filter is the killer)

## Fix direction (minimal)

| Layer | Change |
|-------|--------|
| P0 parser | When `/` present on rule left, split sources on `/` into **phrases** (`elbow drat`, `drat`); do **not** split those phrases into tokens. Keep space-OR only when no `/`. |
| P0 test | RED: plain `Elbow 3" AW 3"` must include `8010024354` in `match_quotation_union` / search_fuzzy; `Elbow` must **not** expand to 丝扣; `Elbow drat` still must. |
| P1 defense | Optional: thread hard-filter / drat expansion only if **pre-knowledge** query has drat/丝扣/螺纹 cues |
| P1 knowledge | Optionally rewrite rule line for clarity after parser fix |

## Contracts (provisional)

- `WANd.MATCH.FIELD_RULE_PARSE.001` — `/`-separated source phrases not token-OR’d
- `WANd.MATCH.ELBOW_PLAIN.001` — plain Elbow+size+AW recalls plain 90° elbow when SKU exists (e.g. 8010024354)

Scripts: `repro_elbow3.py`, `diagnose_size_hits.py`, `trace_expansions.py`, `list_elbow_rules.py` under this task dir.
