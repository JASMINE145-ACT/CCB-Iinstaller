#!/usr/bin/env python3
"""Tests for WANd.ORCH.OUTCOME_RELAY.001 parent delivery gate."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = ROOT / "scripts" / "lib" / "parse_transcript_outcome_relay.py"
FIX = ROOT / "tests" / "fixtures" / "transcripts"
LOG = ROOT / "tests" / "fixtures" / ".outcome-relay-pytest-logs"


def run_eval(
    fixture: str,
    last_msg: str = "",
    session: str = "orch-relay-test",
    agent: str = "wande-orchestrator",
    *,
    clear_counts: bool = True,
) -> tuple[int, dict]:
    LOG.mkdir(parents=True, exist_ok=True)
    counts = LOG / "subagent-gate-outcome-relay-counts.json"
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
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=os.environ.copy(),
    )
    data = json.loads(proc.stdout.strip() or "{}")
    return proc.returncode, data


def test_hollow_parent_nudge() -> None:
    code, data = run_eval(
        "outcome-relay-hollow-parent.jsonl",
        last_msg="好的admin，这就基于上两轮的结果帮您填一份报价单。",
        session="hollow-1",
    )
    assert code == 10, data
    assert data.get("verdict") == "block"
    assert data.get("step") == "nudge"
    assert "OUTCOME-RELAY" in (data.get("reject_prompt") or "")
    assert "Wanding-Quotation" in (data.get("reject_prompt") or "")


def test_hollow_parent_force_forward_on_second() -> None:
    code1, data1 = run_eval(
        "outcome-relay-hollow-parent.jsonl",
        last_msg="好的admin，这就基于上两轮的结果帮您填一份报价单。",
        session="hollow-2",
        clear_counts=True,
    )
    assert code1 == 10, data1
    assert data1.get("step") == "nudge", data1
    code, data = run_eval(
        "outcome-relay-hollow-parent.jsonl",
        last_msg="好的admin，这就基于上两轮的结果帮您填一份报价单。",
        session="hollow-2",
        clear_counts=False,
    )
    assert code == 10, data
    assert data.get("step") == "force_forward", data
    prompt = data.get("reject_prompt") or ""
    assert "DETERMINISTIC FORWARD" in prompt, prompt[:500]
    snippet = data.get("forward_snippet") or ""
    assert "Wanding-Quotation_20260715_194842.xlsx" in snippet, snippet
    assert "filled_count: 1" in snippet, snippet


def test_hollow_parent_escalate_third() -> None:
    sess = "hollow-3"
    for _ in range(2):
        run_eval(
            "outcome-relay-hollow-parent.jsonl",
            last_msg="空壳",
            session=sess,
            clear_counts=False if _ else True,
        )
    code, data = run_eval(
        "outcome-relay-hollow-parent.jsonl",
        last_msg="空壳",
        session=sess,
        clear_counts=False,
    )
    assert code == 20, data
    assert data.get("escalated") is True
    assert data.get("verdict") == "pass"


def test_parent_ok_pass() -> None:
    code, data = run_eval(
        "outcome-relay-parent-ok.jsonl",
        last_msg=(
            "报价单已生成。\n"
            "- 文件：`D:\\CCB-Wanding\\workspace\\Wanding-Quotation_20260716.xlsx`\n"
            "- 成功填写：2 项"
        ),
        session="ok-1",
    )
    assert code == 0, data
    assert data.get("verdict") == "pass"
    assert data.get("step") == "delivered"


def test_no_artifact_query_delivered_pass() -> None:
    # Query-type result (price table, no artifact) + parent relays code → pass.
    code, data = run_eval(
        "outcome-relay-no-artifact.jsonl",
        last_msg="推荐 8020020755，B档 1219。",
        session="price-1",
    )
    assert code == 0, data
    assert data.get("verdict") == "pass"
    assert data.get("step") == "delivered", data
    assert data.get("delivery_kind") == "query", data


def test_query_hollow_nudge() -> None:
    code, data = run_eval(
        "outcome-relay-query-hollow.jsonl",
        last_msg="admin，我在的，您接下来要查什么请直接说一声就行。",
        session="query-hollow-1",
    )
    assert code == 10, data
    assert data.get("verdict") == "block"
    assert data.get("step") == "nudge"
    assert data.get("delivery_kind") == "query", data
    prompt = data.get("reject_prompt") or ""
    assert "OUTCOME-RELAY" in prompt
    assert "8020020755" in prompt, prompt[:500]


def test_query_hollow_force_forward_on_second() -> None:
    sess = "query-hollow-2"
    code1, data1 = run_eval(
        "outcome-relay-query-hollow.jsonl",
        last_msg="admin，我在的。",
        session=sess,
        clear_counts=True,
    )
    assert code1 == 10 and data1.get("step") == "nudge", data1
    code, data = run_eval(
        "outcome-relay-query-hollow.jsonl",
        last_msg="admin，我在的。",
        session=sess,
        clear_counts=False,
    )
    assert code == 10, data
    assert data.get("step") == "force_forward", data
    snippet = data.get("forward_snippet") or ""
    assert "8020020755" in snippet, snippet
    assert "1,219" in snippet or "1219" in snippet, snippet


def test_query_error_result_pass() -> None:
    # Errored Agent tool_result ("price" keyword + trace digits) must not be
    # classified as a query delivery — gate stays silent (regex false-positive guard).
    code, data = run_eval(
        "outcome-relay-query-error.jsonl",
        last_msg="报价子系统暂时超时了，我稍后再帮您重试。",
        session="query-error-1",
    )
    assert code == 0, data
    assert data.get("step") == "no_artifact", data


def test_query_noresult_json_pass() -> None:
    # Bare no-result JSON is not a substantive query delivery; gate stays out.
    code, data = run_eval(
        "outcome-relay-query-noresult.jsonl",
        last_msg="供应商名录里没有匹配「直接50」的厂家。",
        session="query-empty-1",
    )
    assert code == 0, data
    assert data.get("step") == "no_artifact", data


def test_not_orchestrator_skip() -> None:
    code, data = run_eval(
        "outcome-relay-hollow-parent.jsonl",
        last_msg="空壳",
        session="skip-q",
        agent="quotation-agent",
    )
    assert code == 0, data
    assert data.get("step") == "skip"


def test_later_user_turn_pass() -> None:
    code, data = run_eval(
        "outcome-relay-later-thanks.jsonl",
        last_msg="不客气，还有需要再说。",
        session="thanks-1",
    )
    assert code == 0, data
    assert data.get("step") == "new_user_turn", data
    assert data.get("reason") == "new_user_turn_after_artifact"


def main() -> int:
    tests = [
        test_hollow_parent_nudge,
        test_hollow_parent_force_forward_on_second,
        test_hollow_parent_escalate_third,
        test_parent_ok_pass,
        test_no_artifact_query_delivered_pass,
        test_query_hollow_nudge,
        test_query_hollow_force_forward_on_second,
        test_query_error_result_pass,
        test_query_noresult_json_pass,
        test_not_orchestrator_skip,
        test_later_user_turn_pass,
    ]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL {fn.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"ERROR {fn.__name__}: {exc}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
