"""Regression: match_quotation_union candidates[0] — source priority over fuzzy bonus (07-06)."""
from __future__ import annotations

import pytest

from inventory.services.match_and_inventory import match_quotation_union


@pytest.mark.parametrize(
    ("keywords", "expected_code"),
    [
        ("PVC线管 20", "8030050068"),
        ("PVC直接 20", "8030020288"),
    ],
)
def test_quotation_union_top_candidate_source_rank(keywords: str, expected_code: str) -> None:
    """P1: 共同 > 历史 > 字段 — fixes row 8–9 without category/history dampening."""
    candidates = match_quotation_union(keywords, customer_level="B")
    assert candidates, f"no candidates for {keywords!r}"
    top = candidates[0]
    assert top["code"] == expected_code, (
        f"{keywords!r}: expected {expected_code}, got {top['code']} "
        f"(source={top.get('source')!r}) among "
        f"{[(c['code'], c.get('source')) for c in candidates[:6]]}"
    )


@pytest.mark.xfail(
    reason="8030020808 is 字段匹配 only; wrong SKUs are 历史报价 — needs P2/P3 (deferred)",
    strict=True,
)
def test_quotation_corrugated_row10_deferred() -> None:
    """Row 10 — not fixable by source-rank alone; user declined P2/P3."""
    keywords = "50卷波纹管 DN20"
    expected_code = "8030020808"
    candidates = match_quotation_union(keywords, customer_level="B")
    assert candidates
    assert candidates[0]["code"] == expected_code
