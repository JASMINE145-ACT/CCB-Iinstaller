"""append_quotation_mapping_pending MCP dispatch (Section D — local pending jsonl)."""
from __future__ import annotations

from typing import Any

from quotation.learn_by_data_mapping import (
    append_mapping_pending_row,
    build_learn_by_data_mapping_row,
    check_learn_by_data_mapping_guards,
    load_mapping_pending_entries,
)
from quotation.learn_by_data_price_library import normalize_source_file_basename
from system.param_coercion import coerce_bool, require_text_param


def build_mapping_pending_confirmation_payload(
    *,
    row: dict[str, Any],
    guard: dict[str, Any],
    message: str,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "requires_confirmation": True,
        "message": message,
        "tool": "append_quotation_mapping_pending",
        "proposed_row": row,
        "guard": guard,
    }
    if guard.get("action") == "confirm_overwrite":
        payload["requires_overwrite_confirmation"] = True
        payload["existing_product_code"] = guard.get("existing_product_code")
        payload["proposed_product_code"] = guard.get("proposed_product_code")
    return payload


def handle_append_quotation_mapping_pending(params: dict[str, Any]) -> Any:
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
        return {"success": True, "applied": False, "guard": guard}

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
            message="Preview mapping row for historical quote library. Confirm before calling with confirmed=true.",
        )

    basename = normalize_source_file_basename(source_file)
    if basename:
        row["source_file"] = basename

    result = append_mapping_pending_row(row, allow_overwrite=allow_overwrite)
    return {"success": True, "applied": True, "guard": guard, **result}
