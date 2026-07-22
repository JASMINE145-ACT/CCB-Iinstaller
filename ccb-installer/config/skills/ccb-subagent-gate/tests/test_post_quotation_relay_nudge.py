#!/usr/bin/env python3
"""Tests for post-quotation-relay-nudge.py (WANd.QUOTE.RELAY.GUARD.001).

Contract: After mcp__quotation__select_quotation_candidates returns status=ok, the hook
emits a PostToolUse nudge listing the locked codes and the L1 § 查后多候选 GOOD pattern.
- Skips silently for non-select tool, non-ok status, or no selections.
- Dedupe 45s per session key.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "post-quotation-relay-nudge.py"
TMP = ROOT / "tests" / "fixtures" / "tmp-relay-nudge-logs"
# The hook writes to ${SUBAGENT_GATE_LOG_DIR}/post-quotation-relay-nudge/*.flag
FLAG_DIR = TMP / "post-quotation-relay-nudge"


def run_hook(payload: dict, session_id: str = "test-session-relay") -> dict:
    """Run the hook as a subprocess; parse stdout JSON or treat empty as no-nudge."""
    TMP.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["SUBAGENT_GATE_LOG_DIR"] = str(TMP)
    # Force UTF-8 I/O so subprocess doesn't trip on Windows GBK default.
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    proc = subprocess.run(
        [sys.executable, str(SCRIPT)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
        timeout=10,
    )
    assert proc.returncode == 0, f"hook exit={proc.returncode} stderr={proc.stderr}"
    out = proc.stdout.strip()
    if not out:
        return {}
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"_raw": out}


def clear_dedupe():
    if FLAG_DIR.exists():
        for f in FLAG_DIR.glob("*.flag"):
            f.unlink()


def test_skips_for_non_select_tool() -> None:
    clear_dedupe()
    out = run_hook({
        "tool_name": "mcp__quotation__match_quotation",
        "session_id": "s1",
        "tool_response": {"status": "ok", "selections": [{"code": "X"}]},
    })
    assert out == {}, f"non-select tool should produce no nudge, got {out!r}"


def test_skips_for_status_not_ok() -> None:
    clear_dedupe()
    out = run_hook({
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "session_id": "s2",
        "tool_response": {"status": "unable_to_select", "selections": []},
    })
    assert out == {}, f"unable_to_select should produce no nudge, got {out!r}"


def test_skips_for_empty_selections() -> None:
    clear_dedupe()
    out = run_hook({
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "session_id": "s3",
        "tool_response": {"status": "ok", "selections": []},
    })
    assert out == {}, f"empty selections should produce no nudge, got {out!r}"


def test_emits_nudge_for_select_ok_with_locked_codes() -> None:
    clear_dedupe()
    out = run_hook({
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "session_id": "s4",
        "tool_response": {
            "status": "ok",
            "selections": [
                {"keywords": "直接 50", "code": "8020020755", "unit_price": "1219"},
            ],
        },
    })
    assert "hookSpecificOutput" in out, f"expected nudge, got {out!r}"
    ctx = out["hookSpecificOutput"]["additionalContext"]
    assert "relay 守门" in ctx, "must have relay-guard header"
    assert "8020020755" in ctx, "must include locked code"
    assert "1219" in ctx, "must include unit_price"
    assert "推荐" in ctx, "must reference L1 § 查后多候选 GOOD pattern"
    assert "A 选项" in ctx, "must warn against the L1 BAD 形态"


def test_unwraps_acp_text_envelope() -> None:
    """ACP sometimes wraps payload as {'$text': '<json string>'}; the hook must unwrap."""
    clear_dedupe()
    wrapped = {"$text": json.dumps({
        "status": "ok",
        "selections": [{"code": "8010071381", "unit_price": 7604}],
    })}
    out = run_hook({
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "session_id": "s5",
        "tool_response": wrapped,
    })
    assert "hookSpecificOutput" in out, f"expected nudge after $text unwrap, got {out!r}"
    ctx = out["hookSpecificOutput"]["additionalContext"]
    assert "8010071381" in ctx
    assert "7604" in ctx


def test_unwraps_acp_content_array() -> None:
    """ACP rawOutput / content array envelope must also be unwrapped."""
    clear_dedupe()
    inner = json.dumps({
        "status": "ok",
        "selections": [{"code": "8010024812", "unit_price": 8410}],
    })
    wrapped = {"rawOutput": [{"type": "text", "text": inner}]}
    out = run_hook({
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "session_id": "s5b",
        "tool_response": wrapped,
    })
    assert "hookSpecificOutput" in out, f"expected nudge after rawOutput unwrap, got {out!r}"
    ctx = out["hookSpecificOutput"]["additionalContext"]
    assert "8010024812" in ctx
    assert "8410" in ctx


def test_dedupes_within_45_seconds_same_session() -> None:
    clear_dedupe()
    payload = {
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "session_id": "s6-dedupe",
        "tool_response": {"status": "ok", "selections": [{"code": "999", "unit_price": 1}]},
    }
    first = run_hook(payload)
    second = run_hook(payload)
    assert "hookSpecificOutput" in first, "first call must emit"
    assert second == {}, f"second call within 45s must dedupe, got {second!r}"


def test_dedupes_different_sessions_independently() -> None:
    clear_dedupe()
    base = {
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "tool_response": {"status": "ok", "selections": [{"code": "999", "unit_price": 1}]},
    }
    out_a = run_hook({**base, "session_id": "session-A"})
    out_b = run_hook({**base, "session_id": "session-B"})
    assert "hookSpecificOutput" in out_a
    assert "hookSpecificOutput" in out_b, "different session must NOT dedupe"


def test_handles_missing_session_id() -> None:
    """No session_id should still emit (defensive: can't dedupe without it)."""
    clear_dedupe()
    out = run_hook({
        "tool_name": "mcp__quotation__select_quotation_candidates",
        "tool_response": {"status": "ok", "selections": [{"code": "888", "unit_price": 99}]},
    })
    assert "hookSpecificOutput" in out, "missing session_id should still emit"


def test_handles_malformed_json_input() -> None:
    """Hook should exit 0 on garbage input (Claude Code doesn't crash on bad payloads)."""
    proc = subprocess.run(
        [sys.executable, str(SCRIPT)],
        input="not json",
        capture_output=True,
        text=True,
        env={**os.environ, "SUBAGENT_GATE_LOG_DIR": str(TMP)},
        timeout=10,
    )
    assert proc.returncode == 0
    assert proc.stdout.strip() == ""


def test_build_nudge_pure_function_shape() -> None:
    """Direct call to build_nudge for fast unit test without subprocess overhead."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "post_quotation_relay_nudge", str(ROOT / "scripts" / "post-quotation-relay-nudge.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    text = mod.build_nudge([
        {"code": "8020020755", "unit_price": "1219"},
        {"code": "8010071381", "unit_price": "7604"},
    ])
    assert "8020020755 ¥1219" in text
    assert "8010071381 ¥7604" in text
    assert "、".join(["8020020755 ¥1219", "8010071381 ¥7604"]) in text
