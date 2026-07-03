"""Tests for price-library unpublished Stop gate."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

GATE_LIB = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "lib"
    / "parse_transcript_price_library_unpublished.py"
)
sys.path.insert(0, str(GATE_LIB.parent))
from parse_transcript_price_library_unpublished import analyze_transcript  # noqa: E402


class PriceLibraryUnpublishedGateTests(unittest.TestCase):
    def test_warns_when_applied_without_publish(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "t.jsonl"
            path.write_text('{"tool_response": {"applied": true}}\n', encoding="utf-8")
            result = analyze_transcript(path)
            self.assertTrue(result["should_warn"])

    def test_ok_when_publish_follows_apply(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "t.jsonl"
            path.write_text(
                '{"tool_response": {"applied": true}}\n'
                '{"tool_response": {"published": true}}\n',
                encoding="utf-8",
            )
            result = analyze_transcript(path)
            self.assertFalse(result["should_warn"])


if __name__ == "__main__":
    unittest.main()
