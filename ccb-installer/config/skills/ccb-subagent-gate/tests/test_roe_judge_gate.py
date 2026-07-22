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
sys.path.insert(0, str(ROOT))


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


def assert_reject_prompt_shape(prompt: str) -> bool:
    if "[ROE-GATE" not in prompt:
        return False
    if "Gap:" not in prompt:
        return False
    if "ACTION:" not in prompt:
        return False
    if "User:" not in prompt:
        return False
    if "Your text output this turn" in prompt:
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
    shell_log = LOG / "shell-warn"
    shell_log.mkdir(parents=True, exist_ok=True)
    shell_counts = shell_log / "subagent-gate-roe-judge-counts.json"
    if shell_counts.exists():
        shell_counts.unlink()
    env = {
        **os.environ,
        "SUBAGENT_GATE_SKILL_ROOT": str(ROOT),
        "SUBAGENT_GATE_LOG_DIR": str(shell_log),
    }
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


def test_n1_escalation() -> bool:
    """Lightweight fuse: first miss blocks, second miss escalates to pass."""
    LOG.mkdir(parents=True, exist_ok=True)
    counts = LOG / "subagent-gate-roe-judge-counts.json"
    if counts.exists():
        counts.unlink()
    fixture = "roe-edit-promise-no-write.jsonl"
    msg = "收到，马上更新报价单行价格并删除B款。"
    session = "n1-judge-escalation"
    code1, data1 = run_eval(fixture, last_msg=msg, session=session, clear_counts=True)
    if code1 != 10 or data1.get("verdict") != "block":
        print(f"[FAIL] n1 attempt 1 expected block, got {code1} {data1.get('verdict')}")
        return False
    code2, data2 = run_eval(fixture, last_msg=msg, session=session, clear_counts=False)
    if code2 != 20 or data2.get("verdict") != "pass" or data2.get("step") != "escalate":
        print(f"[FAIL] n1 attempt 2 expected escalate pass, got {code2} step={data2.get('step')}")
        return False
    if not data2.get("escalated"):
        print("[FAIL] n1 attempt 2 missing escalated flag")
        return False
    key1 = data1.get("window_key") or ""
    key2 = data2.get("window_key") or ""
    if ":" not in key1 or key1.count(":") != 1:
        print(f"[FAIL] window_key should be session:digest only, got {key1!r}")
        return False
    if key1 != key2:
        print(f"[FAIL] window_key drifted across retries: {key1} vs {key2}")
        return False
    print("[PASS] n1 escalation after 1 block + stable window_key")
    return True


def test_lookup_with_code_not_write_intent() -> bool:
    from scripts.lib.parse_transcript_roe_judge import has_write_intent

    text = "admin 抱歉刚才被拒了。这就把物料 8020020755 的库存查出来。code=8020020755"
    if has_write_intent(text):
        print(f"[FAIL] inventory lookup with code must not be write intent: {text}")
        return False
    print("[PASS] lookup+code is not write intent")
    return True


def test_runtime_meta_injections_do_not_create_write_intent() -> None:
    from scripts.lib.parse_transcript_roe_judge import _extract_handoff_user_text

    code, data = run_eval("roe-live-lookup-with-preloaded-skill-and-hook-feedback.jsonl")
    assert code == 0, data
    assert data.get("verdict") == "pass", data
    assert data.get("step") == "no_roe_scope", data
    assert data.get("has_write_intent") is False, data
    preview = data.get("window_user_text_preview") or ""
    assert "<command-message>" not in preview, data
    assert "Stop hook feedback" not in preview, data
    assert (
        _extract_handoff_user_text(
            "<!-- WANd.HANDOFF.BRIEF.001 -->\n## Inputs\n用户原话：「查询 直接 50 价格」\n"
        )
        == "查询 直接 50 价格"
    )


def test_hook_reject_not_real_user() -> bool:
    from scripts.lib.parse_transcript_roe_judge import _is_real_user_message

    obj = {
        "type": "user",
        "message": {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "[ROE-GATE 1/1] Write not landed — do not end_turn.\nGap: 写意图未完成",
                }
            ],
        },
    }
    if _is_real_user_message(obj):
        print("[FAIL] ROE-GATE inject must not count as real user message")
        return False
    print("[PASS] ROE-GATE inject filtered from real user messages")
    return True


def main() -> int:
    cases = [
        ("roe-judge-partial-n-k.jsonl", 0, "pass", "readonly N/K lookup — no write intent"),
        ("roe-judge-complete-n.jsonl", 0, "pass", "readonly complete table"),
        ("roe-price-lookup-only.jsonl", 0, "pass", "readonly exempt"),
        (
            "roe-live-lookup-with-preloaded-skill-and-hook-feedback.jsonl",
            0,
            "pass",
            "live readonly handoff ignores preloaded skill and Stop-hook feedback",
        ),
        ("roe-judge-clarification.jsonl", 0, "pass", "clarification"),
        (
            "roe-accurate-readonly-brief-pollution.jsonl",
            0,
            "pass",
            "accurate readonly — Brief Expected export pollution skipped via profile",
            "accurate-agent",
        ),
        (
            "roe-accurate-readonly-brief-no-quote.jsonl",
            0,
            "pass",
            "accurate readonly — Brief Goal-only query skipped without 用户原话",
            "accurate-agent",
        ),
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
    for case in cases:
        fixture, expect_code, expect_verdict, label = case[:4]
        agent = case[4] if len(case) > 4 else "quotation-agent"
        code, data = run_eval(fixture, agent=agent, last_msg="")
        if code != expect_code or data.get("verdict") != expect_verdict:
            print(f"[FAIL] {label}: code={code} verdict={data.get('verdict')} expected {expect_code}/{expect_verdict}")
            try:
                print(data)
            except UnicodeEncodeError:
                print(str(data).encode("ascii", "replace").decode("ascii"))
            failed += 1
        else:
            print(f"[PASS] {label}")

    code, data = run_eval(
        "roe-accurate-readonly-brief-pollution.jsonl",
        agent="accurate-agent",
        last_msg="| 5月销售额 | 1,470,601,570 IDR |",
    )
    ok_step = data.get("step") in ("readonly_skip_profile", "no_roe_scope")
    if code != 0 or not ok_step:
        print(f"[FAIL] accurate pollution must pass readonly: step={data.get('step')}")
        failed += 1
    else:
        print(f"[PASS] accurate pollution step={data.get('step')}")

    code, data = run_eval("roe-edit-promise-no-write.jsonl")
    prompt = data.get("reject_prompt", "")
    if code != 10 or not assert_reject_prompt_shape(prompt):
        print(f"[FAIL] reject_prompt shape: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] reject_prompt short fuse shape")

    code, data = run_eval("roe-two-turn-lookup-then-fill.jsonl")
    prompt = data.get("reject_prompt", "")
    if "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] two-turn should action fill: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] two-turn ACTION still points at fill")

    code, data = run_eval("roe-lookup-and-fill-readonly.jsonl")
    prompt = data.get("reject_prompt", "")
    if "fill_quotation_sheet" not in prompt and "edit_excel" not in prompt:
        print(f"[FAIL] lookup+fill should action fill: {prompt[:300]}")
        failed += 1
    else:
        print("[PASS] lookup+fill ACTION fill")

    code, data = run_eval("roe-tool-failed.jsonl")
    gaps = data.get("gaps_text") or ""
    if "失败" not in gaps and "fail" not in gaps.lower() and not data.get("prior_attempt"):
        print(f"[FAIL] tool failed should surface prior_attempt/gaps: {gaps}")
        failed += 1
    else:
        print("[PASS] L2 failure surfaces in gaps/prior_attempt")

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

    if not test_n1_escalation():
        failed += 1
    if not test_lookup_with_code_not_write_intent():
        failed += 1
    if not test_hook_reject_not_real_user():
        failed += 1

    if failed:
        print(f"\n{failed} failed")
        return 1
    if not test_shell_warn_mode():
        return 1
    print(f"\nAll judge tests passed ({len(cases) + 6} cases + shell integration)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
