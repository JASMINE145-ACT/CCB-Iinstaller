"""Remote price library client with LKG snapshot fallback.

Three-tier source precedence for quotation price data:
  0. Bundled-first override — when PRICE_USE_BUNDLED_FIRST=1 (temporary fleet mode)
  1. Org API   — live authenticated fetch (source="org_api", stale=False)
  2. LKG       — last-known-good local snapshot (source="lkg_snapshot", stale=True)
  3. Seed      — bundled install Excel (source="bundled_seed", stale=True)

Stale warnings are mandatory for tiers 2 and 3, and are propagated into every
quotation result that uses non-live data.
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from admin.org_session import (
    OrgAuthError,
    get_auth_candidates,
    resolve_org_server_url,
)

logger = logging.getLogger(__name__)

# Backward-compatible alias for tests and callers.
_AuthError = OrgAuthError

# Full published library is ~3000 products; tiny LKG dirs are dev/test pollution
# that would otherwise block the bundled seed fallback (~3082 rows).
LKG_MIN_PRODUCTS = max(1, int(os.environ.get("LKG_MIN_PRODUCTS", "50")))

_BUNDLED_FIRST_TRUTHY = frozenset({"1", "true", "yes", "on"})


def _bundled_first_enabled() -> bool:
    """Temporary fleet override: skip org API + LKG; use install xlsx only."""
    raw = (os.environ.get("PRICE_USE_BUNDLED_FIRST") or "").strip().lower()
    return raw in _BUNDLED_FIRST_TRUTHY

# Module-level in-memory price cache.
# Structure: {"version_id": str, "products": [...], "source": str, ...}
_price_cache: dict[str, Any] = {}
_cache_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Org server discovery (shared org_session module)
# ---------------------------------------------------------------------------

def _org_server_url() -> str:
    return resolve_org_server_url()


def _org_session_token_candidates() -> list[str]:
    return [candidate.token for candidate in get_auth_candidates()]


def _org_session_token() -> str:
    candidates = _org_session_token_candidates()
    return candidates[0] if candidates else ""


# ---------------------------------------------------------------------------
# LKG snapshot store
# ---------------------------------------------------------------------------

def _lkg_dir() -> Path:
    from inventory.config import InventoryConfig
    return Path(InventoryConfig.PRICE_LKG_DIR)


def _lkg_snapshot_path(version_id: str) -> tuple[Path, Path]:
    """Return (data_path, meta_path) for a given version snapshot."""
    base = _lkg_dir() / version_id
    return base / "data.json", base / "meta.json"


def load_lkg_snapshot() -> dict[str, Any] | None:
    """Read the most recent LKG snapshot by newest synced_at in meta.json.

    Returns a dict with keys:
        version_id, version_number, synced_at, source, products
    or None if no valid snapshot exists.
    """
    lkg = _lkg_dir()
    if not lkg.is_dir():
        return None

    best_meta: dict[str, Any] | None = None
    best_data_path: Path | None = None
    best_synced_at: str = ""

    try:
        for entry in lkg.iterdir():
            if not entry.is_dir():
                continue
            meta_path = entry / "meta.json"
            data_path = entry / "data.json"
            if not meta_path.is_file() or not data_path.is_file():
                continue
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                synced_at = str(meta.get("synced_at") or "")
                if synced_at > best_synced_at:
                    best_synced_at = synced_at
                    best_meta = meta
                    best_data_path = data_path
            except (OSError, json.JSONDecodeError):
                continue
    except OSError:
        return None

    if best_meta is None or best_data_path is None:
        return None

    try:
        data = json.loads(best_data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        logger.warning("org_price_client: failed to read LKG data.json: %s", e)
        return None

    products = data.get("products") or []
    return {
        "version_id": best_meta.get("version_id"),
        "version_number": best_meta.get("version_number"),
        "synced_at": best_meta.get("synced_at"),
        "source": "lkg_snapshot",
        "products": products,
    }


def save_lkg_snapshot(
    version_id: str,
    version_number: int,
    products: list[dict[str, Any]],
) -> None:
    """Atomically write a new LKG snapshot (temp file then rename).

    This prevents a failed mid-write from corrupting a prior good snapshot.
    """
    data_path, meta_path = _lkg_snapshot_path(version_id)
    try:
        data_path.parent.mkdir(parents=True, exist_ok=True)
        synced_at = datetime.now(timezone.utc).isoformat()

        # Write data atomically.
        tmp_dir = str(data_path.parent)
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", suffix=".json", dir=tmp_dir, delete=False
        ) as tmp:
            json.dump({"products": products}, tmp, ensure_ascii=False)
            tmp_data_path = Path(tmp.name)
        tmp_data_path.replace(data_path)

        # Write meta atomically.
        meta = {
            "version_id": version_id,
            "version_number": version_number,
            "synced_at": synced_at,
            "source": "lkg_snapshot",
        }
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", suffix=".json", dir=tmp_dir, delete=False
        ) as tmp:
            json.dump(meta, tmp, ensure_ascii=False)
            tmp_meta_path = Path(tmp.name)
        tmp_meta_path.replace(meta_path)

        logger.info(
            "org_price_client: LKG snapshot saved version_id=%s version_number=%d products=%d",
            version_id,
            version_number,
            len(products),
        )
    except OSError as e:
        logger.warning("org_price_client: failed to save LKG snapshot: %s", e)


# ---------------------------------------------------------------------------
# Org API helpers
# ---------------------------------------------------------------------------

def _make_request(path: str, token: str) -> dict[str, Any] | None:
    """Perform a single authenticated GET. Raises _AuthError on 401."""
    base = _org_server_url()
    if not base:
        return None
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base}{path}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            if isinstance(payload, dict) and "data" in payload:
                return payload["data"]  # type: ignore[return-value]
            return payload if isinstance(payload, dict) else None
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise _AuthError(401, "401 Unauthorized") from e
        logger.warning("org_price_client: GET %s returned HTTP %d", path, e.code)
        return None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        logger.warning("org_price_client: GET %s failed: %s", path, e)
        return None


def _api_get(path: str) -> dict[str, Any] | None:
    """GET /active (or other org path) trying each org-session.token candidate on 401."""
    tokens = _org_session_token_candidates()
    if not tokens:
        try:
            return _make_request(path, "")
        except _AuthError:
            logger.warning("org_price_client: 401 with no session token, falling back")
            return None

    saw_auth_error = False
    for index, token in enumerate(tokens):
        try:
            result = _make_request(path, token)
            if index > 0 and result is not None:
                logger.info(
                    "org_price_client: org API OK using token candidate %d/%d",
                    index + 1,
                    len(tokens),
                )
            return result
        except _AuthError:
            saw_auth_error = True
            continue

    if saw_auth_error:
        logger.warning(
            "org_price_client: 401 for all %d org session token candidate(s), falling back",
            len(tokens),
        )
    return None


def get_active_version_meta() -> dict[str, Any] | None:
    """Fetch lightweight active-version metadata from org API.

    Returns {version_id, version_number, published_at, item_count} or None.
    """
    data = _api_get("/api/price-library/active/meta")
    if not data or not isinstance(data, dict):
        return None
    if not data.get("version_id"):
        return None
    return {
        "version_id": str(data["version_id"]),
        "version_number": int(data.get("version_number") or 0),
        "published_at": data.get("published_at"),
        "item_count": data.get("item_count"),
    }


def fetch_active_products(version_id: str) -> list[dict[str, Any]] | None:
    """Fetch the full product list for the active price-library version.

    Returns a list of product dicts with keys:
        id, material_code, description, unit, price_a, price_b, price_c, price_d
    or None on failure.
    """
    data = _api_get("/api/price-library/active")
    if not data or not isinstance(data, dict):
        return None
    products = data.get("products") or []
    if not isinstance(products, list):
        return None
    return products


# ---------------------------------------------------------------------------
# Main public interface
# ---------------------------------------------------------------------------

def invalidate_price_cache() -> None:
    """Clear the in-memory DataFrame cache (does not delete LKG disk files)."""
    global _price_cache
    with _cache_lock:
        _price_cache = {}

    # Also invalidate the wanding fuzzy matcher DataFrame cache if available.
    try:
        from inventory.services.wanding_fuzzy_matcher import invalidate_wanding_cache
        invalidate_wanding_cache()
    except Exception as e:
        logger.debug("org_price_client: could not invalidate wanding cache: %s", e)


def _load_bundled_seed() -> dict[str, Any] | None:
    """Load the bundled install seed Excel as a minimal product list."""
    from inventory.config import InventoryConfig
    seed_path = Path(InventoryConfig.PRICE_LIBRARY_PATH)
    if not seed_path.is_file():
        return None
    try:
        # Use the existing load mechanism to pull a flat row list.
        from inventory.services.wanding_fuzzy_matcher import load_wanding_df
        full_df = load_wanding_df(seed_path, customer_level="B")
        if full_df.empty:
            return None
        # Convert to minimal product list compatible with org API schema.
        products: list[dict[str, Any]] = []
        for _, row in full_df.iterrows():
            products.append({
                "material_code": str(row.get("Material") or "").strip(),
                "description": str(row.get("Describrition") or "").strip(),
                "description_english": str(row.get("Describrition_English") or "").strip(),
                "product_type": str(row.get("Product_Type") or "").strip(),
                "supplier": str(row.get("supplier") or row.get("Supplier") or "").strip(),
                "unit": "",
                "price_b": float(row.get("unit_price") or 0),
            })
        if not products:
            return None
        return {
            "version_id": None,
            "version_number": None,
            "synced_at": None,
            "source": "bundled_seed",
            "products": products,
        }
    except Exception as e:
        logger.warning("org_price_client: failed to load bundled seed: %s", e)
        return None


def _result_from_bundled_seed(*, stale_reason: str | None = None) -> dict[str, Any] | None:
    seed = _load_bundled_seed()
    if not seed or not seed.get("products"):
        return None
    reason = stale_reason or "使用安装时捆绑的价格库 seed，可能已过期"
    return {
        "products": seed["products"],
        "version_id": None,
        "version_number": None,
        "source": "bundled_seed",
        "stale": True,
        "stale_reason": reason,
        "synced_at": None,
    }


def get_price_data(*, force_refresh: bool = False) -> dict[str, Any]:
    """Return price data with source/stale metadata.

    Return structure::

        {
            "products": [...],
            "version_id": str | None,
            "version_number": int | None,
            "source": "org_api" | "lkg_snapshot" | "bundled_seed" | "none",
            "stale": bool,
            "stale_reason": str | None,
            "synced_at": str | None,
        }

    Priority:
        0. Bundled seed when PRICE_USE_BUNDLED_FIRST=1 (temporary; skips org + LKG)
        1. Org API (fresh, stale=False)
        2. LKG snapshot (stale=True)
        3. Bundled seed xlsx (stale=True, source=bundled_seed)
        4. Empty result (source="none")
    """
    with _cache_lock:
        if not force_refresh and _price_cache:
            if _bundled_first_enabled():
                if _price_cache.get("source") == "bundled_seed":
                    return dict(_price_cache)
            else:
                cached_version = _price_cache.get("version_id")
                if _price_cache.get("source") in ("org_api", "lkg_snapshot") and cached_version:
                    return dict(_price_cache)

    if _bundled_first_enabled():
        result = _result_from_bundled_seed(
            stale_reason="临时使用安装包本地价库（PRICE_USE_BUNDLED_FIRST）；云端价库恢复后请关闭此开关",
        )
        if result:
            with _cache_lock:
                _price_cache.update(result)
            logger.info(
                "org_price_client: bundled_first mode products=%d",
                len(result["products"]),
            )
            return result
        logger.error("org_price_client: bundled_first enabled but seed xlsx missing/empty")
        return {
            "products": [],
            "version_id": None,
            "version_number": None,
            "source": "none",
            "stale": True,
            "stale_reason": "PRICE_USE_BUNDLED_FIRST 已启用但本地价库 xlsx 缺失或为空",
            "synced_at": None,
        }

    # --- Tier 1: Org API ---
    org_data = _api_get("/api/price-library/active")
    if org_data and isinstance(org_data, dict):
        products = org_data.get("products") or []
        if isinstance(products, list) and products:
            version_id = str(org_data.get("version_id") or "")
            version_number = int(org_data.get("version_number") or 0)
            synced_at = datetime.now(timezone.utc).isoformat()

            # Check if LKG needs update (async-ish: update after returning).
            lkg = load_lkg_snapshot()
            lkg_version = lkg.get("version_id") if lkg else None
            if version_id and version_id != lkg_version:
                # Save in background thread to avoid blocking quotation.
                # Also invalidate the matcher DataFrame cache so the next
                # quotation uses the new version rather than the old snapshot.
                def _save_async() -> None:
                    try:
                        save_lkg_snapshot(version_id, version_number, products)
                        # Clear the matcher cache keyed by path/level so the
                        # new org version is picked up on the next quotation.
                        try:
                            from inventory.services.wanding_fuzzy_matcher import (
                                invalidate_wanding_cache,
                            )
                            invalidate_wanding_cache()
                        except Exception as ex2:
                            logger.debug(
                                "org_price_client: could not invalidate wanding cache: %s", ex2
                            )
                    except Exception as ex:
                        logger.debug("org_price_client: background LKG save failed: %s", ex)
                threading.Thread(target=_save_async, daemon=True).start()

            result: dict[str, Any] = {
                "products": products,
                "version_id": version_id or None,
                "version_number": version_number or None,
                "source": "org_api",
                "stale": False,
                "stale_reason": None,
                "synced_at": synced_at,
            }
            with _cache_lock:
                _price_cache.update(result)
            logger.info(
                "org_price_client: using org_api version_id=%s products=%d",
                version_id,
                len(products),
            )
            return result

    # --- Tier 2: LKG snapshot ---
    lkg = load_lkg_snapshot()
    if lkg and lkg.get("products"):
        lkg_count = len(lkg["products"])
        if lkg_count < LKG_MIN_PRODUCTS:
            logger.warning(
                "org_price_client: ignoring LKG snapshot version_id=%s products=%d "
                "(<%d); falling back to bundled seed",
                lkg.get("version_id"),
                lkg_count,
                LKG_MIN_PRODUCTS,
            )
            lkg = None
    if lkg and lkg.get("products"):
        result = {
            "products": lkg["products"],
            "version_id": lkg.get("version_id"),
            "version_number": lkg.get("version_number"),
            "source": "lkg_snapshot",
            "stale": True,
            "stale_reason": "使用本地快照（org 服务不可达）",
            "synced_at": lkg.get("synced_at"),
        }
        with _cache_lock:
            _price_cache.update(result)
        logger.info(
            "org_price_client: using lkg_snapshot version_id=%s products=%d",
            lkg.get("version_id"),
            len(lkg["products"]),
        )
        return result

    # --- Tier 3: Bundled seed ---
    result = _result_from_bundled_seed()
    if result:
        with _cache_lock:
            _price_cache.update(result)
        logger.info(
            "org_price_client: using bundled_seed products=%d",
            len(result["products"]),
        )
        return result

    # --- Tier 4: Nothing available ---
    logger.error("org_price_client: no price data available from any source")
    return {
        "products": [],
        "version_id": None,
        "version_number": None,
        "source": "none",
        "stale": True,
        "stale_reason": "无价格数据可用",
        "synced_at": None,
    }
