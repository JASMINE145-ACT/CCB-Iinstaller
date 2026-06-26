"""append_business_rule tool parameter aliases, confirmation coercion, and write dispatch."""
from __future__ import annotations

from typing import Any

from admin.org_knowledge_payloads import build_append_business_rule_confirmation_payload
from system.param_coercion import coerce_bool, require_text_param


def handle_append_business_rule(params: dict[str, Any]) -> Any:
    rule_text = require_text_param(params, "rule_text", ("rule", "content", "text"))
    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    if not confirmed:
        return build_append_business_rule_confirmation_payload(rule_text, params)

    from admin.org_knowledge_client import append_business_rule

    return append_business_rule(
        rule_text,
        section=params.get("section"),
        reason=params.get("reason"),
        slug=params.get("slug") or "wanding_business_knowledge",
    )
