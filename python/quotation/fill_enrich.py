"""Enrich fill_quotation fill_items with indonesian_name, satuan, brand, and quote spec."""

from __future__ import annotations

import re
from typing import Any

_BRAND_SUFFIX_RE = re.compile(r"\s-\s+([^-\s][^-]+)$")
_KNOWN_BRANDS_CN = ("联塑", "RUCIKA", "信日", "VINILON", "LESSO")
_UNIT_TOKENS = (
    "根",
    "个",
    "只",
    "套",
    "米",
    "桶",
    "卷",
    "pcs",
    "set",
    "roll",
    "kg",
    "m",
)


def _first_str(*values: Any) -> str:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return ""


def extract_brand_from_english(description_english: str) -> str:
    """Extract brand from trailing ' - BRAND' in English description."""
    text = (description_english or "").strip()
    if not text:
        return ""
    match = _BRAND_SUFFIX_RE.search(text)
    if match:
        return match.group(1).strip()
    return ""


def extract_brand_from_chinese(matched_name: str) -> str:
    """Extract known brand tokens from Chinese product name."""
    name = matched_name or ""
    for brand in _KNOWN_BRANDS_CN:
        if brand in name:
            return brand
    if " - RUCIKA" in name:
        return "RUCIKA"
    return ""


def infer_default_satuan(
    quote_name: str = "",
    inquiry_spec: str = "",
    product_name: str = "",
) -> str:
    """管材/管件类询价在无显式单位时的业务默认（与 quotation-agent L1 一致）。"""
    combined = f"{quote_name} {inquiry_spec} {product_name}".lower()
    if re.search(r"[/／]根\b", combined) or "6m/根" in combined.replace(" ", ""):
        return "根"
    if any(token in combined for token in ("管", "pipe", "ppr", "pvc", "hdpe", "pe ", "管材", "管件")):
        return "根"
    if any(token in combined for token in ("个", "只", "件", "套")):
        for token in ("个", "只", "件", "套"):
            if token in combined:
                return token
    return ""


def extract_satuan_from_text(*texts: str) -> str:
    """Best-effort unit extraction from product text."""
    combined = " ".join(t for t in texts if t).strip()
    if not combined:
        return ""
    lower = combined.lower()
    for token in _UNIT_TOKENS:
        if token.isascii():
            if re.search(rf"\b{re.escape(token)}\b", lower):
                return token
        elif token in combined:
            return token
    return ""


def _normalize_dn_in_text(text: str) -> str:
    m = re.search(r"\bdn\s*(\d+)\b", text, re.I)
    if m:
        return f"dn{m.group(1)}"
    return text


def _spec_needs_reextract(specification: str, quote_name: str) -> bool:
    spec = (specification or "").strip()
    if not spec or spec == quote_name:
        return True
    if re.search(r"[\u4e00-\u9fff]", spec):
        return True
    upper = spec.upper()
    if any(token in upper for token in ("PVC", "PPR", "PE", "UPVC")) and not re.search(
        r"\bdn\s*\d+", spec, re.I
    ):
        return True
    if re.search(r"[（(][^）)]*[管箍排水配件][^）)]*[）)]", spec):
        return True
    return False


def _looks_like_chinese_product_name(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def resolve_quote_specification(
    quote_name: str,
    specification: str = "",
    *,
    inquiry_spec: str = "",
    description_english: str = "",
) -> str:
    """
    报价规格列：优先保留 agent 传入的正确 spec；缺失或碎片（如 50 (管箍) PVC-U）时用 LLM 补全。
    与 indonesian_name / brand / satuan 一致——agent 语义提取为主，服务端 LLM 只填缺口。
    """
    quote_name = (quote_name or "").strip()
    specification = (specification or "").strip()

    if specification and specification != quote_name and not _spec_needs_reextract(
        specification, quote_name
    ):
        return _normalize_dn_in_text(specification)

    from quotation.spec_extract import extract_spec_from_quote_name_llm

    llm_spec = extract_spec_from_quote_name_llm(
        quote_name,
        inquiry_spec=inquiry_spec,
        description_english=description_english,
    )
    if llm_spec:
        return llm_spec

    if specification and specification != quote_name:
        return _normalize_dn_in_text(specification)
    return specification


def enrich_fill_item(
    item: dict[str, Any],
    *,
    matched: dict[str, Any] | None = None,
    price_row: dict[str, Any] | None = None,
    inquiry_unit: str = "",
    inquiry_spec: str = "",
) -> dict[str, Any]:
    """
    Fill missing indonesian_name / satuan / brand / specification on a fill_items row.
    Agent-provided values are kept when valid; server fills gaps (spec via LLM).
    """
    out = dict(item)
    matched = matched or {}
    price_row = price_row or {}

    quote_name = _first_str(out.get("quote_name"), matched.get("matched_name"), price_row.get("matched_name"))
    if quote_name:
        out["quote_name"] = quote_name

    description_english = _first_str(
        out.get("description_english"),
        matched.get("description_english"),
        price_row.get("description_english"),
    )

    indo = str(out.get("indonesian_name") or "").strip()
    if not indo or indo == quote_name or (_looks_like_chinese_product_name(indo) and description_english):
        out["indonesian_name"] = description_english or indo or quote_name
    else:
        out["indonesian_name"] = indo

    if not out.get("brand"):
        brand = extract_brand_from_english(description_english) or extract_brand_from_chinese(quote_name)
        if brand:
            out["brand"] = brand

    supplier = _first_str(out.get("supplier"), matched.get("supplier"), price_row.get("supplier"))
    if supplier and not out.get("supplier"):
        out["supplier"] = supplier
    if supplier and not out.get("remark"):
        out["remark"] = supplier

    if not out.get("satuan"):
        satuan = (
            extract_satuan_from_text(quote_name, description_english)
            or (inquiry_unit or "").strip()
            or infer_default_satuan(
                quote_name,
                inquiry_spec or _first_str(out.get("specification"), out.get("inquiry_spec")),
                _first_str(out.get("product_name")),
            )
        )
        if satuan:
            out["satuan"] = satuan

    spec_in = _first_str(out.get("specification"), out.get("spec"), out.get("model"), inquiry_spec)
    out["specification"] = resolve_quote_specification(
        quote_name,
        spec_in,
        inquiry_spec=inquiry_spec,
        description_english=description_english,
    )
    return out
