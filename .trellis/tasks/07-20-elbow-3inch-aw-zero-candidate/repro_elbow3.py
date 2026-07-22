"""Repro: Elbow 3\" AW 3\" → 0 candidates while code 8010024354 in PL."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "python"))

from inventory.services.match_and_inventory import match_quotation_union
from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code, search_fuzzy

CODE = "8010024354"
KEYWORDS = [
    'Elbow 3" AW 3"',
    "Elbow 3\" AW 3\"",
    "Elbow PVC 3\" AW 3\"",
    "Elbow 3\" AW",
]


def _brief(row: dict) -> dict:
    return {
        "code": row.get("code") or row.get("Material"),
        "name": row.get("matched_name") or row.get("name") or row.get("Describrition"),
        "en": (row.get("description_english") or row.get("Describrition_English") or "")[:100],
        "source": row.get("source"),
        "score": row.get("score") or row.get("fuzzy_score"),
    }


def main() -> None:
    print("=== get_wanding_price_by_code", CODE, "===")
    hit = get_wanding_price_by_code(CODE, "B")
    if isinstance(hit, dict):
        print(json.dumps(_brief(hit) | {"raw_keys": sorted(hit.keys())[:30]}, ensure_ascii=False, indent=2))
    else:
        print(repr(hit))

    for kw in KEYWORDS:
        print(f"\n=== match_quotation_union({kw!r}) ===")
        cands = match_quotation_union(kw, customer_level="B")
        print("count=", len(cands))
        for i, c in enumerate(cands[:12]):
            print(i + 1, _brief(c))
        codes = {str(c.get("code") or "") for c in cands}
        print("contains target?", CODE in codes)

    print("\n=== search_fuzzy first keyword ===")
    fuzzy = search_fuzzy(KEYWORDS[0], customer_level="B", top_n=20)
    print("fuzzy count=", len(fuzzy) if fuzzy is not None else None)
    if fuzzy is not None:
        for i, row in enumerate(list(fuzzy)[:12]):
            if hasattr(row, "to_dict"):
                print(i + 1, _brief(row.to_dict()))
            elif isinstance(row, dict):
                print(i + 1, _brief(row))
            else:
                print(i + 1, row)


if __name__ == "__main__":
    main()
