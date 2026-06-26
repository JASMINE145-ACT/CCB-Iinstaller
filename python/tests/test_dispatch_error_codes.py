"""Error-code normalization for the quotation MCP Python entrypoint."""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from admin.org_knowledge_payloads import build_append_business_rule_confirmation_payload  # noqa: E402
from admin.org_knowledge_dispatch import handle_append_business_rule  # noqa: E402
from quotation.excel_edit import _parse_cell_ref  # noqa: E402
from quotation.excel_io import ensure_writable  # noqa: E402
from quotation.fill_dispatch import handle_fill_quotation_sheet  # noqa: E402
from quotation.parse_dispatch import handle_parse_excel_smart  # noqa: E402
from quotation.selection_payloads import build_clarification_payload, handle_ask_clarification  # noqa: E402
from quotation.template_paths import (
    coerce_direct_fill_output_path,
    coerce_flow_fill_output_path,
    default_blank_template,
)  # noqa: E402
from quotation.tool_schema import get_quote_tools_openai_format  # noqa: E402
from quotation.tool_adapter import execute_quote_tool  # noqa: E402
from system.tool_dispatch import handle_request  # noqa: E402


class TestDispatchErrorCodes(unittest.TestCase):
    def test_append_business_rule_confirmation_payload_defaults_live_in_admin_module(self) -> None:
        result = build_append_business_rule_confirmation_payload("Use level B pricing", {})

        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(result["rule_text"], "Use level B pricing")
        self.assertEqual(result["section"], "business_rule_updates")

    def test_append_business_rule_unconfirmed_dispatch_delegates_payload(self) -> None:
        response = handle_request({
            "tool": "append_business_rule",
            "params": {"rule_text": "Use level B pricing"},
        })

        self.assertTrue(response["success"])
        self.assertTrue(response["result"]["requires_confirmation"])
        self.assertEqual(response["result"]["section"], "business_rule_updates")

    def test_append_business_rule_business_dispatch_accepts_aliases(self) -> None:
        result = handle_append_business_rule({"rule": "Use level B pricing", "confirm": False})

        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(result["rule_text"], "Use level B pricing")

    def test_default_blank_template_prefers_wanding_data_dir(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            template = Path(tmp) / "空白标准报价单.xlsx"
            template.touch()
            with patch.dict(os.environ, {"WANDING_DATA_DIR": tmp}, clear=False):
                self.assertEqual(default_blank_template(), str(template))

    def test_direct_fill_output_path_requires_workspace(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            coerce_direct_fill_output_path(None)

        self.assertIn("workspace_path", str(ctx.exception))

    def test_flow_fill_output_path_uses_source_stem(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = coerce_flow_fill_output_path("D:\\tmp\\quote.xlsx", None, tmp)

        self.assertTrue(result.endswith("quote_filled.xlsx"))

    def test_clarification_payload_defaults_live_in_business_module(self) -> None:
        result = build_clarification_payload({})

        self.assertIn("question", result)
        self.assertEqual(result["options"][0]["id"], "pvc_water_supply")
        self.assertEqual(result["options"][-1]["id"], "other")

    def test_ask_clarification_dispatch_delegates_payload(self) -> None:
        response = handle_request({"tool": "ask_clarification", "params": {"question": "Which PVC type?"}})

        self.assertTrue(response["success"])
        self.assertEqual(response["result"]["question"], "Which PVC type?")
        self.assertEqual(response["result"]["options"][0]["id"], "pvc_water_supply")

    def test_ask_clarification_business_dispatch_delegates_payload(self) -> None:
        result = handle_ask_clarification({"question": "Which PVC type?"})

        self.assertEqual(result["question"], "Which PVC type?")
        self.assertEqual(result["options"][0]["id"], "pvc_water_supply")

    def test_missing_required_param_has_invalid_input_code(self) -> None:
        response = handle_request({"tool": "match_quotation", "params": {}})

        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "INVALID_INPUT")
        self.assertIn("Missing required parameter", response["error"])

    @patch("inventory.services.match_and_inventory.match_quotation_union")
    def test_unmatched_selection_payload_has_no_data_code(self, mock_match) -> None:
        mock_match.return_value = []

        response = handle_request({"tool": "match_quotation", "params": {"keywords": "不存在XYZ999"}})

        self.assertTrue(response["success"])
        result = response["result"]
        self.assertTrue(result["unmatched"])
        self.assertEqual(result["error_code"], "NO_DATA")

    @patch("inventory.services.match_and_inventory.match_quotation_union")
    def test_multi_candidate_selection_payload_has_ambiguous_code(self, mock_match) -> None:
        mock_match.return_value = [
            {"code": "A", "matched_name": "直接 50 A", "unit_price": 1},
            {"code": "B", "matched_name": "直接 50 B", "unit_price": 2},
        ]

        response = handle_request({"tool": "match_quotation", "params": {"keywords": "直接50"}})

        self.assertTrue(response["success"])
        result = response["result"]
        self.assertTrue(result["needs_selection"])
        self.assertEqual(result["error_code"], "AMBIGUOUS_MATCH")

    @patch("inventory.services.match_and_inventory.match_quotation_union")
    def test_default_selection_payload_returns_up_to_ten_candidates(self, mock_match) -> None:
        mock_match.return_value = [
            {"code": f"C{i:02d}", "matched_name": f"item {i}", "unit_price": i}
            for i in range(1, 13)
        ]

        response = handle_request({"tool": "match_quotation", "params": {"keywords": "直接50"}})

        self.assertTrue(response["success"])
        result = response["result"]
        self.assertEqual(result["candidate_count"], 12)
        self.assertEqual(result["candidates_returned"], 10)
        self.assertTrue(result["candidates_truncated"])
        self.assertEqual(len(result["candidates"]), 10)
        self.assertEqual(result["candidates"][0]["code"], "C01")
        self.assertEqual(result["candidates"][-1]["code"], "C10")

    def test_inner_tool_failure_is_normalized(self) -> None:
        response = handle_request({
            "tool": "parse_excel_smart",
            "params": {"file_path": "D:\\tmp\\__missing__.xlsx"},
        })

        self.assertTrue(response["success"])
        result = response["result"]
        self.assertFalse(result["success"])
        self.assertEqual(result["error_code"], "FILE_NOT_FOUND")

    @patch("quotation.quote_tools.parse_excel_smart")
    def test_parse_business_dispatch_accepts_excel_path_alias(self, mock_parse) -> None:
        mock_parse.return_value = {"success": True, "rows_read": 1}

        result = handle_parse_excel_smart({"excel_path": "D:\\tmp\\quote.xlsx", "max_rows": 25})

        self.assertTrue(result["success"])
        mock_parse.assert_called_once_with(
            file_path="D:\\tmp\\quote.xlsx",
            sheet_name=None,
            max_rows=25,
        )

    @patch("quotation.tool_adapter.parse_excel_smart")
    def test_quote_tool_adapter_executes_parse_tool(self, mock_parse) -> None:
        mock_parse.return_value = {"success": True, "result": "rows", "rows_read": 2}

        result = execute_quote_tool("parse_excel_smart", {"file_path": "D:\\tmp\\quote.xlsx", "max_rows": "2"})

        self.assertTrue(result["success"])
        self.assertEqual(result["rows_read"], 2)
        mock_parse.assert_called_once_with(
            file_path="D:\\tmp\\quote.xlsx",
            sheet_name=None,
            max_rows=2,
        )

    def test_quote_tool_schema_lives_in_adapter_module(self) -> None:
        names = {
            tool["function"]["name"]
            for tool in get_quote_tools_openai_format()
            if tool.get("type") == "function"
        }

        self.assertIn("parse_excel_smart", names)
        self.assertIn("fill_quotation_sheet", names)
        self.assertIn("edit_excel", names)

    def test_excel_edit_cell_ref_parser_lives_in_excel_edit_module(self) -> None:
        self.assertEqual(_parse_cell_ref("B12"), (12, 2))
        self.assertIsNone(_parse_cell_ref("12B"))

    def test_excel_io_ensure_writable_accepts_existing_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "quote.xlsx"
            path.write_text("x", encoding="utf-8")

            ensure_writable(path)

            self.assertTrue(path.exists())

    def test_confirmed_fill_requires_fill_items(self) -> None:
        response = handle_request({
            "tool": "fill_quotation_sheet",
            "params": {
                "file_path": "D:\\tmp\\quote.xlsx",
                "require_exact_codes": True,
            },
        })

        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "INVALID_INPUT")
        self.assertIn("fill_items", response["error"])
        self.assertIn("rematching is invalid", response["error"])

    def test_fill_business_dispatch_requires_items_when_confirmed(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            handle_fill_quotation_sheet({"file_path": "D:\\tmp\\quote.xlsx", "confirmed": True})

        self.assertIn("fill_items", str(ctx.exception))

    def test_confirmed_fill_items_require_code(self) -> None:
        response = handle_request({
            "tool": "fill_quotation_sheet",
            "params": {
                "require_exact_codes": True,
                "fill_items": [{"row": 8, "keywords": "sealtape", "qty": 200}],
            },
        })

        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "INVALID_INPUT")
        self.assertIn("code/product_code", response["error"])

    def test_fill_default_output_requires_workspace(self) -> None:
        response = handle_request({
            "tool": "fill_quotation_sheet",
            "params": {
                "fill_items": [{"row": 8, "code": "8010062288", "quote_name": "PPR hot pipe", "unit_price": 1, "qty": 1}],
            },
        })

        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "INVALID_INPUT")
        self.assertIn("workspace_path", response["error"])

    def test_fill_items_normalize_unmatched_code(self) -> None:
        from quotation.fill_items import normalize_fill_items

        items = normalize_fill_items(
            [{"row": 8, "code": "UNMATCHED_TRIANGLE_VA", "quote_name": "三角阀", "unit_price": 0, "qty": 1}],
            require_exact_codes=True,
        )
        self.assertEqual(items[0]["code"], "无货")

    @patch("quotation.quote_tools.fill_quotation")
    def test_fill_header_row_returns_invalid_input(self, mock_fill) -> None:
        mock_fill.side_effect = ValueError(
            "fill_items row 7 is in the header area for template 'vantsing'; "
            "data rows start at Excel row 8."
        )
        response = handle_request({
            "tool": "fill_quotation_sheet",
            "params": {
                "file_path": "D:\\tmp\\quote.xlsx",
                "output_path": "D:\\tmp\\out.xlsx",
                "fill_items": [{"row": 7, "code": "无货", "quote_name": "三角阀", "unit_price": 0, "qty": 1}],
            },
        })

        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "INVALID_INPUT")
        self.assertIn("header area", response["error"])


if __name__ == "__main__":
    unittest.main()
