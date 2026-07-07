#!/usr/bin/env python3
"""PostToolUse: invalidate knowledge effectiveness after append_business_rule confirmed=true."""
from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from knowledge_effectiveness import invalidate_knowledge  # noqa: E402

APPEND_TOOL_NAMES = frozenset(
    {
        "mcp__quotation__append_business_rule",
        "append_business_rule",
    }
)


def _coerce_bool(value: object) -> bool:
    if value is True:
        return True
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "confirmed"}
    return False


def _params_confirmed(hook_input: dict[str, object]) -> bool:
    for key in ("tool_input", "tool_parameters", "parameters"):
        raw = hook_input.get(key)
        if isinstance(raw, dict) and _coerce_bool(raw.get("confirmed")):
            return True
    return False


def _response_applied(hook_input: dict[str, object]) -> bool:
    response = hook_input.get("tool_response")
    if not isinstance(response, dict):
        return False
    if response.get("applied") is True or response.get("success") is True:
        if _coerce_bool(response.get("confirmed")) or response.get("rule_text"):
            return True
    return False


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name not in APPEND_TOOL_NAMES:
        return 0
    if hook_input.get("is_error") is True:
        return 0

    if not (_params_confirmed(hook_input) or _response_applied(hook_input)):
        return 0

    session_id = str(hook_input.get("session_id") or "").strip()
    invalidate_knowledge(session_id, "append_business_rule_confirmed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
