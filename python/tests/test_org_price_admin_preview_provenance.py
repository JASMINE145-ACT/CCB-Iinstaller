"""Tests for org price admin preview helpers."""
from __future__ import annotations

from admin.org_price_admin_preview import find_by_source_provenance


def test_find_by_source_provenance_active_hit() -> None:
    active = [
        {
            "product_id": "p1",
            "material_code": "8020020755",
            "source_file": "quote.xlsx",
            "source_sheet": "Sheet1",
            "source_row": 16,
        }
    ]
    hit = find_by_source_provenance(
        active_products=active,
        draft_items=[],
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=16,
    )
    assert hit is not None
    assert hit["material_code"] == "8020020755"


def test_find_by_source_provenance_draft_overlay() -> None:
    active = [{"product_id": "p1", "material_code": "8020020755"}]
    draft = [
        {
            "product_id": "p1",
            "change_type": "update",
            "changed_at": 1,
            "source_file": "quote.xlsx",
            "source_sheet": "Sheet1",
            "source_row": 16,
        }
    ]
    hit = find_by_source_provenance(
        active_products=active,
        draft_items=draft,
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=16,
    )
    assert hit is not None
    assert hit["material_code"] == "8020020755"
