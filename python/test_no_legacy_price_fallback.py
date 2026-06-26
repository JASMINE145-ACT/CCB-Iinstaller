"""Ensure matcher never falls back to wanding_price_lib.xlsx when new library is missing."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from inventory.config import DATA_DIR, config
from inventory.services import wanding_fuzzy_matcher as matcher


class NoLegacyPriceFallbackTest(unittest.TestCase):
    def setUp(self) -> None:
        matcher.invalidate_wanding_cache()

    def tearDown(self) -> None:
        matcher.invalidate_wanding_cache()

    def test_missing_new_library_does_not_use_legacy(self) -> None:
        missing = Path(DATA_DIR) / "__missing_price_library__.xlsx"
        legacy = PYTHON_ROOT.parent / "data" / "wanding_price_lib.xlsx"
        if not legacy.exists():
            self.skipTest("legacy fixture not present")

        with patch.object(config, "PRICE_LIBRARY_PATH", str(missing)):
            with patch.object(config, "LEGACY_PRICE_LIBRARY_PATH", str(legacy)):
                df = matcher._get_cached_df(missing, "B")
                self.assertTrue(df.empty, "must not load legacy when new path is missing")

                cands = matcher.match_fuzzy_candidates(
                    "PE管 pipe 125mm/6m",
                    customer_level="B",
                    price_library_path=str(missing),
                )
                self.assertEqual(cands, [])


if __name__ == "__main__":
    unittest.main()
