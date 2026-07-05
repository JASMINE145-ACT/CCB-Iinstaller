#!/usr/bin/env python3
"""PostToolUse: mark session after Read(wanding_business_knowledge) for PreToolUse gate."""
from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from hook_transcript import READ_TOOL_NAMES, read_tool_file_path  # noqa: E402
from parse_transcript_knowledge_gate import (  # noqa: E402
    _payload_has_knowledge_mark,
    mark_session_knowledge_read,
)


def _tool_input_is_knowledge_read(tool_name: str, tool_input: object) -> bool:
    if tool_name not in READ_TOOL_NAMES:
        return False
    if not isinstance(tool_input, dict):
        return False
    block = {"input": tool_input}
    file_path = read_tool_file_path(block)
    if file_path and _payload_has_knowledge_mark(file_path):
        return True
    return _payload_has_knowledge_mark(json.dumps(tool_input, ensure_ascii=False))


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    tool_input = hook_input.get("tool_input")
    if hook_input.get("is_error") is True:
        return 0
    tool_response = hook_input.get("tool_response")
    if isinstance(tool_response, dict) and tool_response.get("is_error") is True:
        return 0
    if not _tool_input_is_knowledge_read(tool_name, tool_input):
        return 0

    session_id = str(hook_input.get("session_id") or "").strip()
    mark_session_knowledge_read(session_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
