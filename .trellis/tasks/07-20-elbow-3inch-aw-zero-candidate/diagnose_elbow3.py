"""Diagnose why Elbow 3\" AW yields 0 candidates for code 8010024354."""
from __future__ import annotations

import inspect
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "python"))

from inventory.services import wanding_fuzzy_matcher as m
from inventory.services.match_and_inventory import match_quotation_union

CODE = "8010024354"
KW = 'Elbow 3" AW 3"'


def main() -> None:
    hit = m.get_wanding_price_by_code(CODE, "B")
    print("PL hit name:", hit.get("matched_name"))
    print("PL hit en:", hit.get("description_english"))

    # Tokenize query
    print("\nquery tokens:", m._split_tokens(KW))
    print("query norm:", m._normalize(KW))
    print("query fitting:", m._query_fitting(m._normalize(KW)))

    # Build a synthetic row like PL
    row = {
        "Material": CODE,
        "Describrition": hit.get("matched_name"),
        "Describrition_English": hit.get("description_english"),
        "Product_Type": "JIS PVC-U Fitting (AW)",
        "unit_price": 1.0,
    }
    # Try hard filter API if available
    for name in ("_hard_filter_and_bonus", "_hard_filter", "hard_filter_and_bonus"):
        fn = getattr(m, name, None)
        if fn is None:
            continue
        print(f"\n=== {name} signature ===")
        print(inspect.signature(fn))
        try:
            # common patterns
            for args in (
                (KW, row),
                (m._normalize(KW), row),
                (KW, row, "B"),
            ):
                try:
                    out = fn(*args)
                    print("call", args[0][:20] if isinstance(args[0], str) else args[0], "->", out)
                except TypeError as e:
                    print("TypeError", e)
        except Exception as e:
            print("err", e)

    # Compare working half-inch elbow keywords
    for kw in ('Elbow 1/2" AW 1/2"', 'Elbow PVC 1/2" AW 1/2"', 'Elbow ½" AW ½"', KW):
        c = match_quotation_union(kw, customer_level="B")
        print(f"\nunion({kw!r}) count={len(c)} top={[x.get('code') for x in c[:5]]}")

    # Inspect search_fuzzy signature and try
    print("\nsearch_fuzzy sig:", inspect.signature(m.search_fuzzy))
    try:
        fuzzy = m.search_fuzzy(KW, top_n=30)
        print("search_fuzzy len", len(fuzzy) if fuzzy is not None else None)
        if fuzzy is not None and hasattr(fuzzy, "head"):
            print(fuzzy.head(10).to_string())
        elif fuzzy:
            for i, r in enumerate(list(fuzzy)[:10]):
                print(i, r)
    except Exception as e:
        print("search_fuzzy err", type(e), e)

    # Mapping path alone
    try:
        from inventory.services import mapping_table_matcher as mt

        print("\nmapping match...")
        mc = mt.match_mapping_top_candidates(KW, top_n=10)
        print("mapping count", len(mc) if mc else 0)
        if mc:
            for i, r in enumerate(mc[:5]):
                print(i, r)
    except Exception as e:
        print("mapping err", e)


if __name__ == "__main__":
    main()
