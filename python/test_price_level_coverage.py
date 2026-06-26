# -*- coding: utf-8 -*-
"""Unit tests for extended customer_level / price tier coverage."""
from __future__ import annotations

import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from inventory.services.wanding_fuzzy_matcher import (  # noqa: E402
    _fallback_price_fields_for_level,
    _new_price_field_for_level,
    _normalize_price_level,
    get_price_level_display_name,
)


NORMALIZE_CASES = [
    ("LOCAL", "LOCAL_EXC_TAX"),
    ("local不含税", "LOCAL_EXC_TAX"),
    ("LOCAL EXC TAX", "LOCAL_EXC_TAX"),
    ("本地价", "LOCAL_EXC_TAX"),
    ("LOCAL含税", "LOCAL_INC_TAX"),
    ("LOCAL INC TAX", "LOCAL_INC_TAX"),
    ("RUCIKA", "RUCIKA_QUOTE_1"),
    ("RUCIKA pricelist exc", "RUCIKA_PRICELIST_EXC"),
    ("RUCIKA目录价不含税", "RUCIKA_PRICELIST_EXC"),
    ("RUCIKA pricelist inc", "RUCIKA_PRICELIST_INC"),
    ("RUCIKA报单1", "RUCIKA_QUOTE_1"),
    ("RUCIKA第二组价", "RUCIKA_QUOTE_2"),
    ("PE面价", "PE_NOMINAL"),
    ("PE nominal", "PE_NOMINAL"),
    ("PE出厂价", "PE_FACTORY"),
    ("PE factory", "PE_FACTORY"),
    ("D_low", "D_LOW"),
    ("青山价格", "D_QUOTE"),
    ("出厂价_不含税", "FACTORY_EXC_TAX"),
    ("B", "B_QUOTE"),
    ("A", "A_QUOTE"),
    ("采购不含税", "PURCHASE_EXC_TAX"),
]


FIELD_CASES = [
    ("LOCAL", "local_exc_tax"),
    ("LOCAL_INC_TAX", "local_inc_tax"),
    ("RUCIKA_QUOTE_1", "rucika_quote_price_1"),
    ("RUCIKA_QUOTE_2", "rucika_quote_price_2"),
    ("RUCIKA_PRICELIST_EXC", "rucika_pricelist_exc_vat11"),
    ("PE_NOMINAL", "pe_nominal_price"),
    ("PE_FACTORY", "pe_factory_price"),
]


def test_normalize_price_level_extended() -> None:
    for raw, expected in NORMALIZE_CASES:
        assert _normalize_price_level(raw) == expected, f"{raw!r} -> {_normalize_price_level(raw)!r}, want {expected!r}"


def test_new_price_field_for_level_extended() -> None:
    for level, expected_field in FIELD_CASES:
        assert _new_price_field_for_level(level) == expected_field


def test_local_fallback_does_not_include_price_b_first() -> None:
    fields = _fallback_price_fields_for_level("LOCAL")
    assert fields[0] == "local_exc_tax"
    assert "price_b" not in fields


def test_rucika_quote_fallback_order() -> None:
    fields = _fallback_price_fields_for_level("RUCIKA_QUOTE_1")
    assert fields[:2] == ["rucika_quote_price_1", "price_b"]


def test_display_name_local() -> None:
    assert "LOCAL" in get_price_level_display_name("LOCAL")


if __name__ == "__main__":
    for fn in (
        test_normalize_price_level_extended,
        test_new_price_field_for_level_extended,
        test_local_fallback_does_not_include_price_b_first,
        test_rucika_quote_fallback_order,
        test_display_name_local,
    ):
        fn()
    print("price level coverage tests passed")
