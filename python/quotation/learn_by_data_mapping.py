"""Learn-by-data Section D: historical mapping (报价单 → mapping table) helpers."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Mapping

from inventory.config import config
from inventory.services.mapping_table_matcher import load_mapping_df
from inventory.services.wanding_fuzzy_matcher import _normalize
from quotation.learn_by_data_price_library import normalize_source_file_basename, validate_source_provenance

MappingGuardAction = Literal["proceed", "skip", "reject", "confirm_overwrite"]


def mapping_search_text(inquiry_name: str, inquiry_spec: str) -> str:
    name = inquiry_name.strip()
    spec = inquiry_spec.strip()
    return f"{name} {spec}".strip() if spec else name


def normalized_mapping_key(inquiry_name: str, inquiry_spec: str) -> str:
    return _normalize(mapping_search_text(inquiry_name, inquiry_spec))


SectionDTrigger = Literal["mismatch", "gap"]


def is_d_mismatch_row(*, agent_pick_code: str, sheet_product_code: str) -> bool:
    """True when agent pick differs from sheet F col (correction signal)."""
    sheet_code = sheet_product_code.strip()
    if not sheet_code:
        return False
    agent_code = agent_pick_code.strip()
    if not agent_code:
        return True
    return agent_code != sheet_code


def mapping_has_keyword_code(
    mapping_df,
    *,
    inquiry_name: str,
    inquiry_spec: str,
    sheet_product_code: str,
) -> bool:
    """True when mapping table already has norm_text + F col code (M2 hit)."""
    sheet_code = sheet_product_code.strip()
    if not sheet_code:
        return False
    norm_key = normalized_mapping_key(inquiry_name, inquiry_spec)
    if not norm_key:
        return False
    if mapping_df is None:
        mapping_df = load_mapping_df(config.MAPPING_TABLE_PATH)
    if getattr(mapping_df, "empty", True):
        return False
    for hit in _find_mapping_by_norm_text(mapping_df, norm_key):
        if str(hit.get("code") or "").strip() == sheet_code:
            return True
    return False


def section_d_trigger(
    *,
    agent_pick_code: str,
    sheet_product_code: str,
    inquiry_name: str = "",
    inquiry_spec: str = "",
    mapping_df=None,
) -> SectionDTrigger | None:
    """Section D eligibility: D-mismatch (correction) or D-gap (missing mapping)."""
    sheet_code = sheet_product_code.strip()
    if not sheet_code:
        return None
    if is_d_mismatch_row(agent_pick_code=agent_pick_code, sheet_product_code=sheet_code):
        return "mismatch"
    if mapping_has_keyword_code(
        mapping_df,
        inquiry_name=inquiry_name,
        inquiry_spec=inquiry_spec,
        sheet_product_code=sheet_code,
    ):
        return None
    return "gap"


def is_section_d_eligible(
    *,
    agent_pick_code: str,
    sheet_product_code: str,
    inquiry_name: str = "",
    inquiry_spec: str = "",
    mapping_df=None,
) -> bool:
    return section_d_trigger(
        agent_pick_code=agent_pick_code,
        sheet_product_code=sheet_product_code,
        inquiry_name=inquiry_name,
        inquiry_spec=inquiry_spec,
        mapping_df=mapping_df,
    ) is not None


def build_learn_by_data_mapping_row(
    *,
    inquiry_name: str,
    inquiry_spec: str,
    sheet_product_code: str,
    quote_name: str,
    source_file: str,
    source_sheet: str,
    source_row: int,
    agent_pick_code: str = "",
) -> dict[str, Any]:
    """Build mapping-table row from VANTSING sheet columns B/C/F/G."""
    basename = normalize_source_file_basename(source_file)
    if basename is None:
        raise ValueError("source_file must be a safe basename without path traversal")
    return {
        "inquiry_name": inquiry_name.strip(),
        "inquiry_spec": inquiry_spec.strip(),
        "product_code": sheet_product_code.strip(),
        "quotation_name": quote_name.strip(),
        "source_file": basename,
        "source_sheet": source_sheet.strip(),
        "source_row": int(source_row),
        "agent_pick_code": agent_pick_code.strip(),
        "search_text": mapping_search_text(inquiry_name, inquiry_spec),
    }


def resolve_mapping_pending_path() -> Path:
    data_dir = os.environ.get("DATA_DIR", "").strip()
    if data_dir:
        return Path(data_dir) / "mapping_import_pending.jsonl"
    local = os.getenv("LOCALAPPDATA", "").strip()
    if local:
        return Path(local) / "CCB-Wanding" / "data" / "mapping_import_pending.jsonl"
    return Path(config.MAPPING_TABLE_PATH).parent / "mapping_import_pending.jsonl"


def load_mapping_pending_entries(path: Path | None = None) -> list[dict[str, Any]]:
    pending_path = path or resolve_mapping_pending_path()
    if not pending_path.is_file():
        return []
    entries: list[dict[str, Any]] = []
    for line in pending_path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text:
            continue
        try:
            row = json.loads(text)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict):
            entries.append(row)
    return entries


def _find_mapping_by_norm_text(mapping_df, norm_key: str) -> list[dict[str, Any]]:
    if mapping_df.empty or not norm_key:
        return []
    if "norm_text" not in mapping_df.columns:
        return []
    hits = mapping_df[mapping_df["norm_text"] == norm_key]
    return [{"code": str(r.get("code") or ""), "matched_name": str(r.get("matched_name") or "")} for _, r in hits.iterrows()]


def _find_pending_by_source(
    entries: list[dict[str, Any]],
    *,
    source_file: str,
    source_sheet: str,
    source_row: int,
) -> dict[str, Any] | None:
    for entry in entries:
        if entry.get("status") == "merged":
            continue
        row = entry.get("row") if isinstance(entry.get("row"), dict) else entry
        if not isinstance(row, dict):
            continue
        if (
            str(row.get("source_file") or "").strip() == source_file.strip()
            and str(row.get("source_sheet") or "").strip() == source_sheet.strip()
            and int(row.get("source_row") or 0) == int(source_row)
        ):
            return entry
    return None


def sheet_product_code_is_valid(code: str) -> bool:
    """True when code resolves in bundled/org price library (M5)."""
    normalized = code.strip()
    if not normalized:
        return False
    try:
        from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code

        row = get_wanding_price_by_code(normalized, customer_level="B")
    except Exception:
        return False
    return row is not None


def _org_mapping_hits(norm_key: str) -> list[dict[str, Any]]:
    try:
        from admin.org_mapping_client import is_org_mapping_configured, lookup_mapping_rows

        if not is_org_mapping_configured() or not norm_key:
            return []
        data = lookup_mapping_rows(norm_key=norm_key) or {}
        rows = data.get("rows") or []
        hits: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            code = str(row.get("product_code") or "").strip()
            if not code:
                continue
            hits.append(
                {
                    "code": code,
                    "matched_name": str(row.get("quotation_name") or "").strip(),
                    "search_text": norm_key,
                }
            )
        return hits
    except Exception:
        return []


def check_learn_by_data_mapping_guards(
    *,
    inquiry_name: str,
    inquiry_spec: str,
    sheet_product_code: str,
    source_file: str,
    source_sheet: str,
    source_row: int,
    mapping_df=None,
    pending_entries: list[dict[str, Any]] | None = None,
    session_processed_keys: set[tuple[str, str]] | None = None,
) -> dict[str, Any]:
    """M1–M5 guards before Section D pending append."""
    sheet_code = sheet_product_code.strip()
    if not sheet_code:
        return {
            "action": "reject",
            "reason": "missing_sheet_product_code",
            "message": "报价单 F 列产品编号为空，跳过历史映射导入。",
        }

    if not sheet_product_code_is_valid(sheet_code):
        return {
            "action": "reject",
            "reason": "invalid_sheet_product_code",
            "message": f"报价单 F 列料号 {sheet_code} 在价格库/库存中未找到，跳过历史映射导入。",
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

    keywords = mapping_search_text(inquiry_name, inquiry_spec)
    norm_key = normalized_mapping_key(inquiry_name, inquiry_spec)
    session_key = (norm_key, sheet_code)
    processed = session_processed_keys or set()
    if session_key in processed:
        return {
            "action": "skip",
            "reason": "session_duplicate",
            "message": f"本会话已处理 {keywords} → {sheet_code}，跳过。",
        }

    pending = pending_entries if pending_entries is not None else load_mapping_pending_entries()
    duplicate_source = _find_pending_by_source(
        pending,
        source_file=basename,
        source_sheet=source_sheet,
        source_row=source_row,
    )
    if duplicate_source is not None:
        existing_code = str((duplicate_source.get("row") or {}).get("product_code") or "").strip()
        return {
            "action": "reject",
            "reason": "duplicate_source_provenance",
            "message": (
                f"重复来源行 {basename} / {source_sheet.strip()} / {source_row} "
                f"已在 pending 中（料号 {existing_code}），拒绝重复导入。"
            ),
            "existing_product_code": existing_code,
        }

    if mapping_df is None:
        mapping_df = load_mapping_df(config.MAPPING_TABLE_PATH)
    existing = _find_mapping_by_norm_text(mapping_df, norm_key)
    org_hits = _org_mapping_hits(norm_key)
    if org_hits:
        seen_codes = {str(hit.get("code") or "").strip() for hit in existing}
        for hit in org_hits:
            code = str(hit.get("code") or "").strip()
            if code and code not in seen_codes:
                existing.append(hit)
                seen_codes.add(code)
    for hit in existing:
        if str(hit.get("code") or "").strip() == sheet_code:
            return {
                "action": "skip",
                "reason": "mapping_already_exists",
                "message": f"映射表已有 {keywords} → {sheet_code}，跳过。",
            }

    conflicting = [hit for hit in existing if str(hit.get("code") or "").strip() and str(hit.get("code") or "").strip() != sheet_code]
    if conflicting:
        old_code = str(conflicting[0].get("code") or "").strip()
        return {
            "action": "confirm_overwrite",
            "reason": "mapping_keyword_conflict",
            "message": f"映射表已有 {keywords} → {old_code}；本次报价单 F 列为 {sheet_code}，需确认覆盖。",
            "existing_product_code": old_code,
            "proposed_product_code": sheet_code,
        }

    return {
        "action": "proceed",
        "reason": None,
        "message": None,
        "source_file": basename,
        "search_text": keywords,
    }


def append_mapping_pending_row(
    row: Mapping[str, Any],
    *,
    allow_overwrite: bool = False,
    path: Path | None = None,
) -> dict[str, Any]:
    pending_path = path or resolve_mapping_pending_path()
    pending_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "id": str(uuid.uuid4()),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "allow_overwrite": bool(allow_overwrite),
        "row": dict(row),
    }
    with pending_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return {"success": True, "pending_path": str(pending_path), "entry_id": entry["id"]}
