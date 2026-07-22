"""Org Mutate knowledge — locator, budget, delete RBAC, envelope."""
from __future__ import annotations

import os
import unittest
from unittest import mock

from admin.org_session import OrgCsrfError
from admin import org_knowledge_client as okc
from admin import org_knowledge_mutate as okm
from admin.org_knowledge_dispatch import handle_append_business_rule, handle_delete_business_rule


class MutateHelpersTests(unittest.TestCase):
    def test_iter_legacy_and_stamped_blocks(self) -> None:
        content = (
            "## 业务规则补充\n\n"
            "- 旧规则 legacy fifty\n"
            "  - 来源：报价专家会话确认，2026-07-01\n\n"
            "<!-- org_mutate_block id=abc123 hash=deadbeef -->\n"
            "- 新规则 stamped\n"
            "  - 来源：报价专家会话确认，2026-07-14\n"
        )
        blocks = okm.iter_rule_blocks(content)
        self.assertEqual(len(blocks), 2)
        self.assertIsNone(blocks[0].block_id)
        self.assertEqual(blocks[1].block_id, "abc123")

    def test_find_blocks_ambiguous_without_snippet(self) -> None:
        content = "- aa\n- aa\n"
        # same text → same hash
        h = okm.content_hash("- aa\n")
        # rebuild with identical blocks
        content = "- same rule text\n- same rule text\n"
        matches = okm.find_blocks(content, content_hash_value=okm.content_hash("- same rule text\n"))
        self.assertGreaterEqual(len(matches), 1)

    def test_near_duplicate_threshold(self) -> None:
        content = "- PVC直管默认走D排水系列灰色\n"
        near = okm.near_duplicate_matches("PVC直管默认走D排水系列灰", content)
        self.assertTrue(near)

    def test_budget_limit(self) -> None:
        self.assertEqual(okm.check_rule_budget("x" * (okm.MAX_RULE_CHARS + 1)), "LIMIT_EXCEEDED")
        self.assertIsNone(okm.check_rule_budget("short"))


class DeleteDispatchTests(unittest.TestCase):
    def setUp(self) -> None:
        okc.invalidate_org_knowledge_cache()

    def _doc(self, content: str, version: int = 3) -> dict:
        return {
            "slug": "wanding_business_knowledge_test",
            "content": content,
            "version": version,
            "title": "test",
            "source": "org-api",
        }

    def test_preview_no_put(self) -> None:
        content = "- 删除目标规则甲\n  - 来源：x\n"
        h = okm.content_hash(content)
        with mock.patch.object(okc, "get_doc", return_value=self._doc(content)):
            with mock.patch.object(okc, "update_doc") as put:
                out = handle_delete_business_rule(
                    {
                        "slug": "wanding_business_knowledge_test",
                        "content_hash": h,
                        "snippet": "删除目标规则甲",
                        "confirmed": False,
                    }
                )
        put.assert_not_called()
        self.assertTrue(out["requires_confirmation"])
        self.assertFalse(out["applied"])
        self.assertEqual(out["action"], "delete")
        self.assertEqual(out["domain"], "knowledge")
        self.assertIn("preview_before", out)

    def test_apply_forbidden_on_prod_slug(self) -> None:
        content = "- 删除目标规则乙\n"
        h = okm.content_hash(content)
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(okc, "fetch_org_user_claims", return_value={}):
                with mock.patch.object(
                    okc,
                    "get_doc",
                    return_value=self._doc(content) | {"slug": "wanding_business_knowledge"},
                ):
                    with mock.patch.object(okc, "update_doc") as put:
                        out = handle_delete_business_rule(
                            {
                                "slug": "wanding_business_knowledge",
                                "content_hash": h,
                                "snippet": "删除目标规则乙",
                                "confirmed": True,
                            }
                        )
        put.assert_not_called()
        self.assertEqual(out["error_code"], "FORBIDDEN")
        self.assertFalse(out["applied"])
        self.assertIn("删除未落库", out.get("message") or "")
        self.assertIn("FORBIDDEN", out.get("message") or "")

    def test_apply_ok_on_prod_slug_when_is_admin(self) -> None:
        content = "## 业务规则补充\n\n- 删除目标规则丁\n  - 来源：t\n"
        block = okm.iter_rule_blocks(content)[0]
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(
                okc,
                "fetch_org_user_claims",
                return_value={"is_admin": True, "capabilities": []},
            ):
                with mock.patch.object(
                    okc,
                    "get_doc",
                    return_value=self._doc(content, version=11) | {"slug": "wanding_business_knowledge"},
                ):
                    with mock.patch.object(
                        okc,
                        "update_doc",
                        return_value={"version": 12, "updated_by_id": "admin", "content": "x"},
                    ) as put:
                        out = handle_delete_business_rule(
                            {
                                "slug": "wanding_business_knowledge",
                                "content_hash": block.content_hash,
                                "snippet": "删除目标规则丁",
                                "doc_version": 11,
                                "confirmed": True,
                            }
                        )
        put.assert_called_once()
        self.assertTrue(out["applied"])

    def test_apply_ok_on_prod_slug_with_write_capability(self) -> None:
        content = "- 删除目标规则戊\n  - 来源：t\n"
        h = okm.content_hash(content)
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(
                okc,
                "fetch_org_user_claims",
                return_value={"is_admin": False, "capabilities": [okm.ORG_KNOWLEDGE_WRITE_CAP]},
            ):
                with mock.patch.object(
                    okc,
                    "get_doc",
                    return_value=self._doc(content, version=2) | {"slug": "wanding_business_knowledge"},
                ):
                    with mock.patch.object(
                        okc,
                        "update_doc",
                        return_value={"version": 3, "updated_by_id": "u", "content": ""},
                    ) as put:
                        out = handle_delete_business_rule(
                            {
                                "slug": "wanding_business_knowledge",
                                "content_hash": h,
                                "snippet": "删除目标规则戊",
                                "confirmed": True,
                            }
                        )
        put.assert_called_once()
        self.assertTrue(out["applied"])

    def test_session_role_helper(self) -> None:
        self.assertTrue(okm.session_role_allows_knowledge_delete(is_admin=True))
        self.assertTrue(
            okm.session_role_allows_knowledge_delete(
                is_admin=False, capabilities=[okm.ORG_KNOWLEDGE_WRITE_CAP]
            )
        )
        self.assertFalse(okm.session_role_allows_knowledge_delete(is_admin=False, capabilities=[]))

    def test_claims_fetch_error_is_forbid_not_raise(self) -> None:
        content = "- 删除目标规则己\n"
        h = okm.content_hash(content)
        with mock.patch.object(okc, "_api_get", side_effect=OrgCsrfError(403, "csrf")):
            self.assertEqual(okc.fetch_org_user_claims(), {})
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(okc, "_api_get", side_effect=OrgCsrfError(403, "csrf")):
                with mock.patch.object(
                    okc,
                    "get_doc",
                    return_value=self._doc(content) | {"slug": "wanding_business_knowledge"},
                ):
                    with mock.patch.object(okc, "update_doc") as put:
                        out = handle_delete_business_rule(
                            {
                                "slug": "wanding_business_knowledge",
                                "content_hash": h,
                                "snippet": "删除目标规则己",
                                "confirmed": True,
                            }
                        )
        put.assert_not_called()
        self.assertEqual(out["error_code"], "FORBIDDEN")

    def test_apply_ok_on_test_slug(self) -> None:
        content = "## 业务规则补充\n\n- 删除目标规则丙\n  - 来源：t\n"
        block = okm.iter_rule_blocks(content)[0]
        with mock.patch.object(okc, "get_doc", return_value=self._doc(content, version=9)):
            with mock.patch.object(
                okc,
                "update_doc",
                return_value={"version": 10, "updated_by_id": "u1", "content": "x"},
            ) as put:
                out = handle_delete_business_rule(
                    {
                        "slug": "wanding_business_knowledge_test",
                        "content_hash": block.content_hash,
                        "snippet": "删除目标规则丙",
                        "doc_version": 9,
                        "confirmed": True,
                    }
                )
        put.assert_called_once()
        self.assertTrue(out["applied"])
        written = put.call_args.kwargs.get("content") or ""
        self.assertNotIn("删除目标规则丙", written)

    def test_version_conflict(self) -> None:
        content = "- z\n"
        with mock.patch.object(okc, "get_doc", return_value=self._doc(content, version=5)):
            out = handle_delete_business_rule(
                {
                    "slug": "wanding_business_knowledge_test",
                    "content_hash": okm.content_hash(content),
                    "snippet": "z",
                    "doc_version": 4,
                    "confirmed": False,
                }
            )
        self.assertEqual(out["error_code"], "CONFLICT")

    def test_snippet_only_rejected(self) -> None:
        content = "- rule alpha unique\n"
        with mock.patch.object(okc, "get_doc", return_value=self._doc(content)):
            with mock.patch.object(okc, "update_doc") as put:
                out = handle_delete_business_rule(
                    {
                        "slug": "wanding_business_knowledge_test",
                        "snippet": "rule alpha",
                        "confirmed": False,
                    }
                )
        put.assert_not_called()
        self.assertEqual(out["error_code"], "AMBIGUOUS_MATCH")
        self.assertIn("Snippet-only", out.get("message") or "")

    def test_hash_without_snippet_rejected(self) -> None:
        content = "- rule beta\n"
        h = okm.content_hash(content)
        with mock.patch.object(okc, "get_doc", return_value=self._doc(content)):
            out = handle_delete_business_rule(
                {
                    "slug": "wanding_business_knowledge_test",
                    "content_hash": h,
                    "confirmed": False,
                }
            )
        self.assertEqual(out["error_code"], "AMBIGUOUS_MATCH")

    def test_limit_exceeded_no_confirm_prompt(self) -> None:
        out = handle_append_business_rule(
            {"rule_text": "z" * (okm.MAX_RULE_CHARS + 1), "confirmed": False}
        )
        self.assertEqual(out["error_code"], "LIMIT_EXCEEDED")
        self.assertFalse(out["requires_confirmation"])


class AppendEnvelopeTests(unittest.TestCase):
    def test_preview_includes_envelope_and_legacy(self) -> None:
        with mock.patch.object(okc, "get_doc", return_value={"content": "", "version": 1}):
            out = handle_append_business_rule({"rule_text": "新规则XYZ", "confirmed": False})
        self.assertTrue(out["requires_confirmation"])
        self.assertEqual(out["action"], "append")
        self.assertEqual(out["rule_text"], "新规则XYZ")
        self.assertIn("section", out)

    def test_limit_exceeded_on_preview(self) -> None:
        out = handle_append_business_rule(
            {"rule_text": "y" * (okm.MAX_RULE_CHARS + 10), "confirmed": False}
        )
        self.assertEqual(out["error_code"], "LIMIT_EXCEEDED")


if __name__ == "__main__":
    unittest.main()
