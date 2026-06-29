"""Tests for get_product_price_tiers."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from quotation.price_tiers import (  # noqa: E402
    DATA_MD_VENDOR_PATH,
    TIER_GUIDE_SUMMARY,
    _merge_tier_lists,
    _should_supplement_tiers,
    _tiers_from_product_dict,
    get_product_price_tiers,
)

SAMPLE_PRODUCT = {
    "material_code": "10012005*",
    "description": "RUCIKA pipe 50mm",
    "product_type": "RUCIKA JIS",
    "factory_inc_tax": 63008.0,
    "price_b": 66757.0,
    "price_d": 70929.0,
    "price_a": 65000.0,
}


class TestPriceTiers(unittest.TestCase):
    def test_tiers_from_product_dict_skips_zero(self) -> None:
        tiers = _tiers_from_product_dict(SAMPLE_PRODUCT)
        fields = {t["field"] for t in tiers}
        self.assertIn("price_b", fields)
        self.assertIn("price_d", fields)
        self.assertIn("factory_inc_tax", fields)
        self.assertNotIn("price_c", fields)

    def test_org_lookup_returns_tiers(self) -> None:
        org_payload = {
            "source": "org_api",
            "stale": False,
            "version_number": 2,
            "products": [SAMPLE_PRODUCT],
        }
        with patch("admin.org_price_client.get_price_data", return_value=org_payload):
            result = get_product_price_tiers("10012005*")

        self.assertEqual(result["material_code"], "10012005*")
        self.assertGreaterEqual(result["tier_count"], 3)
        self.assertEqual(result["price_source"], "org_api")
        self.assertIn("tier_guide_summary", result)
        self.assertIn("data_md_path", result)
        self.assertEqual(result["data_md_path"], DATA_MD_VENDOR_PATH)
        self.assertIn("必须先 Read", result["tier_guide_summary"])
        self.assertNotIn("青山价", result["tier_guide_summary"])

    def test_dispatch_requires_code(self) -> None:
        from system.tool_dispatch import handle_request

        response = handle_request({"tool": "get_product_price_tiers", "params": {}})
        self.assertFalse(response["success"])
        self.assertIn("code", response["error"])

    def test_dispatch_delegates(self) -> None:
        from system.tool_dispatch import handle_request

        org_payload = {
            "source": "org_api",
            "stale": False,
            "products": [SAMPLE_PRODUCT],
        }
        with patch("admin.org_price_client.get_price_data", return_value=org_payload):
            response = handle_request({
                "tool": "get_product_price_tiers",
                "params": {"code": "10012005*"},
            })

        self.assertTrue(response["success"])
        self.assertGreaterEqual(response["result"]["tier_count"], 1)

    def test_should_supplement_bundled_seed(self) -> None:
        self.assertTrue(_should_supplement_tiers("bundled_seed", 5))
        self.assertTrue(_should_supplement_tiers("lkg_snapshot", 3))
        self.assertTrue(_should_supplement_tiers("org_api", 1))
        self.assertFalse(_should_supplement_tiers("org_api", 4))

    def test_merge_tier_lists_prefers_primary(self) -> None:
        primary = [{"field": "price_b", "label": "B", "price": 100.0}]
        supplemental = [
            {"field": "price_b", "label": "B", "price": 99.0},
            {"field": "price_d", "label": "D", "price": 200.0},
        ]
        merged = _merge_tier_lists(primary, supplemental)
        fields = {t["field"]: t["price"] for t in merged}
        self.assertEqual(fields["price_b"], 100.0)
        self.assertEqual(fields["price_d"], 200.0)

    def test_bundled_seed_supplements_from_local_xlsx(self) -> None:
        sparse_product = {
            "material_code": "8020020755",
            "description": "直通(管箍)PVC-U排水配件白色 dn50",
            "product_type": "国标",
            "price_b": 1519.0,
        }
        org_payload = {
            "source": "bundled_seed",
            "stale": True,
            "products": [sparse_product],
        }
        local_tiers = {
            "tiers": [
                {"field": "price_b", "label": "B档报单价", "price": 1519.0},
                {"field": "price_d", "label": "D档报单价", "price": 1400.0},
                {"field": "price_e", "label": "E档报单价", "price": 1300.0},
            ],
            "description": "直通(管箍)PVC-U排水配件白色 dn50",
            "product_type": "国标",
            "material_code": "8020020755",
        }
        with patch("admin.org_price_client.get_price_data", return_value=org_payload), \
             patch("quotation.price_tiers._lookup_local_tiers", return_value=local_tiers):
            result = get_product_price_tiers("8020020755")

        self.assertEqual(result["price_source"], "bundled_seed")
        self.assertGreaterEqual(result["tier_count"], 3)
        self.assertEqual(result.get("tier_supplemented_from"), "local_xlsx")
        fields = {t["field"] for t in result["tiers"]}
        self.assertIn("price_d", fields)
        self.assertIn("price_e", fields)


if __name__ == "__main__":
    unittest.main()
