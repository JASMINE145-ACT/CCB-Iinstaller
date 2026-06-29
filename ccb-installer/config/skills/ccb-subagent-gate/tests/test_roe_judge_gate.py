#!/usr/bin/env python3
"""Unit tests for universal ROE in-process self-check gate (slim write-anchor + L2)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = ROOT / "scripts" / "lib" / "parse_transcript_roe_judge.py"
FIX = ROOT / "tests" / "fixtures" / "transcripts"
LOG = ROOT / "tests" / "fixtures" / ".roe-judge-pytest-logs"


def run_eval(
    fixture: str,
    agent: str = "quotation-agent",
    last_msg: str = "",
    session: str = "judge-test",
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
            agent,
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
    data = json.loads(proc.stdout.strip() or "{}")
    return proc.returncode, data


def assert_reject_prompt_shape(prompt: str, *, expect_prior_turns: bool = False) -> bool:
    if "[ROE-GATE" not in prompt:
        return False
    if "GAPS (rule-detected):" not in prompt:
        return False
    if "ACTION:" not in prompt:
        return False
    if "Your text output this turn" in prompt:
        return False
    gaps_pos = prompt.find("GAPS (rule-detected):")
    user_pos = prompt.find("User request:")
    if gaps_pos < 0 or user_pos < 0:
        return False
    if expect_prior_turns and "prior turns" not in prompt:
        return False
    if "Already done" not in prompt:
        return False
    return True


def test_shell_warn_mode() -> bool:
    """Integration: generic-roe-judge.sh warn exits 0 with WARN on stderr."""
    sh = ROOT / "scripts" / "validators" / "generic-roe-judge.sh"
    fixture = FIX / "roe-edit-promise-no-write.jsonl"
    bash_candidates = [
        r"C:\Program Files\Git\bin\bash.exe",
        r"C:\Program Files (x86)\Git\bin\bash.exe",
        "bash",
    ]
    bash = None
    for candidate in bash_candidates:
        if candidate == "bash":
            found = __import__("shutil").which("bash")
            if found and "system32" not in found.lower() and "windowsapps" not in found.lower():
                bash = found
            break
        if __import__("os").path.isfile(candidate):
            bash = candidate
            break
    if not bash:
        print("[SKIP] shell warn integration (Git Bash not found)")
        return True
    env = {**os.environ, "SUBAGENT_GATE_SKILL_ROOT": str(ROOT)}
    proc = subprocess.run(
        [bash, str(sh), str(fixture), "shell-test", "quotation-agent", "", "warn"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    if proc.returncode != 0:
        print(f"[FAIL] shell warn: exit={proc.returncode} stderr={proc.stderr[:200]}")
        return False
    if "WARN:" not in proc.stderr and "[ROE-GATE" not in proc.stderr:
        print(f"[FAIL] shell warn: expected WARN stderr, got: {proc.stderr[:200]}")
        return False
    print("[PASS] shell warn integration")
    return True


def test_n5_escalation() -> bool:
    LOG.mkdir(parents=True, exist_ok=True)
    counts = LOG / "subagent-gate-roe-judge-counts.json"
    if counts.exists():
        counts.unlink()
    fixture = "roe-edit-promise-no-write.jsonl"
    msg = "收到，马上更新报价单行价格并删除B款。"
    session = "n5-judge-escalation"
    for attempt in range(1, 7):
        code, data = run_eval(fixture, last_msg=msg, session=session, clear_counts=(attempt == 1))
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
        ("roe-judge-partial-n-k.jsonl", 0, "pass", "readonly N/K lookup — no write intent"),
        ("roe-judge-complete-n.jsonl", 0, "pass", "readonly complete table"),
        ("roe-price-lookup-only.jsonl", 0, "pass", "readonly exempt"),
        ("roe-judge-clarification.jsonl", 0, "pass", "clarification"),
        ("roe-edit-promise-no-write.jsonl", 10, "block", "write intent no L2"),
        ("roe-lookup-and-fill-readonly.jsonl", 10, "block", "lookup+fill composite read-only tools"),
        ("roe-tool-failed.jsonl", 10, "block", "L2 tool failed"),
        ("roe-prior-l2-current-promise.jsonl", 10, "block", "new write anchor no L2 in window"),
        ("roe-multi-tool-batch-l2-fail.jsonl", 10, "block", "multi-tool batch L2 fail must not false-pass"),
        ("roe-two-turn-lookup-then-fill.jsonl", 10, "block", "two-turn lookup then fill — prior done from Turn 1"),
        ("roe-real-fill-failed-missing-path.jsonl", 10, "block", "real two-turn fill failed missing path"),
        ("roe-l2-retry-then-success.jsonl", 0, "pass", "L2 retry then success"),
    ]
    failed = 0
    for fixture, expect_code, expect_verdict, label in cases:
        code, data = run_eval(fixture, last_msg="")
        if code != expect_code or data.get("verdict") != expect_verdict:
            print(f"[FAIL] {label}: code={code} verdict={data.get('verdict')} expected {expect_code}/{expect_verdict}")
            print(data)
            failed += 1
        else:
            print(f"[PASS] {label}")

    code, data = run_eval("roe-edit-promise-no-write.jsonl")
    prompt = data.get("reject_prompt", "")
    if code != 10 or not assert_reject_prompt_shape(prompt):
        print(f"[FAIL] reject_prompt shape: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] reject_prompt gaps → user → already done → action")

    code, data = run_eval("roe-two-turn-lookup-then-fill.jsonl")
    prompt = data.get("reject_prompt", "")
    if "prior turns" not in prompt or "match_quotation" not in prompt:
        print(f"[FAIL] two-turn should list Turn 1 lookup in prior turns: {prompt[:400]}")
        failed += 1
    elif "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] two-turn should action fill: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] two-turn prior-turn Already done")

    code, data = run_eval("roe-lookup-and-fill-readonly.jsonl")
    prompt = data.get("reject_prompt", "")
    if "match_quotation" not in prompt or "search_inventory" not in prompt:
        print(f"[FAIL] lookup+fill should list already done tools: {prompt[:300]}")
        failed += 1
    elif "do NOT call them again" not in prompt.lower() and "do NOT repeat" not in prompt:
        print(f"[FAIL] lookup+fill should warn against repeat: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] lookup+fill already done anti-recheck")

    code, data = run_eval("roe-tool-failed.jsonl")
    prompt = data.get("reject_prompt", "")
    if "Prior attempt" not in prompt:
        print(f"[FAIL] tool failed should show Prior attempt: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] L2 failure surfaces Prior attempt in REJECT")

    code, data = run_eval("roe-edit-promise-no-write.jsonl")
    prompt = data.get("reject_prompt", "")
    if "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] quotation execute hint missing: {prompt[:200]}")
        failed += 1
    else:
        print("[PASS] quotation execute hint in action")

    code, data = run_eval("roe-edit-promise-no-write.jsonl", agent="word-creator")
    if code != 10 or data.get("verdict") != "block":
        print(f"[FAIL] word-creator universal: {code} {data.get('verdict')}")
        failed += 1
    else:
        print("[PASS] word-creator universal block")

    if not test_n5_escalation():
        failed += 1

    if failed:
        print(f"\n{failed} failed")
        return 1
    if not test_shell_warn_mode():
        return 1
    print(f"\nAll judge tests passed ({len(cases) + 4} cases + shell integration)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
