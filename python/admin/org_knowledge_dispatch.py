"""append/delete business_rule tool dispatch — Org Mutate confirmation gates."""
from __future__ import annotations

from typing import Any

from admin.org_knowledge_payloads import build_append_business_rule_confirmation_payload
from system.param_coercion import coerce_bool, require_text_param


def handle_append_business_rule(params: dict[str, Any]) -> Any:
    from admin.org_knowledge_client import get_doc
    from admin.org_knowledge_mutate import check_rule_budget, near_duplicate_matches

    rule_text = require_text_param(params, "rule_text", ("rule", "content", "text"))
    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    force_near = coerce_bool(params.get("force_near_duplicate"))
    slug = params.get("slug") or "wanding_business_knowledge"

    budget_err = check_rule_budget(rule_text)
    if budget_err:
        return build_append_business_rule_confirmation_payload(
            rule_text,
            params,
            error_code=budget_err,
        )

    if not confirmed:
        doc = get_doc(slug, use_cache=False)
        version = int((doc or {}).get("version") or 0)
        content = str((doc or {}).get("content") or "")
        near = [] if force_near else near_duplicate_matches(rule_text, content)
        return build_append_business_rule_confirmation_payload(
            rule_text,
            params,
            error_code="NEAR_DUPLICATE" if near else None,
            changes=near or None,
            preview_after=rule_text,
            version={"doc_version": version},
        )

    from admin.org_knowledge_client import append_business_rule

    return append_business_rule(
        rule_text,
        section=params.get("section"),
        reason=params.get("reason"),
        slug=slug,
        force_near_duplicate=force_near,
    )


def handle_delete_business_rule(params: dict[str, Any]) -> Any:
    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    slug = params.get("slug") or "wanding_business_knowledge"
    block_id = params.get("block_id")
    content_hash_value = params.get("content_hash") or params.get("hash")
    snippet = params.get("snippet")
    doc_version = params.get("doc_version")
    if doc_version is not None:
        try:
            doc_version = int(doc_version)
        except (TypeError, ValueError):
            doc_version = None
    allow_section = coerce_bool(params.get("allow_section_edit"))

    from admin.org_knowledge_client import delete_business_rule

    return delete_business_rule(
        slug=slug,
        block_id=block_id if isinstance(block_id, str) else None,
        content_hash_value=content_hash_value if isinstance(content_hash_value, str) else None,
        snippet=snippet if isinstance(snippet, str) else None,
        doc_version=doc_version,
        confirmed=confirmed,
        allow_section_edit=allow_section,
    )
