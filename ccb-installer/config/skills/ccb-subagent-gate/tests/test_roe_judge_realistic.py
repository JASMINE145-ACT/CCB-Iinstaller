#!/usr/bin/env python3
"""Realistic ROE judge scenarios — multi-turn, continue accumulation, L2 failure paths."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = ROOT / "scripts" / "lib" / "parse_transcript_roe_judge.py"
FIX = ROOT / "tests" / "fixtures" / "transcripts"
LOG = ROOT / "tests" / "fixtures" / ".roe-judge-realistic-logs"


def run_eval(
    fixture: str,
    last_msg: str = "",
    session: str = "realistic-test",
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
            "quotation-agent",
            last_msg,
            str(LOG),
            str(ROOT),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=os.environ.copy(),
    )
    if proc.returncode not in (0, 10, 20) and not proc.stdout.strip():
        print(f"[DEBUG] stderr: {proc.stderr[:500]}")
    data = json.loads(proc.stdout.strip() or "{}")
    return proc.returncode, data


def test_prior_attempt_with_two_turn_lookup() -> bool:
    code, data = run_eval("roe-real-fill-failed-missing-path.jsonl")
    prompt = data.get("reject_prompt", "")
    pa = data.get("prior_attempt") or {}
    gaps = data.get("gaps_text") or ""
    if code != 10 or data.get("verdict") != "block":
        print(f"[FAIL] fill failed missing path: {code} {data.get('verdict')}")
        return False
    if "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] ACTION should still point at fill: {prompt[:400]}")
        return False
    if "file_path" not in gaps.lower() and "file_path" not in str(pa).lower():
        print(f"[FAIL] should show prior L2 failure in gaps/prior_attempt: {gaps} {pa}")
        return False
    if pa.get("error", "").find("file_path") < 0:
        print(f"[FAIL] prior_attempt json: {pa}")
        return False
    print("[PASS] two-turn lookup + fill failed -> gaps + prior_attempt")
    return True


def test_multi_continue_accumulates_window_done() -> bool:
    code, data = run_eval("roe-real-multi-continue-accumulate.jsonl")
    prompt = data.get("reject_prompt", "")
    gaps = data.get("gaps_text") or ""
    pa = data.get("prior_attempt") or {}
    if code != 10:
        print(f"[FAIL] multi-continue expected block: {code}")
        return False
    if "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] ACTION should still point at fill: {prompt[:500]}")
        return False
    if "file_path" not in gaps.lower() and "file_path" not in str(pa).lower():
        print(f"[FAIL] should show fill failure after continues: {gaps} {pa}")
        return False
    print("[PASS] multi-continue still blocks with prior_attempt")
    return True


def test_l2_retry_then_success_passes() -> bool:
    code, data = run_eval("roe-l2-retry-then-success.jsonl")
    if code != 0 or data.get("verdict") != "pass" or data.get("step") != "l2_write_success":
        print(f"[FAIL] retry then success should pass: {code} {data}")
        return False
    print("[PASS] L2 fail then success -> pass (success only)")
    return True


def test_l2_success_plain_passes() -> bool:
    code, data = run_eval("roe-l2-success-plain.jsonl")
    if code != 0 or data.get("verdict") != "pass":
        print(f"[FAIL] plain L2 success: {code} {data}")
        return False
    print("[PASS] plain L2 success passes")
    return True


def test_l2_payload_error_blocks_even_if_is_error_false() -> bool:
    code, data = run_eval("roe-l2-payload-error-is-error-false.jsonl")
    if code != 10 or data.get("has_l2"):
        print(f"[FAIL] payload error must block: {code} has_l2={data.get('has_l2')}")
        return False
    print("[PASS] L2 payload error blocks despite is_error false")
    return True


def test_l2_called_success_payload_passes() -> bool:
    code, data = run_eval("roe-l2-called-but-is-error-false-with-error-field.jsonl")
    if code != 0 or data.get("step") != "l2_write_success":
        print(f"[FAIL] success payload should pass: {code} {data}")
        return False
    print("[PASS] L2 success with is_error false and success payload")
    return True


def test_fill_failed_never_passes() -> bool:
    code, data = run_eval("roe-tool-failed.jsonl", last_msg="已尝试更新第9行价格。")
    if code != 10 or data.get("has_l2"):
        print(f"[FAIL] fill is_error true must block: {data}")
        return False
    prompt = data.get("reject_prompt", "")
    gaps = data.get("gaps_text") or ""
    if "fill_quotation" not in prompt and not data.get("prior_attempt"):
        print(f"[FAIL] failed fill should surface: {prompt[:300]} gaps={gaps}")
        return False
    print("[PASS] L2 is_error true never passes")
    return True


def test_multi_tool_batch_l2_fail_blocks() -> bool:
    code, data = run_eval("roe-multi-tool-batch-l2-fail.jsonl")
    if code != 10 or data.get("has_l2"):
        print(f"[FAIL] batch L2 fail: {data}")
        return False
    prompt = data.get("reject_prompt", "")
    if "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] ACTION should point at fill: {prompt[:400]}")
        return False
    if not data.get("prior_attempt") and "失败" not in (data.get("gaps_text") or ""):
        print(f"[FAIL] should show failed fill attempt: {data.get('gaps_text')}")
        return False
    print("[PASS] same-turn lookup ok + fill fail -> block")
    return True


def main() -> int:
    tests = [
        test_prior_attempt_with_two_turn_lookup,
        test_multi_continue_accumulates_window_done,
        test_l2_retry_then_success_passes,
        test_l2_success_plain_passes,
        test_l2_called_success_payload_passes,
        test_l2_payload_error_blocks_even_if_is_error_false,
        test_fill_failed_never_passes,
        test_multi_tool_batch_l2_fail_blocks,
    ]
    failed = sum(0 if t() else 1 for t in tests)
    print(f"\nRealistic: {len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
