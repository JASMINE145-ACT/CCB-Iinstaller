"""Tests for description_english / indonesian_name on quotation query candidates."""
from __future__ import annotations

import unittest
from unittest.mock import patch

import inventory.services.wanding_fuzzy_matcher as wanding_fuzzy_matcher  # noqa: F401 — load for patch

from inventory.services.match_and_inventory import (
    _merge_candidates_by_code,
    enrich_quotation_candidate,
)


class TestQuotationEnglishEnrich(unittest.TestCase):
    def test_merge_preserves_description_english_from_wanding(self) -> None:
        mapping = [{"code": "801", "matched_name": "直接", "unit_price": 1.0}]
        wanding = [
            {
                "code": "801",
                "matched_name": "直接管",
                "unit_price": 2.0,
                "description_english": "Elbow PVC-U dn50",
            }
        ]
        merged = _merge_candidates_by_code(mapping, wanding)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["description_english"], "Elbow PVC-U dn50")
        self.assertEqual(merged[0]["source"], "共同")

    @patch.object(wanding_fuzzy_matcher, "get_wanding_price_by_code")
    def test_enrich_looks_up_english_by_code(self, mock_lookup) -> None:
        mock_lookup.return_value = {
            "code": "801",
            "matched_name": "直接",
            "unit_price": 3.5,
            "description_english": "Pipe PVC-U dn50",
        }
        out = enrich_quotation_candidate({"code": "801", "matched_name": "直接"})
        self.assertEqual(out["description_english"], "Pipe PVC-U dn50")
        self.assertEqual(out["indonesian_name"], "Pipe PVC-U dn50")
        mock_lookup.assert_called_once()

    def test_enrich_keeps_existing_english_without_lookup(self) -> None:
        with patch.object(wanding_fuzzy_matcher, "get_wanding_price_by_code") as mock_lookup:
            out = enrich_quotation_candidate(
                {
                    "code": "801",
                    "matched_name": "直接",
                    "description_english": "Tee PVC-U dn40",
                }
            )
            self.assertEqual(out["indonesian_name"], "Tee PVC-U dn40")
            mock_lookup.assert_not_called()


if __name__ == "__main__":
    unittest.main()
