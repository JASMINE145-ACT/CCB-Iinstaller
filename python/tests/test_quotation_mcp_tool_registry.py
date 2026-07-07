"""Quotation MCP tool registry parity with Python tool_dispatch."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MCP_INDEX = REPO_ROOT / "mcp_servers" / "quotation-server" / "dist" / "index.js"

# Tools implemented in python/system/tool_dispatch.py and exposed via quotation MCP.
EXPECTED_MCP_TOOLS = frozenset({
    "match_quotation",
    "match_quotation_batch",
    "get_inventory_by_code",
    "get_inventory_by_code_batch",
    "fill_quotation_sheet",
    "parse_excel_smart",
    "ask_clarification",
    "append_business_rule",
    "append_quotation_mapping_pending",
    "get_product_price_tiers",
})


class TestQuotationMcpToolRegistry(unittest.TestCase):
    def test_mcp_index_lists_append_business_rule(self) -> None:
        self.assertTrue(MCP_INDEX.is_file(), f"missing MCP index: {MCP_INDEX}")
        text = MCP_INDEX.read_text(encoding="utf-8")
        names = set(re.findall(r'name:\s*"([a-z_]+)"', text))
        missing = EXPECTED_MCP_TOOLS - names
        self.assertFalse(
            missing,
            f"MCP index.js missing tools: {sorted(missing)}; found={sorted(names)}",
        )

    def test_fill_quotation_sheet_exposes_path_c_fill_items(self) -> None:
        text = MCP_INDEX.read_text(encoding="utf-8")
        fill_block = text.split('name: "fill_quotation_sheet"', 1)[1].split("name:", 1)[0]
        self.assertIn("fill_items", fill_block)
        self.assertIn("require_exact_codes", fill_block)
        self.assertNotIn('required: ["file_path"]', fill_block)


if __name__ == "__main__":
    unittest.main()
