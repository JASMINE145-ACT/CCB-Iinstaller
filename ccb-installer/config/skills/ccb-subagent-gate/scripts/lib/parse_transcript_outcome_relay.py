#!/usr/bin/env python3
"""WANd.ORCH.OUTCOME_RELAY.001 — parent must surface Agent artifact delivery.

When the latest Agent() tool_result carries fill/path evidence (output_path / .xlsx /
filled_count), the parent's final assistant text must include those min fields.
Strategy A: block+nudge once, then block with deterministic forward snippet, then escalate.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

HOOK_REJECT_RE = re.compile(r"^(?:REJECT:\s|\[OUTCOME-RELAY|\[ROE-GATE)", re.I)
OUTPUT_PATH_RE = re.compile(
    r'"output_path"\s*:\s*"((?:\\.|[^"\\])*)"',
    re.IGNORECASE,
)
FILLED_COUNT_RE = re.compile(
    r'"(?:filled_count|rows_filled|items_count)"\s*:\s*(\d+)',
    re.IGNORECASE,
)
XLSX_PATH_RE = re.compile(
    r"(?:[A-Za-z]:\\|\\\\|/)[^\s\"'<>|*?]+\.xlsx\b|"
    r"Wanding-Quotation_[^\s\"'<>|*?]+\.xlsx|"
    r"[^\s\"'<>|*?]*报价单[^\s\"'<>|*?]*\.xlsx",
    re.IGNORECASE,
)
COUNT_CLUE_RE = re.compile(
    r"(?:filled_count|成功|填入|填写|已填|项|行|条|个|件)\s*[:：]?\s*\d+|"
    r"\d+\s*(?:项|行|条|个|件|成功)",
    re.IGNORECASE,
)
QUERY_KEYWORD_RE = re.compile(
    r"价格|单价|库存|报价|推荐|物料编码|可用|仓库|qty|price|stock|IDR|¥|￥",
    re.IGNORECASE,
)
TABLE_ROW_RE = re.compile(r"^\s*\|[^\n|]+\|[^\n|]+\|", re.M)
DIGIT_RUN_RE = re.compile(r"(?<!\d)\d{3,12}(?!\d)")
ERROR_LEAD_RE = re.compile(r"^\s*(?:Error|Exception|Traceback)\b|^\s*(?:错误|失败)[:：]", re.I)
MAX_BLOCKS = 2  # nudge (1) + force-forward (2); 3rd evaluate → escalate pass


def _norm_digits(text: str) -> str:
    """Strip thousands separators so 1,219 and 1219 compare equal."""
    return re.sub(r"(?<=\d),(?=\d)", "", text or "")


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


def _blocks_to_text(blocks: list[dict[str, Any]] | str | Any) -> str:
    if isinstance(blocks, str):
        return blocks
    if not isinstance(blocks, list):
        return str(blocks or "")
    parts: list[str] = []
    for block in blocks:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "text":
            parts.append(str(block.get("text") or ""))
        elif "text" in block:
            parts.append(str(block.get("text") or ""))
        elif "content" in block and isinstance(block.get("content"), str):
            parts.append(block["content"])
    return "\n".join(parts)


def _assistant_text_from_obj(obj: dict[str, Any]) -> str:
    if obj.get("type") != "assistant":
        return ""
    return _blocks_to_text(_iter_content_blocks(obj)).strip()


def _user_text_from_obj(obj: dict[str, Any]) -> str:
    if obj.get("type") != "user":
        return ""
    message = obj.get("message")
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    parts: list[str] = []
    for block in _iter_content_blocks(obj):
        if block.get("type") == "tool_result":
            continue
        if block.get("type") == "text":
            parts.append(str(block.get("text") or ""))
    return "\n".join(parts).strip()


def _is_hook_injected(text: str) -> bool:
    return bool(text and HOOK_REJECT_RE.search(text.strip()))


def _unescape_json_str(s: str) -> str:
    try:
        return json.loads(f'"{s}"')
    except json.JSONDecodeError:
        return s.replace("\\\\", "\\")


def extract_artifact_from_text(text: str) -> dict[str, Any] | None:
    """Return delivery fields if text looks like a fill / sheet artifact payload."""
    if not text or not text.strip():
        return None
    path = None
    m = OUTPUT_PATH_RE.search(text)
    if m:
        path = _unescape_json_str(m.group(1))
    if not path:
        xm = XLSX_PATH_RE.search(text)
        if xm:
            path = xm.group(0)
    filled = None
    cm = FILLED_COUNT_RE.search(text)
    if cm:
        filled = int(cm.group(1))
    # Require path-like evidence; filled_count alone is weak for false positives
    if not path:
        # success+xlsx basename patterns without full path still count
        if re.search(r'"success"\s*:\s*true', text, re.I) and re.search(
            r"\.xlsx|Wanding-Quotation", text, re.I
        ):
            xm = XLSX_PATH_RE.search(text) or re.search(
                r"Wanding-Quotation_[^\s\"']+", text, re.I
            )
            if xm:
                path = xm.group(0)
    if not path:
        return None
    return {
        "output_path": path,
        "filled_count": filled,
        "basename": Path(path.replace("\\", "/")).name,
    }


def extract_query_result_from_text(text: str) -> dict[str, Any] | None:
    """Return delivery fields when text is a substantive query result (price/stock).

    Conservative: requires a business keyword plus either a material code
    (7-12 digit run) or a markdown table with numeric cells. Bare no-result
    JSON (e.g. {"total": 0, "items": []}) and error payloads stay out of
    the gate — an error text like "Error: price service timeout, trace_id
    1234567890" must not force the parent to relay trace digits.
    """
    if not text or not text.strip():
        return None
    if ERROR_LEAD_RE.search(text):
        return None
    if not QUERY_KEYWORD_RE.search(text):
        return None
    norm = _norm_digits(text)
    codes: list[str] = []
    nums: list[str] = []
    for run in dict.fromkeys(DIGIT_RUN_RE.findall(norm)):
        (codes if len(run) >= 7 else nums).append(run)
    has_table = bool(TABLE_ROW_RE.search(text))
    if not codes and not (has_table and nums):
        return None
    tokens = codes[:4] + nums[:4]
    if not tokens:
        return None
    return {"query_tokens": tokens, "result_preview": text.strip()}


def parent_has_query_delivery(parent_text: str, delivery: dict[str, Any]) -> bool:
    text = _norm_digits(parent_text or "")
    if not text.strip():
        return False
    tokens = delivery.get("query_tokens") or []
    return any(tok in text for tok in tokens)


def build_query_forward_snippet(delivery: dict[str, Any]) -> str:
    preview = str(
        delivery.get("result_preview") or delivery.get("agent_result_preview") or ""
    ).strip()
    preview = re.sub(r"\n\s*agentId:.*$", "", preview, flags=re.S)
    return preview[:1500].rstrip()


def find_latest_agent_artifact(lines: list[str]) -> dict[str, Any] | None:
    """Scan transcript for Agent tool_use → tool_result with artifact evidence."""
    pending: dict[str, dict[str, Any]] = {}
    latest: dict[str, Any] | None = None

    for idx, line in enumerate(lines):
        obj = _loads_line(line)
        if not obj:
            continue
        if obj.get("type") == "assistant":
            for block in _iter_content_blocks(obj):
                if block.get("type") != "tool_use":
                    continue
                name = str(block.get("name") or "")
                if name not in ("Agent", "Task"):
                    continue
                tid = str(block.get("id") or "")
                inp = block.get("input") if isinstance(block.get("input"), dict) else {}
                pending[tid] = {
                    "tool_use_id": tid,
                    "subagent_type": str(
                        inp.get("subagent_type") or inp.get("agent") or ""
                    ),
                    "line_idx": idx,
                }
        elif obj.get("type") == "user":
            for block in _iter_content_blocks(obj):
                if block.get("type") != "tool_result":
                    continue
                tid = str(block.get("tool_use_id") or "")
                if tid not in pending:
                    continue
                content = block.get("content")
                text = _blocks_to_text(content)
                art = extract_artifact_from_text(text)
                kind = "artifact"
                if not art and not block.get("is_error"):
                    # Errored tool_results never count as query deliveries —
                    # keywords like "price" in error text are false positives.
                    art = extract_query_result_from_text(text)
                    kind = "query"
                if not art:
                    # still clear pending; no artifact and no query delivery
                    pending.pop(tid, None)
                    continue
                meta = pending.pop(tid)
                latest = {
                    **meta,
                    **art,
                    "delivery_kind": kind,
                    "agent_result_preview": text[:800],
                    "result_line_idx": idx,
                }
    return latest


def parent_has_min_delivery(parent_text: str, artifact: dict[str, Any]) -> bool:
    text = parent_text or ""
    if not text.strip():
        return False
    basename = str(artifact.get("basename") or "")
    path = str(artifact.get("output_path") or "")
    has_path = False
    if basename and basename.lower() in text.lower():
        has_path = True
    elif path and path.lower() in text.lower():
        has_path = True
    elif re.search(r"\.xlsx|Wanding-Quotation", text, re.I):
        has_path = True
    if not has_path:
        return False
    filled = artifact.get("filled_count")
    if filled is None:
        return True
    if re.search(rf"filled_count\s*[=:：]?\s*{filled}", text, re.I):
        return True
    if re.search(rf"(?:成功|填入|填写|已填).{{0,12}}{filled}", text) or re.search(
        rf"{filled}.{{0,8}}(?:项|行|条|个|件)", text
    ):
        return True
    if COUNT_CLUE_RE.search(text) and re.search(rf"(?<!\d){filled}(?!\d)", text):
        return True
    return False


def build_forward_snippet(artifact: dict[str, Any]) -> str:
    path = artifact.get("output_path") or ""
    filled = artifact.get("filled_count")
    lines = [
        "Quotation sheet ready.",
        f"- file: `{path}`",
    ]
    if filled is not None:
        lines.append(f"- filled_count: {filled}")
    return "\n".join(lines)


def window_key(session_id: str, artifact: dict[str, Any]) -> str:
    tokens = artifact.get("query_tokens") or []
    anchor = artifact.get("output_path") or (tokens[0] if tokens else "")
    kind = artifact.get("delivery_kind") or "artifact"
    raw = f"{session_id}|{artifact.get('tool_use_id')}|{kind}|{anchor}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def load_block_count(path: Path, key: str) -> int:
    if not path.is_file():
        return 0
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return 0
    if not isinstance(data, dict):
        return 0
    entry = data.get(key)
    if isinstance(entry, dict):
        return int(entry.get("count") or 0)
    if isinstance(entry, int):
        return entry
    return 0


def save_block_count(path: Path, key: str, count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data: dict[str, Any] = {}
    if path.is_file():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                data = loaded
        except (json.JSONDecodeError, OSError):
            data = {}
    data[key] = {"count": count}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _last_assistant_after(lines: list[str], after_idx: int) -> str:
    text = ""
    for i in range(after_idx + 1, len(lines)):
        obj = _loads_line(lines[i])
        if not obj:
            continue
        if obj.get("type") == "assistant":
            t = _assistant_text_from_obj(obj)
            # skip pure tool_use turns without narrative
            if t and "tool_use" not in t:
                text = t
            elif t:
                # may be mixed; keep if has non-empty narrative beyond JSON-ish
                text = t
        elif obj.get("type") == "user":
            ut = _user_text_from_obj(obj)
            if ut and not _is_hook_injected(ut) and "tool_result" not in (
                str(obj.get("message") or "")
            ):
                # new real user — parent reply window closed; keep last text
                pass
    return text


def _message_has_only_tool_results(obj: dict[str, Any]) -> bool:
    blocks = _iter_content_blocks(obj)
    if not blocks:
        return False
    return all(b.get("type") == "tool_result" for b in blocks)


def has_real_user_after_artifact(lines: list[str], result_line_idx: int) -> bool:
    """True when a real user turn follows the Agent result (closes the relay window)."""
    for i in range(int(result_line_idx) + 1, len(lines)):
        obj = _loads_line(lines[i])
        if not obj or obj.get("type") != "user":
            continue
        if _message_has_only_tool_results(obj):
            continue
        text = _user_text_from_obj(obj)
        if not text.strip():
            continue
        if _is_hook_injected(text):
            continue
        return True
    return False


def evaluate_outcome_relay(
    transcript_path: Path,
    session_id: str,
    agent_type: str,
    last_assistant_message: str,
    log_dir: Path,
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "agent_type": agent_type,
        "contract": "WANd.ORCH.OUTCOME_RELAY.001",
        "strategy": "A",
    }
    if agent_type not in ("wande-orchestrator", "cowork"):
        return {**base, "verdict": "pass", "step": "skip", "reason": "not_orchestrator"}

    if not transcript_path.is_file():
        return {**base, "verdict": "pass", "step": "skip", "reason": "transcript_missing"}

    lines = transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()
    artifact = find_latest_agent_artifact(lines)
    if not artifact:
        return {**base, "verdict": "pass", "step": "no_artifact", "reason": "no_agent_artifact"}

    result_idx = int(artifact.get("result_line_idx") or 0)
    if has_real_user_after_artifact(lines, result_idx):
        return {
            **base,
            "verdict": "pass",
            "step": "new_user_turn",
            "reason": "new_user_turn_after_artifact",
            "delivery_kind": artifact.get("delivery_kind") or "artifact",
            "output_path": artifact.get("output_path"),
            "filled_count": artifact.get("filled_count"),
        }

    wkey = window_key(session_id, artifact)
    counts_path = log_dir / "subagent-gate-outcome-relay-counts.json"
    block_count = load_block_count(counts_path, wkey)

    parent_text = (last_assistant_message or "").strip()
    if not parent_text:
        parent_text = _last_assistant_after(lines, result_idx)
    if not parent_text:
        # fallback: last assistant in whole transcript
        for line in reversed(lines):
            obj = _loads_line(line)
            if obj and obj.get("type") == "assistant":
                parent_text = _assistant_text_from_obj(obj)
                if parent_text:
                    break

    kind = artifact.get("delivery_kind") or "artifact"
    base.update(
        {
            "window_key": wkey,
            "delivery_kind": kind,
            "output_path": artifact.get("output_path"),
            "filled_count": artifact.get("filled_count"),
            "query_tokens": artifact.get("query_tokens"),
            "subagent_type": artifact.get("subagent_type"),
            "judge_block_count": block_count,
            "parent_preview": parent_text[:200],
        }
    )

    if kind == "query":
        delivered = parent_has_query_delivery(parent_text, artifact)
    else:
        delivered = parent_has_min_delivery(parent_text, artifact)
    if delivered:
        return {**base, "verdict": "pass", "step": "delivered", "reason": "parent_has_delivery"}

    if block_count >= MAX_BLOCKS:
        return {
            **base,
            "verdict": "pass",
            "step": "escalate",
            "reason": "escalated_max_blocks",
            "escalated": True,
        }

    new_count = block_count + 1
    save_block_count(counts_path, wkey, new_count)
    if kind == "query":
        snippet = build_query_forward_snippet(artifact)
        gap_line = (
            "- Agent() returned a query result (price/stock figures), but parent reply "
            "does not surface any of its key codes/numbers."
        )
        detected_lines = [
            "Detected key figures:",
            f"- tokens: {', '.join(artifact.get('query_tokens') or [])}",
        ]
        nudge_action = (
            "Final user reply MUST relay the sub-agent result content (codes, prices, "
            "quantities, tables as returned). Do not end with a greeting-only shell."
        )
    else:
        snippet = build_forward_snippet(artifact)
        gap_line = (
            "- Agent() returned a quotation artifact, but parent reply is missing path and/or count."
        )
        detected_lines = [
            "Detected artifact:",
            f"- output_path: {artifact.get('output_path')}",
            f"- filled_count: {artifact.get('filled_count')}",
        ]
        nudge_action = (
            "Final user reply MUST include: quotation file path (or Wanding-Quotation_*.xlsx) "
            "AND filled item count. Do not end with an empty confirmation only."
        )

    if new_count == 1:
        reject_prompt = "\n".join(
            [
                f"[OUTCOME-RELAY {new_count}/{MAX_BLOCKS}] Incomplete parent relay — do not end_turn.",
                "",
                "GAPS:",
                gap_line,
                "",
                *detected_lines,
                "",
                "ACTION:",
                f"- {nudge_action}",
                "",
                "Suggested reply shape:",
                snippet,
            ]
        )
        step = "nudge"
    else:
        action = (
            "Paste the DETERMINISTIC FORWARD body below (greeting optional; "
            "do not drop path or filled_count)."
        )
        reject_prompt = "\n".join(
            [
                f"[OUTCOME-RELAY {new_count}/{MAX_BLOCKS}] Force forward — do not end_turn with empty shell.",
                "",
                "GAPS:",
                "- Prior nudge still missing min delivery fields.",
                "",
                "ACTION:",
                f"- {action}",
                "",
                "=== DETERMINISTIC FORWARD (paste) ===",
                snippet,
                "=== END ===",
            ]
        )
        step = "force_forward"

    return {
        **base,
        "verdict": "block",
        "step": step,
        "reason": "missing_parent_delivery",
        "judge_block_count": new_count,
        "gaps_text": (
            "parent missing key figures after Agent query result"
            if kind == "query"
            else "parent missing path/count after Agent artifact"
        ),
        "reject_prompt": reject_prompt,
        "forward_snippet": snippet,
    }


def append_log(log_dir: Path, result: dict[str, Any]) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    from datetime import datetime, timezone

    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        **{k: v for k, v in result.items() if k != "reject_prompt"},
        "has_reject_prompt": bool(result.get("reject_prompt")),
    }
    with (log_dir / "subagent-gate-outcome-relay.log").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "evaluate":
        print(
            "Usage: parse_transcript_outcome_relay.py evaluate <transcript> "
            "<session_id> <agent_type> [last_assistant] [log_dir]",
            file=sys.stderr,
        )
        return 2
    transcript_path = Path(argv[2])
    session_id = argv[3] if len(argv) > 3 else "unknown"
    agent_type = argv[4] if len(argv) > 4 else "wande-orchestrator"
    last_msg = argv[5] if len(argv) > 5 else ""
    log_dir = Path(argv[6]) if len(argv) > 6 else Path.home() / ".claude" / "logs"
    result = evaluate_outcome_relay(
        transcript_path, session_id, agent_type, last_msg, log_dir
    )
    append_log(log_dir, result)
    print(json.dumps(result, ensure_ascii=True))
    if result.get("verdict") == "block":
        return 10
    if result.get("escalated"):
        return 20
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
