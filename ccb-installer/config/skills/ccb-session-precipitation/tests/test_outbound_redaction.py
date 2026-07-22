#!/usr/bin/env python3
"""Unit tests for D7 outbound redaction + policy."""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts" / "lib"
sys.path.insert(0, str(SCRIPT_DIR))

from outbound_redaction import (  # noqa: E402
    OutboundDenied,
    OutboundRedactionFailed,
    assert_outbound_allowed,
    prepare_outbound_bundle,
    redact_business_fields,
)


class TestOutboundRedaction(unittest.TestCase):
    def test_redacts_amount_company_and_id(self) -> None:
        raw = "客户上海某某科技有限公司合同HT-2024-0088报价¥12,500.00元，电话13812345678"
        out = redact_business_fields(raw)
        self.assertNotIn("¥12,500", out)
        self.assertNotIn("12,500", out)
        self.assertIn("[AMOUNT]", out)
        self.assertIn("[ORG]", out)
        self.assertIn("[BIZ_ID]", out)
        self.assertIn("[PHONE]", out)
        self.assertNotIn("上海某某科技有限公司", out)
        self.assertNotIn("13812345678", out)

    def test_session_deny_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            learning = root / "learning"
            learning.mkdir()
            (learning / "session_outbound_deny.json").write_text(
                json.dumps({"sessions": ["sess-deny"]}),
                encoding="utf-8",
            )
            with self.assertRaises(OutboundDenied) as ctx:
                assert_outbound_allowed(root, "sess-deny", [])
            self.assertEqual(ctx.exception.reason, "session_deny")

    def test_tenant_deny_env(self) -> None:
        prev = os.environ.get("CCB_PRECIPITATION_OUTBOUND")
        os.environ["CCB_PRECIPITATION_OUTBOUND"] = "deny"
        try:
            with tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(OutboundDenied) as ctx:
                    assert_outbound_allowed(Path(tmp), "s1", [])
                self.assertEqual(ctx.exception.reason, "tenant_outbound_deny")
        finally:
            if prev is None:
                os.environ.pop("CCB_PRECIPITATION_OUTBOUND", None)
            else:
                os.environ["CCB_PRECIPITATION_OUTBOUND"] = prev

    def test_user_suppress_phrase(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(OutboundDenied) as ctx:
                assert_outbound_allowed(Path(tmp), "s1", ["请不要学习这次对话"])
            self.assertEqual(ctx.exception.reason, "user_suppressed")

    def test_prepare_bundle_redacts_all_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bundle = prepare_outbound_bundle(
                config_dir=Path(tmp),
                session_id="s1",
                transcript_excerpt="价格 3.5万元 给 北京示例商贸有限公司",
                business_kb_excerpt="历史价 ¥99",
                workflow_excerpt="ok",
                profile_excerpt="ok",
            )
            self.assertIn("[AMOUNT]", bundle["transcript_excerpt"])
            self.assertIn("[ORG]", bundle["transcript_excerpt"])
            self.assertIn("[AMOUNT]", bundle["business_kb_excerpt"])
            self.assertNotIn("3.5万", bundle["transcript_excerpt"])

    def test_fail_closed_wrapper(self) -> None:
        # prepare_outbound_text should raise OutboundRedactionFailed if redact blows up
        import outbound_redaction as mod

        real = mod.redact_business_fields

        def boom(_text: str) -> str:
            raise RuntimeError("boom")

        mod.redact_business_fields = boom  # type: ignore[assignment]
        try:
            with self.assertRaises(OutboundRedactionFailed):
                mod.prepare_outbound_text("secret ¥1", label="transcript")
        finally:
            mod.redact_business_fields = real  # type: ignore[assignment]

    def test_prepare_bundle_never_returns_raw_on_redact_fail(self) -> None:
        import outbound_redaction as mod

        real = mod.redact_business_fields

        def boom(_text: str) -> str:
            raise RuntimeError("boom")

        mod.redact_business_fields = boom  # type: ignore[assignment]
        try:
            with tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(OutboundRedactionFailed):
                    prepare_outbound_bundle(
                        config_dir=Path(tmp),
                        session_id="s1",
                        transcript_excerpt="客户秘密价格¥999",
                    )
        finally:
            mod.redact_business_fields = real  # type: ignore[assignment]


if __name__ == "__main__":
    unittest.main()
