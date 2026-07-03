"""Convert org API product list into a DataFrame compatible with the fuzzy matcher.

This module bridges the gap between the remote price-library format (org API /
LKG snapshot) and the DataFrame schema expected by ``wanding_fuzzy_matcher``.

Column mapping (org API → DataFrame):
    material_code         → Material
    description           → Describrition
    description_english   → Describrition_English
    product_type          → Product_Type
    price_a/b/c/d         → unit_price   (level-dependent)

After building the DataFrame, ``norm_text`` and ``spec_tokens`` are pre-computed
in the same way ``load_wanding_df`` does, so the fuzzy matcher can use them
without modification.
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Org API level → price field mapping (mirrors _level_to_db_price_field)
# ---------------------------------------------------------------------------

_LEVEL_TO_PRICE_FIELD: dict[str, str] = {
    "A": "price_a",
    "A_QUOTE": "price_a",
    "A_MARGIN": "price_a",
    "A_TURN": "price_a",
    "A_ANNUAL": "price_a",
    "B": "price_b",
    "B_QUOTE": "price_b",
    "B_MARGIN": "price_b",
    "B_TURN": "price_b",
    "B_ANNUAL": "price_b",
    "C": "price_c",
    "C_QUOTE": "price_c",
    "C_MARGIN": "price_c",
    "C_TURN": "price_c",
    "D": "price_d",
    "D_QUOTE": "price_d",
    "D_MARGIN": "price_d",
    "D_LOW": "price_d",
    "D_NOADJ": "price_d",
    "D_WHOLESALE": "price_d",
}


def _resolve_price_field(customer_level: str) -> str:
    """Return the org API price field name for a given customer level."""
    level = (customer_level or "B").strip().upper()
    # Normalize to compact form for lookup.
    compact = re.sub(r"[\s_\-（）()：:]+", "", level)
    for key, field in _LEVEL_TO_PRICE_FIELD.items():
        if compact == re.sub(r"[\s_\-（）()：:]+", "", key):
            return field
    return "price_b"  # default


def _safe_float(value: Any) -> float:
    """Convert a value to float, returning 0.0 on failure."""
    if value is None:
        return 0.0
    try:
        result = float(value)
        return result if result == result else 0.0  # NaN check
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_price_dataframe(
    price_data: dict[str, Any],
    customer_level: str = "B",
) -> "tuple[Any, dict[str, Any]]":
    """Convert a ``get_price_data()`` result into a fuzzy-matcher-compatible DataFrame.

    Parameters
    ----------
    price_data:
        Output of ``org_price_client.get_price_data()``.  Must contain at least
        a ``products`` list.  May be empty (returns empty DataFrame).
    customer_level:
        Price level to use (A / B / C / D / B_QUOTE …).  Controls which of the
        ``price_a`` … ``price_d`` fields is mapped to ``unit_price``.

    Returns
    -------
    (df, meta):
        ``df`` — pandas DataFrame ready for ``search_fuzzy`` / ``get_wanding_price_by_code``.
        ``meta`` — dict with source/stale fields for propagation into tool results::

            {
                "price_source": "org_api" | "lkg_snapshot" | "bundled_seed" | "none",
                "price_stale": bool,
                "price_stale_warning": str | None,
                "price_version_id": str | None,
                "price_version_number": int | None,
            }
    """
    try:
        import pandas as pd
    except ImportError:  # pragma: no cover
        logger.error("pandas not installed; cannot load price DataFrame")
        return _empty_result(price_data)

    products = price_data.get("products") or []
    meta = _build_meta(price_data)

    if not products:
        logger.warning("load_price_dataframe: product list is empty (source=%s)", price_data.get("source"))
        import pandas as pd
        return pd.DataFrame(), meta

    price_field = _resolve_price_field(customer_level)

    rows: list[dict[str, Any]] = []
    for item in products:
        if not isinstance(item, dict):
            continue
        material = str(item.get("material_code") or item.get("Material") or "").strip()
        desc = str(
            item.get("description")
            or item.get("Describrition")
            or item.get("description_cn")
            or ""
        ).strip()
        if not material or not desc:
            continue

        desc_en = str(
            item.get("description_english")
            or item.get("Describrition_English")
            or ""
        ).strip()
        product_type = str(
            item.get("product_type")
            or item.get("Product_Type")
            or ""
        ).strip()
        supplier = str(item.get("supplier") or item.get("Supplier") or "").strip()

        # Determine unit_price.  Products from the org API carry explicit fields
        # (price_a, price_b, etc.) while rows from the bundled seed loader
        # already have ``price_b`` flattened.
        unit_price = _safe_float(item.get(price_field))
        if unit_price == 0.0:
            # Fallback: try other price levels in descending preference.
            for fallback in ("price_b", "price_a", "price_c", "price_d"):
                v = _safe_float(item.get(fallback))
                if v:
                    unit_price = v
                    break

        search_text = " ".join(part for part in [desc, desc_en] if part)

        rows.append(
            {
                "Material": material,
                "Describrition": desc,
                "Describrition_English": desc_en,
                "Product_Type": product_type,
                "supplier": supplier,
                "unit_price": unit_price,
                "search_text": search_text,
            }
        )

    if not rows:
        import pandas as pd
        return pd.DataFrame(), meta

    import pandas as pd
    df = pd.DataFrame(rows)

    # Pre-compute normalised columns the fuzzy matcher uses for scoring.
    try:
        from inventory.services.wanding_fuzzy_matcher import _normalize, _split_tokens
        search_series = df["search_text"]
        df["norm_text"] = search_series.apply(_normalize)
        df["spec_tokens"] = search_series.apply(
            lambda t: frozenset(tok for tok in _split_tokens(t) if re.search(r"\d", tok))
        )
    except Exception as e:
        # If the import fails for any reason, the fuzzy matcher will recompute
        # these fields on every call, which is slower but still correct.
        logger.debug("load_price_dataframe: could not pre-compute norm_text: %s", e)

    logger.info(
        "load_price_dataframe: built DataFrame rows=%d source=%s level=%s",
        len(df),
        price_data.get("source"),
        customer_level,
    )
    return df, meta


def _build_meta(price_data: dict[str, Any]) -> dict[str, Any]:
    """Extract stale-propagation metadata from a ``get_price_data()`` result."""
    source = price_data.get("source") or "none"
    stale = bool(price_data.get("stale", True))
    stale_reason = price_data.get("stale_reason")
    return {
        "price_source": source,
        "price_stale": stale,
        "price_stale_warning": stale_reason if stale else None,
        "price_version_id": price_data.get("version_id"),
        "price_version_number": price_data.get("version_number"),
    }


def _empty_result(price_data: dict[str, Any]) -> "tuple[Any, dict[str, Any]]":
    """Return (empty_df_or_None, meta) when pandas is unavailable."""
    meta = _build_meta(price_data)
    return None, meta
