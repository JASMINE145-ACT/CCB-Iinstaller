"""Org quotation-mapping MCP dispatch tests."""
from __future__ import annotations

from unittest.mock import patch

import pytest

from quotation.org_mapping_dispatch import (
    handle_lookup_quotation_mapping,
    handle_publish_quotation_mapping_draft,
)


def test_lookup_quotation_mapping_requires_org() -> None:
    with patch("quotation.org_mapping_dispatch.is_org_mapping_configured", return_value=False):
        result = handle_lookup_quotation_mapping({"inquiry_name": "Elbow drat", "inquiry_spec": '1/2" AW'})
    assert result["success"] is False


def test_lookup_quotation_mapping_returns_org_rows() -> None:
    with (
        patch("quotation.org_mapping_dispatch.is_org_mapping_configured", return_value=True),
        patch(
            "quotation.org_mapping_dispatch.lookup_mapping_rows",
            return_value={
                "norm_key": "elbow drat 1/2 aw",
                "rows": [{"product_code": "8010024875", "quotation_name": "内螺纹弯头"}],
            },
        ),
    ):
        result = handle_lookup_quotation_mapping({"inquiry_name": "Elbow drat", "inquiry_spec": '1/2" AW'})
    assert result["success"] is True
    assert result["rows"][0]["product_code"] == "8010024875"


def test_publish_quotation_mapping_draft_invalidates_cache() -> None:
    with (
        patch("quotation.org_mapping_dispatch.is_org_mapping_configured", return_value=True),
        patch(
            "quotation.org_mapping_dispatch.get_mapping_draft",
            return_value={"revision": 3},
        ),
        patch(
            "quotation.org_mapping_dispatch.publish_mapping_draft",
            return_value={"revision": 4, "item_count": 1},
        ),
        patch("quotation.org_mapping_dispatch.invalidate_mapping_org_cache") as invalidate,
    ):
        result = handle_publish_quotation_mapping_draft({"confirmed": True, "reason": "test"})
    assert result["success"] is True
    assert result["published"] is True
    invalidate.assert_called_once()
