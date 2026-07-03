"""Price library admin MCP confirmation payloads and local preview helpers."""
from __future__ import annotations

from typing import Any

# Mirrors AionCore PriceProductFieldsPatch (migration 018 includes supplier).
UPDATABLE_FIELD_NAMES: frozenset[str] = frozenset({
    "source_file",
    "source_sheet",
    "source_row",
    "is_preferred_price",
    "superseded_by_source",
    "material_code",
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
    "profit_c",
    "price_c",
    "profit_d",
    "price_d",
    "profit_d_low",
    "price_d_low",
    "profit_e",
    "price_e",
    "local_profit",
    "local_exc_tax",
    "local_inc_tax",
    "rucika_pricelist_exc_vat11",
    "rucika_pricelist_inc_vat11",
    "rucika_discount",
    "rucika_quote_profit_1",
    "rucika_quote_price_1",
    "rucika_quote_profit_2",
    "rucika_quote_price_2",
    "pe_nominal_price",
    "pe_discount",
    "pe_factory_price",
    "unit",
    "volume",
    "raw_json",
    "supplier",
})


def build_write_confirmation_payload(
    *,
    tool: str,
    message: str,
    material_code: str,
    change_type: str,
    proposed: dict[str, Any],
    current: dict[str, Any] | None,
    draft_revision: int | None,
) -> dict[str, Any]:
    return {
        "requires_confirmation": True,
        "message": message,
        "tool": tool,
        "material_code": material_code,
        "change_type": change_type,
        "draft_revision": draft_revision,
        "current": current,
        "proposed": proposed,
    }


def build_publish_confirmation_payload(
    *,
    draft_revision: int,
    item_count: int,
    reason: str | None,
    active_version_number: int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "requires_confirmation": True,
        "message": (
            "This will publish the shared price library draft to all users. "
            "Ask the user to confirm before calling again with confirmed=true."
        ),
        "tool": "publish_price_library_draft",
        "draft_revision": draft_revision,
        "pending_draft_items": item_count,
        "reason": reason or "",
    }
    if active_version_number is not None:
        payload["active_version_number"] = active_version_number
        payload["next_version_number"] = active_version_number + 1
    return payload
