"""get_inventory_by_code, batch, and search_inventory business tool dispatch."""
from __future__ import annotations

from typing import Any

from inventory.services.inventory_payloads import (
    INVENTORY_BATCH_MAX_CODES,
    build_inventory_by_code_batch_payload,
    build_search_inventory_payload,
    inventory_miss,
    item_to_dict,
)
from system.param_coercion import coerce_text_list, require_text_param


def handle_get_inventory_by_code(params: dict[str, Any]) -> Any:
    from inventory.agents.table_agent import InventoryTableAgent

    code = require_text_param(params, "code", ("item_code", "no", "sku", "item"))
    item = InventoryTableAgent().get_item_by_code(code)
    if item is None:
        return inventory_miss(code)
    return item_to_dict(item)


def handle_get_inventory_by_code_batch(params: dict[str, Any]) -> Any:
    raw_codes = coerce_text_list(
        params.get("codes") or params.get("code") or params.get("item_codes") or params.get("items"),
        nested_keys=("code", "item_code", "sku", "product_code", "no"),
    )
    if not raw_codes:
        raise ValueError(
            "Missing required parameter 'codes'. "
            'Example: {"tool":"get_inventory_by_code_batch","params":{"codes":["8020020755","8020022784"]}}'
        )
    return build_inventory_by_code_batch_payload(
        raw_codes[:INVENTORY_BATCH_MAX_CODES],
        input_total=len(raw_codes),
    )


def handle_search_inventory(params: dict[str, Any]) -> Any:
    from inventory.agents.table_agent import InventoryTableAgent

    keywords = require_text_param(
        params, "keywords", ("query", "keyword", "product", "product_name", "text", "name")
    )
    try:
        max_results = int(params.get("max_results", 10) or 10)
    except (TypeError, ValueError):
        max_results = 10
    items = InventoryTableAgent().search_items(keywords, max_results=max_results)
    return build_search_inventory_payload(keywords, items)
