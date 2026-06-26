# -*- coding: utf-8 -*-
"""Real-data regression tests against price_library_cleaned_2026_05_15.xlsx."""
from __future__ import annotations

import json
import math
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from inventory.config import config
from inventory.services.wanding_fuzzy_matcher import (
    _load_full_price_df,
    get_profit_rows_by_code,
    get_profit_rows_by_name,
    invalidate_wanding_cache,
    load_wanding_df,
    match_english_candidates,
    match_fuzzy,
    match_fuzzy_candidates,
)

PRICE_LIB = Path(config.PRICE_LIBRARY_PATH)
LEGACY_LIB = Path(config.LEGACY_PRICE_LIBRARY_PATH)


@dataclass
class CaseResult:
    name: str
    query: str
    expected_code: str | None
    got_code: str | None
    matched_name: str = ""
    unit_price: float | None = None
    extra: str = ""
    passed: bool = False


@dataclass
class Report:
    passed: list[CaseResult] = field(default_factory=list)
    failed: list[CaseResult] = field(default_factory=list)

    def add(self, result: CaseResult) -> None:
        (self.passed if result.passed else self.failed).append(result)

    def summary(self) -> dict:
        return {
            "total": len(self.passed) + len(self.failed),
            "passed": len(self.passed),
            "failed": len(self.failed),
            "failures": [
                {
                    "name": r.name,
                    "query": r.query,
                    "expected": r.expected_code,
                    "got": r.got_code,
                    "matched_name": r.matched_name[:120],
                    "extra": r.extra,
                }
                for r in self.failed
            ],
        }


def _run_fuzzy(name: str, query: str, expected: str, report: Report, **kwargs) -> None:
    result = match_fuzzy(query, price_library_path=str(PRICE_LIB), **kwargs)
    got = (result or {}).get("code")
    report.add(
        CaseResult(
            name=name,
            query=query,
            expected_code=expected,
            got_code=got,
            matched_name=(result or {}).get("matched_name", "") or "",
            unit_price=(result or {}).get("unit_price"),
            passed=got == expected,
        )
    )


def _build_cases_from_xlsx(df: pd.DataFrame) -> list[tuple[str, str, str]]:
    """Derive realistic fuzzy queries from preferred rows."""
    pref = df[df["is_preferred_price"].apply(lambda v: bool(v) if not pd.isna(v) else True)]
    cases: list[tuple[str, str, str]] = []

    def add_from_row(label: str, row: pd.Series, query_parts: list[str]) -> None:
        code = str(row["material"]).strip()
        query = " ".join(p for p in query_parts if p)
        if code and query:
            cases.append((label, query, code))

    # LESSO AW white pipe — short query is ambiguous; expect DN16 AW white default
    lesso = pref[pref["product_type"].astype(str).str.contains("LESSO", na=False)]
    lesso_aw = lesso[lesso["description"].astype(str).str.contains("AW", na=False)]
    cases.append(("LESSO AW DN16 white", "PVC-U AW DN16 4M white", "8010012683"))

    # LESSO grey — use full spec from row
    grey = pref[pref["product_type"].astype(str).str.contains("灰管", na=False)]
    if not grey.empty:
        r = grey.iloc[0]
        add_from_row("LESSO grey sample", r, [str(r.get("description") or "")[:80]])

    # 国标管件
    gb = pref[pref["product_type"].astype(str).str.contains("国标", na=False)]
    if not gb.empty:
        r = gb.iloc[0]
        add_from_row("国标管件 sample", r, [str(r.get("description_english") or r["description"])])

    # PE with PN16 — include coil length to disambiguate variants
    pe = pref[pref["source_sheet"].astype(str) == "PE PIPA"]
    pe_pn16 = pe[pe["description"].astype(str).str.contains("1.6", na=False)]
    for i, (_, r) in enumerate(pe_pn16.head(3).iterrows()):
        desc = str(r["description"])
        length = "50M" if "50M" in desc else "100M" if "100M" in desc else ""
        dn_match = re.search(r"dn\s*(\d+)", desc, re.I)
        dn = f"dn{dn_match.group(1)}" if dn_match else "dn20"
        add_from_row(f"PE PN16 sample {i+1}", r, ["HDPE", dn, "PN16", length])

    # RUCIKA English
    rucika = pref[pref["product_type"].astype(str).str.contains("RUCIKA", na=False)]
    if not rucika.empty:
        r = rucika.iloc[0]
        add_from_row("RUCIKA English", r, [str(r.get("description_english") or r["description"])])

    # CEILING
    ceiling = pref[pref["product_type"].astype(str).str.contains("CEILING", na=False)]
    mh = ceiling[ceiling["description"].astype(str).str.contains("Main hollow", case=False, na=False)]
    if not mh.empty:
        r = mh.iloc[0]
        add_from_row("CEILING Main hollow", r, ["Main hollow", "38"])
    st = ceiling[ceiling["description"].astype(str).str.contains("Stelldrat", case=False, na=False)]
    if not st.empty:
        r = st.iloc[0]
        add_from_row("CEILING Stelldrat", r, ["Stelldrat", "8"])

    # Drain pipe
    drain = lesso[lesso["description"].astype(str).str.contains("排水|drain|D ", case=False, na=False, regex=True)]
    if not drain.empty:
        r = drain.iloc[0]
        add_from_row("LESSO drain sample", r, ["PVC-U", "drain", "4M"])

    return cases


def test_library_load(report: Report) -> None:
    df_match = load_wanding_df(str(PRICE_LIB))
    df_full = _load_full_price_df(PRICE_LIB)
    pref = df_full[df_full["is_preferred_price"].apply(lambda v: bool(v) if not pd.isna(v) else True)]

    checks = [
        ("match rows == preferred count", len(df_match) == len(pref)),
        ("match rows > 3000", len(df_match) > 3000),
        ("PE PIPA source_sheet normalized", (pref["source_sheet"] == "PE PIPA").sum() == 752),
        ("no NaN material", pref["material"].isna().sum() == 0),
        ("price_b numeric majority", pref["price_b"].notna().sum() > 2500),
    ]
    for label, ok in checks:
        report.add(
            CaseResult(
                name=f"load: {label}",
                query=str(PRICE_LIB.name),
                expected_code="OK" if ok else "FAIL",
                got_code="OK" if ok else "FAIL",
                extra=f"match_rows={len(df_match)} full_pref={len(pref)}",
                passed=ok,
            )
        )


def test_fixed_regression(report: Report) -> None:
    fixed = [
        ("regression PVC-U AW DN16", "PVC-U AW DN16 4M white", "8010012683"),
        ("regression HDPE 1.6MPa", "HDPE dn20 1.6MPa 100M", "8010036428"),
        ("regression PVC drain dn32", "PVC-U dn32 4M drain", "8020010083"),
        ("regression Main hollow 38", "Main hollow 38", "CP-UPMH-001"),
        ("regression PN16 not size 16", "HDPE dn20 PN16 100M", "8010036428"),
        ("regression Stelldrat", "Stelldrat 8# 3M", "CP-UPST-001"),
        ("regression RUCIKA AW 1/2", 'PIPA RUCIKA STANDARD AW 1/2 " SC 4M', "10172010022004"),
    ]
    for name, query, expected in fixed:
        _run_fuzzy(name, query, expected, report)


def test_xlsx_derived(report: Report) -> None:
    df = pd.read_excel(PRICE_LIB, sheet_name="price_library")
    for name, query, expected in _build_cases_from_xlsx(df):
        _run_fuzzy(name, query, expected, report)


def test_code_exact_lookup(report: Report) -> None:
    df = load_wanding_df(str(PRICE_LIB))
    sample_codes = [
        "8010012683",
        "8010036428",
        "8020010083",
        "CP-UPMH-001",
        "10172010022004",
        "8030020044",
    ]
    for code in sample_codes:
        rows = df[df["Material"].astype(str).str.strip() == code]
        report.add(
            CaseResult(
                name=f"code lookup {code}",
                query=code,
                expected_code=code,
                got_code=str(rows.iloc[0]["Material"]).strip() if not rows.empty else None,
                passed=not rows.empty,
            )
        )
        fuzzy_hit = match_fuzzy(code, price_library_path=str(PRICE_LIB))
        report.add(
            CaseResult(
                name=f"match_fuzzy code short-circuit {code}",
                query=code,
                expected_code=code,
                got_code=(fuzzy_hit or {}).get("code"),
                passed=(fuzzy_hit or {}).get("code") == code,
            )
        )


def test_pe_supersedes_lesso(report: Report) -> None:
    df_all = pd.read_excel(PRICE_LIB, sheet_name="price_library")
    superseded = df_all[
        (df_all["is_preferred_price"] == False)
        & (df_all["superseded_by_source"].astype(str) == "PE PIPA")
    ]
    preferred_pe = df_all[
        (df_all["is_preferred_price"] == True)
        & (df_all["source_sheet"].astype(str) == "PE PIPA")
    ]
    overlap_codes = set(superseded["material"].astype(str)) & set(preferred_pe["material"].astype(str))
    ok_count = len(superseded) == 752 and len(preferred_pe) == 752 and len(overlap_codes) == 752
    report.add(
        CaseResult(
            name="PE supersedes LESSO duplicate codes",
            query="752 overlap",
            expected_code="752",
            got_code=str(len(overlap_codes)),
            extra=f"superseded={len(superseded)} pe_preferred={len(preferred_pe)}",
            passed=ok_count,
        )
    )
    if overlap_codes:
        code = sorted(overlap_codes)[0]
        from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code

        match = get_wanding_price_by_code(code, price_library_path=str(PRICE_LIB))
        pe_row = preferred_pe[preferred_pe["material"].astype(str) == code].iloc[0]
        got_price = (match or {}).get("unit_price")
        exp_price = float(pe_row.get("price_b") or 0)
        price_ok = got_price is not None and abs(got_price - exp_price) < 0.01
        report.add(
            CaseResult(
                name=f"PE price wins for overlap {code}",
                query=code,
                expected_code=code,
                got_code=(match or {}).get("code"),
                extra=f"price got={got_price} exp={exp_price}",
                passed=(match or {}).get("code") == code and price_ok,
            )
        )


def test_profit_queries(report: Report) -> None:
    invalidate_wanding_cache()
    samples = [
        ("8010036428", 100.0),
        ("8010012683", 50.0),
        ("CP-UPMH-001", 200.0),
    ]
    for code, price in samples:
        rows = get_profit_rows_by_code(code, price, PRICE_LIB)
        has_row = len(rows) >= 1
        nan_profit = any(
            isinstance(r.get("matched_profit"), float) and math.isnan(r["matched_profit"])
            for r in rows
        )
        report.add(
            CaseResult(
                name=f"profit by code {code}",
                query=f"{code} @ {price}",
                expected_code=code,
                got_code=rows[0].get("code") if rows else None,
                extra=f"rows={len(rows)} nan={nan_profit}",
                passed=has_row and not nan_profit,
            )
        )

    invalidate_wanding_cache()
    rows_new = get_profit_rows_by_code("8010036428", 100.0, PRICE_LIB)
    rows_old = get_profit_rows_by_code("8010036428", 100.0, LEGACY_LIB)
    report.add(
        CaseResult(
            name="profit cache path isolation",
            query="new+old same process",
            expected_code="both",
            got_code=f"new={len(rows_new)} old={len(rows_old)}",
            passed=len(rows_new) >= 1 and len(rows_old) >= 0,
        )
    )


def test_english_candidates(report: Report) -> None:
    queries = [
        ("RUCIKA AW 3/4", "10172010026004"),
        ("In(JIS)PVC-U WP AW Gy 4M", None),  # flexible top-1
    ]
    for query, expected in queries:
        cands = match_english_candidates(query, price_library_path=str(PRICE_LIB), max_candidates=5)
        top = cands[0]["code"] if cands else None
        passed = expected is None or top == expected
        report.add(
            CaseResult(
                name=f"english candidates: {query[:40]}",
                query=query,
                expected_code=expected or "any",
                got_code=top,
                matched_name=cands[0].get("matched_name", "")[:80] if cands else "",
                passed=passed and bool(cands),
            )
        )


def test_negative_ceiling_vs_pvc(report: Report) -> None:
    """Main hollow 38 must not match PVC conduit H38."""
    result = match_fuzzy("Main hollow 38", price_library_path=str(PRICE_LIB))
    got = (result or {}).get("code")
    bad_codes = {"8030020044", "8030020052"}
    report.add(
        CaseResult(
            name="CEILING not PVC H38",
            query="Main hollow 38",
            expected_code="CP-UPMH-001",
            got_code=got,
            passed=got == "CP-UPMH-001" and got not in bad_codes,
        )
    )


def main() -> int:
    if not PRICE_LIB.is_file():
        print(f"FAIL: missing {PRICE_LIB}")
        return 1

    report = Report()
    test_library_load(report)
    test_fixed_regression(report)
    test_xlsx_derived(report)
    test_code_exact_lookup(report)
    test_pe_supersedes_lesso(report)
    test_profit_queries(report)
    test_english_candidates(report)
    test_negative_ceiling_vs_pvc(report)

    summary = report.summary()
    out_path = PYTHON_ROOT / "test_price_library_real_report.json"
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Price library: {PRICE_LIB}")
    print(f"Total: {summary['total']}  Passed: {summary['passed']}  Failed: {summary['failed']}")
    if summary["failures"]:
        print("\nFailures:")
        for f in summary["failures"]:
            print(f"  - {f['name']}")
            print(f"    query={f['query']!r}")
            print(f"    expected={f['expected']} got={f['got']}")
            if f.get("matched_name"):
                print(f"    matched={f['matched_name']}")
            if f.get("extra"):
                print(f"    extra={f['extra']}")
    print(f"\nReport: {out_path}")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
