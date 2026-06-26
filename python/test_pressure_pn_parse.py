"""PN ↔ MPa pressure parse must match _apply_pressure_expansion."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from inventory.services.wanding_fuzzy_matcher import (
    _apply_pressure_expansion,
    _extract_query_pressure,
    _normalize,
    match_fuzzy_candidates,
)
from inventory.config import config


class PressurePnParseTest(unittest.TestCase):
    def test_pn_to_mpa_inverse_of_expansion(self) -> None:
        cases = [
            ("PN6", 0.6),
            ("PN8", 0.8),
            ("PN10", 1.0),
            ("PN12.5", 1.25),
            ("PN16", 1.6),
            ("PN20", 2.0),
            ("PN25", 2.5),
        ]
        for pn, expected_mpa in cases:
            with self.subTest(pn=pn):
                self.assertAlmostEqual(
                    _extract_query_pressure(_normalize(pn)),
                    expected_mpa,
                )

    def test_mpa_expansion_then_extract_stays_consistent(self) -> None:
        for mpa in ("0.6", "0.8", "1.0", "1.25", "1.6", "2.0", "2.5"):
            with self.subTest(mpa=mpa):
                expanded = _apply_pressure_expansion(f"HDPE {mpa}MPa dn125 6M")
                norm = _normalize(expanded)
                self.assertAlmostEqual(
                    _extract_query_pressure(norm),
                    float(mpa),
                    places=4,
                )

    def test_hdpe_06mpa_dn125_matches_product(self) -> None:
        if not Path(config.PRICE_LIBRARY_PATH).is_file():
            self.skipTest("price library not available")
        cands = match_fuzzy_candidates(
            "HDPE 0.6MPa dn125 6M",
            customer_level="B",
            price_library_path=config.PRICE_LIBRARY_PATH,
            max_score_tiers=2,
        )
        codes = [c.get("code") for c in cands]
        self.assertIn("8010036693", codes)
        self.assertNotIn("8010036709", codes)


if __name__ == "__main__":
    unittest.main()
