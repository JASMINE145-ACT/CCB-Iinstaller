"""Org quotation-mapping MCP dispatch (Section D — cloud draft)."""
from __future__ import annotations

from typing import Any

from admin.org_mapping_client import (
    append_mapping_draft_item,
    get_mapping_draft,
    invalidate_mapping_org_cache,
    is_org_mapping_configured,
    lookup_mapping_rows,
    publish_mapping_draft,
)
from quotation.learn_by_data_mapping import (
    build_learn_by_data_mapping_row,
    check_learn_by_data_mapping_guards,
    load_mapping_pending_entries,
    normalized_mapping_key,
)
from quotation.learn_by_data_price_library import normalize_source_file_basename
from quotation.mapping_pending_dispatch import build_mapping_pending_confirmation_payload
from system.param_coercion import coerce_bool, require_text_param


def handle_lookup_quotation_mapping(params: dict[str, Any]) -> Any:
    inquiry_name = str(params.get("inquiry_name") or "").strip()
    inquiry_spec = str(params.get("inquiry_spec") or "").strip()
    norm_key = str(params.get("norm_key") or "").strip()
    if not norm_key:
        norm_key = normalized_mapping_key(inquiry_name, inquiry_spec)
    search_text = str(params.get("search_text") or "").strip()
    if not search_text and inquiry_name:
        search_text = f"{inquiry_name} {inquiry_spec}".strip()

    if not is_org_mapping_configured():
        return {"success": False, "error": "ORG_SERVER_URL not configured", "rows": []}

    data = lookup_mapping_rows(search_text=search_text, norm_key=norm_key)
    rows = (data or {}).get("rows") or []
    return {
        "success": True,
        "norm_key": (data or {}).get("norm_key") or norm_key,
        "rows": rows,
        "source": "org_api",
    }


def handle_append_quotation_mapping_item(params: dict[str, Any]) -> Any:
    if not is_org_mapping_configured():
        return {"success": False, "error": "ORG_SERVER_URL not configured; use append_quotation_mapping_pending fallback."}

    fields = params.get("fields") if isinstance(params.get("fields"), dict) else params
    inquiry_name = str(fields.get("inquiry_name") or fields.get("inquiry") or "").strip()
    inquiry_spec = str(fields.get("inquiry_spec") or fields.get("spec") or "").strip()
    sheet_product_code = require_text_param(
        fields,
        "product_code",
        ("sheet_product_code", "material_code", "code"),
    )
    quote_name = str(fields.get("quotation_name") or fields.get("quote_name") or "").strip()
    source_file = require_text_param(fields, "source_file")
    source_sheet = require_text_param(fields, "source_sheet")
    source_row = int(fields.get("source_row") or 0)
    agent_pick_code = str(fields.get("agent_pick_code") or params.get("agent_pick_code") or "").strip()

    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    allow_overwrite = coerce_bool(params.get("allow_overwrite") or params.get("overwrite_confirmed"))

    row = build_learn_by_data_mapping_row(
        inquiry_name=inquiry_name,
        inquiry_spec=inquiry_spec,
        sheet_product_code=sheet_product_code,
        quote_name=quote_name,
        source_file=source_file,
        source_sheet=source_sheet,
        source_row=source_row,
        agent_pick_code=agent_pick_code,
    )

    guard = check_learn_by_data_mapping_guards(
        inquiry_name=inquiry_name,
        inquiry_spec=inquiry_spec,
        sheet_product_code=sheet_product_code,
        source_file=source_file,
        source_sheet=source_sheet,
        source_row=source_row,
        pending_entries=load_mapping_pending_entries(),
    )

    action = str(guard.get("action") or "")
    if action in {"skip", "reject"}:
        return {"success": True, "applied": False, "guard": guard, "target": "org_draft"}

    if action == "confirm_overwrite" and not allow_overwrite:
        if not confirmed:
            return build_mapping_pending_confirmation_payload(
                row=row,
                guard=guard,
                message=str(guard.get("message") or "Confirm overwrite before calling with allow_overwrite=true."),
            )
        return {
            "success": False,
            "error": "Mapping keyword conflict requires allow_overwrite=true after user confirms.",
            "guard": guard,
        }

    if not confirmed:
        return build_mapping_pending_confirmation_payload(
            row=row,
            guard=guard,
            message="Preview org mapping draft row. Confirm before calling with confirmed=true.",
        )

    basename = normalize_source_file_basename(source_file)
    if basename:
        row["source_file"] = basename

    row["norm_key"] = normalized_mapping_key(inquiry_name, inquiry_spec)
    row["allow_overwrite"] = allow_overwrite or action == "confirm_overwrite"

    draft = append_mapping_draft_item(row)
    return {
        "success": True,
        "applied": True,
        "guard": guard,
        "target": "org_draft",
        "draft": draft,
        "entry_id": row.get("id"),
        "message": "已写入 org 历史报价映射 draft；需 mapping_admin publish 后全员生效。",
    }


def handle_publish_quotation_mapping_draft(params: dict[str, Any]) -> Any:
    if not is_org_mapping_configured():
        return {"success": False, "error": "ORG_SERVER_URL not configured"}

    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    reason = str(params.get("reason") or "learn-by-data Section D publish").strip()
    revision = int(params.get("revision") or 0)

    draft = get_mapping_draft() or {}
    if not revision:
        revision = int(draft.get("revision") or 0)

    if not confirmed:
        return {
            "requires_confirmation": True,
            "tool": "publish_quotation_mapping_draft",
            "message": f"Preview publish org mapping draft revision={revision}. Confirm with confirmed=true.",
            "draft": draft,
        }

    result = publish_mapping_draft(reason=reason, revision=revision)
    try:
        invalidate_mapping_org_cache()
    except Exception:
        pass
    return {"success": True, "published": True, "version": result}
