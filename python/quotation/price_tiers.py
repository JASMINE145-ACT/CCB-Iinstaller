"""List all quotable price tiers for one product (org API first, local xlsx fallback)."""
from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Aligned with data/data.Md §主流字段 + AionCore QUOTABLE_PRICE_FIELDS.
# Labels are field names only; per-source semantics live in data.Md (agent must Read on get_product_price_tiers).
DATA_MD_VENDOR_PATH = r"D:\CCB-Wanding\vendor\wanding\data\data.Md"

TIER_FIELD_SPECS: list[tuple[str, str, str]] = [
    ("factory_inc_tax", "出厂价含税", "出厂价_含税"),
    ("factory_exc_tax", "出厂价不含税", "出厂价_不含税"),
    ("purchase_exc_tax", "采购不含税", "采购不含税"),
    ("price_a", "A档报单价", "A"),
    ("price_b", "B档报单价", "B"),
    ("price_c", "C档报单价", "C"),
    ("price_d", "D档报单价", "D"),
    ("price_d_low", "D低档报单价", "D_low"),
    ("price_e", "E档报单价", "E"),
    ("local_exc_tax", "LOCAL不含税", "LOCAL"),
    ("local_inc_tax", "LOCAL含税", "LOCAL_INC_TAX"),
    ("rucika_pricelist_exc_vat11", "RUCIKA目录价不含税", "RUCIKA_PRICELIST_EXC"),
    ("rucika_pricelist_inc_vat11", "RUCIKA目录价含税", "RUCIKA_PRICELIST_INC"),
    ("rucika_quote_price_1", "RUCIKA报单价（第一组）", "RUCIKA_QUOTE_1"),
    ("rucika_quote_price_2", "RUCIKA报单价（第二组）", "RUCIKA_QUOTE_2"),
    ("pe_nominal_price", "PE面价", "PE_NOMINAL"),
    ("pe_factory_price", "PE出厂价/条", "PE_FACTORY"),
]

_FIELD_LABEL_MAP: dict[str, tuple[str, str]] = {
    field: (label, hint) for field, label, hint in TIER_FIELD_SPECS
}


def _label_for_field(field: str) -> tuple[str, str]:
    return _FIELD_LABEL_MAP.get(field, (field, field))


TIER_GUIDE_SUMMARY = (
    "档位数值见 tiers[]；各字段在本产品上的业务含义因来源而异（LESSO/RUCIKA/CEILING/国标管件/PE 等）。"
    f"调用本工具后 agent 必须先 Read {DATA_MD_VENDOR_PATH}，"
    "用 product_type / source_sheet 对照 §来源映射 解释，勿用全局 LESSO 口径套用到所有产品。"
)


def _safe_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        result = float(value)
        if result != result or result == 0.0:
            return None
        return result
    except (TypeError, ValueError):
        return None


def _merge_tier_lists(
    primary: list[dict[str, Any]],
    supplemental: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Union tiers by field; primary (org) wins when both have the same field."""
    order = [field for field, _, _ in TIER_FIELD_SPECS]
    by_field: dict[str, dict[str, Any]] = {}
    for tier in supplemental:
        field = str(tier.get("field") or "")
        if field:
            by_field[field] = tier
    for tier in primary:
        field = str(tier.get("field") or "")
        if field:
            by_field[field] = tier
    return [by_field[field] for field in order if field in by_field]


def _should_supplement_tiers(price_source: Any, tier_count: int) -> bool:
    source = str(price_source or "").strip()
    if source in ("bundled_seed", "lkg_snapshot"):
        return True
    return tier_count < 2


def _tiers_from_product_dict(product: dict[str, Any]) -> list[dict[str, Any]]:
    tiers: list[dict[str, Any]] = []
    for field, label, level_hint in TIER_FIELD_SPECS:
        price = _safe_float(product.get(field))
        if price is None:
            continue
        profit_field = field.replace("price_", "profit_", 1) if field.startswith("price_") else None
        profit = _safe_float(product.get(profit_field)) if profit_field else None
        entry: dict[str, Any] = {
            "field": field,
            "label": label,
            "price": price,
            "customer_level_hint": level_hint,
        }
        if profit is not None:
            entry["profit_rate"] = profit
        tiers.append(entry)
    return tiers


def _normalize_code(val: Any) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if not s:
        return ""
    try:
        f = float(s)
        if f == int(f):
            return str(int(f))
    except (TypeError, ValueError):
        pass
    return s


def _lookup_org_product(code: str) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    from admin.org_price_client import get_price_data

    data = get_price_data()
    code_norm = _normalize_code(code)
    for item in data.get("products") or []:
        if not isinstance(item, dict):
            continue
        material = str(item.get("material_code") or item.get("Material") or "").strip()
        if _normalize_code(material) == code_norm:
            meta = {
                "price_source": data.get("source"),
                "price_stale": data.get("stale", False),
                "price_version_number": data.get("version_number"),
            }
            return item, meta
    return None, {
        "price_source": data.get("source"),
        "price_stale": data.get("stale", False),
    }


def _lookup_local_tiers(code: str, path: Any) -> dict[str, Any] | None:
    from inventory.services.wanding_fuzzy_matcher import (
        _load_full_price_df,
        _normalize_code_for_match,
        get_profit_rows_by_code,
    )

    rows = get_profit_rows_by_code(code, 0.0, path)
    if not rows:
        return None

    product_type = ""
    source_sheet = ""
    description = str(rows[0].get("name") or "").strip()
    tiers: list[dict[str, Any]] = []
    df = _load_full_price_df(path)
    if not df.empty:
        code_norm = _normalize_code_for_match(code)
        if "material" in df.columns:
            mask = df["material"].apply(lambda v: _normalize_code_for_match(v) == code_norm)
        elif "Material" in df.columns:
            mask = df["Material"].apply(lambda v: _normalize_code_for_match(v) == code_norm)
        else:
            mask = None
        if mask is not None and mask.any():
            row = df[mask].iloc[0]
            tiers = _tiers_from_product_dict(row.to_dict())
            product_type = str(row.get("product_type") or row.get("Product_Type") or "").strip()
            source_sheet = str(row.get("source_sheet") or "").strip()
            if not description:
                description = str(
                    row.get("description_cn") or row.get("description") or row.get("Describrition") or ""
                ).strip()

    if not tiers:
        all_levels = rows[0].get("all_levels") or []
        level_to_field = {
            "A_QUOTE": "price_a",
            "B_QUOTE": "price_b",
            "C_QUOTE": "price_c",
            "D_QUOTE": "price_d",
            "D_LOW": "price_d_low",
            "E_QUOTE": "price_e",
            "LOCAL_EXC_TAX": "local_exc_tax",
            "LOCAL_INC_TAX": "local_inc_tax",
            "RUCIKA_QUOTE_1": "rucika_quote_price_1",
            "RUCIKA_QUOTE_2": "rucika_quote_price_2",
        }
        for entry in all_levels:
            level = str(entry.get("level") or "")
            field = level_to_field.get(level, level.lower())
            label, level_hint = _label_for_field(field)
            tier: dict[str, Any] = {
                "field": field,
                "label": label,
                "price": float(entry.get("price") or 0),
                "customer_level_hint": level_hint,
            }
            profit = entry.get("profit")
            if profit is not None:
                tier["profit_rate"] = profit
            tiers.append(tier)

    return {
        "tiers": tiers,
        "description": description,
        "product_type": product_type,
        "source_sheet": source_sheet,
        "material_code": str(rows[0].get("code") or code).strip(),
    }


def get_product_price_tiers(
    code: str,
    *,
    price_library_path: Optional[str] = None,
) -> dict[str, Any]:
    """Return all non-zero price tiers for a material code."""
    code = (code or "").strip()
    if not code:
        raise ValueError("code is required")

    use_remote = price_library_path is None
    product: dict[str, Any] | None = None
    meta: dict[str, Any] = {}

    if use_remote:
        product, meta = _lookup_org_product(code)

    if product:
        tiers = _tiers_from_product_dict(product)
        description = str(
            product.get("description")
            or product.get("description_cn")
            or product.get("Describrition")
            or ""
        ).strip()
        product_type = str(product.get("product_type") or product.get("Product_Type") or "").strip()
        source_sheet = str(product.get("source_sheet") or "").strip()
        price_source = meta.get("price_source")
        tier_supplemented = False

        if _should_supplement_tiers(price_source, len(tiers)):
            from inventory.config import config

            path = price_library_path or config.PRICE_LIBRARY_PATH
            local = _lookup_local_tiers(code, path)
            local_tiers = (local or {}).get("tiers") or []
            if len(local_tiers) > len(tiers):
                tiers = _merge_tier_lists(tiers, local_tiers)
                tier_supplemented = True
                if local:
                    if not description:
                        description = str(local.get("description") or "").strip()
                    if not product_type:
                        product_type = str(local.get("product_type") or "").strip()
                    if not source_sheet:
                        source_sheet = str(local.get("source_sheet") or "").strip()

        result: dict[str, Any] = {
            "code": code,
            "material_code": str(product.get("material_code") or code).strip(),
            "description": description,
            "product_type": product_type,
            "source_sheet": source_sheet,
            "tier_count": len(tiers),
            "tiers": tiers,
            "tier_guide_summary": TIER_GUIDE_SUMMARY,
            "data_md_path": DATA_MD_VENDOR_PATH,
            **meta,
        }
        if tier_supplemented:
            result["tier_supplemented_from"] = "local_xlsx"
        return result

    from inventory.config import config

    path = price_library_path or config.PRICE_LIBRARY_PATH
    local = _lookup_local_tiers(code, path)
    if not local or not local.get("tiers"):
        return {
            "code": code,
            "found": False,
            "tier_count": 0,
            "tiers": [],
            "tier_guide_summary": TIER_GUIDE_SUMMARY,
            "data_md_path": DATA_MD_VENDOR_PATH,
            "price_source": "none",
        }

    tiers = local["tiers"]
    return {
        "code": code,
        "found": True,
        "material_code": local.get("material_code") or code,
        "description": local.get("description") or "",
        "product_type": local.get("product_type") or "",
        "source_sheet": local.get("source_sheet") or "",
        "tier_count": len(tiers),
        "tiers": tiers,
        "tier_guide_summary": TIER_GUIDE_SUMMARY,
        "data_md_path": DATA_MD_VENDOR_PATH,
        "price_source": "local_xlsx",
        "price_stale": True,
    }
