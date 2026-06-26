"""match_quotation, match_quotation_batch, and match_price_and_get_inventory dispatch."""
from __future__ import annotations

from typing import Any

from quotation.selection_payloads import (
    MATCH_QUOTATION_BATCH_LIMIT,
    build_price_inventory_selection_payload,
    build_selection_payload,
)
from system.param_coercion import coerce_text_list, require_text_param


def handle_match_quotation(params: dict[str, Any]) -> Any:
    from inventory.services.match_and_inventory import match_quotation_union

    keywords = require_text_param(params, "keywords", ("query", "keyword", "product", "product_name", "text"))
    candidates = match_quotation_union(
        keywords,
        customer_level=params.get("customer_level", "B"),
        price_library_path=params.get("price_library_path"),
        product_type=params.get("product_type"),
    )
    return build_selection_payload(
        keywords,
        candidates,
        show_candidates=bool(params.get("show_candidates", False)),
    )


def handle_match_quotation_batch(params: dict[str, Any]) -> Any:
    from inventory.services.match_and_inventory import match_quotation_union

    results = []
    keywords_list = coerce_text_list(
        params.get("keywords_list")
        or params.get("keywords")
        or params.get("queries")
        or params.get("products")
        or params.get("items"),
        nested_keys=("keywords", "query", "product", "product_name", "name", "text"),
    )
    if not keywords_list:
        raise ValueError(
            "Missing required parameter 'keywords_list'. "
            'For one query, use {"tool":"match_quotation","params":{"keywords":"直接50","customer_level":"B"}}.'
        )
    total_requested = len(keywords_list)
    batch_keywords = keywords_list[:MATCH_QUOTATION_BATCH_LIMIT]
    for keywords in batch_keywords:
        keyword_text = str(keywords)
        candidates = match_quotation_union(
            keyword_text,
            customer_level=params.get("customer_level", "B"),
            price_library_path=params.get("price_library_path"),
            product_type=params.get("product_type"),
        )
        results.append(build_selection_payload(
            keyword_text,
            candidates,
            show_candidates=bool(params.get("show_candidates", False)),
        ))
    truncated = total_requested > len(batch_keywords)
    payload: dict[str, Any] = {
        "batch_limit": MATCH_QUOTATION_BATCH_LIMIT,
        "items_requested": total_requested,
        "items_processed": len(results),
        "items_truncated": truncated,
        "results": results,
    }
    if truncated:
        payload["remaining_keywords"] = [str(k) for k in keywords_list[MATCH_QUOTATION_BATCH_LIMIT:]]
        payload["next_step"] = (
            f"Call match_quotation_batch again with keywords_list=remaining_keywords "
            f"(max {MATCH_QUOTATION_BATCH_LIMIT} per call), or use fill_quotation_sheet for full sheets."
        )
    return payload


def handle_match_price_and_get_inventory(params: dict[str, Any]) -> Any:
    from inventory.services.match_and_inventory import match_price_and_get_inventory

    keywords = require_text_param(params, "keywords", ("query", "keyword", "product", "product_name", "text"))
    result = match_price_and_get_inventory(
        keywords,
        customer_level=params.get("customer_level", "B"),
        price_library_path=params.get("price_library_path"),
        product_type=params.get("product_type"),
    )
    if result is None:
        return {"keywords": keywords, "unmatched": True, "found": False}
    if isinstance(result, dict) and result.get("_needs_human_choice"):
        options = result.get("options") or []
        return build_price_inventory_selection_payload(
            keywords,
            options,
            show_candidates=bool(params.get("show_candidates", False)),
        )
    return result
