"""Batch inventory payload shape for get_inventory_by_code_batch."""
from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

fake_table_agent_module = types.ModuleType("inventory.agents.table_agent")
fake_table_agent_module.InventoryTableAgent = MagicMock(name="InventoryTableAgent")
sys.modules.setdefault("inventory.agents.table_agent", fake_table_agent_module)

from inventory.services.inventory_payloads import (  # noqa: E402
    build_inventory_by_code_batch_payload,
    build_search_inventory_payload,
)
from inventory.services.inventory_dispatch import handle_get_inventory_by_code_batch  # noqa: E402
from system.tool_dispatch import handle_request  # noqa: E402


def _item(code: str, name: str, qty_av: float, qty_wh: float) -> SimpleNamespace:
    return SimpleNamespace(
        code=code,
        name=name,
        qty_available=qty_av,
        qty_warehouse=qty_wh,
        unit="PCS",
    )


class TestInventoryBatchPayload(unittest.TestCase):
    def test_build_payload_stats_and_formatted_response(self) -> None:
        mock_table = MagicMock()
        mock_table.get_items_by_codes.return_value = [
            _item("8020020755", "Sock 50mm", 0.0, 0.0),
            _item("8020022784", "Tee D", 0.0, 156.0),
        ]

        with patch.object(fake_table_agent_module, "InventoryTableAgent", return_value=mock_table):
            result = build_inventory_by_code_batch_payload(
                ["8020020755", "8020022784", "MISSING"],
            )

        self.assertEqual(result["stats"]["found"], 2)
        self.assertEqual(result["stats"]["not_found"], 1)
        self.assertEqual(result["stats"]["input_count"], 3)
        self.assertFalse(result["stats"]["truncated"])
        self.assertEqual(len(result["items"]), 3)
        self.assertIsNotNone(result["items"][0]["item"])
        self.assertEqual(result["items"][2]["error_code"], "NO_DATA")
        self.assertIn("8020020755", result["formatted_response"])
        self.assertIn("Sock 50mm", result["formatted_response"])

    def test_build_payload_truncation_stats(self) -> None:
        mock_table = MagicMock()
        mock_table.get_items_by_codes.return_value = []

        codes = [f"C{i:03d}" for i in range(52)]
        with patch.object(fake_table_agent_module, "InventoryTableAgent", return_value=mock_table):
            result = build_inventory_by_code_batch_payload(codes[:50], input_total=len(codes))

        stats = result["stats"]
        self.assertTrue(stats["truncated"])
        self.assertEqual(stats["input_total"], 52)
        self.assertEqual(stats["input_count"], 50)
        self.assertIn("仅处理前 50 条", result["formatted_response"])

    def test_handle_request_returns_object_not_array(self) -> None:
        mock_table = MagicMock()
        mock_table.get_items_by_codes.return_value = [_item("8020020755", "Sock", 1.0, 2.0)]

        with patch.object(fake_table_agent_module, "InventoryTableAgent", return_value=mock_table):
            response = handle_request({
                "tool": "get_inventory_by_code_batch",
                "params": {"codes": ["8020020755"]},
            })

        self.assertTrue(response["success"])
        result = response["result"]
        self.assertIsInstance(result, dict)
        self.assertIn("formatted_response", result)
        self.assertIn("stats", result)

    def test_business_inventory_batch_dispatch_accepts_nested_codes(self) -> None:
        mock_table = MagicMock()
        mock_table.get_items_by_codes.return_value = [_item("8020020755", "Sock", 1.0, 2.0)]

        with patch.object(fake_table_agent_module, "InventoryTableAgent", return_value=mock_table):
            result = handle_get_inventory_by_code_batch({"items": [{"sku": "8020020755"}]})

        self.assertEqual(result["stats"]["found"], 1)
        mock_table.get_items_by_codes.assert_called_once_with(["8020020755"])

    def test_search_payload_empty_marks_no_data_without_credentials(self) -> None:
        with patch.dict("os.environ", {"AOL_ACCESS_TOKEN": ""}, clear=False):
            result = build_search_inventory_payload("missing", [])

        self.assertFalse(result["found"])
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["error_code"], "NO_DATA")
        self.assertIn("inventory_unavailable", result)

    def test_search_payload_found_items(self) -> None:
        result = build_search_inventory_payload("sock", [_item("8020020755", "Sock", 1.0, 2.0)])

        self.assertTrue(result["found"])
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["items"][0]["code"], "8020020755")
        self.assertNotIn("error_code", result)


if __name__ == "__main__":
    unittest.main()
