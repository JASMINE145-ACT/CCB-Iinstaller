# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook

from inventory.services.wanding_fuzzy_matcher import (
    get_wanding_price_by_code,
    invalidate_wanding_cache,
    match_fuzzy_candidates,
)


def _write_price_library(path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "price_library"
    ws.append(
        [
            "source_file",
            "source_sheet",
            "source_row",
            "is_preferred_price",
            "superseded_by_source",
            "material",
            "description",
            "description_cn",
            "description_english",
            "product_type",
            "factory_inc_tax",
            "factory_exc_tax",
            "purchase_exc_tax",
            "profit_a",
            "price_a",
            "profit_b",
            "price_b",
            "supplier",
        ]
    )
    ws.append(
        [
            "supplier-test.xlsx",
            "test",
            2,
            True,
            "",
            "8010012697",
            'PVC Water Pipe DN100 4M - LESSO',
            'PVC Water Pipe DN100 4M - LESSO',
            'JIS PVC-U AW Pipe DN100 (4") 4M/pcs White - LESSO',
            "LESSO",
            "",
            "",
            "",
            "",
            "",
            "",
            195828,
            "HENG XIN INTERNATIONAL INDONESIA",
        ]
    )
    wb.save(path)


def test_supplier_column_is_returned_for_fuzzy_candidates(tmp_path: Path) -> None:
    path = tmp_path / "supplier_price_library.xlsx"
    _write_price_library(path)
    invalidate_wanding_cache()

    candidates = match_fuzzy_candidates(
        "PVC Water Pipe DN100",
        customer_level="B",
        price_library_path=str(path),
    )

    assert candidates
    assert candidates[0]["code"] == "8010012697"
    assert candidates[0]["supplier"] == "HENG XIN INTERNATIONAL INDONESIA"


def test_supplier_column_is_returned_for_code_lookup(tmp_path: Path) -> None:
    path = tmp_path / "supplier_price_library.xlsx"
    _write_price_library(path)
    invalidate_wanding_cache()

    result = get_wanding_price_by_code("8010012697", customer_level="B", price_library_path=str(path))

    assert result is not None
    assert result["supplier"] == "HENG XIN INTERNATIONAL INDONESIA"


def test_supplier_column_is_preserved_in_bundled_seed_loader(tmp_path: Path, monkeypatch) -> None:
    path = tmp_path / "supplier_price_library.xlsx"
    _write_price_library(path)
    invalidate_wanding_cache()

    from admin.org_price_client import _load_bundled_seed
    from inventory.config import InventoryConfig

    monkeypatch.setattr(InventoryConfig, "PRICE_LIBRARY_PATH", str(path))

    price_data = _load_bundled_seed()

    assert price_data is not None
    row = next(item for item in price_data["products"] if item["material_code"] == "8010012697")
    assert row["supplier"] == "HENG XIN INTERNATIONAL INDONESIA"
