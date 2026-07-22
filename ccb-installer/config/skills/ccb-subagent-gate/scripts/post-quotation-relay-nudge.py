#!/usr/bin/env python3
"""PostToolUse hook: after select_quotation_candidates status=ok, nudge sub-agent to include
locked code in the next assistant text.

Contract: WANd.QUOTE.RELAY.GUARD.001
- Goal: prevent the regression surfaced 2026-07-19 where sub-agent returned the GOOD
  pattern's data via tool calls but its final assistant text claimed "按 A 选项保持当前
  查价结果(已交付,无需再写)" and never relayed the locked code/unit_price to the user.
- Behavior: nudge-only (modes.json quotation-agent:relay-guard = off by default);
  emits a context line listing the locked codes and the L1 § 查后多候选 GOOD pattern
  reminder. Sub-agent ROE remains the only block-mode path (quotation-agent:roe-judge).
- Dedupe: 45s session key, same as post-match-knowledge-nudge.py.
- Action names: PostToolUse on mcp__quotation__select_quotation_candidates only.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

# Force UTF-8 stdout on Windows so emoji / CJK / ¥ don't crash against GBK cp.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from match_selection_payload import unwrap_tool_payload  # noqa: E402

SELECT_TOOL_NAME = "mcp__quotation__select_quotation_candidates"
DEDUPE_WINDOW_SEC = 45


def _log_dir() -> Path:
    base = os.environ.get("SUBAGENT_GATE_LOG_DIR") or os.environ.get("LOCALAPPDATA")
    if base:
        return Path(base) / "post-quotation-relay-nudge"
    return Path.home() / ".claude" / "logs" / "post-quotation-relay-nudge"


def _safe_session_id(session_id: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", session_id.strip())
    return cleaned or "unknown"


def _should_emit_nudge(session_id: str) -> bool:
    if not session_id:
        return True
    flag_dir = _log_dir()
    flag_dir.mkdir(parents=True, exist_ok=True)
    flag_file = flag_dir / f"{_safe_session_id(session_id)}.flag"
    now = time.time()
    if flag_file.is_file():
        try:
            data = json.loads(flag_file.read_text(encoding="utf-8"))
            if now - float(data.get("ts", 0)) < DEDUPE_WINDOW_SEC:
                return False
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            pass
    flag_file.write_text(json.dumps({"ts": now}), encoding="utf-8")
    return True


def _parse_envelope(payload: dict) -> dict | None:
    """Return the inner status/selections dict from one of: top-level, ACP $text envelope, or content array.

    ACP tool responses can be wrapped in multiple ways:
    - {"status": "ok", "selections": [...]}                        (ideal — top-level)
    - {"$text": "{...}"}                                            (ACP envelope)
    - {"content": [{"type":"text","text":"{...}"}]}                 (content array)
    - {"rawOutput": [{"type":"text","text":"{...}"}]}               (rawOutput array)
    Returns None if no usable inner dict found.
    """
    def _from_text(text: str) -> dict | None:
        if not text or not text.strip():
            return None
        try:
            nested = json.loads(text.strip())
        except json.JSONDecodeError:
            return None
        return nested if isinstance(nested, dict) else None

    if not isinstance(payload, dict):
        return None
    # Fast path: top-level status + selections already present
    if "status" in payload or "selections" in payload:
        return payload
    if isinstance(payload.get("$text"), str):
        inner = _from_text(payload["$text"])
        if inner is not None:
            return inner
    for wrapper_key in ("content", "rawOutput"):
        wrapper = payload.get(wrapper_key)
        if isinstance(wrapper, list):
            for item in wrapper:
                if not isinstance(item, dict):
                    continue
                text = item.get("text")
                if isinstance(text, str):
                    inner = _from_text(text)
                    if inner is not None:
                        return inner
                # content may be nested: {"content": {"type":"text","text": "..."}}
                inner_obj = item.get("content")
                if isinstance(inner_obj, dict):
                    text = inner_obj.get("text")
                    if isinstance(text, str):
                        inner = _from_text(text)
                        if inner is not None:
                            return inner
    return None


def _extract_selections(payload: dict) -> list[dict]:
    """Return selections[] from the inner envelope, regardless of ACP wrapping."""
    inner = _parse_envelope(payload)
    if not isinstance(inner, dict):
        return []
    selections = inner.get("selections")
    if isinstance(selections, list):
        return [s for s in selections if isinstance(s, dict)]
    return []


def _extract_status(payload: dict) -> str:
    """Return the status string from the inner envelope (or empty if not parseable)."""
    inner = _parse_envelope(payload)
    if not isinstance(inner, dict):
        return ""
    return str(inner.get("status") or "").strip().lower()


def _format_locked_codes(selections: list[dict]) -> str:
    parts: list[str] = []
    for s in selections:
        code = str(s.get("code") or "").strip()
        if not code:
            continue
        price = s.get("unit_price")
        if price is not None and str(price).strip():
            parts.append(f"{code} ¥{price}")
        else:
            parts.append(code)
    return "、".join(parts)


def build_nudge(selections: list[dict]) -> str:
    """Pure function so tests can call directly without subprocess."""
    locked = _format_locked_codes(selections)
    lines = [
        "【硬约束 — relay 守门】",
        f"select_quotation_candidates 返回 status=ok，锁码：{locked or '(无)'}。",
        "下一条 assistant 文本必须显式包含锁码 + 单价（用户气泡需要看得到）。",
        "参考 L1 § 查后多候选 GOOD 形态：",
        "  推荐(B档): <code> <name> <price>  选型理由: <一行>",
        "  其他可能: ≤4 bullet",
        "  货源(名录): ≥1 条 <name_zh> — <snippet>（必须来自 suppliers_hybrid_match；未调 hybrid 则先补调再回复）",
        "禁止用「按 A 选项已交付」「如要出单请明确告诉我」式空壳确认代替实际推荐价。",
        "禁止只有价表、没有名录段（WANd.TRADE.SOURCING.DUAL.001）。",
        "禁止把 select 返回的 reason 丢弃 — 应写进「备注」或紧随推荐价之后。",
    ]
    return "\n".join(lines)


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name != SELECT_TOOL_NAME:
        return 0

    payload = unwrap_tool_payload(hook_input.get("tool_response"))
    if not isinstance(payload, dict):
        return 0
    if _extract_status(payload) != "ok":
        return 0

    selections = _extract_selections(payload)
    if not selections:
        return 0

    # Only NOW do we know we're emitting, so dedupe check happens last.
    session_id = str(hook_input.get("session_id") or "").strip()
    if not _should_emit_nudge(session_id):
        return 0

    additional = build_nudge(selections)
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": additional,
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
