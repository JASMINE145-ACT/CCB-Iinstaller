"""Local draft preview helpers (no org POST — confirmed=false path)."""
from __future__ import annotations

from typing import Any, Mapping

from admin.org_price_admin_payloads import UPDATABLE_FIELD_NAMES


def _product_fields(record: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(record, dict):
        return {}
    nested = record.get("fields")
    if isinstance(nested, dict):
        merged = dict(nested)
        for key in ("material_code", "product_id", "id"):
            if key in record and record[key] is not None:
                merged.setdefault(key, record[key])
        return merged
    return {k: v for k, v in record.items() if k in UPDATABLE_FIELD_NAMES or k in {"material_code", "product_id", "id"}}


def find_active_product_by_material(
    products: list[dict[str, Any]],
    material_code: str,
) -> dict[str, Any] | None:
    target = material_code.strip()
    if not target:
        return None
    for product in products:
        fields = _product_fields(product)
        if str(fields.get("material_code") or "").strip() == target:
            return product
    return None


def _merge_patch(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in patch.items():
        if key in UPDATABLE_FIELD_NAMES and value is not None:
            merged[key] = value
    return merged


def _last_draft_item_per_product(draft_items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    ordered = sorted(draft_items, key=lambda row: int(row.get("changed_at") or 0))
    last: dict[str, dict[str, Any]] = {}
    for item in ordered:
        product_id = str(item.get("product_id") or "").strip()
        if product_id:
            last[product_id] = item
    return last


def effective_fields_for_product(
    *,
    active_products: list[dict[str, Any]],
    draft_items: list[dict[str, Any]],
    material_code: str,
) -> tuple[dict[str, Any] | None, str | None, bool]:
    """Return (fields, product_id, is_deleted) after applying draft overlay on active."""
    active = find_active_product_by_material(active_products, material_code)
    product_id = str((active or {}).get("product_id") or _product_fields(active or {}).get("product_id") or "").strip()
    base_fields = _product_fields(active) if active else {}

    if not product_id:
        for item in draft_items:
            fields = _product_fields(item)
            if str(fields.get("material_code") or "").strip() == material_code.strip():
                product_id = str(item.get("product_id") or "").strip()
                if product_id:
                    break

    if not product_id:
        return (base_fields or None), None, False

    last_items = _last_draft_item_per_product(draft_items)
    overlay = last_items.get(product_id)
    if not overlay:
        return (base_fields or None), product_id, False

    change_type = str(overlay.get("change_type") or "").strip().lower()
    if change_type == "delete":
        return base_fields or None, product_id, True

    patch = _product_fields(overlay)
    merged = _merge_patch(base_fields, patch)
    return merged, product_id, False


def build_proposed_change(
    *,
    active_products: list[dict[str, Any]],
    draft_items: list[dict[str, Any]],
    draft_revision: int | None,
    material_code: str,
    field_updates: dict[str, Any],
    change_type: str,
) -> dict[str, Any]:
    current_fields, product_id, is_deleted = effective_fields_for_product(
        active_products=active_products,
        draft_items=draft_items,
        material_code=material_code,
    )
    normalized_change = change_type.strip().lower()
    if normalized_change not in {"update", "delete", "restore"}:
        raise ValueError(f"Unsupported change_type: {change_type}")

    if normalized_change == "delete":
        if not product_id and not current_fields:
            raise ValueError(f"material_code not found in active library: {material_code}")
        return {
            "material_code": material_code,
            "product_id": product_id,
            "change_type": "delete",
            "draft_revision": draft_revision,
            "current": current_fields,
            "proposed": None,
            "creates_new": False,
            "currently_deleted_in_draft": is_deleted,
        }

    patch = {k: v for k, v in field_updates.items() if k in UPDATABLE_FIELD_NAMES and v is not None}
    if "material_code" not in patch:
        patch["material_code"] = material_code

    before = dict(current_fields or {})
    after = _merge_patch(before, patch)
    creates_new = product_id is None and not before
    applied_change_type = normalized_change if normalized_change in {"update", "delete", "restore"} else "update"

    return {
        "material_code": material_code,
        "product_id": product_id,
        "change_type": applied_change_type,
        "draft_revision": draft_revision,
        "current": before or None,
        "proposed": after,
        "field_changes": {k: {"before": before.get(k), "after": after.get(k)} for k in patch if before.get(k) != after.get(k)},
        "creates_new": creates_new,
        "currently_deleted_in_draft": is_deleted,
    }


def _collect_material_codes(
    active_products: list[dict[str, Any]],
    draft_items: list[dict[str, Any]],
) -> set[str]:
    codes: set[str] = set()
    for product in active_products:
        fields = _product_fields(product)
        material_code = str(fields.get("material_code") or "").strip()
        if material_code:
            codes.add(material_code)
    for item in draft_items:
        fields = _product_fields(item)
        material_code = str(fields.get("material_code") or "").strip()
        if material_code:
            codes.add(material_code)
    return codes


def fields_match_source_provenance(
    fields: Mapping[str, Any],
    *,
    source_file: str,
    source_sheet: str,
    source_row: int,
) -> bool:
    if not fields:
        return False
    row_value = fields.get("source_row")
    try:
        normalized_row = int(row_value)
    except (TypeError, ValueError):
        return False
    return (
        str(fields.get("source_file") or "").strip() == source_file.strip()
        and str(fields.get("source_sheet") or "").strip() == source_sheet.strip()
        and normalized_row == int(source_row)
    )


def find_by_source_provenance(
    *,
    active_products: list[dict[str, Any]],
    draft_items: list[dict[str, Any]],
    source_file: str,
    source_sheet: str,
    source_row: int,
) -> dict[str, Any] | None:
    """Return first active/draft-effective row matching source_file+sheet+row."""
    normalized_file = source_file.strip()
    normalized_sheet = source_sheet.strip()
    normalized_row = int(source_row)
    if not normalized_file or not normalized_sheet or normalized_row <= 0:
        return None

    for material_code in sorted(_collect_material_codes(active_products, draft_items)):
        fields, product_id, is_deleted = effective_fields_for_product(
            active_products=active_products,
            draft_items=draft_items,
            material_code=material_code,
        )
        if is_deleted or not fields:
            continue
        if fields_match_source_provenance(
            fields,
            source_file=normalized_file,
            source_sheet=normalized_sheet,
            source_row=normalized_row,
        ):
            return {
                "material_code": material_code,
                "product_id": product_id,
                "fields": fields,
            }
    return None
