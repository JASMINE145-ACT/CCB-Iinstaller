"""Row guards for fill_quotation_sheet direct-fill mode."""
from __future__ import annotations

from typing import Any

from quotation.layout import QuotationTemplateLayout

_HEADER_LABELS = frozenset({
    "数量",
    "品牌",
    "单价",
    "总额",
    "产品编号",
    "报价名称",
    "报价规格",
    "单位",
    "qty",
    "quantity",
    "brand",
    "unit price",
    "total",
    "product number",
    "product no",
})


def normalize_unmatched_product_code(code: str) -> str:
    text = (code or "").strip()
    if text.upper().startswith("UNMATCHED_"):
        return "无货"
    return text


def quote_cell_looks_like_header_label(value: str) -> bool:
    text = (value or "").strip()
    if not text:
        return False
    lower = text.lower()
    if lower in _HEADER_LABELS or text in _HEADER_LABELS:
        return True
    for label in _HEADER_LABELS:
        if len(label) >= 2 and label in lower:
            return True
    return False


def _to_int_or_none(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    s = str(value).strip().replace(",", "")
    if not s:
        return None
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return None


def validate_and_fix_fill_rows(
    items: list[dict[str, Any]],
    layout: QuotationTemplateLayout,
) -> list[dict[str, Any]]:
    if not items:
        return items

    rows = [_to_int_or_none(item.get("row")) for item in items]
    data_start = layout.data_start_row

    if rows and all(r is not None for r in rows) and rows == list(range(1, len(rows) + 1)):
        items = [
            {**item, "row": data_start + idx}
            for idx, item in enumerate(items)
        ]
        rows = [item["row"] for item in items]

    fixed: list[dict[str, Any]] = []
    for item in items:
        row_item = dict(item)
        row = _to_int_or_none(row_item.get("row"))
        if row is None or row < data_start:
            raise ValueError(
                f"fill_items row {row} is in the header area for template '{layout.template_id}'; "
                f"data rows start at Excel row {data_start}."
            )
        if row_item.get("code"):
            row_item["code"] = normalize_unmatched_product_code(str(row_item["code"]))
        fixed.append(row_item)
    return fixed


def find_header_labels_in_quote_row(ws, row: int, layout: QuotationTemplateLayout) -> list[str]:
    quote_cols = [
        layout.product_no_col,
        layout.quote_name_col,
        layout.quote_spec_col,
        layout.quote_qty_col,
        layout.unit_price_col,
        layout.total_col,
    ]
    if layout.indonesian_name_col:
        quote_cols.append(layout.indonesian_name_col)
    if layout.satuan_col:
        quote_cols.append(layout.satuan_col)
    if layout.brand_col:
        quote_cols.append(layout.brand_col)

    hits: list[str] = []
    for col in quote_cols:
        value = ws.cell(row=row, column=col).value
        text = str(value or "").strip()
        if text and quote_cell_looks_like_header_label(text):
            hits.append(text)
    return hits
