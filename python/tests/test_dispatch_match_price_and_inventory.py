"""Dispatch routing for match_price_and_get_inventory MCP tool."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from quotation.selection_payloads import build_price_inventory_selection_payload  # noqa: E402
from quotation.match_dispatch import handle_match_price_and_get_inventory  # noqa: E402
from system.tool_dispatch import dispatch  # noqa: E402


class TestDispatchMatchPriceAndInventory(unittest.TestCase):
    @patch("inventory.services.match_and_inventory.match_price_and_get_inventory")
    def test_dispatch_single_result(self, mock_fn) -> None:
        mock_fn.return_value = {
            "code": "8010024360",
            "matched_name": "直接 50",
            "unit_price": 10.5,
            "available_qty": 100.0,
            "warehouse_qty": 120.0,
            "match_source": "共同",
        }
        result = dispatch("match_price_and_get_inventory", {"keywords": "直接50", "customer_level": "B"})
        self.assertEqual(result["code"], "8010024360")
        self.assertEqual(result["available_qty"], 100.0)
        mock_fn.assert_called_once_with("直接50", customer_level="B", price_library_path=None, product_type=None)

    @patch("inventory.services.match_and_inventory.match_price_and_get_inventory")
    def test_dispatch_unmatched(self, mock_fn) -> None:
        mock_fn.return_value = None
        result = dispatch("match_price_and_get_inventory", {"keywords": "不存在的产品"})
        self.assertTrue(result["unmatched"])
        self.assertFalse(result["found"])

    @patch("inventory.services.match_and_inventory.match_price_and_get_inventory")
    def test_dispatch_multi_candidate_selection(self, mock_fn) -> None:
        mock_fn.return_value = {
            "_needs_human_choice": True,
            "keywords": "直接50",
            "options": [
                {"code": "A", "matched_name": "opt1", "unit_price": 1, "source": "共同"},
            ],
        }
        result = dispatch("match_price_and_get_inventory", {"keywords": "直接50"})
        self.assertTrue(result.get("needs_selection"))
        self.assertTrue(result.get("price_and_inventory_mode"))
        self.assertEqual(result["candidate_count"], 1)

    def test_price_inventory_selection_payload_preserves_indonesian_fallback(self) -> None:
        result = build_price_inventory_selection_payload(
            "pipe",
            [
                {
                    "code": "A",
                    "matched_name": "opt1",
                    "unit_price": "2.5",
                    "source": "common",
                    "description_english": "English name",
                }
            ],
        )

        self.assertTrue(result["price_and_inventory_mode"])
        self.assertEqual(result["candidate_count"], 1)
        self.assertEqual(result["candidates"][0]["unit_price"], 2.5)
        self.assertEqual(result["candidates"][0]["indonesian_name"], "English name")

    @patch("inventory.services.match_and_inventory.match_price_and_get_inventory")
    def test_business_match_price_dispatch_directly(self, mock_fn) -> None:
        mock_fn.return_value = None
        result = handle_match_price_and_get_inventory({"keywords": "missing"})

        self.assertTrue(result["unmatched"])
        self.assertFalse(result["found"])
        mock_fn.assert_called_once_with("missing", customer_level="B", price_library_path=None, product_type=None)


if __name__ == "__main__":
    unittest.main()
