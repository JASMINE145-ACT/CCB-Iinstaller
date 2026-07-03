"""Price library admin MCP tool dispatch (confirmed=false preview + read paths)."""
from __future__ import annotations

from typing import Any

from admin.org_price_admin_payloads import (
    UPDATABLE_FIELD_NAMES,
    build_publish_confirmation_payload,
    build_write_confirmation_payload,
)
from admin.org_price_admin_preview import build_proposed_change
from system.param_coercion import coerce_bool, require_text_param


def _extract_field_updates(params: dict[str, Any]) -> dict[str, Any]:
    reserved = {
        "material",
        "material_code",
        "product_code",
        "confirmed",
        "confirm",
        "approved",
        "change_type",
        "product_id",
    }
    updates = {
        key: value
        for key, value in params.items()
        if key in UPDATABLE_FIELD_NAMES and value is not None
    }
    nested = params.get("fields") or params.get("updates")
    if isinstance(nested, dict):
        for key, value in nested.items():
            if key in UPDATABLE_FIELD_NAMES and value is not None:
                updates[key] = value
    if not updates and not any(k in params for k in reserved if k not in reserved):
        pass
    return updates


def _load_library_context() -> tuple[list[dict[str, Any]], list[dict[str, Any]], int | None]:
    from admin.org_price_admin_client import get_active, get_draft

    active_data = get_active() or {}
    draft_data = get_draft() or {}
    active_products = active_data.get("products") or []
    draft_items = draft_data.get("items") or []
    if not isinstance(active_products, list):
        active_products = []
    if not isinstance(draft_items, list):
        draft_items = []
    revision = draft_data.get("revision")
    return active_products, draft_items, int(revision) if revision is not None else None


def handle_get_price_library_active(_params: dict[str, Any]) -> dict[str, Any]:
    from admin.org_price_admin_client import get_active

    data = get_active()
    if not data:
        raise RuntimeError("org price library active API unavailable")
    version = data.get("version") or {}
    products = data.get("products") or []
    return {
        "version_id": version.get("id"),
        "version_number": version.get("version_number"),
        "item_count": version.get("item_count") or len(products),
        "products": products,
    }


def handle_get_price_library_draft(_params: dict[str, Any]) -> dict[str, Any]:
    from admin.org_price_admin_client import get_draft

    data = get_draft()
    if not data:
        raise RuntimeError("org price library draft API unavailable (login as price_admin required)")
    return data


def handle_export_price_library(params: dict[str, Any]) -> dict[str, Any]:
    from pathlib import Path

    from admin.org_price_admin_client import export_active_bytes

    content = export_active_bytes()
    output_path = params.get("output_path") or params.get("file_path")
    if output_path:
        path = Path(str(output_path))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return {
            "format": "xlsx",
            "size_bytes": len(content),
            "file_path": str(path),
        }
    return {
        "format": "xlsx",
        "size_bytes": len(content),
        "message": "Pass output_path to save export bytes to disk.",
    }


def _handle_draft_item_change(params: dict[str, Any], *, default_change_type: str, tool: str) -> Any:
    material = require_text_param(params, "material_code", ("material", "product_code", "code"))
    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    change_type = str(params.get("change_type") or default_change_type).strip().lower()
    field_updates = _extract_field_updates(params)

    active_products, draft_items, draft_revision = _load_library_context()
    proposed = build_proposed_change(
        active_products=active_products,
        draft_items=draft_items,
        draft_revision=draft_revision,
        material_code=material,
        field_updates=field_updates,
        change_type=change_type,
    )

    if not confirmed:
        return build_write_confirmation_payload(
            tool=tool,
            message=(
                "This will modify the shared organization price library draft. "
                "Ask the user to confirm before calling again with confirmed=true."
            ),
            material_code=material,
            change_type=str(proposed["change_type"]),
            proposed=proposed.get("proposed"),
            current=proposed.get("current"),
            draft_revision=draft_revision,
        )

    from admin.org_price_admin_client import apply_draft_item

    if proposed["change_type"] == "delete":
        if not proposed.get("product_id"):
            raise ValueError(f"Cannot delete unknown material_code: {material}")
        apply_draft_item(
            product_id=str(proposed["product_id"]),
            change_type="delete",
            fields={},
        )
    else:
        patch = dict(field_updates)
        if "material_code" not in patch:
            patch["material_code"] = material
        apply_draft_item(
            product_id=proposed.get("product_id"),
            change_type=str(proposed["change_type"]),
            fields=patch,
        )
    fresh = _load_library_context()
    return {
        "applied": True,
        "material_code": material,
        "change_type": proposed["change_type"],
        "draft_revision": fresh[2],
    }


def handle_upsert_price_library_item(params: dict[str, Any]) -> Any:
    if not _extract_field_updates(params):
        raise ValueError("At least one price library field update is required for upsert")
    return _handle_draft_item_change(params, default_change_type="update", tool="upsert_price_library_item")


def handle_delete_price_library_item(params: dict[str, Any]) -> Any:
    stripped = dict(params)
    stripped.setdefault("change_type", "delete")
    return _handle_draft_item_change(stripped, default_change_type="delete", tool="delete_price_library_item")


def handle_restore_price_library_item(params: dict[str, Any]) -> Any:
    stripped = dict(params)
    stripped.setdefault("change_type", "restore")
    return _handle_draft_item_change(stripped, default_change_type="restore", tool="restore_price_library_item")


def handle_publish_price_library_draft(params: dict[str, Any]) -> Any:
    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    reason = str(params.get("reason") or "price library agent publish").strip() or "price library agent publish"

    from admin.org_price_admin_client import get_active, get_draft, publish_draft

    active_data = get_active() or {}
    draft_data = get_draft()
    if not draft_data:
        raise RuntimeError("org price library draft API unavailable (login as price_admin required)")

    revision = draft_data.get("revision")
    if revision is None:
        raise ValueError("draft revision missing from org API")
    revision_int = int(revision)

    draft_items = draft_data.get("items") or []
    if not isinstance(draft_items, list):
        draft_items = []

    active_version = (active_data.get("version") or {}).get("version_number")
    active_version_int = int(active_version) if active_version is not None else None

    if not confirmed:
        return build_publish_confirmation_payload(
            draft_revision=revision_int,
            item_count=len(draft_items),
            reason=reason,
            active_version_number=active_version_int,
        )

    if len(draft_items) == 0:
        raise ValueError("Draft has no pending items; nothing to publish")

    published = publish_draft(reason=reason, revision=revision_int)
    return {
        "published": True,
        "version_id": published.get("id"),
        "version_number": published.get("version_number"),
        "item_count": published.get("item_count"),
        "published_at": published.get("published_at"),
        "previous_active_version_number": active_version_int,
        "draft_revision_used": revision_int,
    }


def handle_preview_price_library_import(params: dict[str, Any]) -> Any:
    from admin.org_price_admin_client import preview_import
    from admin.price_library_import_guard import validate_import_file_path

    file_path = str(params.get("file_path") or params.get("path") or "").strip()
    safe_file = validate_import_file_path(file_path)
    result = preview_import(filename=safe_file.name, content=safe_file.read_bytes())
    return {
        "file_path": str(safe_file),
        "create_count": result.get("create_count"),
        "update_count": result.get("update_count"),
        "unchanged_count": result.get("unchanged_count"),
        "error_count": result.get("error_count"),
        "rows": result.get("rows") or [],
        "errors": result.get("errors") or [],
    }


def handle_apply_price_library_import(params: dict[str, Any]) -> Any:
    from admin.org_price_admin_client import apply_import
    from admin.price_library_import_guard import validate_import_file_path

    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    file_path = str(params.get("file_path") or params.get("path") or "").strip()
    safe_file = validate_import_file_path(file_path)
    if not confirmed:
        preview = handle_preview_price_library_import({"file_path": str(safe_file)})
        preview["requires_confirmation"] = True
        preview["message"] = (
            "This will merge the xlsx changes into the shared organization draft. "
            "Ask the user to confirm before calling again with confirmed=true."
        )
        preview["tool"] = "apply_price_library_import"
        return preview

    result = apply_import(filename=safe_file.name, content=safe_file.read_bytes())
    return {
        "applied": True,
        "file_path": str(safe_file),
        "draft_id": result.get("draft_id"),
        "applied_create_count": result.get("applied_create_count"),
        "applied_update_count": result.get("applied_update_count"),
        "skipped_unchanged_count": result.get("skipped_unchanged_count"),
        "draft_revision": result.get("draft_revision"),
    }


def handle_revert_price_library_version(params: dict[str, Any]) -> Any:
    from admin.org_price_admin_client import revert_version

    confirmed = coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
    version_id = require_text_param(params, "version_id", ("target_version_id", "id"))
    reason = str(params.get("reason") or f"revert to {version_id}").strip() or f"revert to {version_id}"
    if not confirmed:
        return {
            "requires_confirmation": True,
            "tool": "revert_price_library_version",
            "message": (
                "This will create a new active version by reverting to a previous version. "
                "Ask the user to confirm before calling again with confirmed=true."
            ),
            "target_version_id": version_id,
            "reason": reason,
        }

    reverted = revert_version(version_id=version_id, reason=reason)
    return {
        "reverted": True,
        "target_version_id": version_id,
        "new_version_id": reverted.get("id"),
        "version_number": reverted.get("version_number"),
        "item_count": reverted.get("item_count"),
        "published_at": reverted.get("published_at"),
    }
