"""Match selection payloads, clarification payloads, and batch continuation payloads."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from system.error_codes import ERROR_CODE_AMBIGUOUS_MATCH, ERROR_CODE_NO_DATA

logger = logging.getLogger(__name__)

DEFAULT_SELECTION_CANDIDATE_LIMIT = 10
EXPLICIT_SELECTION_CANDIDATE_LIMIT = 15
MATCH_QUOTATION_BATCH_LIMIT = int(os.getenv("MATCH_QUOTATION_BATCH_MAX_ITEMS", "10"))

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _wanding_knowledge_path() -> Path:
    configured = os.getenv("WANDING_BUSINESS_KNOWLEDGE_PATH", "").strip()
    if configured:
        return Path(configured)
    return _PROJECT_ROOT / "data" / "wanding_business_knowledge.md"


def build_selection_payload(
    keywords: str,
    candidates: list[dict[str, Any]],
    show_candidates: bool = False,
) -> dict[str, Any]:
    total_count = len(candidates)
    limit = EXPLICIT_SELECTION_CANDIDATE_LIMIT if show_candidates else DEFAULT_SELECTION_CANDIDATE_LIMIT
    visible = candidates[:limit]
    truncated = total_count > len(visible)

    return {
        "keywords": keywords,
        "unmatched": not bool(candidates),
        "needs_selection": bool(candidates),
        **(
            {"error_code": ERROR_CODE_NO_DATA}
            if not candidates
            else {"error_code": ERROR_CODE_AMBIGUOUS_MATCH}
            if total_count > 1
            else {}
        ),
        "candidate_count": total_count,
        "candidates_returned": len(visible),
        "candidates_truncated": truncated,
        "candidates": visible,
        "show_candidates_requested": bool(show_candidates),
        "selection_owner": "claude_code",
        "selection_context": {
            "mode": "claude_code_auto_select",
            "knowledge_source": str(_wanding_knowledge_path()),
            "instructions": [
                "Do not Read knowledge_source for routine short price lookups when candidate_count is 1.",
                "When candidate_count > 1: Read knowledge_source, apply business rules, reply with ONE recommended line (price table) plus up to 4 brief bullet alternatives — do NOT dump the full candidates table or ask user to pick a number by default.",
                "Each candidate may include description_english and indonesian_name (same value: price-library English product name for Indonesian column H). When replying to the user with a price table, always show this English/Indonesian name column when present.",
                "If every candidate conflicts with the user's keywords, report unmatched instead of forcing a weak match.",
                "If two candidates remain genuinely indistinguishable after applying the knowledge, ask one focused clarification question.",
                "If candidates_truncated is true or the user is unsatisfied with a match, re-run match_quotation for that keywords only with show_candidates=true.",
            ],
        },
    }


def build_price_inventory_selection_payload(
    keywords: str,
    options: list[dict[str, Any]],
    *,
    show_candidates: bool = False,
) -> dict[str, Any]:
    candidates = [
        {
            "code": opt.get("code", ""),
            "matched_name": opt.get("matched_name", ""),
            "unit_price": float(opt.get("unit_price", 0) or 0),
            "source": opt.get("source", "共同"),
            "description_english": opt.get("description_english", ""),
            "indonesian_name": opt.get("indonesian_name", "") or opt.get("description_english", ""),
        }
        for opt in options
    ]
    payload = build_selection_payload(keywords, candidates, show_candidates=show_candidates)
    payload["price_and_inventory_mode"] = True
    return payload


def build_clarification_payload(params: dict[str, Any]) -> dict[str, Any]:
    return {
        "question": params.get("question") or "Please provide product type or specification.",
        "reason": params.get("reason") or "The current description is not enough to match a unique quotation item.",
        "options": params.get("options") or [
            {"id": "pvc_water_supply", "name": "PVC-U water supply pipe"},
            {"id": "pvc_drainage", "name": "PVC-U drainage pipe"},
            {"id": "pvc_conduit", "name": "PVC-U conduit"},
            {"id": "other", "name": "Other; user should provide details"},
        ],
    }


def handle_ask_clarification(params: dict[str, Any]) -> dict[str, Any]:
    return build_clarification_payload(params)
