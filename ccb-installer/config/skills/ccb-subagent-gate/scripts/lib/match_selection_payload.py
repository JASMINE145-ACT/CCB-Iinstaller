"""Parse match_quotation / batch tool responses for selection payload fields."""
from __future__ import annotations

import json
from typing import Any


def _loads_maybe(value: Any) -> Any:
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return value
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return value
    return value


def unwrap_tool_payload(tool_response: Any) -> dict[str, Any] | None:
    data = _loads_maybe(tool_response)
    if not isinstance(data, dict):
        return None
    if "result" in data:
        inner = _loads_maybe(data.get("result"))
        if isinstance(inner, dict):
            return inner
    return data


def iter_selection_payloads(payload: dict[str, Any]) -> list[dict[str, Any]]:
    results = payload.get("results")
    if isinstance(results, list):
        return [item for item in results if isinstance(item, dict)]
    return [payload]


def payload_is_multi_candidate(payload: dict[str, Any]) -> bool:
    for item in iter_selection_payloads(payload):
        count = item.get("candidate_count")
        if isinstance(count, int) and count > 1:
            return True
    return False


def knowledge_source_from_payload(payload: dict[str, Any]) -> str | None:
    for item in iter_selection_payloads(payload):
        ctx = item.get("selection_context")
        if isinstance(ctx, dict):
            source = ctx.get("knowledge_source")
            if isinstance(source, str) and source.strip():
                return source.strip()
    return None


def multi_candidate_keywords(payload: dict[str, Any]) -> list[str]:
    keywords: list[str] = []
    for item in iter_selection_payloads(payload):
        count = item.get("candidate_count")
        if isinstance(count, int) and count > 1:
            kw = item.get("keywords")
            if isinstance(kw, str) and kw.strip():
                keywords.append(kw.strip())
    return keywords


def primary_keywords_from_payload(payload: dict[str, Any]) -> list[str]:
    """All non-empty keywords fields from match / batch results (for hybrid q=)."""
    keywords: list[str] = []
    for item in iter_selection_payloads(payload):
        kw = item.get("keywords")
        if isinstance(kw, str) and kw.strip():
            keywords.append(kw.strip())
    return list(dict.fromkeys(keywords))


def payload_has_match_results(payload: dict[str, Any]) -> bool:
    for item in iter_selection_payloads(payload):
        count = item.get("candidate_count")
        if isinstance(count, int) and count > 0:
            return True
        candidates = item.get("candidates")
        if isinstance(candidates, list) and candidates:
            return True
    return False
