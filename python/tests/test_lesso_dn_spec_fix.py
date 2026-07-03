"""Integration smoke for LESSO DN spec fixes (07-01-ppr-reducer-compound-spec-fix)."""
from __future__ import annotations

import pytest

from inventory.services.match_and_inventory import match_quotation_union


@pytest.mark.parametrize(
    ("keywords", "expected_code"),
    [
        ("LPPR Coupling 40 直接", "8010071380"),
        ("PPR 90 elbow 40 弯头", "8010071404"),
        ("PPR Reducing 40x32 大小头", "8010071450"),
        ("PPR Reducing 40x25 大小头", "8010071449"),
    ],
)
def test_lesso_dn_spec_fix_live_library(keywords: str, expected_code: str) -> None:
    candidates = match_quotation_union(keywords, customer_level="B")
    assert candidates, f"no candidates for {keywords!r}"
    assert candidates[0]["code"] == expected_code, (
        f"{keywords!r}: expected {expected_code}, got "
        f"{candidates[0]['code']} among {[c['code'] for c in candidates[:5]]}"
    )
