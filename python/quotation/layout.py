"""Quotation template layout dataclass and standard column maps."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class QuotationTemplateLayout:
    """报价单模板列布局（1-based 列号）。"""
    template_id: str
    header_scan_rows: int
    data_start_row: int
    inquiry_name_col: int
    inquiry_spec_col: int
    inquiry_qty_col: int
    inquiry_seq_col: int
    product_no_col: int
    quote_name_col: int
    quote_spec_col: int
    quote_qty_col: int
    unit_price_col: int
    total_col: int
    totals_value_col: int
    quote_date_value_col: int | None = None
    indonesian_name_col: int | None = None
    satuan_col: int | None = None
    brand_col: int | None = None
    inquiry_unit_col: int | None = None


LINGWEI_LAYOUT = QuotationTemplateLayout(
    template_id="lingwei",
    header_scan_rows=3,
    data_start_row=2,
    inquiry_name_col=2,
    inquiry_spec_col=3,
    inquiry_qty_col=5,
    inquiry_seq_col=1,
    product_no_col=7,
    quote_name_col=8,
    quote_spec_col=10,
    quote_qty_col=12,
    unit_price_col=14,
    total_col=15,
    totals_value_col=15,
    inquiry_unit_col=4,
)

VANTSING_LAYOUT = QuotationTemplateLayout(
    template_id="vantsing",
    header_scan_rows=10,
    data_start_row=8,
    inquiry_name_col=2,
    inquiry_spec_col=3,
    inquiry_qty_col=5,
    inquiry_seq_col=1,
    product_no_col=6,
    quote_name_col=7,
    quote_spec_col=9,
    quote_qty_col=11,
    unit_price_col=13,
    total_col=14,
    totals_value_col=14,
    quote_date_value_col=11,
    indonesian_name_col=8,
    satuan_col=10,
    brand_col=12,
    inquiry_unit_col=4,
)
