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


def _price_library_meta(customer_level: str = "B") -> dict[str, Any]:
    try:
        from inventory.services.wanding_fuzzy_matcher import (
            _normalize_price_level,
            get_remote_price_meta,
        )

        meta = get_remote_price_meta(_normalize_price_level(customer_level))
        if not meta:
            return {}
        out: dict[str, Any] = {}
        for key in (
            "price_source",
            "price_stale",
            "price_stale_warning",
            "price_version_id",
            "price_version_number",
        ):
            if key in meta and meta[key] is not None:
                out[key] = meta[key]
        return out
    except Exception as exc:
        logger.debug("price_library_meta unavailable: %s", exc)
        return {}


def build_selection_payload(
    keywords: str,
    candidates: list[dict[str, Any]],
    show_candidates: bool = False,
    *,
    customer_level: str = "B",
) -> dict[str, Any]:
    total_count = len(candidates)
    limit = EXPLICIT_SELECTION_CANDIDATE_LIMIT if show_candidates else DEFAULT_SELECTION_CANDIDATE_LIMIT
    visible = candidates[:limit]
    truncated = total_count > len(visible)

    payload: dict[str, Any] = {
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
                "Session rule: Read knowledge_source once before the first match_quotation in this session; do not re-Read on later price lookups.",
                "When candidate_count > 1: apply business rules from knowledge_source, reply with ONE recommended line (price table) plus up to 4 brief bullet alternatives — do NOT dump the full candidates table or ask user to pick a number by default.",
                "Each candidate may include description_english and indonesian_name (same value: price-library English product name for Indonesian column H). When replying to the user with a price table, always show this English/Indonesian name column when present.",
                "When a candidate includes supplier, show a supplier column in the user-facing price table and pass supplier into fill_items on Path C.",
                "If every candidate conflicts with the user's keywords, report unmatched instead of forcing a weak match.",
                "If two candidates remain genuinely indistinguishable after applying the knowledge, ask one focused clarification question.",
                "If candidates_truncated is true or the user is unsatisfied with a match, re-run match_quotation for that keywords only with show_candidates=true.",
            ],
        },
    }
    payload.update(_price_library_meta(customer_level))
    return payload


def build_price_inventory_selection_payload(
    keywords: str,
    options: list[dict[str, Any]],
    *,
    show_candidates: bool = False,
) -> dict[str, Any]:
    candidates = []
    for opt in options:
        row = {
            "code": opt.get("code", ""),
            "matched_name": opt.get("matched_name", ""),
            "unit_price": float(opt.get("unit_price", 0) or 0),
            "source": opt.get("source", "共同"),
            "description_english": opt.get("description_english", ""),
            "indonesian_name": opt.get("indonesian_name", "") or opt.get("description_english", ""),
        }
        supplier = str(opt.get("supplier") or "").strip()
        if supplier:
            row["supplier"] = supplier
        candidates.append(row)
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
