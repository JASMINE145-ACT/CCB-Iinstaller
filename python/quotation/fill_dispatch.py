"""fill_quotation_sheet business tool parameter aliases and fill branching."""
from __future__ import annotations

from typing import Any

from quotation.fill_items import normalize_fill_items
from quotation.template_paths import (
    coerce_direct_fill_output_path,
    coerce_flow_fill_output_path,
    default_blank_template,
)
from system.param_coercion import coerce_bool, require_text_param


def handle_fill_quotation_sheet(params: dict[str, Any]) -> Any:
    direct_items = params.get("fill_items") or params.get("items") or params.get("rows") or params.get("lines")
    require_exact_codes = any(
        coerce_bool(params.get(key))
        for key in ("require_exact_codes", "locked_lines", "confirmed", "confirmed_selection")
    )
    if require_exact_codes and not direct_items:
        raise ValueError(
            "Confirmed quotation rows must call fill_quotation_sheet with fill_items; "
            "automatic keywords/file rematching is invalid."
        )
    if direct_items:
        from quotation.quote_tools import fill_quotation

        fill_items = normalize_fill_items(
            direct_items,
            customer_level=params.get("customer_level", "B"),
            price_library_path=params.get("price_library_path"),
            require_exact_codes=require_exact_codes,
        )
        file_path = (
            params.get("file_path")
            or params.get("path")
            or params.get("quotation_path")
            or params.get("template_path")
            or params.get("template")
            or params.get("file")
            or default_blank_template()
        )
        workspace_path = params.get("workspace_path") or params.get("workspace") or None
        output_path = coerce_direct_fill_output_path(
            params.get("output_path") or params.get("out_path"),
            str(workspace_path) if workspace_path else None,
        )
        return fill_quotation(
            file_path=str(file_path),
            fill_items=fill_items,
            sheet_name=params.get("sheet_name"),
            output_path=str(output_path),
            quotation_date=params.get("quotation_date"),
            delivery_date=params.get("delivery_date"),
        ) | {"mode": "direct_fill", "items_count": len(fill_items)}

    from quotation.flow_orchestrator import run_quotation_fill_flow

    ws = params.get("workspace_path") or params.get("workspace")
    legacy_out = coerce_flow_fill_output_path(
        _require_flow_source_path(params),
        params.get("output_path"),
        str(ws) if ws else None,
    )

    return run_quotation_fill_flow(
        quotation_path=require_text_param(params, "file_path", ("path", "quotation_path", "file")),
        price_library_path=params.get("price_library_path"),
        output_path=legacy_out,
        sheet_name=params.get("sheet_name"),
        customer_level=params.get("customer_level", "B"),
    )


def _require_flow_source_path(params: dict[str, Any]) -> str:
    return require_text_param(params, "file_path", ("path", "quotation_path", "file"))
