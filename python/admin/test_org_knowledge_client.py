"""Unit tests for admin.org_knowledge_client."""
from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from admin import org_knowledge_client as okc


class OrgKnowledgeClientTests(unittest.TestCase):
    def setUp(self) -> None:
        okc.invalidate_org_knowledge_cache()

    def test_rule_already_in_doc_detects_duplicate(self) -> None:
        content = "## 业务规则\n\n- 直接50默认A系列白色排水\n"
        self.assertTrue(okc.rule_already_in_doc("直接50默认A系列白色", content))
        self.assertFalse(okc.rule_already_in_doc("全新未出现规则XYZ", content))

    def test_is_org_api_configured_false_by_default(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertFalse(okc.is_org_api_configured())

    def test_load_doc_content_file_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "wanding_business_knowledge.md"
            path.write_text("# knowledge\nline", encoding="utf-8")
            with mock.patch.dict(os.environ, {}, clear=True):
                content = okc.load_doc_content(fallback_path=path)
            self.assertIn("knowledge", content)

    def test_get_doc_uses_api_and_cache(self) -> None:
        payload = json.dumps({"data": {"slug": "wanding_business_knowledge", "content": "from api", "version": 2}}).encode(
            "utf-8"
        )

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return payload

        with mock.patch.dict(
            os.environ,
            {"ORG_SERVER_URL": "http://127.0.0.1:13401", "ORG_SESSION_TOKEN": "tok"},
            clear=True,
        ):
            with mock.patch("urllib.request.urlopen", return_value=FakeResp()):
                doc1 = okc.get_doc()
                doc2 = okc.get_doc()
        self.assertIsNotNone(doc1)
        assert doc1 is not None
        self.assertEqual(doc1["content"], "from api")
        self.assertEqual(doc2["content"], "from api")

    def test_api_json_put_bootstraps_csrf_and_sends_header(self) -> None:
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
            def open(self, req, timeout=20):
                headers = {k.lower(): v for k, v in req.header_items()}
                calls.append((req.get_method(), headers))
                if req.get_method() == "PUT":
                    return FakeResp({"data": {"version": 3, "content": "updated"}})
                return FakeResp({})

        with mock.patch.dict(
            os.environ,
            {"ORG_SERVER_URL": "http://127.0.0.1:13401", "ORG_SESSION_TOKEN": "jwt"},
            clear=True,
        ):
            with mock.patch.object(okc, "bootstrap_org_csrf", return_value="csrf-xyz") as mock_bootstrap:
                with mock.patch.object(okc, "build_cookie_opener", return_value=FakeOpener()):  # type: ignore[arg-type]
                    result = okc.update_doc(
                        "wanding_business_knowledge",
                        title="t",
                        content="body",
                        expected_version=2,
                    )
        mock_bootstrap.assert_called_once_with(
            "http://127.0.0.1:13401",
            mock.ANY,
            opener_factory=mock.ANY,
        )
        self.assertEqual(result["version"], 3)
        self.assertEqual(len(calls), 1)
        method, headers = calls[0]
        self.assertEqual(method, "PUT")
        self.assertEqual(headers.get("authorization"), "Bearer jwt")
        self.assertEqual(headers.get("x-csrf-token"), "csrf-xyz")

    def test_append_business_rule_put_path_uses_update_doc(self) -> None:
        put_payload = json.dumps({"data": {"version": 5, "content": "updated", "title": "Wanding"}}).encode("utf-8")

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return put_payload

        class FakeOpener:
            def open(self, req, timeout=20):
                return FakeResp()

        with mock.patch.dict(
            os.environ,
            {"ORG_SERVER_URL": "http://127.0.0.1:13401", "ORG_SESSION_TOKEN": "jwt"},
            clear=True,
        ):
            with mock.patch.object(
                okc,
                "get_doc",
                return_value={
                    "slug": "wanding_business_knowledge",
                    "content": "# base\n",
                    "version": 4,
                    "title": "Wanding",
                    "source": "org-api",
                },
            ):
                with mock.patch.object(okc, "bootstrap_org_csrf", return_value="csrf-xyz") as mock_bootstrap:
                    with mock.patch.object(okc, "build_cookie_opener", return_value=FakeOpener()):  # type: ignore[arg-type]
                        result = okc.append_business_rule("默认 A 系列白管", reason="test")
        mock_bootstrap.assert_called_once()
        self.assertEqual(result["previous_version"], 4)
        self.assertEqual(result["version"], 5)

    def test_api_get_retries_on_401_with_second_token(self) -> None:
        calls: list[str] = []

        def fake_make_get(base: str, path: str, token: str) -> dict[str, Any] | None:
            calls.append(token)
            if token == "bad-jwt":
                raise okc.OrgAuthError(401, "HTTP 401 Unauthorized")
            return {"slug": "wanding_business_knowledge", "content": "# ok", "version": 1}

        with mock.patch.dict(
            os.environ,
            {"ORG_SERVER_URL": "http://127.0.0.1:13401"},
            clear=True,
        ):
            with mock.patch.object(okc, "get_auth_candidates") as mock_candidates:
                from admin.org_session import AuthCandidate

                mock_candidates.return_value = [
                    AuthCandidate(token="bad-jwt", source="profile:AionUi", profile="AionUi"),
                    AuthCandidate(token="good-jwt", source="profile:AionUi-Dev", profile="AionUi-Dev"),
                ]
                with mock.patch.object(okc, "_make_get", side_effect=fake_make_get):
                    result = okc._api_get("/api/org-knowledge/wanding_business_knowledge")

        self.assertEqual(calls, ["bad-jwt", "good-jwt"])
        self.assertIsNotNone(result)
        self.assertEqual(result["version"], 1)


if __name__ == "__main__":
    unittest.main()
