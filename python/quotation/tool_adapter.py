"""OpenAI-style quotation tool execution adapter and response envelope normalization."""
from __future__ import annotations

import json
from typing import Any

from quotation.excel_edit import edit_excel
from quotation.quote_tools import extract_quotation_data, fill_quotation, parse_excel_smart


def execute_quote_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """执行报价 Agent 工具，返回 {success, result, error, ...} 或 {success, items, error, rows_count}。"""
    if name == "extract_quotation_data":
        file_path = (arguments.get("file_path") or "").strip()
        sheet_name = (arguments.get("sheet_name") or "").strip() or None
        if not file_path:
            return {"success": False, "result": "", "error": "请提供 file_path", "rows_count": 0}
        return extract_quotation_data(file_path=file_path, sheet_name=sheet_name)
    if name == "fill_quotation_sheet":
        file_path = (arguments.get("file_path") or "").strip()
        fill_items = arguments.get("fill_items") or []
        output_path = (arguments.get("output_path") or "").strip() or None
        sheet_name = (arguments.get("sheet_name") or "").strip() or None
        quotation_date = (arguments.get("quotation_date") or "").strip() or None
        delivery_date = (arguments.get("delivery_date") or "").strip() or None
        if not file_path:
            return {"success": False, "result": "", "error": "请提供 file_path"}
        if not fill_items or not isinstance(fill_items, list):
            return {"success": False, "result": "", "error": "请提供 fill_items 数组"}
        out = fill_quotation(
            file_path=file_path,
            fill_items=fill_items,
            sheet_name=sheet_name,
            output_path=output_path,
            quotation_date=quotation_date,
            delivery_date=delivery_date,
        )
        if out.get("success"):
            return {"success": True, "result": json.dumps({"filled_count": out["filled_count"], "output_path": out["output_path"]}, ensure_ascii=False), "error": None}
        return {"success": False, "result": "", "error": out.get("error", "填表失败")}
    if name == "parse_excel_smart":
        fp = (arguments.get("file_path") or "").strip()
        sheet_name = (arguments.get("sheet_name") or "").strip() or None
        max_rows = arguments.get("max_rows")
        if max_rows is None:
            max_rows = 500
        try:
            max_rows = int(max_rows)
        except (TypeError, ValueError):
            max_rows = 500
        if not fp:
            return {"success": False, "result": "", "error": "请提供 file_path", "rows_read": 0}
        out = parse_excel_smart(file_path=fp, sheet_name=sheet_name, max_rows=max_rows)
        if out.get("success"):
            return {"success": True, "result": out["result"], "error": None, "rows_read": out.get("rows_read", 0)}
        return {"success": False, "result": "", "error": out.get("error", "解析失败"), "rows_read": 0}
    if name == "edit_excel":
        fp = (arguments.get("file_path") or "").strip()
        edits = arguments.get("edits") or []
        sheet_name = (arguments.get("sheet_name") or "").strip() or None
        output_path = (arguments.get("output_path") or "").strip() or None
        if not fp:
            return {"success": False, "result": "", "error": "请提供 file_path", "output_path": ""}
        out = edit_excel(file_path=fp, edits=edits, sheet_name=sheet_name, output_path=output_path)
        if out.get("success"):
            return {"success": True, "result": out["result"], "error": None, "output_path": out.get("output_path", "")}
        return {"success": False, "result": "", "error": out.get("error", "编辑失败"), "output_path": ""}
    return {"success": False, "result": "", "error": f"未知工具: {name}", "rows_count": 0}
