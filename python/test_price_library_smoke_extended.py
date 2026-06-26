# -*- coding: utf-8 -*-
"""Extended smoke: new price_library_cleaned adaptation across categories + union path."""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from inventory.config import config
from inventory.services.match_and_inventory import match_quotation_union
from inventory.services.wanding_fuzzy_matcher import (
    invalidate_wanding_cache,
    match_fuzzy_candidates,
)

PRICE_LIB = Path(config.PRICE_LIBRARY_PATH)


@dataclass
class SmokeCase:
    name: str
    query: str
    check: str  # human-readable expectation
    passed: bool = False
    detail: str = ""


@dataclass
class SmokeReport:
    cases: list[SmokeCase] = field(default_factory=list)

    def add(self, case: SmokeCase) -> None:
        self.cases.append(case)

    def summary(self) -> dict:
        passed = sum(1 for c in self.cases if c.passed)
        failed = len(self.cases) - passed
        return {
            "total": len(self.cases),
            "passed": passed,
            "failed": failed,
            "failures": [
                {"name": c.name, "query": c.query, "check": c.check, "detail": c.detail}
                for c in self.cases
                if not c.passed
            ],
        }


def _codes(cands: list[dict]) -> list[str]:
    return [str(c.get("code") or "").strip() for c in cands if c.get("code")]


def _run_fuzzy_multi(
    report: SmokeReport,
    name: str,
    query: str,
    *,
    min_count: int = 1,
    must_include: list[str] | None = None,
    must_exclude: list[str] | None = None,
    min_dn125_hdpe: int = 0,
) -> None:
    cands = match_fuzzy_candidates(
        query,
        customer_level="B",
        price_library_path=str(PRICE_LIB),
        max_score_tiers=2,
    )
    codes = _codes(cands)
    hdpe_dn125 = [
        c for c in cands
        if "dn125" in (c.get("matched_name") or "").lower()
        and "hdpe" in (c.get("matched_name") or "").lower()
    ]
    ok = len(cands) >= min_count
    if must_include:
        ok = ok and all(code in codes for code in must_include)
    if must_exclude:
        ok = ok and not any(code in codes for code in must_exclude)
    if min_dn125_hdpe:
        ok = ok and len(hdpe_dn125) >= min_dn125_hdpe
    detail = f"n={len(cands)} top={codes[:5]}"
    if hdpe_dn125:
        detail += f" dn125_hdpe={len(hdpe_dn125)}"
    report.add(
        SmokeCase(
            name=name,
            query=query,
            check=f"min={min_count} include={must_include} dn125_hdpe>={min_dn125_hdpe}",
            passed=ok,
            detail=detail,
        )
    )


def _run_union(
    report: SmokeReport,
    name: str,
    query: str,
    *,
    min_count: int = 1,
    must_include: list[str] | None = None,
) -> None:
    cands = match_quotation_union(query, customer_level="B", price_library_path=str(PRICE_LIB))
    codes = _codes(cands)
    ok = len(cands) >= min_count
    if must_include:
        ok = ok and all(code in codes for code in must_include)
    report.add(
        SmokeCase(
            name=name,
            query=query,
            check=f"union min={min_count} include={must_include}",
            passed=ok,
            detail=f"n={len(cands)} codes={codes[:6]}",
        )
    )


def main() -> int:
    if not PRICE_LIB.is_file():
        print(f"FAIL: missing {PRICE_LIB}")
        return 1

    invalidate_wanding_cache()
    report = SmokeReport()

    # --- PE / HDPE pipes (user-reported gap) ---
    _run_fuzzy_multi(
        report,
        "PE 125mm/6m all pressures",
        "PE管 pipe 125mm/6m",
        min_count=7,
        must_include=["8010036693", "8010036709"],
        min_dn125_hdpe=7,
    )
    _run_fuzzy_multi(
        report,
        "PE 125mm/6m with 1.0MPa",
        "PE管 1.0MPa dn125 6M",
        min_count=1,
        must_include=["8010036701"],
    )
    _run_fuzzy_multi(
        report,
        "HDPE coil PN16 100M",
        "HDPE dn20 PN16 100M",
        min_count=1,
        must_include=["8010036428"],
    )
    _run_union(
        report,
        "union PE 125mm/6m",
        "PE管 pipe 125mm/6m",
        min_count=7,
        must_include=["8010036693"],
    )

    # --- PVC LESSO AW / drain ---
    _run_fuzzy_multi(
        report,
        "PVC-U AW DN16 white",
        "PVC-U AW DN16 4M white",
        min_count=1,
        must_include=["8010012683"],
    )
    _run_fuzzy_multi(
        report,
        "PVC drain dn32 4M",
        "PVC-U dn32 4M drain",
        min_count=1,
        must_include=["8020010083"],
    )
    _run_fuzzy_multi(
        report,
        "穿线管 conduit",
        "穿线管 dn25 3M",
        min_count=1,
    )

    # --- PPR fittings ---
    _run_fuzzy_multi(
        report,
        "PPR 直接 dn50",
        "PPR 直接 dn50",
        min_count=1,
    )
    _run_fuzzy_multi(
        report,
        "PPR 三通 dn25",
        "PPR 三通 dn25",
        min_count=1,
    )
    _run_fuzzy_multi(
        report,
        "PPR 弯头 90度 dn32",
        "PPR 弯头 90度 dn32",
        min_count=1,
    )

    # --- 国标管件 ---
    _run_fuzzy_multi(
        report,
        "国标 带检查口弯头",
        "带检查口弯头 dn50",
        min_count=1,
    )
    _run_fuzzy_multi(
        report,
        "国标 管帽",
        "管帽 dn40",
        min_count=1,
    )

    # --- RUCIKA English ---
    _run_fuzzy_multi(
        report,
        "RUCIKA AW 1/2 inch",
        'PIPA RUCIKA STANDARD AW 1/2 " SC 4M',
        min_count=1,
        must_include=["10172010022004"],
    )

    # --- CEILING (must not confuse with PVC conduit) ---
    _run_fuzzy_multi(
        report,
        "CEILING Main hollow 38",
        "Main hollow 38",
        min_count=1,
        must_include=["CP-UPMH-001"],
        must_exclude=["8030020044"],
    )

    # --- Valves / glue (library naming) ---
    _run_fuzzy_multi(
        report,
        "PVC-U 角阀 DN15",
        "角阀 DN15",
        min_count=1,
        must_include=["8110010107"],
    )
    _run_fuzzy_multi(
        report,
        "PVC 胶水",
        "PVC 胶水",
        min_count=1,
        must_include=["80516584"],
    )

    # --- Code short-circuit ---
    _run_fuzzy_multi(
        report,
        "code lookup 8010036693",
        "8010036693",
        min_count=1,
        must_include=["8010036693"],
    )

    # --- Pressure disambiguation ---
    _run_fuzzy_multi(
        report,
        "PE 0.6MPa dn125 only",
        "HDPE 0.6MPa dn125 6M",
        min_count=1,
        must_include=["8010036693"],
        must_exclude=["8010036709"],
    )
    _run_fuzzy_multi(
        report,
        "PE 1.6MPa dn125 only",
        "HDPE 1.6MPa dn125 6M",
        min_count=1,
        must_include=["8010036709"],
        must_exclude=["8010036693"],
    )

    summary = report.summary()
    out = PYTHON_ROOT / "test_price_library_smoke_extended_report.json"
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Price library: {PRICE_LIB}")
    print(f"Extended smoke: {summary['passed']}/{summary['total']} passed")
    if summary["failures"]:
        print("\nFailures:")
        for f in summary["failures"]:
            print(f"  - {f['name']}")
            print(f"    query={f['query']!r}")
            print(f"    check={f['check']}")
            print(f"    detail={f['detail']}")
    print(f"\nReport: {out}")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
