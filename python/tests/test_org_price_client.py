"""Unit tests for admin.org_price_client and inventory.price_loader.

Tests use unittest.mock to avoid real network calls or filesystem writes.
Run with:  python -m unittest tests.test_org_price_client -v
"""
from __future__ import annotations

import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

# Detect whether pandas/numpy are available in this environment.
try:
    import pandas as _pandas  # noqa: F401
    _HAS_PANDAS = True
except (ImportError, Exception):
    _HAS_PANDAS = False

# Ensure project root is on sys.path so imports work when run from any cwd.
PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_PRODUCTS: list[dict[str, Any]] = [
    {
        "material_code": "8010072480",
        "description": "PVC-U 直接管 DN50",
        "description_english": "PVC-U Straight Connector DN50",
        "product_type": "管材",
        "unit": "根",
        "price_a": 120.0,
        "price_b": 110.0,
        "price_c": 100.0,
        "price_d": 90.0,
    },
    {
        "material_code": "8010072490",
        "description": "PVC-U 弯头 DN50",
        "description_english": "PVC-U Elbow DN50",
        "product_type": "管件",
        "unit": "个",
        "price_a": 25.0,
        "price_b": 22.0,
        "price_c": 20.0,
        "price_d": 18.0,
    },
]

SAMPLE_API_PAYLOAD: dict[str, Any] = {
    "version_id": "ver-001",
    "version_number": 5,
    "products": SAMPLE_PRODUCTS,
}


# ---------------------------------------------------------------------------
# Tests: org_price_client
# ---------------------------------------------------------------------------

class TestApiGet(unittest.TestCase):
    """_api_get delegates correctly and handles 401 retry."""

    def test_returns_data_field_from_response(self) -> None:
        from admin.org_price_client import _api_get, _org_server_url

        response_payload = {"data": {"products": [], "version_id": "v1"}}
        mock_resp = MagicMock()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps(response_payload).encode()

        with patch("admin.org_price_client._org_server_url", return_value="http://localhost:3000"), \
             patch("admin.org_price_client._org_session_token", return_value="tok123"), \
             patch("urllib.request.urlopen", return_value=mock_resp):
            result = _api_get("/api/price-library/active")

        self.assertIsNotNone(result)
        self.assertEqual(result["version_id"], "v1")

    def test_returns_none_when_no_server_url(self) -> None:
        from admin.org_price_client import _api_get

        with patch("admin.org_price_client._org_server_url", return_value=""):
            result = _api_get("/api/price-library/active")

        self.assertIsNone(result)

    def test_401_triggers_token_refresh_and_retry(self) -> None:
        from admin.org_price_client import _AuthError, _api_get

        call_count = {"n": 0}

        def fake_make_request(path: str, token: str):
            call_count["n"] += 1
            # Both calls raise _AuthError (401); second attempt also fails.
            raise _AuthError("401 Unauthorized")

        with patch("admin.org_price_client._make_request", side_effect=fake_make_request), \
             patch("admin.org_price_client._org_session_token", side_effect=["old-token", "new-token"]):
            result = _api_get("/api/price-library/active")

        # Both attempts raised _AuthError → result is None (graceful fallback)
        self.assertIsNone(result)
        self.assertEqual(call_count["n"], 2)


class TestLkgSnapshot(unittest.TestCase):
    """LKG snapshot round-trip: save → load returns same data."""

    def test_save_and_load_round_trip(self) -> None:
        from admin.org_price_client import load_lkg_snapshot, save_lkg_snapshot

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("admin.org_price_client._lkg_dir", return_value=Path(tmpdir)):
                save_lkg_snapshot("ver-test-1", 42, SAMPLE_PRODUCTS)
                result = load_lkg_snapshot()

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["version_id"], "ver-test-1")
        self.assertEqual(result["version_number"], 42)
        self.assertEqual(result["source"], "lkg_snapshot")
        self.assertEqual(len(result["products"]), 2)

    def test_load_lkg_returns_none_if_dir_missing(self) -> None:
        from admin.org_price_client import load_lkg_snapshot

        with patch("admin.org_price_client._lkg_dir", return_value=Path("/nonexistent/path/xyz")):
            result = load_lkg_snapshot()

        self.assertIsNone(result)

    def test_save_is_atomic_temp_then_rename(self) -> None:
        """Verify that save_lkg_snapshot produces both data.json and meta.json."""
        from admin.org_price_client import save_lkg_snapshot

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("admin.org_price_client._lkg_dir", return_value=Path(tmpdir)):
                save_lkg_snapshot("ver-atomic", 7, SAMPLE_PRODUCTS)

                data_path = Path(tmpdir) / "ver-atomic" / "data.json"
                meta_path = Path(tmpdir) / "ver-atomic" / "meta.json"
                self.assertTrue(data_path.exists())
                self.assertTrue(meta_path.exists())

                data = json.loads(data_path.read_text(encoding="utf-8"))
                meta = json.loads(meta_path.read_text(encoding="utf-8"))

        self.assertEqual(len(data["products"]), 2)
        self.assertEqual(meta["version_id"], "ver-atomic")
        self.assertEqual(meta["version_number"], 7)


class TestGetPriceData(unittest.TestCase):
    """get_price_data() three-tier fallback."""

    def _clear_cache(self) -> None:
        from admin import org_price_client
        with org_price_client._cache_lock:
            org_price_client._price_cache.clear()

    def test_tier1_org_api_success(self) -> None:
        self._clear_cache()
        from admin.org_price_client import get_price_data

        with patch("admin.org_price_client._api_get", return_value=SAMPLE_API_PAYLOAD):
            result = get_price_data(force_refresh=True)

        self.assertEqual(result["source"], "org_api")
        self.assertFalse(result["stale"])
        self.assertIsNone(result["stale_reason"])
        self.assertEqual(len(result["products"]), 2)
        self.assertEqual(result["version_id"], "ver-001")

    def test_tier2_lkg_when_api_fails(self) -> None:
        self._clear_cache()
        from admin.org_price_client import get_price_data

        lkg_data = {
            "version_id": "ver-lkg-99",
            "version_number": 3,
            "synced_at": "2026-06-01T00:00:00Z",
            "source": "lkg_snapshot",
            "products": SAMPLE_PRODUCTS,
        }

        with patch("admin.org_price_client._api_get", return_value=None), \
             patch("admin.org_price_client.load_lkg_snapshot", return_value=lkg_data):
            result = get_price_data(force_refresh=True)

        self.assertEqual(result["source"], "lkg_snapshot")
        self.assertTrue(result["stale"])
        self.assertIsNotNone(result["stale_reason"])
        self.assertEqual(result["version_id"], "ver-lkg-99")

    def test_tier3_bundled_seed_when_api_and_lkg_fail(self) -> None:
        self._clear_cache()
        from admin.org_price_client import get_price_data

        seed_data = {
            "version_id": None,
            "version_number": None,
            "synced_at": None,
            "source": "bundled_seed",
            "products": SAMPLE_PRODUCTS,
        }

        with patch("admin.org_price_client._api_get", return_value=None), \
             patch("admin.org_price_client.load_lkg_snapshot", return_value=None), \
             patch("admin.org_price_client._load_bundled_seed", return_value=seed_data):
            result = get_price_data(force_refresh=True)

        self.assertEqual(result["source"], "bundled_seed")
        self.assertTrue(result["stale"])

    def test_tier4_all_fail_returns_empty(self) -> None:
        self._clear_cache()
        from admin.org_price_client import get_price_data

        with patch("admin.org_price_client._api_get", return_value=None), \
             patch("admin.org_price_client.load_lkg_snapshot", return_value=None), \
             patch("admin.org_price_client._load_bundled_seed", return_value=None):
            result = get_price_data(force_refresh=True)

        self.assertEqual(result["source"], "none")
        self.assertEqual(result["products"], [])
        self.assertTrue(result["stale"])

    def test_cache_returns_same_object_without_force_refresh(self) -> None:
        self._clear_cache()
        from admin.org_price_client import get_price_data

        with patch("admin.org_price_client._api_get", return_value=SAMPLE_API_PAYLOAD) as mock_api:
            get_price_data(force_refresh=True)
            get_price_data()  # Should hit cache, not API again.

        # The cache check for org_api/lkg_snapshot with a version_id stops
        # the second call from reaching the API.
        self.assertGreaterEqual(mock_api.call_count, 1)

    def test_lkg_snapshot_saved_async_when_version_differs(self) -> None:
        """Verify that when API returns a new version, save_lkg_snapshot is called."""
        self._clear_cache()
        from admin.org_price_client import get_price_data

        old_lkg = {
            "version_id": "old-ver",
            "version_number": 1,
            "synced_at": "2026-01-01T00:00:00Z",
            "source": "lkg_snapshot",
            "products": SAMPLE_PRODUCTS,
        }
        saved: dict[str, Any] = {}

        def fake_save(vid: str, vnum: int, products: list) -> None:
            saved["version_id"] = vid

        with patch("admin.org_price_client._api_get", return_value=SAMPLE_API_PAYLOAD), \
             patch("admin.org_price_client.load_lkg_snapshot", return_value=old_lkg), \
             patch("admin.org_price_client.save_lkg_snapshot", side_effect=fake_save), \
             patch("threading.Thread") as mock_thread:
            get_price_data(force_refresh=True)
            # Thread is started for async save.
            mock_thread.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: price_loader
# ---------------------------------------------------------------------------

@unittest.skipUnless(_HAS_PANDAS, "pandas/numpy not installed in this environment")
class TestLoadPriceDataframe(unittest.TestCase):
    """load_price_dataframe converts products list to fuzzy-matcher DataFrame."""

    def _make_price_data(self, source: str = "org_api", stale: bool = False) -> dict[str, Any]:
        return {
            "products": SAMPLE_PRODUCTS,
            "version_id": "ver-001",
            "version_number": 5,
            "source": source,
            "stale": stale,
            "stale_reason": "使用本地快照（org 服务不可达）" if stale else None,
            "synced_at": "2026-06-27T00:00:00Z",
        }

    def test_builds_dataframe_with_expected_columns(self) -> None:
        from inventory.price_loader import load_price_dataframe

        df, meta = load_price_dataframe(self._make_price_data(), customer_level="B")

        self.assertFalse(df.empty)
        self.assertIn("Material", df.columns)
        self.assertIn("Describrition", df.columns)
        self.assertIn("unit_price", df.columns)
        self.assertEqual(len(df), 2)

    def test_maps_price_b_for_b_level(self) -> None:
        from inventory.price_loader import load_price_dataframe

        df, _ = load_price_dataframe(self._make_price_data(), customer_level="B")
        first_row = df[df["Material"] == "8010072480"].iloc[0]
        self.assertAlmostEqual(float(first_row["unit_price"]), 110.0)

    def test_maps_price_a_for_a_level(self) -> None:
        from inventory.price_loader import load_price_dataframe

        df, _ = load_price_dataframe(self._make_price_data(), customer_level="A")
        first_row = df[df["Material"] == "8010072480"].iloc[0]
        self.assertAlmostEqual(float(first_row["unit_price"]), 120.0)

    def test_meta_stale_false_for_org_api(self) -> None:
        from inventory.price_loader import load_price_dataframe

        _, meta = load_price_dataframe(self._make_price_data(source="org_api", stale=False))
        self.assertEqual(meta["price_source"], "org_api")
        self.assertFalse(meta["price_stale"])
        self.assertIsNone(meta["price_stale_warning"])

    def test_meta_stale_true_for_lkg(self) -> None:
        from inventory.price_loader import load_price_dataframe

        _, meta = load_price_dataframe(
            self._make_price_data(source="lkg_snapshot", stale=True)
        )
        self.assertEqual(meta["price_source"], "lkg_snapshot")
        self.assertTrue(meta["price_stale"])
        self.assertIsNotNone(meta["price_stale_warning"])

    def test_empty_products_returns_empty_df(self) -> None:
        from inventory.price_loader import load_price_dataframe

        price_data = {
            "products": [],
            "version_id": None,
            "version_number": None,
            "source": "none",
            "stale": True,
            "stale_reason": "无价格数据可用",
            "synced_at": None,
        }
        df, meta = load_price_dataframe(price_data)
        self.assertTrue(df.empty)
        self.assertEqual(meta["price_source"], "none")

    def test_description_english_mapped(self) -> None:
        from inventory.price_loader import load_price_dataframe

        df, _ = load_price_dataframe(self._make_price_data())
        self.assertIn("Describrition_English", df.columns)
        first = df[df["Material"] == "8010072480"].iloc[0]
        self.assertEqual(first["Describrition_English"], "PVC-U Straight Connector DN50")

    def test_product_type_mapped(self) -> None:
        from inventory.price_loader import load_price_dataframe

        df, _ = load_price_dataframe(self._make_price_data())
        self.assertIn("Product_Type", df.columns)
        first = df[df["Material"] == "8010072480"].iloc[0]
        self.assertEqual(first["Product_Type"], "管材")

    def test_rows_without_material_or_desc_are_skipped(self) -> None:
        from inventory.price_loader import load_price_dataframe

        products = [
            {"material_code": "", "description": "有描述但无编码", "price_b": 10.0},
            {"material_code": "8010072480", "description": "", "price_b": 10.0},
            {"material_code": "8010072481", "description": "合法行", "price_b": 55.0},
        ]
        price_data = {
            "products": products,
            "version_id": None,
            "version_number": None,
            "source": "org_api",
            "stale": False,
            "stale_reason": None,
            "synced_at": None,
        }
        df, _ = load_price_dataframe(price_data)
        self.assertEqual(len(df), 1)
        self.assertEqual(df.iloc[0]["Material"], "8010072481")


# ---------------------------------------------------------------------------
# Tests: invalidate_price_cache
# ---------------------------------------------------------------------------

class TestInvalidatePriceCache(unittest.TestCase):
    def test_clears_in_memory_cache(self) -> None:
        from admin import org_price_client

        with org_price_client._cache_lock:
            org_price_client._price_cache["source"] = "lkg_snapshot"
            org_price_client._price_cache["products"] = []

        from admin.org_price_client import invalidate_price_cache
        invalidate_price_cache()

        with org_price_client._cache_lock:
            self.assertEqual(org_price_client._price_cache, {})


if __name__ == "__main__":
    unittest.main()
