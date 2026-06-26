"""Row guards for fill_quotation_sheet."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

import openpyxl  # noqa: E402

from quotation.fill_row_guard import (  # noqa: E402
    find_header_labels_in_quote_row,
    normalize_unmatched_product_code,
    quote_cell_looks_like_header_label,
    validate_and_fix_fill_rows,
)
from quotation.layout import VANTSING_LAYOUT  # noqa: E402
from quotation.quote_tools import (  # noqa: E402
    _detect_quotation_layout,
    extract_inquiry_items,
    fill_quotation,
    fill_template_with_inquiry_items,
)


class TestNormalizeUnmatchedCode(unittest.TestCase):
    def test_unmatched_prefix_maps_to_wuhuo(self) -> None:
        self.assertEqual(normalize_unmatched_product_code("UNMATCHED_TRIANGLE_VA"), "无货")
        self.assertEqual(normalize_unmatched_product_code("unmatched_foo"), "无货")

    def test_real_code_unchanged(self) -> None:
        self.assertEqual(normalize_unmatched_product_code("8010071492"), "8010071492")
        self.assertEqual(normalize_unmatched_product_code("无货"), "无货")


class TestValidateAndFixFillRows(unittest.TestCase):
    def test_remaps_list_indices_starting_at_one(self) -> None:
        items = [
            {"row": 1, "code": "8010000001"},
            {"row": 2, "code": "8010000002"},
            {"row": 3, "code": "8010000003"},
        ]
        fixed = validate_and_fix_fill_rows(items, VANTSING_LAYOUT)
        self.assertEqual([it["row"] for it in fixed], [8, 9, 10])

    def test_does_not_remap_off_by_one_header_row(self) -> None:
        items = [{"row": 7, "code": "8010000001"}]
        with self.assertRaises(ValueError):
            validate_and_fix_fill_rows(items, VANTSING_LAYOUT)

    def test_rejects_header_row_seven(self) -> None:
        items = [{"row": 7, "code": "UNMATCHED_TRIANGLE_VA", "quote_name": "三角阀"}]
        with self.assertRaises(ValueError) as ctx:
            validate_and_fix_fill_rows(items, VANTSING_LAYOUT)
        self.assertIn("row 7", str(ctx.exception))
        self.assertIn("header area", str(ctx.exception))

    def test_keeps_valid_vantsing_rows(self) -> None:
        items = [{"row": 8, "code": "8010000001"}, {"row": 9, "code": "8010000002"}]
        fixed = validate_and_fix_fill_rows(items, VANTSING_LAYOUT)
        self.assertEqual([it["row"] for it in fixed], [8, 9])


class TestFillQuotationRowGuardIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        data_dir = PYTHON_ROOT.parent / "data"
        matches = [p for p in data_dir.glob("*.xlsx") if "空白" in p.name]
        if not matches:
            raise unittest.SkipTest("blank VANTSING template xlsx not found under data/")
        cls.blank_template = matches[0]

    def test_fill_row_seven_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / "quote.xlsx"
            inquiry = fill_template_with_inquiry_items(
                str(self.blank_template),
                [{"product_name": "三角阀", "specification": "20内丝", "qty": 15}],
                str(work),
            )
            self.assertTrue(inquiry.get("success"))

            ext = extract_inquiry_items(str(work))
            self.assertTrue(ext.get("success"))
            target_row = ext["items"][0]["row"]

            bad_row = target_row - 1
            result = fill_quotation(
                str(work),
                [
                    {
                        "row": bad_row,
                        "code": "无货",
                        "quote_name": "三角阀 20内丝",
                        "unit_price": 0,
                        "qty": 15,
                        "specification": "20内丝",
                    }
                ],
                output_path=str(Path(tmp) / "filled.xlsx"),
            )
            self.assertFalse(result["success"])
            self.assertIn("header area", result.get("error", ""))

    def test_fill_correct_row_no_header_labels_in_quote_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / "quote.xlsx"
            inquiry = fill_template_with_inquiry_items(
                str(self.blank_template),
                [{"product_name": "PVC排水管", "specification": "dn110", "qty": 70}],
                str(work),
            )
            self.assertTrue(inquiry.get("success"))

            ext = extract_inquiry_items(str(work))
            row = ext["items"][0]["row"]
            out = Path(tmp) / "filled.xlsx"
            result = fill_quotation(
                str(work),
                [
                    {
                        "row": row,
                        "code": "8020010018",
                        "quote_name": "PVC-U排水直管白色 dn110",
                        "unit_price": 161428,
                        "qty": 70,
                        "specification": "dn110",
                        "brand": "LESSO",
                        "satuan": "根",
                    }
                ],
                output_path=str(out),
            )
            self.assertTrue(result.get("success"), result.get("error"))

            wb = openpyxl.load_workbook(out, data_only=True)
            ws = wb.active
            layout = _detect_quotation_layout(ws)
            self.assertEqual(layout.template_id, "vantsing")
            header_hits = find_header_labels_in_quote_row(ws, row, layout)
            self.assertEqual(header_hits, [], f"header labels leaked: {header_hits}")
            self.assertEqual(str(ws.cell(row, layout.product_no_col).value), "8020010018")


class TestQuoteCellHeaderDetection(unittest.TestCase):
    def test_detects_chinese_header_literals(self) -> None:
        self.assertTrue(quote_cell_looks_like_header_label("数量"))
        self.assertTrue(quote_cell_looks_like_header_label("品牌"))
        self.assertFalse(quote_cell_looks_like_header_label("LESSO"))


if __name__ == "__main__":
    unittest.main()
