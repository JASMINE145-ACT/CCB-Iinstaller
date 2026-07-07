#!/usr/bin/env python3
"""PreToolUse gate: block match_quotation until business knowledge Read once per session."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from hook_transcript import resolve_hook_transcript_paths  # noqa: E402
from parse_transcript_knowledge_gate import (  # noqa: E402
    KNOWLEDGE_FALLBACK_PATH,
    MATCH_TOOL_NAMES,
    transcript_has_knowledge_read,
)
from knowledge_effectiveness import (  # noqa: E402
    deny_reason_for_code,
    knowledge_is_effective,
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

    paths = resolve_hook_transcript_paths(hook_input)
    has_transcript_read = transcript_has_knowledge_read(*paths)
    session_id = str(hook_input.get("session_id") or "").strip()
    from parse_transcript_knowledge_gate import session_has_knowledge_read_flag  # noqa: E402

    legacy_read = bool(session_id and session_has_knowledge_read_flag(session_id))

    effective, reason_code = knowledge_is_effective(
        hook_input,
        transcript_has_read=has_transcript_read,
        session_has_legacy_read=legacy_read,
    )
    if effective:
        return 0

    kb_path = (os.environ.get("WANDING_BUSINESS_KNOWLEDGE_PATH") or "").strip() or KNOWLEDGE_FALLBACK_PATH
    deny_reason = deny_reason_for_code(reason_code, kb_path) if reason_code else DENY_REASON_TEMPLATE.format(kb_path=kb_path)
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": deny_reason,
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
