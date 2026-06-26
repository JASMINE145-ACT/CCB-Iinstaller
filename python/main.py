#!/usr/bin/env python3
"""JSON-lines entry point used by the quotation MCP server."""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

_project_root = Path(__file__).resolve().parent.parent
_env_file = _project_root / ".env.accurate"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file, override=True)
    except Exception:
        pass

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

_log_level = getattr(logging, os.getenv("QUOTATION_LOG_LEVEL", "WARNING").upper(), logging.WARNING)
logging.basicConfig(level=_log_level, format="%(name)s: %(message)s", stream=sys.stderr)
logger = logging.getLogger(__name__)

ERROR_CODE_NO_DATA = "NO_DATA"
ERROR_CODE_AMBIGUOUS_MATCH = "AMBIGUOUS_MATCH"
ERROR_CODE_FILE_NOT_FOUND = "FILE_NOT_FOUND"
ERROR_CODE_INVALID_INPUT = "INVALID_INPUT"
ERROR_CODE_TIMEOUT = "TIMEOUT"
ERROR_CODE_DEPENDENCY_MISSING = "DEPENDENCY_MISSING"
ERROR_CODE_PERMISSION_REQUIRED = "PERMISSION_REQUIRED"


def _infer_error_code(error: Any) -> str:
    text = str(error or "").strip().lower()
    if not text:
        return ERROR_CODE_INVALID_INPUT
    if any(token in text for token in ("timed out", "timeout", "超时")):
        return ERROR_CODE_TIMEOUT
    if any(token in text for token in ("permission", "denied", "not allowed", "权限", "拒绝")):
        return ERROR_CODE_PERMISSION_REQUIRED
    if any(token in text for token in ("no such file", "file not found", "文件不存在", "模板不存在")):
        return ERROR_CODE_FILE_NOT_FOUND
    if any(token in text for token in ("install", "module", "dependency", "openpyxl", "请安装", "未安装")):
        return ERROR_CODE_DEPENDENCY_MISSING
    if any(token in text for token in ("missing required", "invalid", "unknown tool", "请提供", "非法")):
        return ERROR_CODE_INVALID_INPUT
    if any(token in text for token in ("not found", "no data", "unmatched", "未找到", "未匹配", "无数据")):
        return ERROR_CODE_NO_DATA
    if any(token in text for token in ("ambiguous", "multiple candidates", "needs selection", "多候选")):
        return ERROR_CODE_AMBIGUOUS_MATCH
    return ERROR_CODE_INVALID_INPUT


def _normalize_error_codes(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_error_codes(item) for item in value]
    if not isinstance(value, dict):
        return value

    normalized = {key: _normalize_error_codes(item) for key, item in value.items()}
    error = normalized.get("error")

    if normalized.get("success") is False and "error_code" not in normalized:
        normalized["error_code"] = _infer_error_code(error)

    candidate_count = normalized.get("candidate_count")
    if normalized.get("unmatched") is True or normalized.get("found") is False:
        normalized.setdefault("error_code", ERROR_CODE_NO_DATA)
    elif normalized.get("needs_selection") is True and isinstance(candidate_count, int) and candidate_count > 1:
        normalized.setdefault("error_code", ERROR_CODE_AMBIGUOUS_MATCH)

    return normalized


def _wanding_knowledge_path() -> Path:
    configured = os.getenv("WANDING_BUSINESS_KNOWLEDGE_PATH", "").strip()
    if configured:
        return Path(configured)
    return _project_root / "data" / "wanding_business_knowledge.md"


def _load_wanding_knowledge() -> str:
    try:
        from admin.org_knowledge_client import load_doc_content

        content = load_doc_content(
            "wanding_business_knowledge",
            fallback_path=_wanding_knowledge_path(),
            use_cache=True,
        )
        if content:
            return content
    except Exception:
        logger.debug("org knowledge client unavailable; falling back to local file")

    path = _wanding_knowledge_path()
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        logger.exception("Failed to load wanding business knowledge: %s", path)
        return ""


DEFAULT_SELECTION_CANDIDATE_LIMIT = 10
EXPLICIT_SELECTION_CANDIDATE_LIMIT = 15
MATCH_QUOTATION_BATCH_LIMIT = int(os.getenv("MATCH_QUOTATION_BATCH_MAX_ITEMS", "10"))
INVENTORY_BATCH_MAX_CODES = 50


def _build_selection_payload(keywords: str, candidates: list[dict[str, Any]], show_candidates: bool = False) -> dict[str, Any]:
    total_count = len(candidates)
    limit = EXPLICIT_SELECTION_CANDIDATE_LIMIT if show_candidates else DEFAULT_SELECTION_CANDIDATE_LIMIT
    visible = candidates[:limit]
    truncated = total_count > len(visible)

    return {
        "keywords": keywords,
        "unmatched": not bool(candidates),
        "needs_selection": bool(candidates),
        **(
            {"error_code": ERROR_CODE_NO_DATA}
            if not candidates
            else {"error_code": ERROR_CODE_AMBIGUOUS_MATCH}
            if total_count > 1
            else {}
        ),
        "candidate_count": total_count,
        "candidates_returned": len(visible),
        "candidates_truncated": truncated,
        "candidates": visible,
        "show_candidates_requested": bool(show_candidates),
        "selection_owner": "claude_code",
        "selection_context": {
            "mode": "claude_code_auto_select",
            "knowledge_source": str(_wanding_knowledge_path()),
            "instructions": [
                "Do not Read knowledge_source for routine short price lookups when candidate_count is 1.",
                "When candidate_count > 1: Read knowledge_source, apply business rules, reply with ONE recommended line (price table) plus up to 4 brief bullet alternatives — do NOT dump the full candidates table or ask user to pick a number by default.",
                "Each candidate may include description_english and indonesian_name (same value: price-library English product name for Indonesian column H). When replying to the user with a price table, always show this English/Indonesian name column when present.",
                "If every candidate conflicts with the user's keywords, report unmatched instead of forcing a weak match.",
                "If two candidates remain genuinely indistinguishable after applying the knowledge, ask one focused clarification question.",
                "If candidates_truncated is true or the user is unsatisfied with a match, re-run match_quotation for that keywords only with show_candidates=true.",
            ],
        },
    }


def _require_text_param(params: dict[str, Any], name: str, aliases: tuple[str, ...] = ()) -> str:
    for key in (name, *aliases):
        value = params.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if value is not None and not isinstance(value, (dict, list, tuple, set)):
            text = str(value).strip()
            if text:
                return text
    alias_text = ", ".join((name, *aliases))
    raise ValueError(
        f"Missing required parameter '{name}'. Accepted keys: {alias_text}. "
        'For example: {"tool":"match_quotation","params":{"keywords":"直接50","customer_level":"B"}}'
    )


def _coerce_text_list(value: Any, *, nested_keys: tuple[str, ...] = ()) -> list[str]:
    """Accept common LLM shapes for list params and return non-empty strings."""
    if value is None:
        return []
    if isinstance(value, str):
        parts = re.split(r"[\n,，;；]+", value)
        return [part.strip() for part in parts if part and part.strip()]
    if isinstance(value, dict):
        for key in nested_keys:
            if key in value:
                found = _coerce_text_list(value.get(key), nested_keys=nested_keys)
                if found:
                    return found
        values: list[str] = []
        for item in value.values():
            values.extend(_coerce_text_list(item, nested_keys=nested_keys))
        return values
    if isinstance(value, (list, tuple, set)):
        values: list[str] = []
        for item in value:
            values.extend(_coerce_text_list(item, nested_keys=nested_keys))
        return values
    text = str(value).strip()
    return [text] if text else []


def _coerce_number(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return default


def _coerce_int(value: Any, default: int = 1) -> int:
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return default


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip().lower()
    return text in {"1", "true", "yes", "y", "on", "confirmed", "locked"}


from wanding_workspace_paths import coerce_write_path
def _default_blank_template() -> str:
    candidates: list[Path] = []
    data_dir = os.getenv("WANDING_DATA_DIR", "").strip()
    if data_dir:
        candidates.append(Path(data_dir))
    price_lib = os.getenv("WANDING_PRICE_LIB_PATH", "").strip()
    if price_lib:
        candidates.append(Path(price_lib).parent)
    candidates.extend([
        _project_root / "data",
        PYTHON_ROOT.parent / "data",
        PYTHON_ROOT.parent / "vendor" / "wanding" / "data",
    ])
    for root in candidates:
        if not root.exists():
            continue
        for path in sorted(root.glob("*.xlsx")):
            if "空白" in path.name and "标准" in path.name:
                return str(path)
    raise ValueError(
        "Missing required parameter 'file_path' or 'template_path', and no bundled blank standard quotation template was found."
    )


def _first_dict(value: Any) -> dict[str, Any] | None:
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        for item in value:
            found = _first_dict(item)
            if found:
                return found
    return None


def _extract_match_like(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Find a selected/candidate/product dict inside common model-produced shapes."""
    for key in (
        "selected",
        "selected_item",
        "match",
        "matched",
        "best_match",
        "quotation",
        "candidate",
        "item",
        "result",
    ):
        found = _first_dict(raw.get(key))
        if found:
            return found
    candidates = raw.get("candidates")
    if isinstance(candidates, list) and candidates:
        return _first_dict(candidates[0])
    return None


def _fill_item_lookup_text(raw: dict[str, Any]) -> str:
    for key in ("keywords", "query", "product", "product_name", "name", "quote_name", "description", "text"):
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _match_fill_item(raw: dict[str, Any], customer_level: str, price_library_path: Any) -> dict[str, Any] | None:
    keywords = _fill_item_lookup_text(raw)
    if not keywords:
        return None
    try:
        from inventory.services.match_and_inventory import match_quotation_union
        from inventory.services.llm_selector import _apply_candidate_pre_filter

        candidates = match_quotation_union(
            keywords,
            customer_level=customer_level,
            price_library_path=str(price_library_path) if price_library_path else None,
        )
        if not candidates:
            return None
        ranked = _rank_fill_candidates(keywords, _apply_candidate_pre_filter(keywords, candidates))
        return ranked[0] if ranked else candidates[0]
    except Exception:
        logger.exception("Failed to auto-match fill item: %s", keywords)
        return None


def _rank_fill_candidates(keywords: str, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Extra deterministic intent ranking for direct fill without a model decision."""
    kw = (keywords or "").lower()
    wants_coupling = any(token in kw for token in ("直接", "直通", "管箍", "socket", "coupling"))
    wants_tee = "三通" in kw or "tee" in kw
    wants_reducing = "异径" in kw or "变径" in kw or "大小头" in kw

    ranked: list[dict[str, Any]] = []
    for candidate in candidates:
        item = dict(candidate)
        name_raw = str(item.get("matched_name") or "")
        name = name_raw.lower()
        score = float(item.get("_pre_score") or 0)

        if wants_coupling:
            if "直通" in name_raw or "管箍" in name_raw or "直接头" in name_raw:
                score += 60
            if "日标" not in kw and "印尼(日标)" in name_raw:
                score -= 12
            if "管(" in name_raw or "直管" in name_raw or "扩直口管" in name_raw:
                score -= 70
            if any(bad in name_raw for bad in ("三通", "弯头", "存水弯", "管帽", "法兰", "清扫口")):
                score -= 35

        if wants_tee:
            if "三通" in name_raw:
                score += 60
            else:
                score -= 70
            if "顺水三通" in name_raw:
                score += 12
            if "短型" in name_raw:
                score += 8
            if "异径" in name_raw and not wants_reducing:
                score -= 25
            if any(bad in name_raw for bad in ("直通", "直管", "弯头", "存水弯", "管帽", "法兰", "清扫口")):
                score -= 20

        item["_fill_score"] = score
        ranked.append(item)

    return sorted(ranked, key=lambda c: c.get("_fill_score", 0), reverse=True)


def _lookup_wanding_row_by_code(
    code: str,
    *,
    customer_level: str = "B",
    price_library_path: Any = None,
) -> dict[str, Any] | None:
    code = (code or "").strip()
    if not code or code == "无货":
        return None
    try:
        from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code

        return get_wanding_price_by_code(
            code,
            customer_level=customer_level,
            price_library_path=str(price_library_path) if price_library_path else None,
        )
    except Exception:
        logger.exception("Failed to lookup wanding row for code=%s", code)
        return None


def _normalize_fill_items(
    items: Any,
    *,
    customer_level: str = "B",
    price_library_path: Any = None,
    require_exact_codes: bool = False,
) -> list[dict[str, Any]]:
    if isinstance(items, dict):
        for key in ("items", "fill_items", "rows", "lines"):
            if isinstance(items.get(key), list):
                items = items[key]
                break
        else:
            items = [items]
    if not isinstance(items, list):
        raise ValueError("fill_quotation_sheet direct mode requires 'items' or 'fill_items' to be an array.")

    from quotation.fill_enrich import enrich_fill_item

    normalized: list[dict[str, Any]] = []
    for idx, raw in enumerate(items):
        if not isinstance(raw, dict):
            raise ValueError("Each quotation item must be an object.")
        nested = _extract_match_like(raw) or {}
        row = _coerce_int(raw.get("row") or raw.get("excel_row"), 8 + idx)
        qty = _coerce_int(raw.get("qty") or raw.get("quantity") or raw.get("count"), 1)
        unit_price = _coerce_number(
            raw.get("unit_price")
            or raw.get("price")
            or raw.get("b_price")
            or raw.get("price_b")
            or nested.get("unit_price")
            or nested.get("price")
            or nested.get("b_price")
            or nested.get("price_b"),
            0.0,
        )
        code = (
            raw.get("code")
            or raw.get("item_code")
            or raw.get("sku")
            or raw.get("product_code")
            or nested.get("code")
            or nested.get("item_code")
            or nested.get("sku")
            or nested.get("product_code")
        )
        quote_name = (
            raw.get("quote_name")
            or raw.get("matched_name")
            or raw.get("name")
            or raw.get("product_name")
            or raw.get("keywords")
            or raw.get("description")
            or nested.get("quote_name")
            or nested.get("matched_name")
            or nested.get("name")
            or nested.get("product_name")
            or nested.get("keywords")
            or nested.get("description")
        )
        matched: dict[str, Any] | None = None
        if require_exact_codes and not code:
            raise ValueError(
                "Confirmed quotation rows must use fill_items with code/product_code; "
                "keywords fallback is invalid."
            )
        if not require_exact_codes and (not code or not quote_name or unit_price <= 0):
            matched = _match_fill_item(raw, customer_level=customer_level, price_library_path=price_library_path)
            if matched:
                code = code or matched.get("code")
                quote_name = quote_name or matched.get("matched_name") or matched.get("name")
                if unit_price <= 0:
                    unit_price = _coerce_number(matched.get("unit_price") or matched.get("price"), 0.0)
        if not code:
            code = "无货"
        if not quote_name:
            quote_name = _fill_item_lookup_text(raw) or "未匹配"
        if unit_price <= 0:
            unit_price = 0.0

        indonesian_name = str(
            raw.get("indonesian_name")
            or nested.get("indonesian_name")
            or raw.get("description_english")
            or nested.get("description_english")
            or ""
        ).strip()
        satuan = str(raw.get("satuan") or nested.get("satuan") or "").strip()
        brand = str(raw.get("brand") or nested.get("brand") or "").strip()
        specification = str(
            raw.get("specification") or raw.get("spec") or raw.get("model") or nested.get("specification") or ""
        ).strip()
        price_row = _lookup_wanding_row_by_code(
            str(code),
            customer_level=customer_level,
            price_library_path=price_library_path,
        )

        normalized.append(
            enrich_fill_item(
                {
                    "row": row,
                    "code": str(code).strip(),
                    "quote_name": str(quote_name).strip(),
                    "unit_price": unit_price,
                    "qty": qty,
                    "specification": specification,
                    "indonesian_name": indonesian_name,
                    "satuan": satuan,
                    "brand": brand,
                },
                matched=matched,
                price_row=price_row,
                inquiry_unit=str(
                    raw.get("inquiry_unit") or raw.get("unit") or nested.get("inquiry_unit") or nested.get("unit") or ""
                ).strip(),
            )
        )
    return normalized


def _item_to_dict(item: Any) -> dict[str, Any] | None:
    if item is None:
        return None
    return {
        "code": getattr(item, "code", None) or getattr(item, "item_no", ""),
        "name": getattr(item, "name", None) or getattr(item, "item_name", ""),
        "qty_available": getattr(item, "qty_available", 0.0) or 0.0,
        "qty_warehouse": getattr(item, "qty_warehouse", 0.0) or 0.0,
        "unit": getattr(item, "unit", ""),
    }


_INVENTORY_NO_CREDENTIALS = (
    "Inventory lookup is unavailable: Accurate Online API credentials "
    "(AOL_ACCESS_TOKEN / AOL_SIGNATURE_SECRET / AOL_DATABASE_ID) are not configured "
    "for this CCB-Wanding install."
)


def _aol_configured() -> bool:
    """True when the bundled inventory API has usable Accurate Online credentials."""
    return bool(os.getenv("AOL_ACCESS_TOKEN", "").strip())


def _inventory_miss(code: str) -> dict[str, Any]:
    """Structured 'not found' so the model can tell 'no stock' from 'no credentials'."""
    result: dict[str, Any] = {"code": code, "found": False, "error_code": ERROR_CODE_NO_DATA}
    if _aol_configured():
        result["message"] = f"No inventory item found for code '{code}'."
    else:
        result["inventory_unavailable"] = _INVENTORY_NO_CREDENTIALS
    return result


def _inventory_batch_row(code: str, item_dict: dict[str, Any] | None) -> dict[str, Any]:
    row: dict[str, Any] = {"code": code, "item": item_dict}
    if item_dict is None:
        row["error_code"] = ERROR_CODE_NO_DATA
    return row


def _build_inventory_by_code_batch_payload(
    codes: list[str],
    *,
    input_total: int | None = None,
) -> dict[str, Any]:
    """Batch inventory lookup with stats + markdown table for agent replies."""
    from inventory.agents.table_agent import InventoryTableAgent
    from inventory.services.inventory_agent_tools import _build_inventory_batch_formatted_response

    max_codes = INVENTORY_BATCH_MAX_CODES
    input_total = input_total if input_total is not None else len(codes)
    truncated = input_total > len(codes)

    normalized = [str(code or "").strip() for code in codes]
    valid_codes = [code for code in normalized if code]
    code_to_item: dict[str, dict[str, Any]] = {}
    if valid_codes:
        table = InventoryTableAgent()
        for item in table.get_items_by_codes(valid_codes):
            item_dict = _item_to_dict(item)
            if not item_dict:
                continue
            key = str(item_dict.get("code") or "").strip()
            if key:
                code_to_item.setdefault(key, item_dict)

    items: list[dict[str, Any]] = []
    items_with_status: list[dict[str, Any]] = []
    found = 0
    not_found = 0
    invalid = 0

    for idx, code in enumerate(normalized):
        if not code:
            invalid += 1
            items.append(_inventory_batch_row("", None))
            items_with_status.append(
                {"input_index": idx, "code": "", "item_status": "invalid_code"},
            )
            continue

        item_dict = code_to_item.get(code)
        if item_dict:
            found += 1
            items.append(_inventory_batch_row(code, item_dict))
            items_with_status.append(
                {
                    "input_index": idx,
                    "code": code,
                    "item_status": "found",
                    "item_summary": {
                        "item_name": item_dict.get("name"),
                        "qty_warehouse": item_dict.get("qty_warehouse"),
                        "qty_available": item_dict.get("qty_available"),
                    },
                },
            )
        else:
            not_found += 1
            items.append(_inventory_batch_row(code, None))
            items_with_status.append(
                {"input_index": idx, "code": code, "item_status": "not_found"},
            )

    formatted_response = _build_inventory_batch_formatted_response(items_with_status)
    if truncated:
        formatted_response = (
            f"（本次仅处理前 {max_codes} 条，共 {input_total} 个编号；其余请分批调用。）\n\n"
            f"{formatted_response}"
        )

    return {
        "items": items,
        "stats": {
            "found": found,
            "not_found": not_found,
            "invalid": invalid,
            "input_count": len(normalized),
            "truncated": truncated,
            "input_total": input_total,
        },
        "formatted_response": formatted_response,
    }


def dispatch(tool: str, params: dict[str, Any]) -> Any:
    if tool == "append_business_rule":
        rule_text = _require_text_param(params, "rule_text", ("rule", "content", "text"))
        confirmed = _coerce_bool(params.get("confirmed") or params.get("confirm") or params.get("approved"))
        if not confirmed:
            return {
                "requires_confirmation": True,
                "message": "This will update the shared organization knowledge base. Ask the user to confirm before calling again with confirmed=true.",
                "rule_text": rule_text,
                "section": params.get("section") or "业务规则补充",
            }

        from admin.org_knowledge_client import append_business_rule

        return append_business_rule(
            rule_text,
            section=params.get("section"),
            reason=params.get("reason"),
            slug=params.get("slug") or "wanding_business_knowledge",
        )

    if tool == "match_quotation":
        from inventory.services.match_and_inventory import match_quotation_union

        keywords = _require_text_param(params, "keywords", ("query", "keyword", "product", "product_name", "text"))
        candidates = match_quotation_union(
            keywords,
            customer_level=params.get("customer_level", "B"),
            price_library_path=params.get("price_library_path"),
            product_type=params.get("product_type"),
        )
        return _build_selection_payload(
            keywords,
            candidates,
            show_candidates=bool(params.get("show_candidates", False)),
        )

    if tool == "match_quotation_batch":
        from inventory.services.match_and_inventory import match_quotation_union

        results = []
        keywords_list = _coerce_text_list(
            params.get("keywords_list")
            or params.get("keywords")
            or params.get("queries")
            or params.get("products")
            or params.get("items"),
            nested_keys=("keywords", "query", "product", "product_name", "name", "text"),
        )
        if not keywords_list:
            raise ValueError(
                "Missing required parameter 'keywords_list'. "
                'For one query, use {"tool":"match_quotation","params":{"keywords":"直接50","customer_level":"B"}}.'
            )
        total_requested = len(keywords_list)
        batch_keywords = keywords_list[:MATCH_QUOTATION_BATCH_LIMIT]
        for keywords in batch_keywords:
            keyword_text = str(keywords)
            candidates = match_quotation_union(
                keyword_text,
                customer_level=params.get("customer_level", "B"),
                price_library_path=params.get("price_library_path"),
                product_type=params.get("product_type"),
            )
            results.append(_build_selection_payload(
                keyword_text,
                candidates,
                show_candidates=bool(params.get("show_candidates", False)),
            ))
        truncated = total_requested > len(batch_keywords)
        payload: dict[str, Any] = {
            "batch_limit": MATCH_QUOTATION_BATCH_LIMIT,
            "items_requested": total_requested,
            "items_processed": len(results),
            "items_truncated": truncated,
            "results": results,
        }
        if truncated:
            payload["remaining_keywords"] = [str(k) for k in keywords_list[MATCH_QUOTATION_BATCH_LIMIT:]]
            payload["next_step"] = (
                f"Call match_quotation_batch again with keywords_list=remaining_keywords "
                f"(max {MATCH_QUOTATION_BATCH_LIMIT} per call), or use fill_quotation_sheet for full sheets."
            )
        return payload

    if tool == "match_price_and_get_inventory":
        from inventory.services.match_and_inventory import match_price_and_get_inventory

        keywords = _require_text_param(params, "keywords", ("query", "keyword", "product", "product_name", "text"))
        result = match_price_and_get_inventory(
            keywords,
            customer_level=params.get("customer_level", "B"),
            price_library_path=params.get("price_library_path"),
            product_type=params.get("product_type"),
        )
        if result is None:
            return {"keywords": keywords, "unmatched": True, "found": False}
        if isinstance(result, dict) and result.get("_needs_human_choice"):
            options = result.get("options") or []
            candidates = [
                {
                    "code": opt.get("code", ""),
                    "matched_name": opt.get("matched_name", ""),
                    "unit_price": float(opt.get("unit_price", 0) or 0),
                    "source": opt.get("source", "共同"),
                    "description_english": opt.get("description_english", ""),
                    "indonesian_name": opt.get("indonesian_name", "")
                    or opt.get("description_english", ""),
                }
                for opt in options
            ]
            payload = _build_selection_payload(
                keywords,
                candidates,
                show_candidates=bool(params.get("show_candidates", False)),
            )
            payload["price_and_inventory_mode"] = True
            return payload
        return result

    if tool == "get_inventory_by_code":
        from inventory.agents.table_agent import InventoryTableAgent

        code = _require_text_param(params, "code", ("item_code", "no", "sku", "item"))
        item = InventoryTableAgent().get_item_by_code(code)
        if item is None:
            return _inventory_miss(code)
        return _item_to_dict(item)

    if tool == "get_inventory_by_code_batch":
        raw_codes = _coerce_text_list(
            params.get("codes") or params.get("code") or params.get("item_codes") or params.get("items"),
            nested_keys=("code", "item_code", "sku", "product_code", "no"),
        )
        if not raw_codes:
            raise ValueError(
                "Missing required parameter 'codes'. "
                'Example: {"tool":"get_inventory_by_code_batch","params":{"codes":["8020020755","8020022784"]}}'
            )
        return _build_inventory_by_code_batch_payload(
            raw_codes[:INVENTORY_BATCH_MAX_CODES],
            input_total=len(raw_codes),
        )

    if tool == "search_inventory":
        from inventory.agents.table_agent import InventoryTableAgent

        keywords = _require_text_param(
            params, "keywords", ("query", "keyword", "product", "product_name", "text", "name")
        )
        try:
            max_results = int(params.get("max_results", 10) or 10)
        except (TypeError, ValueError):
            max_results = 10
        items = InventoryTableAgent().search_items(keywords, max_results=max_results)
        payload: dict[str, Any] = {
            "keywords": keywords,
            "count": len(items),
            "items": [_item_to_dict(item) for item in items],
            "found": bool(items),
        }
        if not items and not _aol_configured():
            payload["inventory_unavailable"] = _INVENTORY_NO_CREDENTIALS
        if not items:
            payload["error_code"] = ERROR_CODE_NO_DATA
        return payload

    if tool == "parse_excel_smart":
        from quotation.quote_tools import parse_excel_smart

        return parse_excel_smart(
            file_path=_require_text_param(params, "file_path", ("path", "excel_path", "file")),
            sheet_name=params.get("sheet_name"),
            max_rows=params.get("max_rows", 500),
        )

    if tool == "fill_quotation_sheet":
        direct_items = params.get("fill_items") or params.get("items") or params.get("rows") or params.get("lines")
        require_exact_codes = any(
            _coerce_bool(params.get(key))
            for key in ("require_exact_codes", "locked_lines", "confirmed", "confirmed_selection")
        )
        if require_exact_codes and not direct_items:
            raise ValueError(
                "Confirmed quotation rows must call fill_quotation_sheet with fill_items; "
                "automatic keywords/file rematching is invalid."
            )
        if direct_items:
            from quotation.quote_tools import fill_quotation

            fill_items = _normalize_fill_items(
                direct_items,
                customer_level=params.get("customer_level", "B"),
                price_library_path=params.get("price_library_path"),
                require_exact_codes=require_exact_codes,
            )
            file_path = (
                params.get("file_path")
                or params.get("path")
                or params.get("quotation_path")
                or params.get("template_path")
                or params.get("template")
                or params.get("file")
                or _default_blank_template()
            )
            output_path = params.get("output_path") or params.get("out_path")
            workspace_path = (
                params.get("workspace_path") or params.get("workspace") or None
            )
            if not output_path:
                stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = coerce_write_path(
                    None,
                    workspace_path=str(workspace_path) if workspace_path else None,
                    default_filename=f"Wanding-Quotation_{stamp}.xlsx",
                    require_workspace=True,
                )
            else:
                output_path = coerce_write_path(
                    str(output_path),
                    workspace_path=str(workspace_path) if workspace_path else None,
                    require_workspace=not Path(str(output_path)).is_absolute(),
                )
            return fill_quotation(
                file_path=str(file_path),
                fill_items=fill_items,
                sheet_name=params.get("sheet_name"),
                output_path=str(output_path),
                quotation_date=params.get("quotation_date"),
                delivery_date=params.get("delivery_date"),
            ) | {"mode": "direct_fill", "items_count": len(fill_items)}

        from quotation.flow_orchestrator import run_quotation_fill_flow

        ws = params.get("workspace_path") or params.get("workspace")
        legacy_out = params.get("output_path")
        if not legacy_out:
            src = Path(
                _require_text_param(params, "file_path", ("path", "quotation_path", "file"))
            )
            legacy_out = coerce_write_path(
                None,
                workspace_path=str(ws) if ws else None,
                default_filename=f"{src.stem}_filled{src.suffix}",
                require_workspace=True,
            )
        else:
            legacy_out = coerce_write_path(
                str(legacy_out),
                workspace_path=str(ws) if ws else None,
                require_workspace=not Path(str(legacy_out)).is_absolute(),
            )

        return run_quotation_fill_flow(
            quotation_path=_require_text_param(params, "file_path", ("path", "quotation_path", "file")),
            price_library_path=params.get("price_library_path"),
            output_path=legacy_out,
            sheet_name=params.get("sheet_name"),
            customer_level=params.get("customer_level", "B"),
        )

    if tool == "ask_clarification":
        return {
            "question": params.get("question") or "Please provide product type or specification.",
            "reason": params.get("reason") or "The current description is not enough to match a unique quotation item.",
            "options": params.get("options") or [
                {"id": "pvc_water_supply", "name": "PVC-U water supply pipe"},
                {"id": "pvc_drainage", "name": "PVC-U drainage pipe"},
                {"id": "pvc_conduit", "name": "PVC-U conduit"},
                {"id": "other", "name": "Other; user should provide details"},
            ],
        }

    raise ValueError(f"Unknown tool: {tool}")


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    tool = str(request.get("tool", ""))
    params = request.get("params", {}) or {}
    logger.info("Dispatching: %s", tool)
    try:
        return {"success": True, "result": _normalize_error_codes(dispatch(tool, params))}
    except ValueError as exc:
        return {"success": False, "error": str(exc), "error_code": _infer_error_code(exc)}
    except Exception as exc:
        logger.exception("Tool dispatch failed")
        return {"success": False, "error": str(exc), "error_code": _infer_error_code(exc)}


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            response = handle_request(json.loads(line.lstrip("\ufeff")))
        except ValueError as exc:
            response = {"success": False, "error": str(exc), "error_code": _infer_error_code(exc)}
        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
