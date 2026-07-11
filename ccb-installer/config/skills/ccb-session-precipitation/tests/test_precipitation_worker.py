#!/usr/bin/env python3
"""Tests for LLM bundle gates and precipitation extraction."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

SCRIPT_LIB = Path(__file__).resolve().parents[1] / "scripts" / "lib"
import sys

sys.path.insert(0, str(SCRIPT_LIB))

from parse_transcript_precipitation import (  # noqa: E402
    extract_proposals,
    iter_user_messages,
    kb_overlap,
)
from precipitation_gates import bundle_to_proposals  # noqa: E402
from precipitation_store import append_proposals, list_pending, record_decision  # noqa: E402


class TestPrecipitationExtract(unittest.TestCase):
    def test_workflow_habit(self) -> None:
        lines = [
            json.dumps(
                {
                    "type": "user",
                    "message": {"role": "user", "content": "我习惯先查库存再报价，以后都这样。"},
                },
                ensure_ascii=False,
            )
        ]
        proposals = extract_proposals(
            lines=lines,
            session_id="s1",
            conversation_id="c1",
            kb_text="",
            workflow_text="",
            user_acknowledged=True,
        )
        lanes = {p["lane"] for p in proposals}
        self.assertIn("personal_habit", lanes)

    def test_kb_duplicate_skipped(self) -> None:
        self.assertEqual(kb_overlap("直接50默认A系列白色", "直接50默认A系列白色排水"), "duplicate")

    def test_llm_bundle_all_lanes(self) -> None:
        bundle = {
            "skipped": False,
            "lanes": {
                "business_rules": [
                    {
                        "summary": "新品类默认用B系列",
                        "evidence": ["用户说默认B系列"],
                        "confidence": 0.8,
                        "kb_overlap_hint": "none",
                    }
                ],
                "personal_habits": [
                    {
                        "bullet": "报价前先查库存",
                        "target": "workflow",
                        "evidence": ["我习惯先查库存"],
                        "confidence": 0.75,
                    }
                ],
                "golden_paths": [
                    {
                        "description": "委派报价 agent",
                        "tool_sequence": ["Agent(quotation-agent)"],
                        "user_ack": "explicit",
                        "confidence": 0.7,
                    }
                ],
                "eval_cases": [
                    {
                        "category": "routing",
                        "agent": "wande-orchestrator",
                        "input": "帮我查价",
                        "expected_tools": ["Agent"],
                        "must_not": ["mcp__quotation__match_quotation"],
                        "confidence": 0.7,
                    }
                ],
            },
        }
        proposals = bundle_to_proposals(
            bundle,
            session_id="s1",
            conversation_id="c1",
            kb_text="",
            workflow_text="",
            user_acknowledged=True,
        )
        lanes = {p["lane"] for p in proposals}
        self.assertEqual(
            lanes,
            {"business_rule", "personal_habit", "golden_path", "eval_case"},
        )

    def test_decision_archives_pending(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp)
            append_proposals(
                config,
                [
                    {
                        "lane": "personal_habit",
                        "title": "test",
                        "content": "bullet",
                        "evidence": ["e"],
                        "sessionId": "s",
                        "conversationId": "c",
                    }
                ],
            )
            pending = list_pending(config)
            self.assertEqual(len(pending), 1)
            ok = record_decision(config, proposal_id=pending[0]["id"], action="approve")
            self.assertTrue(ok)
            self.assertEqual(len(list_pending(config)), 0)

    def test_heuristic_force_raises(self) -> None:
        """Production worker must not fall back to heuristic extraction."""
        import importlib.util
        import os

        worker_path = Path(__file__).resolve().parents[1] / "scripts" / "precipitation_worker.py"
        sys.path.insert(0, str(worker_path.parent / "lib"))
        spec = importlib.util.spec_from_file_location("precipitation_worker", worker_path)
        mod = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(mod)

        prev = os.environ.get("CCB_PRECIPITATION_FORCE_HEURISTIC")
        os.environ["CCB_PRECIPITATION_FORCE_HEURISTIC"] = "1"
        try:
            with self.assertRaises(RuntimeError):
                mod._extract_proposals_llm(  # noqa: SLF001
                    config_dir=Path(tempfile.mkdtemp()),
                    lines=[json.dumps({"type": "user", "message": {"role": "user", "content": "x"}})],
                    session_id="s",
                    conversation_id="c",
                    kb_text="",
                    workflow_text="",
                    profile_text="",
                    user_acknowledged=True,
                )
        finally:
            if prev is None:
                os.environ.pop("CCB_PRECIPITATION_FORCE_HEURISTIC", None)
            else:
                os.environ["CCB_PRECIPITATION_FORCE_HEURISTIC"] = prev


if __name__ == "__main__":
    unittest.main()
