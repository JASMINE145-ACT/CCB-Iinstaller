"""Learn-by-data helpers: price library presence + upsert field builder (Phase 2)."""
from __future__ import annotations

import os
from typing import Any, Literal, Mapping

from admin.org_price_admin_preview import find_by_source_provenance

LearnByDataUpsertAction = Literal["proceed", "skip", "reject"]


def material_in_price_library(tiers_result: Mapping[str, Any] | None) -> bool:
    """True when get_product_price_tiers indicates the code exists in org or local PL."""
    if not tiers_result:
        return False
    if tiers_result.get("found") is False:
        return False
    if tiers_result.get("price_source") == "none":
        return False
    tier_count = tiers_result.get("tier_count")
    if isinstance(tier_count, int) and tier_count > 0:
        return True
    tiers = tiers_result.get("tiers")
    if isinstance(tiers, list) and len(tiers) > 0:
        return True
    return tiers_result.get("found") is True


def normalize_source_file_basename(source_file: str) -> str | None:
    """Return basename only; None when path is unsafe or empty."""
    raw = source_file.strip()
    if not raw:
        return None
    if ".." in raw:
        return None
    if raw.startswith("\\\\") or "://" in raw:
        return None
    basename = os.path.basename(raw.replace("\\", "/"))
    if not basename or basename in {".", ".."}:
        return None
    return basename


def validate_source_provenance(
    *,
    source_file: str,
    source_sheet: str,
    source_row: int,
) -> tuple[bool, str | None]:
    basename = normalize_source_file_basename(source_file)
    if basename is None:
        return False, "source_file must be a safe basename without path traversal"
    if not source_sheet.strip():
        return False, "source_sheet is required"
    try:
        row = int(source_row)
    except (TypeError, ValueError):
        return False, "source_row must be a positive integer"
    if row <= 0:
        return False, "source_row must be a positive integer"
    return True, None


def build_learn_by_data_upsert_fields(
    *,
    source_file: str,
    source_sheet: str,
    source_row: int,
    top_candidate: Mapping[str, Any],
    keywords: str,
) -> dict[str, Any]:
    """Build org draft upsert fields for learn-by-data Section C (no tier prices)."""
    basename = normalize_source_file_basename(source_file)
    if basename is None:
        raise ValueError("source_file must be a safe basename without path traversal")
    matched_name = str(top_candidate.get("matched_name") or "").strip()
    description_english = str(top_candidate.get("description_english") or "").strip()
    return {
        "source_file": basename,
        "source_sheet": source_sheet.strip(),
        "source_row": int(source_row),
        "is_preferred_price": True,
        "superseded_by_source": "",
        "description": matched_name,
        "description_cn": keywords.strip(),
        "description_english": description_english,
    }


def check_learn_by_data_upsert_guards(
    *,
    tiers_result: Mapping[str, Any] | None,
    active_products: list[dict[str, Any]],
    draft_items: list[dict[str, Any]],
    source_file: str,
    source_sheet: str,
    source_row: int,
    top_code: str,
    session_processed_top_codes: set[str] | None = None,
) -> dict[str, Any]:
    """L1/L2/L3 guards before learn-by-data Section C upsert preview."""
    normalized_top = top_code.strip()
    if not normalized_top:
        return {
            "action": "reject",
            "reason": "missing_top_code",
            "message": "缺少 Agent 首位料号，跳过价格库补全。",
        }

    valid, validation_error = validate_source_provenance(
        source_file=source_file,
        source_sheet=source_sheet,
        source_row=source_row,
    )
    if not valid:
        return {
            "action": "reject",
            "reason": "invalid_provenance",
            "message": validation_error or "来源字段无效。",
        }

    basename = normalize_source_file_basename(source_file)
    assert basename is not None

    processed = session_processed_top_codes or set()
    if normalized_top in processed:
        return {
            "action": "skip",
            "reason": "session_duplicate_top_code",
            "message": f"本会话已处理料号 {normalized_top}，跳过重复补全。",
        }

    if material_in_price_library(tiers_result):
        return {
            "action": "skip",
            "reason": "material_already_in_price_library",
            "message": f"料号 {normalized_top} 已在价格库，跳过重复导入。",
        }

    duplicate = find_by_source_provenance(
        active_products=active_products,
        draft_items=draft_items,
        source_file=basename,
        source_sheet=source_sheet,
        source_row=source_row,
    )
    if duplicate is not None:
        existing_code = str(duplicate.get("material_code") or "").strip()
        return {
            "action": "reject",
            "reason": "duplicate_source_provenance",
            "message": (
                f"重复来源行 {basename} / {source_sheet.strip()} / {source_row} "
                f"已对应料号 {existing_code}，拒绝重复导入。"
            ),
            "existing_material_code": existing_code,
        }

    return {
        "action": "proceed",
        "reason": None,
        "message": None,
        "source_file": basename,
    }
