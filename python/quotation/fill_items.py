"""Direct-fill row normalization, enrichment, and deterministic fill candidate ranking."""
from __future__ import annotations

import logging
from typing import Any

from quotation.fill_row_guard import normalize_unmatched_product_code

logger = logging.getLogger(__name__)


def _coerce_int(value: Any, default: int = 1) -> int:
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return default


def _coerce_number(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return default


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


def normalize_fill_items(
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
        else:
            code = normalize_unmatched_product_code(str(code).strip())
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
        supplier = str(raw.get("supplier") or nested.get("supplier") or "").strip()
        remark = str(raw.get("remark") or raw.get("catatan") or nested.get("remark") or nested.get("catatan") or "").strip()
        specification = str(
            raw.get("specification") or raw.get("spec") or raw.get("model") or nested.get("specification") or ""
        ).strip()
        inquiry_name = str(raw.get("inquiry_name") or nested.get("inquiry_name") or "").strip()
        price_row = _lookup_wanding_row_by_code(
            str(code),
            customer_level=customer_level,
            price_library_path=price_library_path,
        )

        fill_row: dict[str, Any] = {
            "row": row,
            "code": str(code).strip(),
            "quote_name": str(quote_name).strip(),
            "unit_price": unit_price,
            "qty": qty,
            "specification": specification,
            "inquiry_name": inquiry_name,
            "indonesian_name": indonesian_name,
            "satuan": satuan,
            "brand": brand,
            "supplier": supplier,
            "remark": remark,
        }
        normalized.append(
            enrich_fill_item(
                fill_row,
                matched=matched,
                price_row=price_row,
                inquiry_unit=str(
                    raw.get("inquiry_unit") or raw.get("unit") or nested.get("inquiry_unit") or nested.get("unit") or ""
                ).strip(),
            )
        )
    return normalized
