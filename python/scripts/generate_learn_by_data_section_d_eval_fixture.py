#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate isolated Section D eval fixture (gap / mismatch / skip) — no live pending writes.

Output:
  data/smoke/learn-by-data-section-d-eval.xlsx
  data/smoke/learn-by-data-section-d-eval.manifest.json

Scenarios:
  d-gap          — agent aligned with F col; keyword absent from mapping table
  d-mismatch     — agent pick != F col (in-candidates)
  d-skip-m2      — aligned + mapping already has norm_text + code (Section D skip)
  d-skip-empty   — empty F col (guard reject)
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

from inventory.config import config  # noqa: E402
from inventory.services.mapping_table_matcher import load_mapping_df  # noqa: E402
from inventory.services.match_and_inventory import match_quotation_union  # noqa: E402
from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code  # noqa: E402
from quotation.layout import VANTSING_LAYOUT  # noqa: E402
from quotation.learn_by_data_mapping import mapping_has_keyword_code, section_d_trigger  # noqa: E402
from quotation.quote_tools import fill_quotation  # noqa: E402

BLANK_TEMPLATE = ROOT / "data" / "空白标准报价单.xlsx"
OUT_PATH = ROOT / "data" / "smoke" / "learn-by-data-section-d-eval.xlsx"
MANIFEST_PATH = ROOT / "data" / "smoke" / "learn-by-data-section-d-eval.manifest.json"


def _top_code(keywords: str) -> str:
    cands = match_quotation_union(keywords, customer_level="B")
    return str(cands[0]["code"]) if cands else ""


def _nth_code(keywords: str, n: int) -> str:
    cands = match_quotation_union(keywords, customer_level="B")
    if len(cands) <= n:
        raise RuntimeError(f"need >={n + 1} candidates for {keywords!r}, got {len(cands)}")
    return str(cands[n]["code"])


def _unique_gap_keyword() -> tuple[str, str, str]:
    """Return (inquiry_name, inquiry_spec, product_code) for a guaranteed D-gap row."""
    base_kw = "PVC直通 20"
    code = _top_code(base_kw)
    token = uuid.uuid4().hex[:8]
    inquiry_name = f"EVAL_GAP_{token}"
    inquiry_spec = "DN20"
    mapping_df = load_mapping_df(config.MAPPING_TABLE_PATH)
    if mapping_has_keyword_code(
        mapping_df,
        inquiry_name=inquiry_name,
        inquiry_spec=inquiry_spec,
        sheet_product_code=code,
    ):
        raise RuntimeError("unexpected collision for gap keyword")
    return inquiry_name, inquiry_spec, code


def _mapping_skip_row() -> tuple[str, str, str]:
    mapping_df = load_mapping_df(config.MAPPING_TABLE_PATH)
    if mapping_df.empty:
        raise RuntimeError("mapping table empty — cannot build d-skip-m2 row")
    for _, row in mapping_df.iterrows():
        code = str(row.get("code") or "").strip()
        search_text = str(row.get("search_text") or "").strip()
        if not code or not search_text:
            continue
        parts = search_text.split(" ", 1)
        inquiry_name = parts[0]
        inquiry_spec = parts[1] if len(parts) > 1 else ""
        if mapping_has_keyword_code(
            mapping_df,
            inquiry_name=inquiry_name,
            inquiry_spec=inquiry_spec,
            sheet_product_code=code,
        ):
            return inquiry_name, inquiry_spec, code
    raise RuntimeError("no mapping row suitable for d-skip-m2")


def _build_rows() -> list[dict]:
    gap_name, gap_spec, gap_code = _unique_gap_keyword()
    mismatch_kw = "PVC直通 20"
    mismatch_code = _nth_code(mismatch_kw, 1)
    skip_name, skip_spec, skip_code = _mapping_skip_row()

    scenarios: list[tuple[str, str, str, str, str]] = [
        (gap_name, gap_spec, gap_code, "d-gap", gap_code),
        (
            mismatch_kw.split(" ", 1)[0],
            mismatch_kw.split(" ", 1)[1] if " " in mismatch_kw else "",
            mismatch_code,
            "d-mismatch",
            _top_code(mismatch_kw),
        ),
        (skip_name, skip_spec, skip_code, "d-skip-m2", skip_code),
        ("EVAL_EMPTY_F", "ROW", "", "d-skip-empty", ""),
    ]

    layout = VANTSING_LAYOUT
    mapping_df = load_mapping_df(config.MAPPING_TABLE_PATH)
    fill_items: list[dict] = []
    for i, (name, spec, code, kind, agent_pick) in enumerate(scenarios):
        row_num = layout.data_start_row + i
        price_row = get_wanding_price_by_code(code, customer_level="B") if code else None
        quote_name = (price_row or {}).get("matched_name") or f"{name} {spec}".strip()
        trigger = (
            section_d_trigger(
                agent_pick_code=agent_pick,
                sheet_product_code=code,
                inquiry_name=name,
                inquiry_spec=spec,
                mapping_df=mapping_df,
            )
            if code
            else None
        )
        fill_items.append(
            {
                "row": row_num,
                "code": code or "",
                "quote_name": str(quote_name)[:80],
                "specification": spec or name,
                "unit_price": float((price_row or {}).get("unit_price") or 1000),
                "qty": 1,
                "inquiry_name": name,
                "inquiry_spec": spec,
                "satuan": "pcs",
                "brand": "LESSO",
                "_scenario": kind,
                "_expected_trigger": trigger,
                "_agent_pick": agent_pick,
            }
        )
    return fill_items


def main() -> int:
    if not BLANK_TEMPLATE.exists():
        print(f"ERROR: missing template {BLANK_TEMPLATE}", file=sys.stderr)
        return 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fill_items = _build_rows()

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp) / "work.xlsx"
        shutil.copy2(BLANK_TEMPLATE, work)
        payload = [{k: v for k, v in item.items() if not k.startswith("_")} for item in fill_items if item["code"]]
        # empty-F row: fill manually in payload — use placeholder code then clear? fill_quotation needs code
        # For empty F row, append with minimal code then we'll document excel row separately
        empty_item = next(i for i in fill_items if i["_scenario"] == "d-skip-empty")
        payload.append(
            {
                "row": empty_item["row"],
                "code": "8030020288",
                "quote_name": "placeholder",
                "specification": empty_item["inquiry_spec"],
                "unit_price": 1000,
                "qty": 1,
                "inquiry_name": empty_item["inquiry_name"],
                "inquiry_spec": empty_item["inquiry_spec"],
                "satuan": "pcs",
                "brand": "LESSO",
            }
        )
        result = fill_quotation(str(work), payload, output_path=str(OUT_PATH))

    if not result.get("success"):
        print(f"ERROR: fill_quotation failed: {result}", file=sys.stderr)
        return 1

    import openpyxl

    layout = VANTSING_LAYOUT
    wb = openpyxl.load_workbook(OUT_PATH)
    ws = wb.active
    empty_row = empty_item["row"]
    ws.cell(empty_row, layout.product_no_col, None)
    wb.save(OUT_PATH)
    wb.close()

    manifest = {
        "fixture": str(OUT_PATH.relative_to(ROOT)).replace("\\", "/"),
        "purpose": "Section D offline eval — isolated temp dirs only; do not merge into production mapping",
        "row_count": len(fill_items),
        "scenarios": {k: sum(1 for i in fill_items if i["_scenario"] == k) for k in sorted({i["_scenario"] for i in fill_items})},
        "rows": [
            {
                "row": item["row"],
                "keywords": f"{item['inquiry_name']} {item.get('inquiry_spec', '')}".strip(),
                "actual_code": item["code"],
                "scenario": item["_scenario"],
                "expected_section_d_trigger": item["_expected_trigger"],
                "agent_pick_for_eval": item["_agent_pick"],
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
