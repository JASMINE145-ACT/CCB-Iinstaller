#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate data/smoke/learn-by-data-vantsing-filled.xlsx for learn-by-data E2E smoke.

Row scenarios (against current bundled price library):
  - match: agent top == actual_code
  - in-candidates: actual in candidate list but not rank 1
  - not-in-candidates: valid code not in candidate list for keywords
  - zero-candidate: keywords with no match
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

from inventory.services.match_and_inventory import match_quotation_union  # noqa: E402
from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code  # noqa: E402
from quotation.layout import VANTSING_LAYOUT  # noqa: E402
from quotation.quote_tools import TOTAL_ROW_MARKER, fill_quotation  # noqa: E402

BLANK_TEMPLATE = ROOT / "data" / "空白标准报价单.xlsx"
OUT_PATH = ROOT / "data" / "smoke" / "learn-by-data-vantsing-filled.xlsx"
MANIFEST_PATH = ROOT / "data" / "smoke" / "learn-by-data-vantsing-filled.manifest.json"


def _top_code(keywords: str) -> str:
    cands = match_quotation_union(keywords, customer_level="B")
    return str(cands[0]["code"]) if cands else ""


def _nth_code(keywords: str, n: int) -> str:
    cands = match_quotation_union(keywords, customer_level="B")
    if len(cands) <= n:
        raise RuntimeError(f"need >={n + 1} candidates for {keywords!r}, got {len(cands)}")
    return str(cands[n]["code"])


def _code_outside_candidates(keywords: str, probe: str) -> str:
    codes = {c["code"] for c in match_quotation_union(keywords, customer_level="B")}
    row = get_wanding_price_by_code(probe, customer_level="B")
    if row and probe not in codes:
        return probe
    raise RuntimeError(f"probe {probe!r} not valid outside candidates for {keywords!r}")


def _build_rows() -> list[dict]:
    kw_direct50 = "直接50"
    kw_direct75 = "直接75"
    kw_elbow50 = "弯头50"
    kw_tee50 = "三通50"
    kw_zero = "xxxxx_nonexistent_product_xyz"

    outside_direct50 = _code_outside_candidates(kw_direct50, "8010012697")
    outside_direct75 = _code_outside_candidates(kw_direct75, "8010012697")
    outside_tee50 = _code_outside_candidates(kw_tee50, "8020020755")

    scenarios: list[tuple[str, str, str]] = [
        # match (>=3)
        (kw_direct50, _top_code(kw_direct50), "match"),
        (kw_direct75, _top_code(kw_direct75), "match"),
        (kw_elbow50, _top_code(kw_elbow50), "match"),
        (kw_tee50, _top_code(kw_tee50), "match"),
        # in-candidates mismatch (>=3)
        (kw_direct50, _nth_code(kw_direct50, 1), "in-candidates"),
        (kw_direct50, _nth_code(kw_direct50, 2), "in-candidates"),
        (kw_elbow50, _nth_code(kw_elbow50, 1), "in-candidates"),
        (kw_direct75, _nth_code(kw_direct75, 1), "in-candidates"),
        # not-in-candidates (>=3)
        (kw_direct50, outside_direct50, "not-in-candidates"),
        (kw_direct75, outside_direct75, "not-in-candidates"),
        (kw_tee50, outside_tee50, "not-in-candidates"),
        (kw_elbow50, outside_direct50, "not-in-candidates"),
        # zero-candidate (>=1)
        (kw_zero, "", "zero-candidate"),
        # padding for 2-batch (>=15 total)
        (kw_direct50, _top_code(kw_direct50), "match"),
        (kw_direct75, _top_code(kw_direct75), "match"),
        (kw_elbow50, _top_code(kw_elbow50), "match"),
    ]

    layout = VANTSING_LAYOUT
    fill_items: list[dict] = []
    for i, (keywords, actual_code, _kind) in enumerate(scenarios):
        row_num = layout.data_start_row + i
        name, _, spec = keywords.partition(" ")
        if not spec and " " not in keywords:
            name, spec = keywords, ""
        price_row = get_wanding_price_by_code(actual_code, customer_level="B") if actual_code else None
        quote_name = (price_row or {}).get("matched_name") or keywords
        fill_items.append(
            {
                "row": row_num,
                "code": actual_code or "0000000000",
                "quote_name": str(quote_name)[:80],
                "specification": spec or name,
                "unit_price": float((price_row or {}).get("unit_price") or 1000),
                "qty": 10,
                "inquiry_name": name or keywords,
                "inquiry_spec": spec,
                "satuan": "pcs",
                "brand": "LESSO",
                "_scenario": _kind,
            }
        )
    return fill_items


def main() -> int:
    if not BLANK_TEMPLATE.exists():
        print(f"ERROR: missing template {BLANK_TEMPLATE}", file=sys.stderr)
        return 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp) / "work.xlsx"
        shutil.copy2(BLANK_TEMPLATE, work)

        fill_items = _build_rows()
        payload = [{k: v for k, v in item.items() if not k.startswith("_")} for item in fill_items]
        result = fill_quotation(str(work), payload, output_path=str(OUT_PATH))

    if not result.get("success"):
        print(f"ERROR: fill_quotation failed: {result}", file=sys.stderr)
        return 1

    kinds = [item["_scenario"] for item in fill_items]
    manifest = {
        "fixture": str(OUT_PATH.relative_to(ROOT)).replace("\\", "/"),
        "row_count": len(fill_items),
        "scenarios": {k: kinds.count(k) for k in sorted(set(kinds))},
        "rows": [
            {
                "row": item["row"],
                "keywords": f"{item['inquiry_name']} {item.get('inquiry_spec', '')}".strip(),
                "actual_code": item["code"],
                "scenario": item["_scenario"],
            }
            for item in fill_items
        ],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(fill_items)} rows)")
    print(f"Wrote {MANIFEST_PATH}")
    print("scenarios:", manifest["scenarios"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
