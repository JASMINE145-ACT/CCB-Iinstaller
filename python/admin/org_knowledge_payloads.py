"""Org knowledge write confirmation payloads and defaults."""
from __future__ import annotations

from typing import Any


def build_append_business_rule_confirmation_payload(
    rule_text: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    return {
        "requires_confirmation": True,
        "message": "This will update the shared organization knowledge base. Ask the user to confirm before calling again with confirmed=true.",
        "rule_text": rule_text,
        "section": params.get("section") or "business_rule_updates",
    }
