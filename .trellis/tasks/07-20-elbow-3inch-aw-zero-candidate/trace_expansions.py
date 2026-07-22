"""Trace which expansion adds 丝扣/内螺纹 to plain Elbow query."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "python"))

from inventory.services import wanding_fuzzy_matcher as m

STEPS = [
    ("raw", lambda s: s),
    ("knowledge", m._apply_knowledge_expansion),
    ("pressure", m._apply_pressure_expansion),
    ("fractions", m._normalize_unicode_fractions),
    ("normalize_terms", m._normalize_keyword_terms),
    ("drat", m._apply_drat_thread_expansion),
    ("strip_intent", m._strip_query_intent_terms),
]


def trace(kw: str) -> None:
    cur = kw
    print("===", repr(kw), "===")
    for name, fn in STEPS:
        if name == "raw":
            print(f"{name:16} {cur!r}")
            continue
        nxt = fn(cur)
        mark = " *" if nxt != cur else ""
        print(f"{name:16} {nxt!r}{mark}")
        cur = nxt
    print("thread_gender", m._thread_gender(m._normalize(cur)))
    print("synonyms", m._expand_keyword_with_synonyms(cur)[:8])


def main() -> None:
    for kw in [
        'Elbow 3" AW 3"',
        'Elbow 1/2" AW 1/2"',
        'Elbow drat 1/2" AW',
        'Elbow PVC 3" AW 3"',
        '弯头 3" AW',
    ]:
        trace(kw)
        print()


if __name__ == "__main__":
    main()
