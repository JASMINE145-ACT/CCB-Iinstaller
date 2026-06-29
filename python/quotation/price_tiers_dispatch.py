"""get_product_price_tiers MCP dispatch."""
from __future__ import annotations

from typing import Any

from system.param_coercion import require_text_param


def handle_get_product_price_tiers(params: dict[str, Any]) -> Any:
    from quotation.price_tiers import get_product_price_tiers

    code = require_text_param(params, "code", ("material_code", "product_code"))
    return get_product_price_tiers(
        code,
        price_library_path=params.get("price_library_path"),
    )
