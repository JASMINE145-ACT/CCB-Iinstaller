#!/usr/bin/env python3
"""PreToolUse gate: block match_quotation until business knowledge Read once per session."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from parse_transcript_knowledge_gate import (  # noqa: E402
    KNOWLEDGE_FALLBACK_PATH,
    MATCH_TOOL_NAMES,
    hook_input_has_knowledge_read,
)

DENY_REASON_TEMPLATE = (
    "查价前必须先 Read 一次业务知识库（本会话只需读一次，后续查价不必重复 Read）：\n"
    "  {kb_path}\n"
    "完成 Read 后再调用 match_quotation。"
)


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name not in MATCH_TOOL_NAMES:
        return 0

    if hook_input_has_knowledge_read(hook_input):
        return 0

    kb_path = (os.environ.get("WANDING_BUSINESS_KNOWLEDGE_PATH") or "").strip() or KNOWLEDGE_FALLBACK_PATH
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": DENY_REASON_TEMPLATE.format(kb_path=kb_path),
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
