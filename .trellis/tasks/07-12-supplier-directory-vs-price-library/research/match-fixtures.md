# Match / query fixtures — fixed acceptance cases

**Status:** execution contract (pre-implement)  
**Date:** 2026-07-12  
**Derived from:** `research/index-supplier-directory.html` (2026-07 dump)

Scorer + `/match` + MCP `suppliers_match_product` **must** share one implementation. UI product-match mode and Agent must return the same ranked set for these fixtures.

## Scoring rules (minimum)

1. Tokenize query; match against flattened product strings (`flatProducts` semantics from HTML).
2. Exact substring hit ranks above fuzzy/partial.
3. **Tie-break:** higher score first; then `name_zh` ascending (stable).
4. Default `top_n` = **10** (tests assert membership + order of required hits, not exclusive set size).
5. **NL query (2026-07-12):** Server strips intent words before scoring; e.g. `土工布谁有货？` must match like `土工布` (Fixture A still holds). Agent should still pass extracted `q` when possible.

## Fixture A — product match「土工布」

| Field | Value |
|-------|--------|
| Query | `土工布` |
| Must include (unordered set OK if scores equal; ordered if scores differ) | **HAKUNA**, **三信** |
| HAKUNA snippet must contain | `土工布` |
| 三信 snippet must contain | `土工` (e.g. 土工材料 / 无纺土工布 / 机织土工布) |
| Must **not** invent | suppliers absent from Org directory |
| Min results | ≥ 2 |

**Rank preference (if scores differ):** HAKUNA (exact `土工布` token) ≥ 三信 (category/compound 土工*).  
If implementation scores equal → stable name order: `HAKUNA` before `三信` (ASCII/Latin before CJK is OK only if documented; preferred: score-desc then name asc UTF-8).

**GREEN (provisional command — finalize at implement):**

```text
node --test <scorer.test>   # or pytest
# asserts Fixture A membership + snippet substrings
```

## Fixture B — address「双林」

| Field | Value |
|-------|--------|
| Query mode | supplier search by name |
| Query | `双林` |
| Must return | exactly one primary hit named **双林** (or starts with 双林) |
| Address must contain | `KITIC DELTAMAS` and `Bekasi` (from seed) |
| Full seed address | `KITIC DELTAMAS, KAWASAN INDUSTRI JOINT INDONESIA CHINA, Jl. Anggrek VII KAVLING NO 26, Nagasari, Serang Baru, Bekasi Regency, West Java 17330` |

**NL list query (2026-07-12):** `双林仓库地址是什么？` → normalized `双林` → same hit as `q=双林`.

## Fixture C — vehicle「送管材」

| Field | Value |
|-------|--------|
| Query | 用途/场景含管材 or Agent prompt「送管材用什么车」 |
| Must prefer vehicles whose `use` text mentions 管材 / pipa | e.g. Van / Pick Up / Engkel / CDD / Fuso rows from seed |
| Must **not** recommend | 摩托车 as primary for 大批量管材 |
| Min useful suggestions | ≥ 1 mid/heavy row (载重 ≥ 600 kg) |

## Fixture D — negative

| Query | Expectation |
|-------|-------------|
| `xyzzy-no-such-product-999` | empty list or explicit no-match; **no hallucination** |
| Employee JWT + write tool | 403 (RBAC; not match) |

## Agent smoke mapping

| User prompt | Fixture | Path |
|-------------|---------|------|
| 谁做土工布 / 土工布谁有 | A | match MCP |
| 双林地址 | B | search/get |
| 送管材用什么车 | C | vehicles search |
