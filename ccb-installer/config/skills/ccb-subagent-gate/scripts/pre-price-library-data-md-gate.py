#!/usr/bin/env python3
"""PreToolUse gate: block price-library field writes until data.Md Read once per session."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from parse_transcript_data_md_gate import (  # noqa: E402
    DATA_MD_FALLBACK_PATH,
    WRITE_TOOL_NAMES,
    transcript_has_data_md_read,
)

DENY_REASON_TEMPLATE = (
    "改价格库字段前必须先 Read 一次字段语义契约 data.Md（本会话只需读一次）：\n"
    "  {data_md_path}\n"
    "完成 Read 后再调用 upsert / apply_price_library_import。"
)


def _transcript_candidates(hook_input: dict[str, object]) -> list[Path]:
    paths: list[Path] = []
    for key in ("transcript_path", "agent_transcript_path"):
        raw = str(hook_input.get(key) or "").strip()
        if raw:
            paths.append(Path(raw))
    return paths


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name not in WRITE_TOOL_NAMES:
        return 0

    if transcript_has_data_md_read(*_transcript_candidates(hook_input)):
        return 0

    data_md_path = (os.environ.get("WANDING_DATA_MD_PATH") or "").strip() or DATA_MD_FALLBACK_PATH
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": DENY_REASON_TEMPLATE.format(data_md_path=data_md_path),
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
