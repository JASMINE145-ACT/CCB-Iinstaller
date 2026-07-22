"""Pinpoint size_hits / min_score for Elbow 3\" vs code 8010024354."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "python"))

from inventory.config import config
from inventory.services import wanding_fuzzy_matcher as m

CODE = "8010024354"
KW = 'Elbow 3" AW 3"'


def main() -> None:
    print("MIN_SCORE", getattr(config, "INVENTORY_MIN_SCORE", None))
    print("MIN_SCORE_GAP", getattr(config, "INVENTORY_MIN_SCORE_GAP", None))
    print("PRICE_LIBRARY_PATH", config.PRICE_LIBRARY_PATH)

    df = m._get_cached_df(config.PRICE_LIBRARY_PATH, "B", try_remote=True)
    print("df rows", len(df), "cols has norm_text", "norm_text" in df.columns)

    hit_rows = df[df["Material"].astype(str).str.strip() == CODE]
    print("df rows with code", len(hit_rows))
    if hit_rows.empty:
        # try numeric
        hit_rows = df[df["Material"].astype(str).str.contains(CODE, na=False)]
        print("contains code", len(hit_rows))
    if not hit_rows.empty:
        row = hit_rows.iloc[0]
        print("Describrition:", str(row.get("Describrition", ""))[:120])
        print("EN:", str(row.get("Describrition_English", ""))[:120])
        print("Product_Type:", row.get("Product_Type"))
        if "norm_text" in df.columns:
            print("norm_text:", str(row["norm_text"])[:160])
            print("spec_tokens:", row["spec_tokens"])
        else:
            raw = str(row.get("Describrition", ""))
            print("live split:", m._split_tokens(raw))
            print(
                "live specs:",
                [t for t in m._split_tokens(raw) if re.search(r"\d", t)],
            )

    # Expanded keyword path (same as match_fuzzy_candidates)
    kw = KW
    kw = m._apply_knowledge_expansion(kw)
    kw = m._apply_pressure_expansion(kw)
    kw = m._normalize_unicode_fractions(kw)
    kw = m._normalize_keyword_terms(kw)
    kw = m._apply_drat_thread_expansion(kw)
    kw = m._strip_query_intent_terms(kw)
    print("\nafter expansions:", repr(kw))

    results = m.search_fuzzy(df, kw)
    print("search_fuzzy count", len(results))
    if results:
        print("top5:", [(r[0].get("code"), round(r[1], 4)) for r in results[:5]])
        codes = {str(r[0].get("code")) for r in results}
        print("has target", CODE in codes)
        if CODE in codes:
            for r, s in results:
                if str(r.get("code")) == CODE:
                    print("target score", s)
                    break
    else:
        # Manual size check on target row
        if not hit_rows.empty:
            row = hit_rows.iloc[0]
            norm_kw = m._normalize(kw)
            chinese_tokens = m._split_tokens(norm_kw)
            query_size_tokens = {
                t for t in chinese_tokens if re.search(r"\d", t) and not t.endswith("°")
            }
            query_inch_tokens = {t for t in query_size_tokens if m._is_inch_token(t)}
            print("query_size_tokens", query_size_tokens)
            print("query_inch_tokens", query_inch_tokens)
            material_tokens = re.findall(r"pvc|ppr|pe|hdpe", norm_kw)
            query_material = material_tokens[0] if material_tokens else None
            spec_equivs = {
                q_spec: m._expand_token_with_synonyms_and_units(q_spec, material=query_material)
                for q_spec in query_size_tokens
            }
            print("spec_equivs", {k: sorted(v)[:20] for k, v in spec_equivs.items()})
            if "spec_tokens" in df.columns:
                product_specs = hit_rows.iloc[0]["spec_tokens"]
            else:
                product_specs = frozenset(
                    t
                    for t in m._split_tokens(str(row.get("Describrition", "")))
                    if re.search(r"\d", t)
                )
            print("product_specs sample", sorted(list(product_specs))[:30])
            for q_spec, q_eq in spec_equivs.items():
                inter = q_eq & product_specs
                print(f"intersect {q_spec!r}:", sorted(inter)[:20], "empty?", not inter)

            product_text = " ".join(
                [
                    str(row.get("Describrition", "")),
                    str(row.get("Describrition_English", "") or ""),
                    str(row.get("Product_Type", "") or ""),
                ]
            )
            keep, bonus = m._hard_filter_and_bonus(
                norm_kw, product_text, CODE, str(row.get("Product_Type", "") or "")
            )
            print("hard_filter", keep, bonus)

    # Also try Chinese query that should hit
    for alt in [
        '弯头 3" AW',
        "弯头 DN75 AW",
        "90度弯头 DN75 AW给水",
        'Elbow DN75 AW',
    ]:
        r = m.search_fuzzy(df, alt)
        print(f"alt {alt!r} count={len(r)} top={[(x[0].get('code'), round(x[1],3)) for x in r[:3]]}")


if __name__ == "__main__":
    main()
