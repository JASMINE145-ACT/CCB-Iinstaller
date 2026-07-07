"""Admin cache stub for standalone MCP mode."""
from __future__ import annotations

from typing import Any


def get_product_mapping_rows() -> list[dict[str, Any]]:
    try:
        from admin.org_mapping_client import get_product_mapping_rows as org_rows

        rows = org_rows()
        if rows:
            return rows
    except Exception:
        pass
    return []


def get_price_library_rows() -> list[dict[str, Any]]:
    return []
