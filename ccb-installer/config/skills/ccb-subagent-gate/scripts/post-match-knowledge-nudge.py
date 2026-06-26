#!/usr/bin/env python3
"""PostToolUse hook: after multi-candidate match, nudge one Read of business knowledge."""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from match_selection_payload import (  # noqa: E402
    knowledge_source_from_payload,
    multi_candidate_keywords,
    payload_is_multi_candidate,
    unwrap_tool_payload,
)

MATCH_TOOL_NAMES = {
    "mcp__quotation__match_quotation",
    "mcp__quotation__match_quotation_batch",
}
DEDUPE_WINDOW_SEC = 45
KNOWLEDGE_FALLBACK = (
    r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
)


def _log_dir() -> Path:
    base = os.environ.get("SUBAGENT_GATE_LOG_DIR") or os.environ.get("LOCALAPPDATA")
    if base:
        return Path(base) / "post-match-nudge"
    return Path.home() / ".claude" / "logs" / "post-match-nudge"


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


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name not in MATCH_TOOL_NAMES:
        return 0

    payload = unwrap_tool_payload(hook_input.get("tool_response"))
    if not payload or not payload_is_multi_candidate(payload):
        return 0

    session_id = str(hook_input.get("session_id") or "")
    if not _should_emit_nudge(session_id):
        return 0

    kb_path = knowledge_source_from_payload(payload) or KNOWLEDGE_FALLBACK
    keywords = multi_candidate_keywords(payload)
    kw_hint = "、".join(keywords[:5])
    if len(keywords) > 5:
        kw_hint += f" 等 {len(keywords)} 条"

    context_lines = [
        "【硬约束 — 多候选选型】",
        "match_quotation 返回 candidate_count > 1。",
        "等本轮所有 match 工具结果都返回后，Read 一次业务知识库（不要每个产品各 Read 一次）：",
        f"  {kb_path}",
    ]
    if kw_hint:
        context_lines.append(f"本轮多候选 keywords：{kw_hint}。")
    context_lines.extend(
        [
            "Read 完成后：每个 keyword 各输出 1 条推荐价 + ≤4 条 bullet「其他可能」。",
            "禁止在未 Read 前向用户写「根据知识库」「按默认规则」等表述。",
            "禁止把默认候选窗口整表倒灌或「请回复序号 1–N」。",
        ]
    )

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": "\n".join(context_lines),
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
