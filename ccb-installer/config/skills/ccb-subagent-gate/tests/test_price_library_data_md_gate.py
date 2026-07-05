"""Tests for price-library data.Md Read gate."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS / "lib"))

from hook_transcript import derive_agent_transcript_path  # noqa: E402
from parse_transcript_data_md_gate import (  # noqa: E402
    analyze_transcript,
    hook_input_has_data_md_read,
    mark_session_data_md_read,
    transcript_has_data_md_read,
)


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

    def test_allows_upsert_after_session_flag(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env["SUBAGENT_GATE_LOG_DIR"] = tmp
            proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "pre-price-library-data-md-gate.py")],
                input=json.dumps(
                    {
                        "tool_name": "mcp__price-library__upsert_price_library_item",
                        "session_id": "pl-flag-1",
                        "transcript_path": "",
                    }
                ),
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, msg=proc.stderr)
            self.assertNotEqual(proc.stdout.strip(), "")
            mark_proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "post-data-md-read-mark.py")],
                input=json.dumps(
                    {
                        "tool_name": "Read",
                        "session_id": "pl-flag-1",
                        "tool_input": {
                            "file_path": r"D:\CCB-Wanding\vendor\wanding\data\data.Md"
                        },
                    }
                ),
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(mark_proc.returncode, 0, msg=mark_proc.stderr)
            allow_proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "pre-price-library-data-md-gate.py")],
                input=json.dumps(
                    {
                        "tool_name": "mcp__price-library__upsert_price_library_item",
                        "session_id": "pl-flag-1",
                        "transcript_path": "",
                    }
                ),
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(allow_proc.returncode, 0, msg=allow_proc.stderr)
            self.assertEqual(allow_proc.stdout.strip(), "")

    def test_derives_agent_transcript_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            session_id = "pl-session"
            agent_id = "agent-pl1"
            agent_dir = root / session_id / "subagents"
            agent_dir.mkdir(parents=True)
            agent_file = agent_dir / f"agent-{agent_id}.jsonl"
            read_line = json.dumps(
                {
                    "type": "assistant",
                    "message": {
                        "content": [
                            {
                                "type": "tool_use",
                                "name": "Read",
                                "input": {
                                    "file_path": r"D:\CCB-Wanding\vendor\wanding\data\data.Md"
                                },
                            }
                        ]
                    },
                },
                ensure_ascii=False,
            )
            agent_file.write_text(read_line + "\n", encoding="utf-8")
            derived = derive_agent_transcript_path(
                {
                    "session_id": session_id,
                    "agent_id": agent_id,
                    "transcript_path": str(root / f"{session_id}.jsonl"),
                }
            )
            self.assertEqual(derived, agent_file)
            self.assertTrue(
                hook_input_has_data_md_read(
                    {
                        "session_id": session_id,
                        "agent_id": agent_id,
                        "transcript_path": str(root / f"{session_id}.jsonl"),
                    }
                )
            )

    def test_stop_check_honors_session_flag(self) -> None:
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
            old = os.environ.get("SUBAGENT_GATE_LOG_DIR")
            os.environ["SUBAGENT_GATE_LOG_DIR"] = tmp
            try:
                mark_session_data_md_read("pl-stop-flag")
                result = analyze_transcript(path, session_id="pl-stop-flag")
            finally:
                if old is None:
                    os.environ.pop("SUBAGENT_GATE_LOG_DIR", None)
                else:
                    os.environ["SUBAGENT_GATE_LOG_DIR"] = old
            self.assertTrue(result["data_md_read_in_session"])
            self.assertFalse(result["should_block"])


if __name__ == "__main__":
    unittest.main()
