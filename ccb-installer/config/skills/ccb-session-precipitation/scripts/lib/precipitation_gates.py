#!/usr/bin/env python3
"""Post-LLM gates + bundle → precipitation proposal rows."""
from __future__ import annotations

from typing import Any

from parse_transcript_precipitation import kb_overlap, _workflow_duplicate


def _lane_list(bundle: dict[str, Any], key: str) -> list[dict[str, Any]]:
    lanes = bundle.get("lanes")
    if not isinstance(lanes, dict):
        return []
    items = lanes.get(key)
    if not isinstance(items, list):
        return []
    return [i for i in items if isinstance(i, dict)]


def bundle_to_proposals(
    bundle: dict[str, Any] | None,
    *,
    session_id: str,
    conversation_id: str,
    kb_text: str,
    workflow_text: str,
    user_acknowledged: bool,
) -> list[dict[str, Any]]:
    if not bundle or bundle.get("skipped"):
        return []

    proposals: list[dict[str, Any]] = []

    for item in _lane_list(bundle, "business_rules"):
        summary = str(item.get("summary") or "").strip()
        evidence = [str(e) for e in (item.get("evidence") or []) if str(e).strip()]
        if not summary or not evidence:
            continue
        try:
            confidence = float(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 0.6:
            continue
        overlap = kb_overlap(summary, kb_text)
        hint = str(item.get("kb_overlap_hint") or overlap)
        if overlap == "duplicate" or hint == "duplicate":
            continue
        proposals.append(
            {
                "lane": "business_rule",
                "title": "业务知识库补充",
                "content": summary[:500],
                "evidence": evidence[:5],
                "sessionId": session_id,
                "conversationId": conversation_id,
                "confidence": confidence,
                "metadata": {"kbOverlap": overlap, "source": "llm"},
            }
        )

    for item in _lane_list(bundle, "personal_habits"):
        bullet = str(item.get("bullet") or "").strip()
        evidence = [str(e) for e in (item.get("evidence") or []) if str(e).strip()]
        target = str(item.get("target") or "workflow").strip()
        if target not in ("workflow", "profile"):
            target = "workflow"
        if not bullet or not evidence:
            continue
        try:
            confidence = float(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 0.5:
            continue
        if target == "workflow" and _workflow_duplicate(bullet, workflow_text):
            continue
        proposals.append(
            {
                "lane": "personal_habit",
                "title": "个人工作习惯" if target == "workflow" else "个人画像",
                "content": bullet[:200],
                "evidence": evidence[:5],
                "sessionId": session_id,
                "conversationId": conversation_id,
                "confidence": confidence,
                "metadata": {"target": target, "source": "llm"},
            }
        )

    for item in _lane_list(bundle, "golden_paths"):
        desc = str(item.get("description") or "").strip()
        tools = [str(t) for t in (item.get("tool_sequence") or []) if str(t).strip()]
        ack = str(item.get("user_ack") or "implicit_idle")
        if not desc and not tools:
            continue
        try:
            confidence = float(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 0.55 and not user_acknowledged:
            continue
        if ack == "implicit_idle" and not user_acknowledged and confidence < 0.65:
            continue
        content = desc or " → ".join(tools[:8])
        proposals.append(
            {
                "lane": "golden_path",
                "title": "实现路径",
                "content": content[:500],
                "evidence": [desc] if desc else tools[:3],
                "sessionId": session_id,
                "conversationId": conversation_id,
                "confidence": confidence,
                "metadata": {"toolSequence": tools[:12], "userAck": ack, "source": "llm"},
            }
        )

    for item in _lane_list(bundle, "eval_cases"):
        inp = str(item.get("input") or "").strip()
        expected = [str(t) for t in (item.get("expected_tools") or []) if str(t).strip()]
        must_not = [str(t) for t in (item.get("must_not") or []) if str(t).strip()]
        if not inp:
            continue
        try:
            confidence = float(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 0.6:
            continue
        proposals.append(
            {
                "lane": "eval_case",
                "title": "Eval 候选",
                "content": inp[:300],
                "evidence": [inp[:300]],
                "sessionId": session_id,
                "conversationId": conversation_id,
                "confidence": confidence,
                "metadata": {
                    "category": str(item.get("category") or "routing"),
                    "agent": str(item.get("agent") or ""),
                    "expectedTools": expected,
                    "mustNot": must_not,
                    "source": "llm",
                    "status": "pending_review",
                },
            }
        )

    return proposals
