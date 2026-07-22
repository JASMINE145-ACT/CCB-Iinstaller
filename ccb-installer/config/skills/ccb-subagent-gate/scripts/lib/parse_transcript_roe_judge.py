#!/usr/bin/env python3
"""Universal ROE gate — end_turn only; write-anchor window + L2 evidence + Already done REJECT."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

CLARIFY_PROMPT_RE = re.compile(r"请确认|请回复|需要你选择|请选择|你希望")
CLARIFY_OPTIONS_RE = re.compile(
    r"(?:\b[A-Ca-c]\b.*[/／].*\b[A-Ca-c]\b)|(?:\b[123]\b.*[/／].*\b[123]\b)|(?:[ABCabc]\s*[/／]\s*[ABCabc])"
)
CLARIFY_MISSING_RE = re.compile(r"缺少|无法确定|需要.{0,12}确定")
HOOK_REJECT_RE = re.compile(
    r"^(?:Stop hook feedback:|REJECT:\s*(?:\[ROE-GATE)?|\[ROE-GATE)", re.I
)
SKILL_INJECTION_RE = re.compile(
    r"<skill-format>\s*true\s*</skill-format>|<loaded-skill\b|^Base directory for this skill:",
    re.I,
)
HANDOFF_BRIEF_MARKER = "<!-- WANd.HANDOFF.BRIEF.001 -->"
HANDOFF_USER_QUOTE_RE = re.compile(r"(?m)^\s*(?:[-*]\s*)?用户原话\s*[：:]\s*(.+?)\s*$")
HANDOFF_GOAL_SECTION_RE = re.compile(r"(?m)^## Goal\s*\n(.+?)(?=^## |\Z)", re.S)
EXPLICIT_EXPORT_INTENT_RE = re.compile(
    r"导出\s*(?:为|成)?\s*(?:xlsx|excel|csv|md|文件|报告)|"
    r"生成\s*(?:xlsx|excel|csv|md|文件|报告文件)|"
    r"落盘\s*(?:md|csv|xlsx|文件)",
    re.I,
)
NEGATED_WRITE_RE = re.compile(
    r"(?:不要|无需|不需要|不必|禁止|别|不强制|未)\s*"
    r"(?:再|自动|直接|额外|强制)?\s*"
    r"(?:生成|制作|导出|填写|填进|填入|写入|修改|更新|删除|清空)\s*"
    r"(?:Excel|excel|报价单|文件|表格|规则|数据)?"
)

WRITE_VERB_RE = re.compile(r"改|删|填|写|更新|写入|追加|删除|清空|生成|制作|导出")
WRITE_NOUN_RE = re.compile(r"报价单|删行|改价")
READONLY_LOOKUP_RE = re.compile(r"查询|查价|询价|多少|什么价|查一下|推荐价|库存")
ROW_EDIT_RE = re.compile(r"第\d+行")
PRICE_EDIT_RE = re.compile(r"价格.{0,10}(改|成|为)|改.{0,10}价格")

FAILURE_MARKERS_RE = re.compile(
    r'"is_error"\s*:\s*true|\berror\b|\bfailed\b|\bREJECT\b|\bexception\b|exit code [1-9]',
    re.IGNORECASE,
)

DEFAULT_L2_MARKERS = (
    "fill_quotation_sheet",
    "edit_excel",
    "mcp__excel__write",
)

# Lightweight fuse: one block then escalate→pass. Profiles may raise via max_blocks.
JUDGE_MAX_BLOCKS = 1

AGENT_EXECUTE_HINTS: dict[str, str] = {
    "quotation-agent": (
        "Do NOT repeat lookup tools already done above. "
        "Call fill_quotation_sheet with fill_items + require_exact_codes=true (Path C; omit file_path) "
        "or edit_excel for single-cell patches."
    ),
    "word-creator": "Call the office-word MCP tool to create or update the document.",
    "ppt-creator": "Call the office/ppt MCP tool to produce or update the deck.",
    "excel-creator": "Call the excel MCP write tool with file_path and fill_items.",
    "accurate-agent": "Call accurate_summarize_records or the correct accounting MCP with required parameters.",
}


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
        return [b for b in content if isinstance(b, dict)]
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


def _extract_handoff_user_text(text: str) -> str:
    """Use the original user utterance, not generated Goal/Prohibitions, as ROE intent."""
    if HANDOFF_BRIEF_MARKER not in text:
        return text
    match = HANDOFF_USER_QUOTE_RE.search(text)
    if not match:
        return text
    value = match.group(1).strip()
    quote_pairs = (("「", "」"), ("“", "”"), ('"', '"'), ("'", "'"))
    for left, right in quote_pairs:
        if value.startswith(left) and value.endswith(right) and len(value) >= 2:
            return value[len(left) : -len(right)].strip()
    return value


def _extract_brief_goal(text: str) -> str:
    if HANDOFF_BRIEF_MARKER not in text:
        return ""
    match = HANDOFF_GOAL_SECTION_RE.search(text)
    return match.group(1).strip() if match else ""


def explicit_export_intent(text: str) -> bool:
    """True when the user-facing ask explicitly requests file export/delivery."""
    return bool(text and EXPLICIT_EXPORT_INTENT_RE.search(text))


def skip_readonly_patterns_from_profile(profile: dict[str, Any]) -> tuple[str, ...]:
    raw = profile.get("skip_readonly_patterns")
    if not isinstance(raw, list):
        return ()
    return tuple(str(p) for p in raw if p)


def matches_readonly_skip(text: str, patterns: tuple[str, ...]) -> bool:
    if not text or not patterns:
        return False
    for pat in patterns:
        try:
            if re.search(pat, text, re.I):
                return True
        except re.error:
            if pat in text:
                return True
    return False


def readonly_skip_from_profile(anchor_text: str, profile: dict[str, Any]) -> bool:
    """Agent-scoped readonly bypass — ignores Brief Expected-output pollution when Goal/quote is readonly."""
    patterns = skip_readonly_patterns_from_profile(profile)
    if not patterns:
        return False
    quote = _extract_handoff_user_text(anchor_text)
    goal = _extract_brief_goal(anchor_text)
    candidates = [quote]
    if goal and goal not in candidates:
        candidates.append(goal)
    if HANDOFF_BRIEF_MARKER not in anchor_text:
        candidates.append(anchor_text)
    for candidate in candidates:
        if not candidate.strip():
            continue
        if explicit_export_intent(candidate):
            continue
        if matches_readonly_skip(candidate, patterns):
            return True
    return False


def _intent_user_text_from_obj(obj: dict[str, Any]) -> str:
    return _extract_handoff_user_text(_user_text_from_obj(obj))


def _is_hook_injected_user_text(text: str) -> bool:
    return bool(text and HOOK_REJECT_RE.search(text.strip()))


def _is_skill_injected_user_text(text: str) -> bool:
    return bool(text and SKILL_INJECTION_RE.search(text.strip()))


def _is_real_user_message(obj: dict[str, Any]) -> bool:
    if obj.get("type") != "user":
        return False
    # CCB serializes Skill preloads and Stop-hook feedback as user-role meta messages.
    # They are model context, not a new human request, and must never move the ROE anchor.
    if obj.get("isMeta") is True:
        return False
    text = _user_text_from_obj(obj)
    if not text:
        return False
    if _is_hook_injected_user_text(text) or _is_skill_injected_user_text(text):
        return False
    return True


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
    intent_text = NEGATED_WRITE_RE.sub("", text)
    # Pure lookup (price/stock/recommend) is never write intent — even if a product code appears.
    if READONLY_LOOKUP_RE.search(intent_text) and not WRITE_VERB_RE.search(intent_text):
        if "报价单" not in intent_text and not ROW_EDIT_RE.search(intent_text):
            if not re.search(r"填写|填进|填入", intent_text):
                return False
    if WRITE_VERB_RE.search(intent_text) or WRITE_NOUN_RE.search(intent_text):
        return True
    if PRICE_EDIT_RE.search(intent_text) or ROW_EDIT_RE.search(intent_text):
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


def extract_write_anchor_window(
    lines: list[str],
) -> tuple[int, list[str], str, bool]:
    """Most recent write-intent user message → transcript end (semi-persistent anchor)."""
    user_indices: list[tuple[int, str]] = []
    for idx, line in enumerate(lines):
        obj = _loads_line(line)
        if obj and _is_real_user_message(obj):
            user_indices.append((idx, _intent_user_text_from_obj(obj)))

    write_start: int | None = None
    write_text = ""
    for idx, text in reversed(user_indices):
        if has_write_intent(text):
            write_start = idx
            write_text = text
            break

    if write_start is not None:
        return write_start, lines[write_start:], write_text, True

    if user_indices:
        idx, text = user_indices[-1]
        return idx, lines[idx:], text, has_write_intent(text)

    return 0, lines, "", False


def window_key(session_id: str, start_line: int, user_text: str) -> str:
    """Stable key for one user request. start_line is ignored (kept for call-site compat):
    transcript growth / duplicated user lines used to reset the block counter and disable max_blocks."""
    del start_line  # retained in signature for callers; must not affect the key
    digest = hashlib.sha256(user_text.encode("utf-8")).hexdigest()[:12]
    return f"{session_id}:{digest}"


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


def load_profile(skill_root: Path, agent_type: str) -> dict[str, Any]:
    profiles_dir = skill_root / "config" / "roe-judge-profiles"
    default_path = profiles_dir / "default.json"
    agent_path = profiles_dir / f"{agent_type}.json"
    profile: dict[str, Any] = {}
    if default_path.is_file():
        try:
            profile = json.loads(default_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            profile = {}
    if agent_path.is_file():
        try:
            override = json.loads(agent_path.read_text(encoding="utf-8"))
            if isinstance(override, dict):
                profile.update(override)
        except (json.JSONDecodeError, OSError):
            pass
    return profile


def l2_markers_from_profile(profile: dict[str, Any]) -> tuple[str, ...]:
    raw = profile.get("l2_tool_markers")
    if isinstance(raw, list) and raw:
        return tuple(str(x) for x in raw if x)
    return DEFAULT_L2_MARKERS


def _tool_name_matches_l2(name: str, markers: tuple[str, ...]) -> bool:
    for marker in markers:
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
    try:
        stripped = text.strip()
        if stripped.startswith("{"):
            data = json.loads(stripped)
            if isinstance(data, dict):
                if data.get("is_error") is True:
                    return False
                err = data.get("error")
                if err is not None and str(err).strip():
                    return False
                if data.get("success") is True:
                    return True
                if data.get("output_path") or data.get("rows_filled") is not None:
                    return True
    except (json.JSONDecodeError, TypeError):
        pass
    if FAILURE_MARKERS_RE.search(text):
        if re.search(r'"is_error"\s*:\s*true', text, re.I):
            return False
        if re.search(r'\berror\b', text, re.I) and not re.search(
            r'"is_error"\s*:\s*false', text, re.I
        ):
            return False
        if re.search(r"\b(failed|REJECT|exception)\b", text, re.I):
            return False
    if re.search(r'"is_error"\s*:\s*true', text, re.I):
        return False
    return True


def _tool_use_id_from_block(block: dict[str, Any]) -> str:
    return str(block.get("id") or block.get("tool_use_id") or "")


def _extract_tool_result_message(block: dict[str, Any], raw_line: str) -> str:
    """One-line error/summary from tool_result for REJECT PRIOR ATTEMPT."""
    payload = block.get("content")
    if isinstance(payload, str):
        text = payload.strip()
    elif payload is not None:
        text = json.dumps(payload, ensure_ascii=False)
    else:
        text = raw_line
    try:
        if text.startswith("{") or text.startswith("["):
            data = json.loads(text)
            if isinstance(data, dict):
                for key in ("error", "message", "detail", "reason", "msg"):
                    val = data.get(key)
                    if val:
                        return str(val).replace("\n", " ").strip()[:200]
    except (json.JSONDecodeError, TypeError):
        pass
    one = text.replace("\n", " ").strip()
    return one[:200] if len(one) > 200 else one


def _pair_tool_results_indexed(
    lines: list[str],
) -> list[tuple[int, str, bool, str]]:
    """Return (line_index, tool_name, success, result_message) per completed tool."""
    pending: list[tuple[str, str]] = []
    completed: list[tuple[int, str, bool, str]] = []
    for line_idx, line in enumerate(lines):
        obj = _loads_line(line)
        if not obj:
            continue
        for block in _iter_content_blocks(obj):
            btype = block.get("type")
            if btype == "tool_use":
                name = str(block.get("name") or block.get("toolName") or "")
                tid = _tool_use_id_from_block(block)
                pending.append((tid, name))
            elif btype == "tool_result" and pending:
                result_tid = _tool_use_id_from_block(block)
                idx = 0
                if result_tid:
                    for i, (tid, _) in enumerate(pending):
                        if tid and tid == result_tid:
                            idx = i
                            break
                _, name = pending.pop(idx)
                ok = _tool_result_is_success(block, line)
                msg = _extract_tool_result_message(block, line)
                completed.append((line_idx, name, ok, msg))
    return completed


def _pair_tool_results_in_window(
    window_lines: list[str],
) -> list[tuple[str, bool]]:
    """Pair each tool_use with its tool_result (by tool_use_id when present, else FIFO)."""
    pending: list[tuple[str, str]] = []  # (tool_use_id, name)
    completed: list[tuple[str, bool]] = []
    for line in window_lines:
        obj = _loads_line(line)
        if not obj:
            continue
        for block in _iter_content_blocks(obj):
            btype = block.get("type")
            if btype == "tool_use":
                name = str(block.get("name") or block.get("toolName") or "")
                tid = _tool_use_id_from_block(block)
                pending.append((tid, name))
            elif btype == "tool_result" and pending:
                result_tid = _tool_use_id_from_block(block)
                idx = 0
                if result_tid:
                    for i, (tid, _) in enumerate(pending):
                        if tid and tid == result_tid:
                            idx = i
                            break
                _, name = pending.pop(idx)
                completed.append((name, _tool_result_is_success(block, line)))
    return completed


def has_l2_write_success_in_window(
    window_lines: list[str], markers: tuple[str, ...]
) -> bool:
    for name, ok in _pair_tool_results_in_window(window_lines):
        if ok and _tool_name_matches_l2(name, markers):
            return True
    return False


def build_already_done_partitioned(
    all_lines: list[str], window_start_idx: int
) -> tuple[list[str], list[str]]:
    """Successful tools before window (prior turns) vs inside write-anchor window."""
    prior: list[str] = []
    in_window: list[str] = []
    for line_idx, name, ok, _msg in _pair_tool_results_indexed(all_lines):
        if not ok:
            continue
        if line_idx < window_start_idx:
            prior.append(name)
        else:
            in_window.append(name)
    return list(dict.fromkeys(prior)), list(dict.fromkeys(in_window))


def find_latest_l2_failure_in_window(
    all_lines: list[str],
    window_start_idx: int,
    markers: tuple[str, ...],
) -> dict[str, str] | None:
    """Most recent failed L2 tool attempt inside write-anchor window."""
    latest: dict[str, str] | None = None
    for line_idx, name, ok, msg in _pair_tool_results_indexed(all_lines):
        if line_idx < window_start_idx or ok:
            continue
        if not _tool_name_matches_l2(name, markers):
            continue
        latest = {"tool": name, "error": msg or "tool returned error"}
    return latest


def build_action_for_block(
    agent_type: str,
    profile: dict[str, Any],
    prior_done: list[str],
    window_done: list[str],
    prior_attempt: dict[str, str] | None,
) -> str:
    if prior_attempt:
        tool = prior_attempt["tool"]
        err = prior_attempt["error"]
        base = f"Retry {tool} with corrected parameters. Prior failure: {err}"
        if prior_done or window_done:
            base += " Do NOT repeat lookup/read tools already listed above."
        return base
    action = execute_tools_hint(agent_type, profile)
    if prior_done or window_done:
        action = f"{action} Lookup/read tools already succeeded — do NOT call them again."
    return action


def build_already_done_lines(window_lines: list[str]) -> list[str]:
    """Successful tool results in window — for anti-recheck REJECT."""
    done: list[str] = []
    for name, ok in _pair_tool_results_in_window(window_lines):
        if ok:
            done.append(name)
    return list(dict.fromkeys(done))


def detect_nk_warn_only(bundle: dict[str, Any]) -> str | None:
    """N/K table gap — log only, never block."""
    user = bundle.get("user_intent") or ""
    assistant = bundle.get("assistant_text") or ""
    n_match = re.search(r"(\d+)\s*个", user) or re.search(r"([五六七八九十两三四])个", user)
    if not n_match:
        return None
    raw = n_match.group(1)
    cn_map = {"两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
    expected = cn_map.get(raw, int(raw) if raw.isdigit() else 0)
    if expected <= 0:
        return None
    rows = [
        ln
        for ln in assistant.splitlines()
        if "|" in ln and not re.match(r"^\|[-:\s|]+\|$", ln.strip())
    ]
    data_rows = [r for r in rows if not re.search(r"^[\|\s]*(?:code|物料|品名|名称)", r, re.I)]
    actual = len(data_rows)
    if 0 < actual < expected:
        return f"warn: user asked ~{expected} items, table has {actual} data rows"
    return None


def summarize_user_intent_one_line(user_text: str, max_len: int = 120) -> str:
    text = (user_text or "").strip().replace("\n", " ")
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def build_urgency_line(block_count: int, max_blocks: int) -> str:
    if max_blocks <= 0:
        return ""
    if block_count >= max_blocks - 1:
        return (
            "FINAL attempt — complete the deliverable OR ask ONE structured A/B/C question. "
            "Do not promise again."
        )
    if block_count >= max(2, int(max_blocks * 0.6)):
        return "Repeated incomplete stop — fix the gap(s) above before end_turn."
    return ""


def execute_tools_hint(agent_type: str, profile: dict[str, Any]) -> str:
    hint = profile.get("execute_tools_hint")
    if isinstance(hint, str) and hint.strip():
        return hint.strip()
    return AGENT_EXECUTE_HINTS.get(
        agent_type, "Call the required write tool now. Do not describe — execute."
    )


def build_reject_prompt(
    anchor_text: str,
    gap_summary: str,
    prior_done: list[str],
    window_done: list[str],
    prior_attempt: dict[str, str] | None,
    action: str,
    block_count: int,
    max_blocks: int,
) -> str:
    """Short fuse prompt — avoid long rejections that re-trigger write-intent heuristics."""
    del prior_done, window_done, prior_attempt  # kept for call-site compat; omitted from short prompt
    urgency = build_urgency_line(block_count, max_blocks)
    parts = [
        f"[ROE-GATE {block_count}/{max_blocks}] Write not landed — do not end_turn.",
        f"Gap: {gap_summary}",
        f"User: {summarize_user_intent_one_line(anchor_text, max_len=80)}",
        f"ACTION: {action}",
    ]
    if urgency:
        parts.insert(1, urgency)
    return "\n".join(parts)


def evaluate_roe_judge(
    transcript_path: Path,
    session_id: str,
    agent_type: str,
    last_assistant_message: str,
    log_dir: Path,
    skill_root: Path,
) -> dict[str, Any]:
    profile = load_profile(skill_root, agent_type)
    max_blocks = int(profile.get("max_blocks") or JUDGE_MAX_BLOCKS)
    l2_markers = l2_markers_from_profile(profile)

    if not transcript_path.is_file():
        return {"verdict": "pass", "step": "skip", "reason": "transcript_missing"}

    lines = transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()
    start_idx, window_lines, anchor_text, window_write_intent = extract_write_anchor_window(lines)
    last_assistant = last_assistant_message.strip() or _last_assistant_text(lines)
    has_l2 = has_l2_write_success_in_window(window_lines, l2_markers)
    wkey = window_key(session_id, start_idx, anchor_text)
    counts_path = log_dir / "subagent-gate-roe-judge-counts.json"
    block_count = load_block_count(counts_path, wkey)

    assistant_in_window = []
    for line in window_lines:
        obj = _loads_line(line)
        if obj:
            t = _assistant_text_from_obj(obj)
            if t:
                assistant_in_window.append(t)
    bundle = {
        "user_intent": anchor_text[:4000],
        "assistant_text": (last_assistant or "\n\n".join(assistant_in_window))[:4000],
    }

    base: dict[str, Any] = {
        "window_start_line": start_idx,
        "window_key": wkey,
        "window_user_text_preview": anchor_text[:120],
        "has_write_intent": window_write_intent,
        "has_l2": has_l2,
        "judge_block_count": block_count,
        "agent_type": agent_type,
        "judge_mode": "in_process",
    }

    nk_warn = detect_nk_warn_only(bundle)
    if nk_warn:
        base["nk_warn"] = nk_warn

    if not anchor_text.strip():
        return {**base, "verdict": "pass", "step": "skip", "reason": "no_user_intent"}

    if is_clarification_message(last_assistant):
        return {**base, "verdict": "pass", "step": "clarification", "reason": "clarification"}

    if not window_write_intent:
        return {**base, "verdict": "pass", "step": "no_roe_scope", "reason": "no_write_intent"}

    if readonly_skip_from_profile(anchor_text, profile):
        return {
            **base,
            "verdict": "pass",
            "step": "readonly_skip_profile",
            "reason": "readonly_skip_profile",
        }

    if has_l2:
        return {**base, "verdict": "pass", "step": "l2_write_success", "reason": "l2_write_success"}

    if block_count >= max_blocks:
        return {
            **base,
            "verdict": "pass",
            "step": "escalate",
            "reason": "escalated_max_blocks",
            "escalated": True,
        }

    prior_done, window_done = build_already_done_partitioned(lines, start_idx)
    prior_attempt = find_latest_l2_failure_in_window(lines, start_idx, l2_markers)
    gap_summary = "写意图未完成：本轮无成功 L2 写工具（读/查价工具不算交付完成）"
    if prior_attempt:
        gap_summary = (
            f"{gap_summary}；最近 L2 尝试失败：{prior_attempt['tool']} — {prior_attempt['error']}"
        )
    action = build_action_for_block(
        agent_type, profile, prior_done, window_done, prior_attempt
    )

    new_count = block_count + 1
    save_block_count(counts_path, wkey, new_count)
    reject_prompt = build_reject_prompt(
        anchor_text,
        gap_summary,
        prior_done,
        window_done,
        prior_attempt,
        action,
        new_count,
        max_blocks,
    )
    already_done = prior_done + [n for n in window_done if n not in prior_done]
    return {
        **base,
        "verdict": "block",
        "step": "write_no_l2",
        "reason": "write_no_l2",
        "judge_block_count": new_count,
        "gaps_text": gap_summary,
        "prior_attempt": prior_attempt,
        "reject_prompt": reject_prompt,
    }


def append_judge_log(log_dir: Path, result: dict[str, Any]) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    from datetime import datetime, timezone

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = (
        f"[{ts}] agent={result.get('agent_type')} verdict={result.get('verdict')} "
        f"step={result.get('step')} reason={result.get('reason')} "
        f"window_key={result.get('window_key')} judge_block_count={result.get('judge_block_count', 0)} "
        f"write_intent={result.get('has_write_intent')} l2={result.get('has_l2')} "
        f"mode={result.get('judge_mode')} gaps={result.get('gaps_text', '')}"
    )
    if result.get("nk_warn"):
        line += f" nk_warn={result.get('nk_warn')}"
    if result.get("escalated"):
        line += " escalated_max_blocks=true"
    with (log_dir / "subagent-gate-roe-judge.log").open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def main(argv: list[str]) -> int:
    if len(argv) < 4 or argv[1] != "evaluate":
        print(
            "usage: parse_transcript_roe_judge.py evaluate <transcript> <session> "
            "<agent_type> [last_assistant] [log_dir] [skill_root]",
            file=sys.stderr,
        )
        return 2

    transcript_path = Path(argv[2])
    session_id = argv[3] if len(argv) > 3 else "unknown"
    agent_type = argv[4] if len(argv) > 4 else "unknown"
    last_msg = argv[5] if len(argv) > 5 else ""
    log_dir = Path(argv[6]) if len(argv) > 6 else Path.home() / ".claude" / "logs"
    skill_root = Path(argv[7]) if len(argv) > 7 else Path(__file__).resolve().parents[2]

    try:
        result = evaluate_roe_judge(
            transcript_path, session_id, agent_type, last_msg, log_dir, skill_root
        )
    except Exception as exc:  # fail-open: never freeze the agent session
        result = {
            "verdict": "pass",
            "step": "fail_open",
            "reason": f"judge_exception:{type(exc).__name__}",
            "agent_type": agent_type,
            "judge_mode": "fail_open",
        }
        try:
            append_judge_log(log_dir, result)
        except OSError:
            pass
        print(json.dumps(result, ensure_ascii=False))
        return 0

    append_judge_log(log_dir, result)
    print(json.dumps(result, ensure_ascii=False))
    if result.get("verdict") == "block":
        return 10
    if result.get("escalated"):
        return 20
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
