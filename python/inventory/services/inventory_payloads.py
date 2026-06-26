"""Inventory lookup/search result normalization and batch response assembly."""
from __future__ import annotations

import os
from typing import Any

from system.error_codes import ERROR_CODE_NO_DATA

INVENTORY_BATCH_MAX_CODES = 50

_INVENTORY_NO_CREDENTIALS = (
    "Inventory lookup is unavailable: Accurate Online API credentials "
    "(AOL_ACCESS_TOKEN / AOL_SIGNATURE_SECRET / AOL_DATABASE_ID) are not configured "
    "for this CCB-Wanding install."
)


def aol_configured() -> bool:
    """True when the bundled inventory API has usable Accurate Online credentials."""
    return bool(os.getenv("AOL_ACCESS_TOKEN", "").strip())


def item_to_dict(item: Any) -> dict[str, Any] | None:
    if item is None:
        return None
    return {
        "code": getattr(item, "code", None) or getattr(item, "item_no", ""),
        "name": getattr(item, "name", None) or getattr(item, "item_name", ""),
        "qty_available": getattr(item, "qty_available", 0.0) or 0.0,
        "qty_warehouse": getattr(item, "qty_warehouse", 0.0) or 0.0,
        "unit": getattr(item, "unit", ""),
    }


def inventory_miss(code: str) -> dict[str, Any]:
    """Structured 'not found' so the model can tell 'no stock' from 'no credentials'."""
    result: dict[str, Any] = {"code": code, "found": False, "error_code": ERROR_CODE_NO_DATA}
    if aol_configured():
        result["message"] = f"No inventory item found for code '{code}'."
    else:
        result["inventory_unavailable"] = _INVENTORY_NO_CREDENTIALS
    return result


def _inventory_batch_row(code: str, item_dict: dict[str, Any] | None) -> dict[str, Any]:
    row: dict[str, Any] = {"code": code, "item": item_dict}
    if item_dict is None:
        row["error_code"] = ERROR_CODE_NO_DATA
    return row


def build_inventory_by_code_batch_payload(
    codes: list[str],
    *,
    input_total: int | None = None,
) -> dict[str, Any]:
    """Batch inventory lookup with stats + markdown table for agent replies."""
    from inventory.agents.table_agent import InventoryTableAgent
    from inventory.services.inventory_agent_tools import _build_inventory_batch_formatted_response

    max_codes = INVENTORY_BATCH_MAX_CODES
    input_total = input_total if input_total is not None else len(codes)
    truncated = input_total > len(codes)

    normalized = [str(code or "").strip() for code in codes]
    valid_codes = [code for code in normalized if code]
    code_to_item: dict[str, dict[str, Any]] = {}
    if valid_codes:
        table = InventoryTableAgent()
        for item in table.get_items_by_codes(valid_codes):
            item_dict = item_to_dict(item)
            if not item_dict:
                continue
            key = str(item_dict.get("code") or "").strip()
            if key:
                code_to_item.setdefault(key, item_dict)

    items: list[dict[str, Any]] = []
    items_with_status: list[dict[str, Any]] = []
    found = 0
    not_found = 0
    invalid = 0

    for idx, code in enumerate(normalized):
        if not code:
            invalid += 1
            items.append(_inventory_batch_row("", None))
            items_with_status.append(
                {"input_index": idx, "code": "", "item_status": "invalid_code"},
            )
            continue

        item_dict = code_to_item.get(code)
        if item_dict:
            found += 1
            items.append(_inventory_batch_row(code, item_dict))
            items_with_status.append(
                {
                    "input_index": idx,
                    "code": code,
                    "item_status": "found",
                    "item_summary": {
                        "item_name": item_dict.get("name"),
                        "qty_warehouse": item_dict.get("qty_warehouse"),
                        "qty_available": item_dict.get("qty_available"),
                    },
                },
            )
        else:
            not_found += 1
            items.append(_inventory_batch_row(code, None))
            items_with_status.append(
                {"input_index": idx, "code": code, "item_status": "not_found"},
            )

    formatted_response = _build_inventory_batch_formatted_response(items_with_status)
    if truncated:
        formatted_response = (
            f"（本次仅处理前 {max_codes} 条，共 {input_total} 个编号；其余请分批调用。）\n\n"
            f"{formatted_response}"
        )

    return {
        "items": items,
        "stats": {
            "found": found,
            "not_found": not_found,
            "invalid": invalid,
            "input_count": len(normalized),
            "truncated": truncated,
            "input_total": input_total,
        },
        "formatted_response": formatted_response,
    }


def build_search_inventory_payload(keywords: str, items: list[Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "keywords": keywords,
        "count": len(items),
        "items": [item_to_dict(item) for item in items],
        "found": bool(items),
    }
    if not items and not aol_configured():
        payload["inventory_unavailable"] = _INVENTORY_NO_CREDENTIALS
    if not items:
        payload["error_code"] = ERROR_CODE_NO_DATA
    return payload
