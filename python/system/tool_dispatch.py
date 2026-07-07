"""MCP JSON tool dispatch, adapter parameter coercion, and request error wrapping."""
from __future__ import annotations

import logging
from typing import Any

from system.error_codes import infer_error_code, normalize_error_codes
from system.param_coercion import (
    coerce_bool,
    coerce_int,
    coerce_number,
    coerce_text_list,
    require_text_param,
)

logger = logging.getLogger(__name__)

__all__ = [
    "coerce_bool",
    "coerce_int",
    "coerce_number",
    "coerce_text_list",
    "dispatch",
    "handle_request",
    "require_text_param",
]


def dispatch(tool: str, params: dict[str, Any]) -> Any:
    if tool == "append_business_rule":
        from admin.org_knowledge_dispatch import handle_append_business_rule

        return handle_append_business_rule(params)

    if tool == "append_quotation_mapping_pending":
        from quotation.mapping_pending_dispatch import handle_append_quotation_mapping_pending

        return handle_append_quotation_mapping_pending(params)

    if tool == "match_quotation":
        from quotation.match_dispatch import handle_match_quotation

        return handle_match_quotation(params)

    if tool == "match_quotation_batch":
        from quotation.match_dispatch import handle_match_quotation_batch

        return handle_match_quotation_batch(params)

    if tool == "match_price_and_get_inventory":
        from quotation.match_dispatch import handle_match_price_and_get_inventory

        return handle_match_price_and_get_inventory(params)

    if tool == "get_inventory_by_code":
        from inventory.services.inventory_dispatch import handle_get_inventory_by_code

        return handle_get_inventory_by_code(params)

    if tool == "get_inventory_by_code_batch":
        from inventory.services.inventory_dispatch import handle_get_inventory_by_code_batch

        return handle_get_inventory_by_code_batch(params)

    if tool == "search_inventory":
        from inventory.services.inventory_dispatch import handle_search_inventory

        return handle_search_inventory(params)

    if tool == "parse_excel_smart":
        from quotation.parse_dispatch import handle_parse_excel_smart

        return handle_parse_excel_smart(params)

    if tool == "fill_quotation_sheet":
        from quotation.fill_dispatch import handle_fill_quotation_sheet

        return handle_fill_quotation_sheet(params)

    if tool == "ask_clarification":
        from quotation.selection_payloads import handle_ask_clarification

        return handle_ask_clarification(params)

    if tool == "get_product_price_tiers":
        from quotation.price_tiers_dispatch import handle_get_product_price_tiers

        return handle_get_product_price_tiers(params)

    raise ValueError(f"Unknown tool: {tool}")


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    tool = str(request.get("tool", ""))
    params = request.get("params", {}) or {}
    logger.info("Dispatching: %s", tool)
    try:
        return {"success": True, "result": normalize_error_codes(dispatch(tool, params))}
    except ValueError as exc:
        return {"success": False, "error": str(exc), "error_code": infer_error_code(exc)}
    except Exception as exc:
        logger.exception("Tool dispatch failed")
        return {"success": False, "error": str(exc), "error_code": infer_error_code(exc)}
