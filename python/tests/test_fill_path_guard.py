"""Tests for fill_quotation_sheet Path A vs Path C guards."""
from __future__ import annotations

import unittest
from unittest.mock import patch

from quotation.fill_dispatch import handle_fill_quotation_sheet
from quotation.fill_path_guard import guard_path_a_file_path, is_invented_file_path, resolve_direct_template_path


class TestFillPathGuard(unittest.TestCase):
    def test_invented_file_path_detects_blank_and_output_names(self) -> None:
        self.assertTrue(is_invented_file_path("blank"))
        self.assertTrue(is_invented_file_path("D:\\CCB-Wanding\\workspace\\Wanding-Quotation_20260628.xlsx"))
        self.assertFalse(is_invented_file_path("D:\\data\\inquiry.xlsx"))

    def test_guard_path_a_rejects_blank(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            guard_path_a_file_path({"file_path": "blank"})
        self.assertIn("Path C", str(ctx.exception))
        self.assertIn("fill_items", str(ctx.exception))

    def test_guard_path_a_requires_real_file_path(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            guard_path_a_file_path({})
        self.assertIn("file_path", str(ctx.exception))

    @patch("quotation.template_paths.default_blank_template", return_value="D:\\tpl\\空白标准报价单.xlsx")
    def test_resolve_direct_template_ignores_blank(self, _mock_tpl) -> None:
        path = resolve_direct_template_path({"file_path": "blank", "fill_items": [{"row": 8}]})
        self.assertEqual(path, "D:\\tpl\\空白标准报价单.xlsx")

    @patch("quotation.quote_tools.fill_quotation")
    @patch("quotation.template_paths.default_blank_template", return_value="D:\\tpl\\空白标准报价单.xlsx")
    def test_path_c_with_blank_file_path_uses_bundled_template(
        self, _mock_tpl, mock_fill
    ) -> None:
        mock_fill.return_value = {"success": True, "filled_count": 1}
        result = handle_fill_quotation_sheet({
            "file_path": "blank",
            "customer_level": "B",
            "output_path": "D:\\out\\q.xlsx",
            "fill_items": [{
                "row": 8,
                "code": "8020020755",
                "quote_name": "test",
                "unit_price": 100,
                "qty": 1,
                "inquiry_name": "直接50",
                "specification": "dn50",
            }],
            "require_exact_codes": True,
        })
        self.assertTrue(result["success"])
        self.assertEqual(mock_fill.call_args.kwargs["file_path"], "D:\\tpl\\空白标准报价单.xlsx")


if __name__ == "__main__":
    unittest.main()
