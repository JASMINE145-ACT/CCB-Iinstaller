"""Inquiry column (B–E) backfill when empty — agent-provided fields."""
from __future__ import annotations

from typing import Any

from quotation.layout import QuotationTemplateLayout


def resolve_inquiry_fields_from_item(item: dict[str, Any]) -> dict[str, str]:
    inquiry_name = str(
        item.get("inquiry_name")
        or item.get("source_keyword")
        or item.get("product_name")
        or item.get("keywords")
        or ""
    ).strip()
    inquiry_spec = str(
        item.get("inquiry_spec")
        or item.get("specification")
        or item.get("spec")
        or ""
    ).strip()
    return {"inquiry_name": inquiry_name, "inquiry_spec": inquiry_spec}


def _cell_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def backfill_inquiry_columns_if_empty(
    ws,
    row: int,
    layout: QuotationTemplateLayout,
    item: dict[str, Any],
    *,
    satuan: str | None = None,
    qty: int | None = None,
) -> None:
    fields = resolve_inquiry_fields_from_item(item)

    if not _cell_text(ws.cell(row=row, column=layout.inquiry_name_col).value) and fields["inquiry_name"]:
        ws.cell(row=row, column=layout.inquiry_name_col, value=fields["inquiry_name"])

    if not _cell_text(ws.cell(row=row, column=layout.inquiry_spec_col).value) and fields["inquiry_spec"]:
        ws.cell(row=row, column=layout.inquiry_spec_col, value=fields["inquiry_spec"])

    if layout.inquiry_unit_col:
        if not _cell_text(ws.cell(row=row, column=layout.inquiry_unit_col).value):
            unit_val = (satuan or item.get("satuan") or "").strip()
            if unit_val:
                ws.cell(row=row, column=layout.inquiry_unit_col, value=unit_val)

    if not _cell_text(ws.cell(row=row, column=layout.inquiry_qty_col).value):
        qty_val = qty if qty is not None else item.get("qty")
        if qty_val is not None and str(qty_val).strip() != "":
            ws.cell(row=row, column=layout.inquiry_qty_col, value=qty_val)
