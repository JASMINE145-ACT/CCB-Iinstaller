"""Unit tests for org price library admin client, preview, and dispatch."""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

PYTHON_ROOT = Path(__file__).resolve().parent.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from admin import org_price_admin_client as opac  # noqa: E402
from admin.org_price_admin_dispatch import (  # noqa: E402
    handle_apply_price_library_import,
    handle_delete_price_library_item,
    handle_get_price_library_active,
    handle_list_price_library_versions,
    handle_publish_price_library_draft,
    handle_revert_price_library_version,
    handle_upsert_price_library_item,
)
from admin.price_library_import_guard import validate_import_file_path  # noqa: E402
from admin.org_price_admin_preview import build_proposed_change  # noqa: E402
from system.price_library_tool_dispatch import handle_request  # noqa: E402


class OrgPriceAdminPreviewTests(unittest.TestCase):
    def test_build_proposed_change_shows_field_diff_without_post(self) -> None:
        active = [
            {
                "product_id": "plp-1",
                "material_code": "M001",
                "price_b": 10.0,
                "description": "Pipe",
            }
        ]
        result = build_proposed_change(
            active_products=active,
            draft_items=[],
            draft_revision=3,
            material_code="M001",
            field_updates={"price_b": 12.5},
            change_type="update",
        )
        self.assertEqual(result["change_type"], "update")
        self.assertEqual(result["proposed"]["price_b"], 12.5)
        self.assertEqual(result["field_changes"]["price_b"]["before"], 10.0)

    def test_delete_preview_marks_delete_change_type(self) -> None:
        active = [{"product_id": "plp-9", "material_code": "M009", "price_b": 1.0}]
        result = build_proposed_change(
            active_products=active,
            draft_items=[],
            draft_revision=1,
            material_code="M009",
            field_updates={},
            change_type="delete",
        )
        self.assertEqual(result["change_type"], "delete")
        self.assertIsNone(result["proposed"])


class OrgPriceAdminClientTests(unittest.TestCase):
    def test_is_org_api_configured_false_by_default(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertFalse(opac.is_org_api_configured())

    def test_api_json_bootstraps_csrf(self) -> None:
        calls: list[tuple[str, dict[str, str]]] = []

        class FakeResp:
            def __init__(self, body: dict):
                self._body = json.dumps(body).encode("utf-8")

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return self._body

        class FakeOpener:
            def open(self, req, timeout=30):
                headers = {k.lower(): v for k, v in req.header_items()}
                calls.append((req.get_method(), headers))
                return FakeResp({"data": {"ok": True}})

        with mock.patch.dict(
            os.environ,
            {"ORG_SERVER_URL": "http://127.0.0.1:13401", "ORG_SESSION_TOKEN": "jwt"},
            clear=True,
        ):
            with mock.patch.object(opac, "bootstrap_org_csrf", return_value="csrf-xyz") as mock_bootstrap:
                with mock.patch.object(opac, "build_cookie_opener", return_value=FakeOpener()):  # type: ignore[arg-type]
                    result = opac.apply_draft_item(
                        product_id="plp-1",
                        change_type="update",
                        fields={"material_code": "M001", "price_b": 2.0},
                    )
        mock_bootstrap.assert_called_once()
        self.assertEqual(result, None)
        self.assertEqual(calls[0][0], "POST")
        self.assertEqual(calls[0][1].get("x-csrf-token"), "csrf-xyz")

    def test_get_active_parses_wrapper(self) -> None:
        payload = json.dumps(
            {
                "data": {
                    "version": {"version_number": 3, "id": "plv-3"},
                    "products": [{"material_code": "M001", "price_b": 1.0}],
                }
            }
        ).encode("utf-8")

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return payload

        with mock.patch.dict(
            os.environ,
            {"ORG_SERVER_URL": "http://127.0.0.1:13401", "ORG_SESSION_TOKEN": "jwt"},
            clear=True,
        ):
            with mock.patch("urllib.request.urlopen", return_value=FakeResp()):
                data = opac.get_active()
        self.assertIsNotNone(data)
        assert data is not None
        self.assertEqual(data["version"]["version_number"], 3)
        self.assertEqual(len(data["products"]), 1)


class OrgPriceAdminDispatchTests(unittest.TestCase):
    def test_unconfirmed_upsert_does_not_call_apply(self) -> None:
        active = {"version": {"version_number": 3}, "products": [{"product_id": "plp-1", "material_code": "M001", "price_b": 1.0}]}
        draft = {"revision": 2, "items": []}
        with mock.patch.object(opac, "get_active", return_value=active):
            with mock.patch.object(opac, "get_draft", return_value=draft):
                with mock.patch.object(opac, "apply_draft_item") as mock_apply:
                    result = handle_upsert_price_library_item(
                        {"material_code": "M001", "price_b": 2.0, "confirmed": False}
                    )
        mock_apply.assert_not_called()
        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(result["material_code"], "M001")

    def test_unconfirmed_upsert_accepts_learn_by_data_source_fields(self) -> None:
        active = {"version": {"version_number": 3}, "products": []}
        draft = {"revision": 2, "items": []}
        fields = {
            "source_file": "quote.xlsx",
            "source_sheet": "Sheet1",
            "source_row": 16,
            "is_preferred_price": True,
            "superseded_by_source": "",
            "description": "直接50",
            "description_cn": "直接50",
            "description_english": "Coupling 50",
        }
        with mock.patch.object(opac, "get_active", return_value=active):
            with mock.patch.object(opac, "get_draft", return_value=draft):
                with mock.patch.object(opac, "apply_draft_item") as mock_apply:
                    result = handle_upsert_price_library_item(
                        {"material_code": "8020020755", "fields": fields, "confirmed": False}
                    )
        mock_apply.assert_not_called()
        self.assertTrue(result["requires_confirmation"])
        proposed = result.get("proposed") or {}
        patch = proposed.get("fields") or proposed
        self.assertEqual(patch.get("source_file"), "quote.xlsx")
        self.assertEqual(patch.get("source_row"), 16)
        self.assertNotIn("price_b", patch)

    def test_confirmed_upsert_calls_apply(self) -> None:
        active = {"version": {"version_number": 3}, "products": [{"product_id": "plp-1", "material_code": "M001", "price_b": 1.0}]}
        draft = {"revision": 2, "items": []}
        with mock.patch.object(opac, "get_active", return_value=active):
            with mock.patch.object(opac, "get_draft", return_value=draft):
                with mock.patch.object(opac, "apply_draft_item") as mock_apply:
                    result = handle_upsert_price_library_item(
                        {"material_code": "M001", "price_b": 2.0, "confirmed": True}
                    )
        mock_apply.assert_called_once()
        self.assertTrue(result["applied"])

    def test_get_active_dispatch_summary(self) -> None:
        active = {
            "version": {"id": "plv-1", "version_number": 1, "item_count": 1},
            "products": [{"material_code": "M001"}],
        }
        with mock.patch.object(opac, "get_active", return_value=active):
            result = handle_get_price_library_active({})
        self.assertEqual(result["version_number"], 1)
        self.assertEqual(result["item_count"], 1)

    def test_handle_request_maps_403_permission(self) -> None:
        from admin.org_session import OrgCsrfError

        with mock.patch.object(opac, "get_draft", side_effect=OrgCsrfError(403, "price_admin required")):
            response = handle_request({"tool": "get_price_library_draft", "params": {}})
        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "PERMISSION_REQUIRED")

    def test_unconfirmed_publish_does_not_call_publish(self) -> None:
        active = {"version": {"version_number": 3}, "products": []}
        draft = {"revision": 7, "items": [{"product_id": "plp-1", "change_type": "update"}]}
        with mock.patch.object(opac, "get_active", return_value=active):
            with mock.patch.object(opac, "get_draft", return_value=draft):
                with mock.patch.object(opac, "publish_draft") as mock_publish:
                    result = handle_publish_price_library_draft({"confirmed": False, "reason": "smoke"})
        mock_publish.assert_not_called()
        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(result["draft_revision"], 7)
        self.assertEqual(result["pending_draft_items"], 1)
        self.assertEqual(result["active_version_number"], 3)
        self.assertEqual(result["next_version_number"], 4)

    def test_confirmed_publish_calls_publish_with_revision(self) -> None:
        active = {"version": {"version_number": 3}, "products": []}
        draft = {"revision": 7, "items": [{"product_id": "plp-1", "change_type": "update"}]}
        published = {"id": "plv-4", "version_number": 4, "item_count": 3299}
        with mock.patch.object(opac, "get_active", return_value=active):
            with mock.patch.object(opac, "get_draft", return_value=draft):
                with mock.patch.object(opac, "publish_draft", return_value=published) as mock_publish:
                    result = handle_publish_price_library_draft({"confirmed": True, "reason": "agent publish"})
        mock_publish.assert_called_once_with(reason="agent publish", revision=7)
        self.assertTrue(result["published"])
        self.assertEqual(result["version_number"], 4)

    def test_publish_empty_draft_rejected_when_confirmed(self) -> None:
        active = {"version": {"version_number": 3}, "products": []}
        draft = {"revision": 7, "items": []}
        with mock.patch.object(opac, "get_active", return_value=active):
            with mock.patch.object(opac, "get_draft", return_value=draft):
                with self.assertRaises(ValueError):
                    handle_publish_price_library_draft({"confirmed": True})

    def test_handle_request_maps_409_revision_conflict(self) -> None:
        from admin.org_session import OrgVersionConflictError

        with mock.patch.object(
            opac,
            "publish_draft",
            side_effect=OrgVersionConflictError(409, "stale revision"),
        ):
            active = {"version": {"version_number": 3}, "products": []}
            draft = {"revision": 1, "items": [{"product_id": "plp-1"}]}
            with mock.patch.object(opac, "get_active", return_value=active):
                with mock.patch.object(opac, "get_draft", return_value=draft):
                    response = handle_request(
                        {"tool": "publish_price_library_draft", "params": {"confirmed": True}}
                    )
        self.assertFalse(response["success"])
        self.assertEqual(response["error_code"], "REVISION_CONFLICT")

    def test_unconfirmed_apply_import_returns_preview_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            import_file = Path(tmp) / "import.xlsx"
            import_file.write_bytes(b"fake-xlsx")
            with mock.patch.dict(os.environ, {"WANDING_WORKSPACE": tmp}, clear=False):
                with mock.patch.object(opac, "preview_import", return_value={"create_count": 5, "error_count": 0}):
                    with mock.patch.object(opac, "apply_import") as mock_apply:
                        result = handle_apply_price_library_import(
                            {"file_path": str(import_file), "confirmed": False}
                        )
            mock_apply.assert_not_called()
            self.assertTrue(result["requires_confirmation"])
            self.assertEqual(result["create_count"], 5)

    def test_confirmed_apply_import_calls_client(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            import_file = Path(tmp) / "import.xlsx"
            import_file.write_bytes(b"fake-xlsx")
            with mock.patch.dict(os.environ, {"WANDING_WORKSPACE": tmp}, clear=False):
                with mock.patch.object(
                    opac,
                    "apply_import",
                    return_value={
                        "applied_create_count": 2,
                        "applied_update_count": 1,
                        "skipped_unchanged_count": 0,
                        "draft_revision": 22,
                    },
                ) as mock_apply:
                    result = handle_apply_price_library_import(
                        {"file_path": str(import_file), "confirmed": True}
                    )
            mock_apply.assert_called_once()
            self.assertTrue(result["applied"])
            self.assertEqual(result["draft_revision"], 22)

    def test_revert_requires_confirmation_first(self) -> None:
        with mock.patch.object(opac, "revert_version") as mock_revert:
            result = handle_revert_price_library_version({"version_id": "plv-3", "confirmed": False})
        mock_revert.assert_not_called()
        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(result["target_version_id"], "plv-3")

    def test_confirmed_revert_calls_client(self) -> None:
        with mock.patch.object(
            opac,
            "revert_version",
            return_value={"id": "plv-9", "version_number": 9, "item_count": 10},
        ) as mock_revert:
            result = handle_revert_price_library_version(
                {"version_id": "plv-3", "reason": "rollback", "confirmed": True}
            )
        mock_revert.assert_called_once_with(version_id="plv-3", reason="rollback")
        self.assertTrue(result["reverted"])
        self.assertEqual(result["new_version_id"], "plv-9")


class ListPriceLibraryVersionsTests(unittest.TestCase):
    def test_list_versions_normalizes_and_marks_active(self) -> None:
        versions = [
            {"id": "plv-2", "version_number": 2, "item_count": 100},
            {"id": "plv-3", "version_number": 3, "item_count": 3299, "published_at": "2026-07-01"},
        ]
        active = {"version": {"id": "plv-3", "version_number": 3}, "products": []}
        with mock.patch.object(opac, "list_versions", return_value=versions):
            with mock.patch.object(opac, "get_active", return_value=active):
                result = handle_list_price_library_versions({"limit": 5})
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["active_version_id"], "plv-3")
        self.assertTrue(result["versions"][0]["is_active"])
        self.assertEqual(result["versions"][0]["version_id"], "plv-3")

    def test_list_versions_limit_returns_newest_first(self) -> None:
        versions = [
            {"id": "plv-1", "version_number": 1},
            {"id": "plv-2", "version_number": 2},
            {"id": "plv-3", "version_number": 3},
        ]
        with mock.patch.object(opac, "list_versions", return_value=versions):
            with mock.patch.object(opac, "get_active", return_value={"version": {"id": "plv-3"}}):
                result = handle_list_price_library_versions({"limit": 2})
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["versions"][0]["version_id"], "plv-3")
        self.assertEqual(result["versions"][1]["version_id"], "plv-2")

    def test_list_versions_rejects_invalid_limit(self) -> None:
        with self.assertRaises(ValueError):
            handle_list_price_library_versions({"limit": "bad"})


class PriceLibraryImportPathGuardTests(unittest.TestCase):
    def test_validate_import_path_rejects_non_xlsx(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad_file = Path(tmp) / "import.csv"
            bad_file.write_text("x", encoding="utf-8")
            with mock.patch.dict(os.environ, {"WANDING_WORKSPACE": tmp}, clear=False):
                with self.assertRaises(ValueError):
                    validate_import_file_path(str(bad_file))


class PriceLibraryMcpRegistryTests(unittest.TestCase):
    def test_mcp_index_lists_price_library_tools(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent
        index = repo_root / "mcp_servers" / "price-library-server" / "dist" / "index.js"
        self.assertTrue(index.is_file(), f"missing MCP index: {index}")
        text = index.read_text(encoding="utf-8")
        for name in (
            "get_price_library_active",
            "get_price_library_draft",
            "list_price_library_versions",
            "upsert_price_library_item",
            "delete_price_library_item",
            "export_price_library",
            "publish_price_library_draft",
            "preview_price_library_import",
            "apply_price_library_import",
            "revert_price_library_version",
        ):
            self.assertIn(f'name: "{name}"', text)


if __name__ == "__main__":
    unittest.main()
