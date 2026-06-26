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


if __name__ == "__main__":
    unittest.main()
