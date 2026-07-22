#!/usr/bin/env python3
"""Tests for post-match-knowledge-nudge hybrid + select nudges (WANd.TRADE.SOURCING.DUAL.001)."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "lib"))
sys.path.insert(0, str(ROOT / "scripts"))

spec = importlib.util.spec_from_file_location(
    "post_match_nudge", ROOT / "scripts" / "post-match-knowledge-nudge.py"
)
nudge = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(nudge)

relay_spec = importlib.util.spec_from_file_location(
    "post_relay_nudge", ROOT / "scripts" / "post-quotation-relay-nudge.py"
)
relay = importlib.util.module_from_spec(relay_spec)
assert relay_spec and relay_spec.loader
relay_spec.loader.exec_module(relay)


def test_multi_candidate_includes_hybrid_and_select() -> bool:
    payload = {
        "keywords": "直接50",
        "candidate_count": 10,
        "candidates": [{"code": "8020020755"}],
    }
    ctx = nudge.build_nudge_context(payload)
    if not ctx or "suppliers_hybrid_match" not in ctx:
        print("[FAIL] missing hybrid tool in nudge")
        return False
    if "select_quotation_candidates" not in ctx:
        print("[FAIL] missing select in multi-candidate nudge")
        return False
    if "货源（名录）" not in ctx:
        print("[FAIL] missing 货源 section reminder")
        return False
    print("[PASS] multi-candidate hybrid+select nudge")
    return True


def test_single_candidate_includes_hybrid_only() -> bool:
    payload = {
        "keywords": "土工布",
        "candidate_count": 1,
        "candidates": [{"code": "100001"}],
    }
    ctx = nudge.build_nudge_context(payload)
    if not ctx or "suppliers_hybrid_match" not in ctx:
        print("[FAIL] single candidate must still nudge hybrid")
        return False
    if "多候选选型" in ctx:
        print("[FAIL] single candidate should not include multi-select block")
        return False
    print("[PASS] single-candidate hybrid-only nudge")
    return True


def test_relay_nudge_mentions_hybrid_requirement() -> bool:
    text = relay.build_nudge([{"code": "8020020755", "unit_price": 1219}])
    if "suppliers_hybrid_match" not in text and "名录" not in text:
        print("[FAIL] relay nudge missing 名录 requirement")
        return False
    print("[PASS] relay nudge mentions 名录")
    return True


def main() -> int:
    ok = all(
        [
            test_multi_candidate_includes_hybrid_and_select(),
            test_single_candidate_includes_hybrid_only(),
            test_relay_nudge_mentions_hybrid_requirement(),
        ]
    )
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
