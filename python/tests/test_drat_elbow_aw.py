"""P0: Elbow drat = 丝扣弯头 / 螺纹弯头 (PT. JINSE row 10)."""
from __future__ import annotations

import pandas as pd
import pytest

from inventory.services.match_and_inventory import match_quotation_union
from inventory.services.wanding_fuzzy_matcher import (
    _hard_filter_and_bonus,
    _normalize,
    _query_ceiling_category,
    _split_tokens,
    _thread_gender,
    search_fuzzy,
)

DRAT_ELBOW_ROWS = [
    {
        "Material": "8010024875",
        "Describrition": '内螺纹弯头印尼(日标)PVC-U管件(AW给水系列)灰色 DN16 (1/2") 联塑',
        "Describrition_English": 'dn16 Faucet Elbow(PVC-U AW) Grey - LESSO',
        "Product_Type": "JIS PVC-U Fitting (AW)",
        "unit_price": 1487.0,
    },
    {
        "Material": "8010024350",
        "Describrition": '90°弯头印尼(日标)PVC-U管件(AW给水系列)灰色 DN16 (1/2") 联塑',
        "Describrition_English": 'dn16 90° Elbow(PVC-U AW) Grey - LESSO',
        "Product_Type": "JIS PVC-U Fitting (AW)",
        "unit_price": 1394.0,
    },
    {
        "Material": "8010024438",
        "Describrition": '45°弯头印尼(日标)PVC-U管件(AW给水系列)灰色 DN16 (1/2") 联塑',
        "Describrition_English": 'dn16 45° Elbow(PVC-U AW) Grey - LESSO',
        "Product_Type": "JIS PVC-U Fitting (AW)",
        "unit_price": 1394.0,
    },
]


def _build_df() -> pd.DataFrame:
    df = pd.DataFrame(DRAT_ELBOW_ROWS)
    df["norm_text"] = df["Describrition"].apply(_normalize)
    df["spec_tokens"] = df["Describrition"].apply(
        lambda value: frozenset(t for t in _split_tokens(str(value)) if any(ch.isdigit() for ch in t))
    )
    return df


@pytest.mark.parametrize(
    "keywords",
    [
        'Elbow drat 1/2" AW',
        'Elbow drat ½" AW',
    ],
)
def test_drat_elbow_aw_fuzzy_prefers_faucet_elbow(keywords: str) -> None:
    codes = [row["code"] for row, _score in search_fuzzy(_build_df(), keywords)]
    assert codes, f"no candidates for {keywords!r}"
    assert codes[0] == "8010024875", f"{keywords!r}: expected 8010024875, got {codes}"


def test_drat_maps_to_female_thread_on_query() -> None:
    assert _thread_gender('Elbow drat 1/2" AW') == "female"


def test_stelldrat_not_thread_gender() -> None:
    assert _thread_gender("Stelldrat 8# 3M") is None
    assert _query_ceiling_category("Stelldrat 8# 3M") == "stelldrat"


def test_plain_elbow_rejected_when_query_has_drat_thread() -> None:
    keywords = 'Elbow drat 1/2" AW'
    plain = DRAT_ELBOW_ROWS[1]
    ok, _bonus = _hard_filter_and_bonus(
        keywords,
        plain["Describrition"],
        code=plain["Material"],
        product_type=plain["Product_Type"],
    )
    assert ok is False


def test_faucet_elbow_passes_when_query_has_drat_thread() -> None:
    keywords = 'Elbow drat 1/2" AW'
    threaded = DRAT_ELBOW_ROWS[0]
    ok, bonus = _hard_filter_and_bonus(
        keywords,
        threaded["Describrition"],
        code=threaded["Material"],
        product_type=threaded["Product_Type"],
    )
    assert ok is True
    assert bonus > 0


@pytest.mark.parametrize(
    "keywords",
    [
        'Elbow drat 1/2" AW',
        'Elbow drat ½" AW',
    ],
)
def test_match_quotation_union_drat_elbow_live(keywords: str) -> None:
    candidates = match_quotation_union(keywords, customer_level="B")
    codes = [c["code"] for c in candidates]
    if "8010024875" not in codes:
        pytest.skip("live price library missing 8010024875")
    assert candidates[0]["code"] == "8010024875", (
        f"{keywords!r}: expected 8010024875, got {[(c['code'], c.get('source')) for c in candidates[:5]]}"
    )
