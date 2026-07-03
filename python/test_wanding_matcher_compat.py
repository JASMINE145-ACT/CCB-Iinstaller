from __future__ import annotations

import pandas as pd

from inventory.services.match_and_inventory import _rank_compatible_candidates
from inventory.services.wanding_fuzzy_matcher import _normalize, _split_tokens, search_fuzzy


ROWS = [
    {
        "Material": "PPR-PIPE-50",
        "Describrition": "PPR hot water pipe DN50 PN20 4m/pcs",
        "Describrition_English": "PPR hot water pipe",
        "Product_Type": "PPR pipe",
        "unit_price": 10.0,
    },
    {
        "Material": "PPR-ELBOW-50",
        "Describrition": "PPR elbow DN50",
        "Describrition_English": "PPR elbow",
        "Product_Type": "PPR fitting",
        "unit_price": 2.0,
    },
    {
        "Material": "PPR-VALVE-1-2",
        "Describrition": 'PPR stop valve 1/2"',
        "Describrition_English": "PPR stop valve",
        "Product_Type": "PPR valve",
        "unit_price": 3.0,
    },
    {
        "Material": "PPR-ANGLE-VALVE",
        "Describrition": "PPR angle valve DN20",
        "Describrition_English": "PPR angle valve",
        "Product_Type": "PPR valve",
        "unit_price": 3.5,
    },
    {
        "Material": "PPR-TRIANGLE-VALVE",
        "Describrition": "PPR triangle valve DN20",
        "Describrition_English": "PPR triangle valve",
        "Product_Type": "PPR valve",
        "unit_price": 3.6,
    },
    {
        "Material": "PPR-WELDER",
        "Describrition": "PPR welding machine 20-63mm",
        "Describrition_English": "PPR welding machine",
        "Product_Type": "tool",
        "unit_price": 30.0,
    },
    {
        "Material": "PVC-HOSE-20",
        "Describrition": "PVC flexible hose DN20",
        "Describrition_English": "PVC flexible hose",
        "Product_Type": "hose",
        "unit_price": 4.5,
    },
    {
        "Material": "PPR-ELBOW-90-40",
        "Describrition": "PPR 90 degree elbow DN40",
        "Describrition_English": "PPR 90 degree elbow",
        "Product_Type": "PPR fitting",
        "unit_price": 2.4,
    },
    {
        "Material": "PPR-ELBOW-45-40",
        "Describrition": "PPR 45 degree elbow DN40",
        "Describrition_English": "PPR 45 degree elbow",
        "Product_Type": "PPR fitting",
        "unit_price": 2.2,
    },
    {
        "Material": "PPR-TEE-EQUAL-32",
        "Describrition": "PPR tee DN32",
        "Describrition_English": "PPR equal tee DN32",
        "Product_Type": "PPR fitting",
        "unit_price": 2.8,
    },
    {
        "Material": "PPR-TEE-32X1-2",
        "Describrition": 'PPR female thread tee DN32x1/2"',
        "Describrition_English": 'PPR female thread tee DN32x1/2"',
        "Product_Type": "PPR fitting",
        "unit_price": 3.8,
    },
    {
        "Material": "PPR-TEE-32X3-4",
        "Describrition": 'PPR female thread tee DN32x3/4"',
        "Describrition_English": 'PPR female thread tee DN32x3/4"',
        "Product_Type": "PPR fitting",
        "unit_price": 4.8,
    },
    {
        "Material": "PVC-AW-50",
        "Describrition": "RUCIKA AW water supply PVC pipe DN50",
        "Describrition_English": "AW PVC water supply pipe",
        "Product_Type": "PVC water",
        "unit_price": 5.0,
    },
    {
        "Material": "PVC-D-75",
        "Describrition": "PVC D drainage pipe DN75",
        "Describrition_English": "PVC drainage pipe",
        "Product_Type": "PVC drain",
        "unit_price": 6.0,
    },
    {
        "Material": "PPR-COLD-20",
        "Describrition": "PPR cold water pipe DN20 PN10",
        "Describrition_English": "PPR cold water pipe",
        "Product_Type": "PPR cold",
        "unit_price": 7.0,
    },
    {
        "Material": "PPR-HOT-20",
        "Describrition": "PPR hot water pipe DN20 PN20",
        "Describrition_English": "PPR hot water pipe",
        "Product_Type": "PPR hot",
        "unit_price": 8.0,
    },
    {
        "Material": "PE-PIPE-100",
        "Describrition": "HDPE water supply pipe DN100 PN16",
        "Describrition_English": "HDPE water supply pipe",
        "Product_Type": "PE pipe",
        "unit_price": 11.0,
    },
    {
        "Material": "PE-EF-100",
        "Describrition": "HDPE electrofusion coupling DN100 PN16",
        "Describrition_English": "HDPE electrofusion coupling",
        "Product_Type": "PE electrofusion fitting",
        "unit_price": 12.0,
    },
    {
        "Material": "PVC-GLUE-400",
        "Describrition": "PVC glue cement 400g",
        "Describrition_English": "PVC glue cement",
        "Product_Type": "PVC glue",
        "unit_price": 4.0,
    },
    {
        "Material": "PVC-PIPE-400",
        "Describrition": "PVC water supply pipe DN400",
        "Describrition_English": "PVC water supply pipe",
        "Product_Type": "PVC pipe",
        "unit_price": 40.0,
    },
    {
        "Material": "PVC-PIPE-10",
        "Describrition": "PVC D drainage pipe DN10",
        "Describrition_English": "PVC drainage pipe",
        "Product_Type": "PVC drain",
        "unit_price": 1.0,
    },
    {
        "Material": "PVC-PIPE-100",
        "Describrition": "PVC D drainage pipe DN100",
        "Describrition_English": "PVC drainage pipe",
        "Product_Type": "PVC drain",
        "unit_price": 9.0,
    },
]

LESSO_DN_ROWS = [
    {
        "Material": "LESSO-CPL-40",
        "Describrition": "直通(PPR 管件)印尼绿色 dn40 (1-1/4\") 联塑",
        "Describrition_English": "PPR Coupling dn40 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.1,
    },
    {
        "Material": "LESSO-CPL-50",
        "Describrition": "直通(PPR 管件)印尼绿色 dn50 (1-1/2\") 联塑",
        "Describrition_English": "PPR Coupling dn50 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.2,
    },
    {
        "Material": "LESSO-ELBOW-40",
        "Describrition": "90度弯头(PPR 管件)印尼绿色 dn40 (1-1/4\") 联塑",
        "Describrition_English": "PPR 90 elbow dn40 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.3,
    },
    {
        "Material": "LESSO-ELBOW-50",
        "Describrition": "90度弯头(PPR 管件)印尼绿色 dn50 (1-1/2\") 联塑",
        "Describrition_English": "PPR 90 elbow dn50 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.4,
    },
    {
        "Material": "LESSO-RED-40X32",
        "Describrition": "异径套(PPR 管件)印尼绿色 dn40x32 (1-1/4\"x1\") 联塑",
        "Describrition_English": "PPR Reducer dn40x32 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.5,
    },
    {
        "Material": "LESSO-RED-40X25",
        "Describrition": "异径套(PPR 管件)印尼绿色 dn40x25 (1-1/4\"x3/4\") 联塑",
        "Describrition_English": "PPR Reducer dn40x25 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.6,
    },
    {
        "Material": "LESSO-RED-40X20",
        "Describrition": "异径套(PPR 管件)印尼绿色 dn40x20 (1-1/4\"x1/2\") 联塑",
        "Describrition_English": "PPR Reducer dn40x20 Green(INA) - LESSO",
        "Product_Type": "PPR fitting",
        "unit_price": 1.7,
    },
]


def build_df() -> pd.DataFrame:
    df = pd.DataFrame(ROWS)
    df["norm_text"] = df["Describrition"].apply(_normalize)
    df["spec_tokens"] = df["Describrition"].apply(
        lambda value: frozenset(t for t in _split_tokens(str(value)) if any(ch.isdigit() for ch in t))
    )
    return df


def build_lesso_df() -> pd.DataFrame:
    df = pd.DataFrame(LESSO_DN_ROWS)
    df["norm_text"] = df["Describrition"].apply(_normalize)
    df["spec_tokens"] = df["Describrition"].apply(
        lambda value: frozenset(t for t in _split_tokens(str(value)) if any(ch.isdigit() for ch in t))
    )
    return df


def top_codes_on(df: pd.DataFrame, query: str) -> list[str]:
    return [row["code"] for row, _score in search_fuzzy(df, query)]


def top_codes(query: str) -> list[str]:
    return top_codes_on(build_df(), query)


def assert_top_on(df: pd.DataFrame, query: str, expected: str) -> None:
    codes = top_codes_on(df, query)
    assert codes, f"{query!r} returned no candidates"
    assert codes[0] == expected, f"{query!r}: expected {expected}, got {codes[:5]}"


def assert_absent_on(df: pd.DataFrame, query: str, unwanted: str) -> None:
    codes = top_codes_on(df, query)
    assert unwanted not in codes, f"{query!r}: unexpected {unwanted} in {codes[:5]}"


def assert_top(query: str, expected: str) -> None:
    assert_top_on(build_df(), query, expected)


def assert_absent(query: str, unwanted: str) -> None:
    codes = top_codes(query)
    assert unwanted not in codes, f"{query!r}: unexpected {unwanted} in {codes[:5]}"


def test_union_ranking_filters_incompatible_candidates() -> None:
    ranked = _rank_compatible_candidates(
        "PPR elbow DN50",
        [
            {"code": "PIPE", "matched_name": "PPR hot water pipe DN50", "source": "历史报价"},
            {"code": "ELBOW", "matched_name": "PPR 90 degree elbow DN50", "source": "字段匹配"},
        ],
    )
    assert [c["code"] for c in ranked] == ["ELBOW"]


def test_union_ranking_filters_compound_wrong_diameter() -> None:
    ranked = _rank_compatible_candidates(
        "PPR 45 degree elbow DN50",
        [
            {"code": "GOOD", "matched_name": "PPR 45 degree elbow dn50", "source": "字段匹配"},
            {"code": "WRONG", "matched_name": 'PPR female thread elbow dn63x2"', "source": "字段匹配"},
        ],
    )
    assert [c["code"] for c in ranked] == ["GOOD"]


def test_strict_category_without_valid_candidate_returns_empty() -> None:
    ranked = _rank_compatible_candidates(
        "PPR triangle valve DN20",
        [
            {"code": "PIPE", "matched_name": "PPR hot water pipe DN20", "source": "历史报价"},
            {"code": "ANGLE", "matched_name": "PPR angle valve DN20", "source": "历史报价"},
        ],
    )
    assert ranked == []


def test_ppr_fitting_not_pipe() -> None:
    assert_top("PPR elbow DN50", "PPR-ELBOW-50")
    assert_absent("PPR elbow DN50", "PPR-PIPE-50")


def test_valve_not_pipe_or_elbow() -> None:
    assert_top('PPR stop valve 1/2"', "PPR-VALVE-1-2")
    assert_absent('PPR stop valve 1/2"', "PPR-PIPE-50")
    assert_absent('PPR stop valve 1/2"', "PPR-ELBOW-50")


def test_special_products_do_not_fall_back_to_pipe() -> None:
    assert_top("PPR triangle valve DN20", "PPR-TRIANGLE-VALVE")
    assert_absent("PPR triangle valve DN20", "PPR-ANGLE-VALVE")
    assert_top("PPR welding machine", "PPR-WELDER")
    assert_absent("PPR welding machine", "PPR-HOT-20")
    assert_top("PVC flexible hose DN20", "PVC-HOSE-20")
    assert_absent("PVC flexible hose DN20", "PPR-HOT-20")


def test_elbow_angle_preference() -> None:
    assert_top("PPR elbow DN40", "PPR-ELBOW-90-40")
    assert_top("PPR 45 degree elbow DN40", "PPR-ELBOW-45-40")


def test_compound_main_sub_spec_is_enforced() -> None:
    assert_top("PPR 32*20 female thread tee", "PPR-TEE-32X1-2")
    assert_absent("PPR 32*20 female thread tee", "PPR-TEE-32X3-4")
    assert_absent("PPR 32*20 female thread tee", "PPR-TEE-EQUAL-32")


def test_equal_tee_preferred_when_no_reducer_requested() -> None:
    assert_top("PPR tee DN32", "PPR-TEE-EQUAL-32")


def test_pvc_water_and_drain_are_separate() -> None:
    assert_top("PVC drainage pipe DN75", "PVC-D-75")
    assert_absent("PVC drainage pipe DN75", "PVC-AW-50")
    assert_top("PVC water supply pipe DN50", "PVC-AW-50")
    assert_absent("PVC water supply pipe DN50", "PVC-D-75")


def test_diameter_100_does_not_collapse_to_10() -> None:
    assert_top("PVC drainage pipe DN100", "PVC-PIPE-100")
    assert_absent("PVC drainage pipe DN100", "PVC-PIPE-10")


def test_hot_and_cold_are_separate() -> None:
    assert_top("PPR hot water pipe DN20", "PPR-HOT-20")
    assert_absent("PPR hot water pipe DN20", "PPR-COLD-20")


def test_pe_electrofusion_default_is_excluded() -> None:
    assert_top("PE water supply pipe DN100", "PE-PIPE-100")
    assert_absent("PE water supply pipe DN100", "PE-EF-100")
    assert_top("PE electrofusion DN100", "PE-EF-100")


def test_glue_query_is_glue_only() -> None:
    assert_top("PVC glue 400g", "PVC-GLUE-400")
    assert_absent("PVC glue 400g", "PVC-PIPE-400")


def test_bare_dn_coupling_40_prefers_dn40_not_dn50() -> None:
    df = build_lesso_df()
    assert_top_on(df, "LPPR Coupling 40 直接", "LESSO-CPL-40")
    assert_absent_on(df, "LPPR Coupling 40 直接", "LESSO-CPL-50")


def test_bare_dn_elbow_40_prefers_dn40_not_dn50() -> None:
    df = build_lesso_df()
    assert_top_on(df, "PPR 90 elbow 40 弯头", "LESSO-ELBOW-40")
    assert_absent_on(df, "PPR 90 elbow 40 弯头", "LESSO-ELBOW-50")


def test_reducing_40x32_prefers_correct_lesso_reducer() -> None:
    df = build_lesso_df()
    assert_top_on(df, "PPR Reducing 40x32 大小头", "LESSO-RED-40X32")
    assert_absent_on(df, "PPR Reducing 40x32 大小头", "LESSO-RED-40X25")


def test_reducing_40x25_prefers_correct_lesso_reducer() -> None:
    df = build_lesso_df()
    assert_top_on(df, "PPR Reducing 40x25 大小头", "LESSO-RED-40X25")
    assert_absent_on(df, "PPR Reducing 40x25 大小头", "LESSO-RED-40X20")


if __name__ == "__main__":
    for test in (
        test_union_ranking_filters_incompatible_candidates,
        test_union_ranking_filters_compound_wrong_diameter,
        test_strict_category_without_valid_candidate_returns_empty,
        test_ppr_fitting_not_pipe,
        test_valve_not_pipe_or_elbow,
        test_special_products_do_not_fall_back_to_pipe,
        test_elbow_angle_preference,
        test_compound_main_sub_spec_is_enforced,
        test_equal_tee_preferred_when_no_reducer_requested,
        test_pvc_water_and_drain_are_separate,
        test_diameter_100_does_not_collapse_to_10,
        test_hot_and_cold_are_separate,
        test_pe_electrofusion_default_is_excluded,
        test_glue_query_is_glue_only,
        test_bare_dn_coupling_40_prefers_dn40_not_dn50,
        test_bare_dn_elbow_40_prefers_dn40_not_dn50,
        test_reducing_40x32_prefers_correct_lesso_reducer,
        test_reducing_40x25_prefers_correct_lesso_reducer,
    ):
        test()
    print("wanding matcher compatibility tests passed")
