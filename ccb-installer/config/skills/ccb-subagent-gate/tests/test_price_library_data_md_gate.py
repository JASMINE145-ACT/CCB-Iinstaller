"""Tests for price-library data.Md Read gate."""
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
    / "parse_transcript_data_md_gate.py"
)
sys.path.insert(0, str(GATE_LIB.parent))
from parse_transcript_data_md_gate import analyze_transcript, transcript_has_data_md_read  # noqa: E402


class PriceLibraryDataMdGateTests(unittest.TestCase):
    def test_blocks_without_read(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "t.jsonl"
            path.write_text(
                json.dumps(
                    {
                        "type": "assistant",
                        "message": {
                            "content": [
                                {
                                    "type": "tool_use",
                                    "name": "mcp__price-library__upsert_price_library_item",
                                    "input": {"material_code": "M1"},
                                }
                            ]
                        },
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            result = analyze_transcript(path)
            self.assertTrue(result["should_block"])
            self.assertFalse(result["data_md_read_in_session"])

    def test_allows_after_read(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "t.jsonl"
            lines = [
                {
                    "type": "assistant",
                    "message": {
                        "content": [
                            {
                                "type": "tool_use",
                                "name": "Read",
                                "input": {"file_path": r"D:\CCB-Wanding\vendor\wanding\data\data.Md"},
                            }
                        ]
                    },
                },
                {
                    "type": "assistant",
                    "message": {
                        "content": [
                            {
                                "type": "tool_use",
                                "name": "mcp__price-library__upsert_price_library_item",
                                "input": {"material_code": "M1"},
                            }
                        ]
                    },
                },
            ]
            path.write_text("\n".join(json.dumps(line) for line in lines) + "\n", encoding="utf-8")
            self.assertTrue(transcript_has_data_md_read(path))
            result = analyze_transcript(path)
            self.assertFalse(result["should_block"])


if __name__ == "__main__":
    unittest.main()
