#!/usr/bin/env python3
"""ROE (Result-Oriented Execution) transcript evaluator for quotation-agent Stop hook."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

WRITE_VERB_RE = re.compile(r"改|删|填|更新|写入|追加|删除|清空")
WRITE_NOUN_RE = re.compile(r"报价单|删行|改价")
READONLY_LOOKUP_RE = re.compile(r"查询|查价|询价|多少|什么价|查一下|推荐价")
ROW_EDIT_RE = re.compile(r"第\d+行")
PRICE_EDIT_RE = re.compile(r"价格.{0,10}(改|成|为)|改.{0,10}价格")
COMMITMENT_RE = re.compile(
    r"收到|好的|我来|马上|继续|将会|update|处理|已安排|将",
    re.IGNORECASE,
)
WRITE_OBJECT_RE = re.compile(
    r"改|删|填|更新|写入|追加|报价单|行|价格|\bcode\b",
    re.IGNORECASE,
)
CLARIFY_PROMPT_RE = re.compile(r"请确认|请回复|需要你选择|请选择|你希望")
CLARIFY_OPTIONS_RE = re.compile(
    r"(?:\b[A-Ca-c]\b.*[/／].*\b[A-Ca-c]\b)|(?:\b[123]\b.*[/／].*\b[123]\b)|(?:[ABCabc]\s*[/／]\s*[ABCabc])"
)
CLARIFY_MISSING_RE = re.compile(r"缺少|无法确定|需要.{0,12}确定")

L2_TOOL_MARKERS = (
    "fill_quotation_sheet",
    "edit_excel",
    "mcp__excel__write",
)

FAILURE_MARKERS_RE = re.compile(
    r'"is_error"\s*:\s*true|\berror\b|\bfailed\b|\bREJECT\b|\bexception\b|exit code [1-9]',
    re.IGNORECASE,
)

ROE_MAX_BLOCKS = 5


def _loads_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _iter_content_blocks(obj: dict[str, Any]) -> list[dict[str, Any]]:
    message = obj.get("message")
    if not isinstance(message, dict):
        return []
    content = message.get("content")
    if isinstance(content, list):
        return [block for block in content if isinstance(block, dict)]
    return []


def _user_text_from_obj(obj: dict[str, Any]) -> str:
    if obj.get("type") != "user":
        return ""
    message = obj.get("message")
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    parts: list[str] = []
    if isinstance(content, str):
        parts.append(content)
    elif isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_result":
                continue
            if block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
    return "\n".join(parts).strip()


def _is_real_user_message(obj: dict[str, Any]) -> bool:
    if obj.get("type") != "user":
        return False
    message = obj.get("message")
    if not isinstance(message, dict):
        return False
    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return True
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_result":
                continue
            if block.get("type") == "text" and str(block.get("text") or "").strip():
                return True
    return False


def _assistant_text_from_obj(obj: dict[str, Any]) -> str:
    if obj.get("type") != "assistant":
        return ""
    message = obj.get("message")
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    parts: list[str] = []
    if isinstance(content, str):
        parts.append(content)
    elif isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
    return "\n".join(parts).strip()


def _last_assistant_text(lines: list[str]) -> str:
    for line in reversed(lines):
        obj = _loads_line(line)
        if not obj:
            continue
        text = _assistant_text_from_obj(obj)
        if text:
            return text
    return ""


def has_write_intent(text: str) -> bool:
    if not text:
        return False
    if READONLY_LOOKUP_RE.search(text) and not WRITE_VERB_RE.search(text):
        if "报价单" not in text and not ROW_EDIT_RE.search(text):
            return False
    if WRITE_VERB_RE.search(text) or WRITE_NOUN_RE.search(text):
        return True
    if PRICE_EDIT_RE.search(text) or ROW_EDIT_RE.search(text):
        return True
    if re.search(r"\bcode\b", text, re.IGNORECASE):
        return True
    return False


def is_clarification_message(text: str) -> bool:
    if not text or not CLARIFY_PROMPT_RE.search(text):
        return False
    if CLARIFY_OPTIONS_RE.search(text):
        return True
    if CLARIFY_MISSING_RE.search(text):
        return True
    return False


def _has_commitment_and_write_object(text: str) -> bool:
    return bool(
        text
        and COMMITMENT_RE.search(text)
        and WRITE_OBJECT_RE.search(text)
    )


def is_promise_signal(text: str) -> bool:
    return _has_commitment_and_write_object(text) and not is_clarification_message(text)


def is_promise_without_tool(text: str, has_l2: bool) -> bool:
    return is_promise_signal(text) and not has_l2


def _tool_name_matches_l2(name: str) -> bool:
    for marker in L2_TOOL_MARKERS:
        if marker in name:
            return True
    return False


def _tool_result_is_success(block: dict[str, Any], raw_line: str) -> bool:
    if block.get("is_error") is True:
        return False
    payload = block.get("content")
    if isinstance(payload, str):
        text = payload
    else:
        text = json.dumps(payload, ensure_ascii=False) if payload is not None else raw_line
    if FAILURE_MARKERS_RE.search(text):
        if '"is_error"' in text and re.search(r'"is_error"\s*:\s*false', text, re.I):
            pass
        elif re.search(r'"is_error"\s*:\s*true', text, re.I):
            return False
        elif re.search(r'\b(error|failed|REJECT|exception)\b', text, re.I):
            return False
    if re.search(r'"is_error"\s*:\s*true', text, re.I):
        return False
    return True


def has_l2_write_success_in_window(window_lines: list[str]) -> bool:
    pending_tools: list[str] = []
    for line in window_lines:
        obj = _loads_line(line)
        if not obj:
            continue
        for block in _iter_content_blocks(obj):
            block_type = block.get("type")
            if block_type == "tool_use":
                name = str(block.get("name") or block.get("toolName") or "")
                if _tool_name_matches_l2(name):
                    pending_tools.append(name)
            elif block_type == "tool_result" and pending_tools:
                if _tool_result_is_success(block, line):
                    return True
                pending_tools.pop(0)
    return False


def extract_intent_window(
    lines: list[str],
) -> tuple[int, list[str], str, bool]:
    """Return (start_line_index, window_lines, window_user_text, has_write_intent)."""
    user_indices: list[tuple[int, str]] = []
    for idx, line in enumerate(lines):
        obj = _loads_line(line)
        if obj and _is_real_user_message(obj):
            user_indices.append((idx, _user_text_from_obj(obj)))

    last_assistant = _last_assistant_text(lines)

    write_start: int | None = None
    write_text = ""
    for idx, text in reversed(user_indices):
        if has_write_intent(text):
            write_start = idx
            write_text = text
            break

    if write_start is not None:
        window = lines[write_start:]
        return write_start, window, write_text, True

    if is_promise_signal(last_assistant) and user_indices:
        idx, text = user_indices[-1]
        return idx, lines[idx:], text, has_write_intent(text)

    if user_indices:
        idx, text = user_indices[-1]
        return idx, lines[idx:], text, has_write_intent(text)

    return 0, lines, "", False


def window_key(session_id: str, start_line: int, user_text: str) -> str:
    digest = hashlib.sha256(user_text.encode("utf-8")).hexdigest()[:12]
    return f"{session_id}:{start_line}:{digest}"


def load_block_count(counts_path: Path, key: str) -> int:
    if not counts_path.is_file():
        return 0
    try:
        data = json.loads(counts_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return 0
    value = data.get(key, 0)
    return int(value) if isinstance(value, int) else 0


def save_block_count(counts_path: Path, key: str, count: int) -> None:
    counts_path.parent.mkdir(parents=True, exist_ok=True)
    data: dict[str, Any] = {}
    if counts_path.is_file():
        try:
            data = json.loads(counts_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            data = {}
    data[key] = count
    counts_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def evaluate_roe(
    transcript_path: Path,
    session_id: str,
    last_assistant_message: str,
    log_dir: Path,
) -> dict[str, Any]:
    if not transcript_path.is_file():
        return {
            "verdict": "pass",
            "step": 4,
            "reason": "transcript missing",
        }

    lines = transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()
    start_idx, window_lines, window_user_text, window_write_intent = extract_intent_window(
        lines
    )
    last_assistant = last_assistant_message.strip() or _last_assistant_text(lines)
    has_l2 = has_l2_write_success_in_window(window_lines)
    wkey = window_key(session_id, start_idx, window_user_text)
    counts_path = log_dir / "subagent-gate-roe-counts.json"
    block_count = load_block_count(counts_path, wkey)

    base = {
        "window_start_line": start_idx,
        "window_key": wkey,
        "window_user_text_preview": window_user_text[:120],
        "has_write_intent": window_write_intent,
        "has_l2": has_l2,
        "roe_block_count": block_count,
        "last_assistant_preview": last_assistant[:160],
    }

    # Step 2: L2 write success in window
    if has_l2:
        return {**base, "verdict": "pass", "step": 2, "reason": "l2_write_success"}

    # Step 3: true clarification
    if is_clarification_message(last_assistant):
        return {**base, "verdict": "pass", "step": 3, "reason": "clarification"}

    # Step 4: no write intent and no promise signal
    if not window_write_intent and not is_promise_signal(last_assistant):
        return {**base, "verdict": "pass", "step": 4, "reason": "no_roe_scope"}

    # Step 5: escalation
    if block_count >= ROE_MAX_BLOCKS:
        return {
            **base,
            "verdict": "pass",
            "step": 5,
            "reason": "escalated_max_blocks",
            "escalated": True,
        }

    # Step 6: block
    if window_write_intent:
        block_reason = "write-intent"
    elif is_promise_without_tool(last_assistant, has_l2):
        block_reason = "promise-without-tool"
    else:
        return {**base, "verdict": "pass", "step": 4, "reason": "no_block_rule_matched"}

    new_count = block_count + 1
    save_block_count(counts_path, wkey, new_count)
    return {
        **base,
        "verdict": "block",
        "step": 6,
        "reason": block_reason,
        "roe_block_count": new_count,
    }


def append_roe_log(log_dir: Path, session_id: str, agent_type: str, result: dict[str, Any]) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "subagent-gate-roe.log"
    from datetime import datetime, timezone

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = (
        f"[{ts}] session={session_id} agent={agent_type} "
        f"verdict={result.get('verdict')} step={result.get('step')} "
        f"reason={result.get('reason')} window_key={result.get('window_key')} "
        f"roe_block_count={result.get('roe_block_count')}"
    )
    if result.get("escalated"):
        line += " escalated_max_blocks=true"
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "evaluate":
        print(
            "usage: parse_transcript_roe.py evaluate <transcript_path> "
            "<session_id> [last_assistant_message] [log_dir]",
            file=sys.stderr,
        )
        return 2

    transcript_path = Path(argv[2])
    session_id = argv[3] if len(argv) > 3 else "unknown"
    last_msg = argv[4] if len(argv) > 4 else ""
    log_dir = Path(argv[5]) if len(argv) > 5 else Path(
        Path.home() / ".claude" / "logs"
    )

    result = evaluate_roe(transcript_path, session_id, last_msg, log_dir)
    print(json.dumps(result, ensure_ascii=False))
    if result.get("verdict") == "block":
        return 10
    if result.get("escalated"):
        return 20
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
