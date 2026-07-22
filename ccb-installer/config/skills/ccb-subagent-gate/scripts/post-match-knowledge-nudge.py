#!/usr/bin/env python3
"""PostToolUse hook: after match, nudge hybrid + (when multi-candidate) select_quotation_candidates."""
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
    payload_has_match_results,
    payload_is_multi_candidate,
    primary_keywords_from_payload,
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
HYBRID_TOOL = "mcp__supplier-directory__suppliers_hybrid_match"


def _log_dir() -> Path:
    base = os.environ.get("SUBAGENT_GATE_LOG_DIR") or os.environ.get("LOCALAPPDATA")
    if base:
        return Path(base) / "post-match-nudge"
    return Path.home() / ".claude" / "logs" / "post-match-nudge"


def _safe_session_id(session_id: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", session_id.strip())
    return cleaned or "unknown"


def _should_emit_nudge(session_id: str, kind: str = "match") -> bool:
    if not session_id:
        return True
    flag_dir = _log_dir()
    flag_dir.mkdir(parents=True, exist_ok=True)
    flag_file = flag_dir / f"{_safe_session_id(session_id)}.{kind}.flag"
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


def _match_failed(hook_input: dict) -> bool:
    if hook_input.get("is_error") is True:
        return True
    tool_response = hook_input.get("tool_response")
    if isinstance(tool_response, dict) and tool_response.get("is_error") is True:
        return True
    return False


def build_hybrid_nudge_lines(keywords: list[str]) -> list[str]:
    kw_hint = "、".join(keywords[:3]) if keywords else "用户原产品词"
    q_example = keywords[0] if keywords else "直接50"
    return [
        "【硬约束 — 货源名录 · 同轮并行】",
        f"match 已成功。本回合还必须调用 {HYBRID_TOOL}（与 select 同轮，不可跳过）。",
        f'  q 用产品短语，例如 keywords="{q_example}" → q="{q_example}"（口语「直接50」可保留原词）。',
        f"本轮 keywords 参考：{kw_hint}。",
        "然后再调用 mcp__quotation__select_quotation_candidates。",
        "最终回复须含 L1 §双调用合成 的「货源（名录）」段（≥1 条 name_zh）；无命中写「名录未找到相关工厂」。",
        "禁止跳过 hybrid；禁止用价库 supplier 列冒充工厂。",
    ]


def build_select_nudge_lines(payload: dict, keywords: list[str]) -> list[str]:
    kb_path = knowledge_source_from_payload(payload) or KNOWLEDGE_FALLBACK
    kw_hint = "、".join(keywords[:5])
    if len(keywords) > 5:
        kw_hint += f" 等 {len(keywords)} 条"
    lines = [
        "【硬约束 — 多候选选型】",
        "match_quotation 返回 candidate_count > 1。",
        "下一步调用 mcp__quotation__select_quotation_candidates（传入本轮 candidates/results）；不要先 Read 知识库。",
        "select 返回 status=ok → 锁码出推荐价；unable_to_select / 不可用 → 才 Read 知识库自选：",
        f"  {kb_path}",
    ]
    if kw_hint:
        lines.append(f"本轮多候选 keywords：{kw_hint}。")
    lines.extend(
        [
            "每个 keyword **先**输出 1 条推荐价（编码+名称+单价+一句理由，优先用 select.reason），**再** ≤4 bullet「其他可能」。",
            "禁止在未给推荐价的情况下写「候选含义不够清晰，请确认 A/B/C」或「按 1A 格式回复」。",
            "禁止把默认候选窗口整表倒灌或「请回复序号 1–N」。",
            "「直接50」等无给水/国标语义时：默认推荐 PVC-U 排水配件（如 8020020755），PPR/AW 仅列 bullet。",
            "禁止跳过 select 却向用户写「根据知识库」「按默认规则」等表述。",
        ]
    )
    return lines


def build_nudge_context(payload: dict) -> str | None:
    if not payload_has_match_results(payload):
        return None
    keywords = primary_keywords_from_payload(payload) or multi_candidate_keywords(payload)
    lines = build_hybrid_nudge_lines(keywords)
    if payload_is_multi_candidate(payload):
        lines.extend(build_select_nudge_lines(payload, keywords))
    return "\n".join(lines)


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name not in MATCH_TOOL_NAMES:
        return 0

    session_id = str(hook_input.get("session_id") or "").strip()
    if not _match_failed(hook_input):
        from knowledge_effectiveness import increment_match_count  # noqa: E402

        increment_match_count(session_id)

    if _match_failed(hook_input):
        return 0

    payload = unwrap_tool_payload(hook_input.get("tool_response"))
    if not payload:
        return 0

    context = build_nudge_context(payload)
    if not context:
        return 0

    if not _should_emit_nudge(session_id, "match"):
        return 0

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": context,
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
