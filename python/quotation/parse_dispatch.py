"""parse_excel_smart business tool parameter aliases and dispatch."""
from __future__ import annotations

from typing import Any

from system.param_coercion import require_text_param


def handle_parse_excel_smart(params: dict[str, Any]) -> Any:
    from quotation.quote_tools import parse_excel_smart

    return parse_excel_smart(
        file_path=require_text_param(params, "file_path", ("path", "excel_path", "file")),
        sheet_name=params.get("sheet_name"),
        max_rows=params.get("max_rows", 500),
    )
