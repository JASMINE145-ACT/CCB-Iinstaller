"""Tests for learn-by-data price library helpers."""
from __future__ import annotations

from quotation.learn_by_data_price_library import (
    build_learn_by_data_upsert_fields,
    check_learn_by_data_upsert_guards,
    material_in_price_library,
    normalize_source_file_basename,
    validate_source_provenance,
)


def test_material_in_price_library_org_hit() -> None:
    assert material_in_price_library({"tier_count": 2, "tiers": [{"field": "price_b"}], "price_source": "org_api"})


def test_material_in_price_library_not_found() -> None:
    assert not material_in_price_library({"found": False, "tier_count": 0, "price_source": "none"})


def test_build_learn_by_data_upsert_fields_omits_prices() -> None:
    fields = build_learn_by_data_upsert_fields(
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=16,
        top_candidate={"matched_name": "直接50", "description_english": "Coupling 50"},
        keywords="直接50",
    )
    assert fields["source_file"] == "quote.xlsx"
    assert fields["source_sheet"] == "Sheet1"
    assert fields["source_row"] == 16
    assert fields["is_preferred_price"] is True
    assert fields["superseded_by_source"] == ""
    assert fields["description"] == "直接50"
    assert fields["description_cn"] == "直接50"
    assert fields["description_english"] == "Coupling 50"
    assert "price_b" not in fields


def test_normalize_source_file_basename_strips_path() -> None:
    assert normalize_source_file_basename(r"D:\data\quote.xlsx") == "quote.xlsx"
    assert normalize_source_file_basename("../evil.xlsx") is None
    assert normalize_source_file_basename(r"\\server\share\quote.xlsx") is None


def test_validate_source_provenance_requires_triple() -> None:
    ok, err = validate_source_provenance(source_file="q.xlsx", source_sheet="S1", source_row=8)
    assert ok and err is None
    bad, err = validate_source_provenance(source_file="q.xlsx", source_sheet="", source_row=8)
    assert not bad and err


def test_check_guards_rejects_duplicate_source_row() -> None:
    active = [
        {
            "product_id": "p1",
            "material_code": "8020020755",
            "source_file": "quote.xlsx",
            "source_sheet": "Sheet1",
            "source_row": 16,
        }
    ]
    result = check_learn_by_data_upsert_guards(
        tiers_result={"found": False, "price_source": "none", "tier_count": 0},
        active_products=active,
        draft_items=[],
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=16,
        top_code="8020099999",
    )
    assert result["action"] == "reject"
    assert result["reason"] == "duplicate_source_provenance"


def test_check_guards_skips_material_already_in_library() -> None:
    result = check_learn_by_data_upsert_guards(
        tiers_result={"tier_count": 1, "tiers": [{"price_b": 1}], "price_source": "org_api"},
        active_products=[],
        draft_items=[],
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=20,
        top_code="8020020755",
    )
    assert result["action"] == "skip"
    assert result["reason"] == "material_already_in_price_library"


def test_check_guards_skips_session_duplicate_top_code() -> None:
    result = check_learn_by_data_upsert_guards(
        tiers_result={"found": False, "price_source": "none", "tier_count": 0},
        active_products=[],
        draft_items=[],
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=20,
        top_code="8020020755",
        session_processed_top_codes={"8020020755"},
    )
    assert result["action"] == "skip"
    assert result["reason"] == "session_duplicate_top_code"
