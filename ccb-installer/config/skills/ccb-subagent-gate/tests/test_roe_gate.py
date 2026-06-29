#!/usr/bin/env python3
"""Legacy ROE gate tests — redirected to slim universal judge (parse_transcript_roe_judge.py)."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = ROOT / "scripts" / "lib" / "parse_transcript_roe_judge.py"
FIX = ROOT / "tests" / "fixtures" / "transcripts"
LOG = ROOT / "tests" / "fixtures" / ".roe-pytest-logs"
AGENT = "quotation-agent"


def run_eval(
    fixture: str,
    last_msg: str,
    session: str = "test-session",
    *,
    clear_counts: bool = True,
) -> tuple[int, dict]:
    LOG.mkdir(parents=True, exist_ok=True)
    counts = LOG / "subagent-gate-roe-judge-counts.json"
    if clear_counts and counts.exists():
        counts.unlink()
    proc = subprocess.run(
        [
            sys.executable,
            str(PY),
            "evaluate",
            str(FIX / fixture),
            session,
            AGENT,
            last_msg,
            str(LOG),
            str(ROOT),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    data = json.loads(proc.stdout.strip() or "{}")
    return proc.returncode, data


def test_n5_escalation() -> bool:
    """Sixth evaluate on same window passes with step=escalate after five blocks."""
    LOG.mkdir(parents=True, exist_ok=True)
    counts = LOG / "subagent-gate-roe-judge-counts.json"
    if counts.exists():
        counts.unlink()
    fixture = "roe-edit-promise-no-write.jsonl"
    msg = "收到，马上更新报价单行价格并删除B款。"
    session = "n5-escalation-session"
    for attempt in range(1, 7):
        code, data = run_eval(
            fixture, msg, session=session, clear_counts=(attempt == 1)
        )
        if attempt <= 5:
            if code != 10 or data.get("verdict") != "block":
                print(f"[FAIL] n5 attempt {attempt} expected block, got {code} {data.get('verdict')}")
                return False
        else:
            if code != 20 or data.get("verdict") != "pass" or data.get("step") != "escalate":
                print(f"[FAIL] n5 attempt 6 expected escalate pass, got {code} step={data.get('step')}")
                return False
            if not data.get("escalated"):
                print("[FAIL] n5 attempt 6 missing escalated flag")
                return False
    print("[PASS] n5 escalation after 5 blocks")
    return True


def main() -> int:
    cases = [
        ("roe-edit-promise-no-write.jsonl", "收到，马上更新报价单行价格并删除B款。", 10, "block"),
        ("roe-empty-promise.jsonl", "收到，将继续 update 报价单行价格。", 10, "block"),
        ("roe-price-lookup-only.jsonl", "三通50 B档推荐价 4869", 0, "pass"),
        ("roe-clarification.jsonl", "请确认 A 改价 / B 追加 / C 删除", 0, "pass"),
        ("roe-tool-failed.jsonl", "已尝试更新第9行价格。", 10, "block"),
        ("roe-prior-l2-current-promise.jsonl", "收到，马上删 B 款。", 10, "block"),
    ]
    failed = 0
    for fixture, msg, expected_code, expected_verdict in cases:
        code, data = run_eval(fixture, msg)
        verdict = data.get("verdict")
        ok = code == expected_code and verdict == expected_verdict
        label = "PASS" if ok else "FAIL"
        print(f"[{label}] {fixture} exit={code} verdict={verdict} step={data.get('step')}")
        if not ok:
            failed += 1
            print(f"       expected exit={expected_code} verdict={expected_verdict}")
    if not test_n5_escalation():
        failed += 1
    print(f"\nResults: {len(cases) + 1 - failed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
