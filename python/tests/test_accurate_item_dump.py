"""Unit tests for Accurate item dump → slim store → price gap-fill."""
from __future__ import annotations

from pathlib import Path

import pytest

from inventory.services.item_dump import dump_all_pages, merge_pages, extract_list_rows
from inventory.services.item_store import rows_to_slim_records, write_slim_xlsx, write_raw_jsonl
from inventory.services.price_gap_fill import gap_codes, write_gap_report_csv, load_codes_from_slim_xlsx


def test_merge_pages_dedupes_by_code():
    pages = [
        [{"id": 1, "no": "A1", "name": "one"}, {"id": 2, "no": "A2", "name": "two"}],
        [{"id": 2, "no": "A2", "name": "two-dup"}, {"id": 3, "no": "A3", "name": "three"}],
    ]
    merged = merge_pages(pages)
    assert [r["no"] for r in merged] == ["A1", "A2", "A3"]
    assert merged[1]["name"] == "two"


def test_dump_all_pages_stops_on_empty_and_short_page():
    calls = []

    def fetch(page, page_size):
        calls.append((page, page_size))
        if page == 1:
            return [{"id": i, "no": f"C{i}", "name": f"n{i}"} for i in range(1, 3)]
        if page == 2:
            return [{"id": 3, "no": "C3", "name": "n3"}]  # short page
        return []

    rows = dump_all_pages(fetch, page_size=2, max_pages=10)
    assert [r["no"] for r in rows] == ["C1", "C2", "C3"]
    assert calls == [(1, 2), (2, 2)]


def test_dump_all_pages_stops_on_duplicate_page_ids():
    def fetch(page, page_size):
        return [{"id": 1, "no": "X", "name": "same"}]

    rows = dump_all_pages(fetch, page_size=10, max_pages=5)
    assert len(rows) == 1


def test_dump_without_id_does_not_stop_after_page_one():
    calls = []

    def fetch(page, page_size):
        calls.append(page)
        if page == 1:
            return [{"no": f"N{i}", "name": "a"} for i in range(2)]
        if page == 2:
            return [{"no": "N2", "name": "b"}]
        return []

    rows = dump_all_pages(fetch, page_size=2, max_pages=5)
    assert [r["no"] for r in rows] == ["N0", "N1", "N2"]
    assert calls == [1, 2]


def test_extract_list_rows_nested_d_r():
    assert extract_list_rows({"s": True, "d": {"r": [{"no": "Z"}]}}) == [{"no": "Z"}]
    assert extract_list_rows({"s": False, "d": []}) == []


def test_rows_to_slim_and_write_xlsx(tmp_path: Path):
    rows = [
        {"no": "IC-1", "name": "English", "charField3": "中文"},
        {"no": "IC-1", "name": "dup"},
        {"no": "", "name": "skip"},
    ]
    records = rows_to_slim_records(rows)
    assert records == [{"Item Code": "IC-1", "Item Name": "English", "Chinese name": "中文"}]
    dest = tmp_path / "item-list-slim.xlsx"
    write_slim_xlsx(records, dest)
    assert dest.is_file()
    codes = load_codes_from_slim_xlsx(dest)
    assert codes == {"IC-1"}
    jsonl = write_raw_jsonl(rows, tmp_path / "raw.jsonl")
    assert jsonl.read_text(encoding="utf-8").count("\n") == 3


def test_gap_codes_accurate_minus_price_lib(tmp_path: Path):
    gap = gap_codes(["A", "B", "C", "", "nan"], ["B", "D"])
    assert gap == ["A", "C"]
    report = write_gap_report_csv(gap, tmp_path / "gap.csv")
    text = report.read_text(encoding="utf-8")
    assert "A,insert_draft" in text
    assert "C,insert_draft" in text
    assert "publish" not in text


def test_load_codes_prefers_price_library_sheet(tmp_path: Path):
    import pandas as pd

    path = tmp_path / "pl.xlsx"
    with pd.ExcelWriter(path) as writer:
        pd.DataFrame({"Material": ["OLD"]}).to_excel(writer, sheet_name="other", index=False)
        pd.DataFrame({"Material": ["M1", "M2"]}).to_excel(writer, sheet_name="price_library", index=False)
    from inventory.services.price_gap_fill import load_codes_from_price_library_xlsx

    assert load_codes_from_price_library_xlsx(path) == {"M1", "M2"}