"""Org knowledge write confirmation payloads (Org Mutate envelope + legacy fields)."""
from __future__ import annotations

from typing import Any


def build_org_mutate_envelope(
    *,
    action: str,
    domain: str = "knowledge",
    requires_confirmation: bool = True,
    applied: bool = False,
    target: dict[str, Any] | None = None,
    changes: list[Any] | None = None,
    preview_before: str = "",
    preview_after: str = "",
    version: dict[str, Any] | None = None,
    error_code: str | None = None,
    message: str | None = None,
    **legacy: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "action": action,
        "domain": domain,
        "requires_confirmation": requires_confirmation,
        "applied": applied,
        "target": target or {},
        "changes": changes or [],
        "preview_before": preview_before,
        "preview_after": preview_after,
        "version": version or {},
        "error_code": error_code,
    }
    if message is not None:
        payload["message"] = message
    payload.update(legacy)
    return payload


def build_append_business_rule_confirmation_payload(
    rule_text: str,
    params: dict[str, Any],
    *,
    error_code: str | None = None,
    changes: list[Any] | None = None,
    preview_before: str = "",
    preview_after: str = "",
    version: dict[str, Any] | None = None,
) -> dict[str, Any]:
    section = params.get("section") or "业务规则补充"
    slug = params.get("slug") or "wanding_business_knowledge"
    msg = (
        "This will update the shared organization knowledge base. "
        "Ask the user to confirm before calling again with confirmed=true."
    )
    if error_code == "LIMIT_EXCEEDED":
        msg = "rule_text exceeds hard limit; do not split into multiple appends — shorten or split sections explicitly with user OK."
    elif error_code == "NEAR_DUPLICATE":
        msg = "Near-duplicate of an existing rule — likely a split append. Merge into one rule or pass force_near_duplicate=true after user OK."
    needs_confirm = error_code != "LIMIT_EXCEEDED"
    return build_org_mutate_envelope(
        action="append",
        requires_confirmation=needs_confirm,
        applied=False,
        target={"slug": slug, "section": section},
        changes=changes,
        preview_before=preview_before,
        preview_after=preview_after or rule_text,
        version=version,
        error_code=error_code,
        message=msg,
        rule_text=rule_text,
        section=section,
    )
