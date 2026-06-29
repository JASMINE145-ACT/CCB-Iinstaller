#!/usr/bin/env python3
"""Unit tests for quotation knowledge-read gate helpers."""
from __future__ import annotations

import io
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

from match_selection_payload import payload_is_multi_candidate, unwrap_tool_payload  # noqa: E402
from parse_transcript_knowledge_gate import analyze_transcript  # noqa: E402


class TestMatchSelectionPayload(unittest.TestCase):
    def test_single_candidate_is_not_multi(self) -> None:
        payload = {"candidate_count": 1, "keywords": "直接50"}
        self.assertFalse(payload_is_multi_candidate(payload))

    def test_multi_candidate(self) -> None:
        payload = {"candidate_count": 14, "keywords": "三通50"}
        self.assertTrue(payload_is_multi_candidate(payload))

    def test_unwrap_nested_result(self) -> None:
        outer = {"success": True, "result": json.dumps({"candidate_count": 3})}
        inner = unwrap_tool_payload(outer)
        self.assertIsNotNone(inner)
        assert inner is not None
        self.assertEqual(inner["candidate_count"], 3)


class TestPostMatchNudge(unittest.TestCase):
    _dedupe_tmp: str | None = None

    def _run_nudge(self, hook_input: dict[str, object], *, fresh_session: bool = False) -> str:
        if fresh_session or self._dedupe_tmp is None:
            self._dedupe_tmp = tempfile.mkdtemp()
        env = os.environ.copy()
        env["SUBAGENT_GATE_LOG_DIR"] = self._dedupe_tmp
        proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-match-knowledge-nudge.py")],
            input=json.dumps(hook_input),
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        return proc.stdout.strip()

    def test_emits_context_for_multi_candidate(self) -> None:
        hook_input = {
            "session_id": "sess-test-1",
            "tool_name": "mcp__quotation__match_quotation",
            "tool_response": {
                "candidate_count": 14,
                "keywords": "三通50",
                "selection_context": {
                    "knowledge_source": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
                },
            },
        }
        output = json.loads(self._run_nudge(hook_input, fresh_session=True))
        self.assertIn("additionalContext", output["hookSpecificOutput"])
        ctx = output["hookSpecificOutput"]["additionalContext"]
        self.assertIn("Read 一次", ctx)
        self.assertIn("推荐价", ctx)
        self.assertIn("按 1A 格式", ctx)
        self.assertIn("8020020755", ctx)

    def test_dedupes_within_window(self) -> None:
        hook_input = {
            "session_id": "sess-test-dedupe",
            "tool_name": "mcp__quotation__match_quotation",
            "tool_response": {"candidate_count": 5, "keywords": "三通50"},
        }
        first = self._run_nudge(hook_input, fresh_session=True)
        second = self._run_nudge(hook_input)
        self.assertGreater(len(first), 0)
        self.assertEqual(second, "")


class TestPostPriceTiersNudge(unittest.TestCase):
    _dedupe_tmp: str | None = None

    def _run_nudge(self, hook_input: dict[str, object], *, fresh_session: bool = False) -> str:
        if fresh_session or self._dedupe_tmp is None:
            self._dedupe_tmp = tempfile.mkdtemp()
        env = os.environ.copy()
        env["SUBAGENT_GATE_LOG_DIR"] = self._dedupe_tmp
        proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-price-tiers-nudge.py")],
            input=json.dumps(hook_input),
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        return proc.stdout.strip()

    def test_emits_context_for_successful_tiers(self) -> None:
        hook_input = {
            "session_id": "sess-tiers-1",
            "tool_name": "mcp__quotation__get_product_price_tiers",
            "tool_response": {
                "code": "8020020755",
                "tier_count": 3,
                "tiers": [{"field": "price_b", "price": 1519}],
                "data_md_path": r"D:\CCB-Wanding\vendor\wanding\data\data.Md",
                "price_source": "bundled_seed",
                "price_stale": True,
            },
        }
        output = json.loads(self._run_nudge(hook_input, fresh_session=True))
        ctx = output["hookSpecificOutput"]["additionalContext"]
        self.assertIn("markdown", ctx)
        self.assertIn("没有内容", ctx)
        self.assertIn("8020020755", ctx)

    def test_skips_when_no_tiers(self) -> None:
        hook_input = {
            "session_id": "sess-tiers-empty",
            "tool_name": "mcp__quotation__get_product_price_tiers",
            "tool_response": {"found": False, "tier_count": 0, "tiers": []},
        }
        output = self._run_nudge(hook_input, fresh_session=True)
        self.assertEqual(output, "")

    def test_skips_wrong_tool(self) -> None:
        hook_input = {
            "session_id": "sess-tiers-wrong",
            "tool_name": "mcp__quotation__match_quotation",
            "tool_response": {"tier_count": 2},
        }
        output = self._run_nudge(hook_input, fresh_session=True)
        self.assertEqual(output, "")


class TestTranscriptKnowledgeGate(unittest.TestCase):
    def test_warn_when_multi_match_without_read(self) -> None:
        fixture = SKILL_ROOT / "tests/fixtures/transcripts/quotation-multi-no-read.jsonl"
        result = analyze_transcript(fixture)
        self.assertTrue(result["multi_match"])
        self.assertFalse(result["knowledge_read_after_match"])
        self.assertTrue(result["should_warn"])

    def test_pass_when_read_present(self) -> None:
        fixture = SKILL_ROOT / "tests/fixtures/transcripts/quotation-multi-with-read.jsonl"
        result = analyze_transcript(fixture)
        self.assertTrue(result["multi_match"])
        self.assertTrue(result["knowledge_read_after_match"])
        self.assertFalse(result["should_warn"])


if __name__ == "__main__":
    unittest.main()
