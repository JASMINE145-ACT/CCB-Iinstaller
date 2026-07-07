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
from unittest.mock import patch

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS / "lib"))

from match_selection_payload import payload_is_multi_candidate, unwrap_tool_payload  # noqa: E402
from parse_transcript_knowledge_gate import (  # noqa: E402
    analyze_transcript,
    derive_agent_transcript_path,
    hook_input_has_knowledge_read,
    mark_session_knowledge_read,
    session_has_knowledge_read_flag,
    transcript_has_knowledge_read,
)


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
        self.assertIn("不要再 Read", ctx)
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


class TestPreMatchKnowledgeGate(unittest.TestCase):
    def _run_pre_gate(self, hook_input: dict[str, object], *, transcript_lines: list[str] | None = None) -> str:
        with tempfile.TemporaryDirectory() as tmp:
            if transcript_lines is not None:
                transcript = Path(tmp) / "session.jsonl"
                transcript.write_text("\n".join(transcript_lines) + "\n", encoding="utf-8")
                hook_input = dict(hook_input)
                hook_input["transcript_path"] = str(transcript)
            proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
                input=json.dumps(hook_input),
                text=True,
                capture_output=True,
                env=os.environ.copy(),
                check=False,
            )
            self.assertEqual(proc.returncode, 0, msg=proc.stderr)
            return proc.stdout.strip()

    def test_denies_match_without_session_read(self) -> None:
        output = self._run_pre_gate(
            {"tool_name": "mcp__quotation__match_quotation", "transcript_path": ""},
            transcript_lines=[],
        )
        payload = json.loads(output)
        self.assertEqual(payload["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertIn("wanding_business_knowledge", payload["hookSpecificOutput"]["permissionDecisionReason"])

    def test_allows_match_after_session_read(self) -> None:
        read_line = json.dumps(
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Read",
                            "input": {
                                "file_path": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
                            },
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )
        output = self._run_pre_gate(
            {"tool_name": "mcp__quotation__match_quotation"},
            transcript_lines=[read_line],
        )
        self.assertEqual(output, "")

    def test_allows_non_match_tools(self) -> None:
        output = self._run_pre_gate({"tool_name": "mcp__quotation__get_inventory_by_code"})
        self.assertEqual(output, "")

    def test_allows_match_after_session_flag(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env["SUBAGENT_GATE_LOG_DIR"] = tmp
            proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
                input=json.dumps(
                    {
                        "tool_name": "mcp__quotation__match_quotation",
                        "session_id": "sess-flag-1",
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
                [sys.executable, str(SCRIPTS / "post-knowledge-read-mark.py")],
                input=json.dumps(
                    {
                        "tool_name": "Read",
                        "session_id": "sess-flag-1",
                        "tool_input": {
                            "file_path": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
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
                [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
                input=json.dumps(
                    {
                        "tool_name": "mcp__quotation__match_quotation",
                        "session_id": "sess-flag-1",
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
            session_id = "main-session"
            agent_id = "agent-abc"
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
                                    "file_path": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
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
                hook_input_has_knowledge_read(
                    {
                        "session_id": session_id,
                        "agent_id": agent_id,
                        "transcript_path": str(root / f"{session_id}.jsonl"),
                    }
                )
            )


class TestTranscriptKnowledgeGate(unittest.TestCase):
    def test_block_when_multi_match_without_read(self) -> None:
        fixture = SKILL_ROOT / "tests/fixtures/transcripts/quotation-multi-no-read.jsonl"
        result = analyze_transcript(fixture)
        self.assertTrue(result["price_match_in_turn"])
        self.assertTrue(result["multi_match"])
        self.assertFalse(result["knowledge_read_in_session"])
        self.assertTrue(result["should_block"])

    def test_pass_when_read_present(self) -> None:
        fixture = SKILL_ROOT / "tests/fixtures/transcripts/quotation-multi-with-read.jsonl"
        result = analyze_transcript(fixture)
        self.assertTrue(result["price_match_in_turn"])
        self.assertTrue(result["multi_match"])
        self.assertTrue(result["knowledge_read_in_session"])
        self.assertFalse(result["should_block"])

    def test_block_single_candidate_without_read(self) -> None:
        fixture = SKILL_ROOT / "tests/fixtures/transcripts/quotation-single-no-read.jsonl"
        result = analyze_transcript(fixture)
        self.assertTrue(result["price_match_in_turn"])
        self.assertFalse(result["multi_match"])
        self.assertTrue(result["should_block"])

    def test_stop_check_honors_session_flag(self) -> None:
        fixture = SKILL_ROOT / "tests/fixtures/transcripts/quotation-single-no-read.jsonl"
        with tempfile.TemporaryDirectory() as tmp:
            old = os.environ.get("SUBAGENT_GATE_LOG_DIR")
            os.environ["SUBAGENT_GATE_LOG_DIR"] = tmp
            try:
                mark_session_knowledge_read("stop-flag-session")
                result = analyze_transcript(
                    fixture,
                    session_id="stop-flag-session",
                )
            finally:
                if old is None:
                    os.environ.pop("SUBAGENT_GATE_LOG_DIR", None)
                else:
                    os.environ["SUBAGENT_GATE_LOG_DIR"] = old
            self.assertTrue(result["knowledge_read_in_session"])
            self.assertFalse(result["should_block"])


class TestKnowledgeEffectiveness(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.mkdtemp()
        self._env = os.environ.copy()
        os.environ["SUBAGENT_GATE_LOG_DIR"] = self._tmp

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    def test_denies_after_four_completed_matches(self) -> None:
        from knowledge_effectiveness import (  # noqa: E402
            MATCH_COUNT_LIMIT,
            increment_match_count,
            mark_knowledge_effective_read,
        )

        session_id = "sess-match-limit"
        mark_knowledge_effective_read(session_id)
        for _ in range(MATCH_COUNT_LIMIT):
            increment_match_count(session_id)

        read_line = json.dumps(
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Read",
                            "input": {
                                "file_path": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
                            },
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )
        proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
            input=json.dumps(
                {
                    "tool_name": "mcp__quotation__match_quotation",
                    "session_id": session_id,
                    "transcript_path": "",
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        payload = json.loads(proc.stdout)
        self.assertEqual(payload["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertIn("4", payload["hookSpecificOutput"]["permissionDecisionReason"])

    def test_append_business_rule_invalidates_next_match(self) -> None:
        mark_session_knowledge_read("sess-rule-invalidate")
        mark_proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-knowledge-read-mark.py")],
            input=json.dumps(
                {
                    "tool_name": "Read",
                    "session_id": "sess-rule-invalidate",
                    "tool_input": {
                        "file_path": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
                    },
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(mark_proc.returncode, 0, msg=mark_proc.stderr)

        invalidate_proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-business-rule-knowledge-invalidate.py")],
            input=json.dumps(
                {
                    "tool_name": "mcp__quotation__append_business_rule",
                    "session_id": "sess-rule-invalidate",
                    "tool_input": {"confirmed": True},
                    "tool_response": {"success": True, "applied": True},
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(invalidate_proc.returncode, 0, msg=invalidate_proc.stderr)

        deny_proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
            input=json.dumps(
                {
                    "tool_name": "mcp__quotation__match_quotation",
                    "session_id": "sess-rule-invalidate",
                    "transcript_path": "",
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(deny_proc.returncode, 0, msg=deny_proc.stderr)
        payload = json.loads(deny_proc.stdout)
        self.assertEqual(payload["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertIn("规则已变更", payload["hookSpecificOutput"]["permissionDecisionReason"])

    def test_kb_hash_change_denies_until_re_read(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            kb_path = Path(tmp) / "wanding_business_knowledge.md"
            kb_path.write_text("kb-version-1", encoding="utf-8")
            env = os.environ.copy()
            env["SUBAGENT_GATE_LOG_DIR"] = tmp
            env["WANDING_BUSINESS_KNOWLEDGE_PATH"] = str(kb_path)
            session_id = "sess-kb-hash"

            mark_proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "post-knowledge-read-mark.py")],
                input=json.dumps(
                    {
                        "tool_name": "Read",
                        "session_id": session_id,
                        "tool_input": {"file_path": str(kb_path)},
                    }
                ),
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(mark_proc.returncode, 0, msg=mark_proc.stderr)

            kb_path.write_text("kb-version-2", encoding="utf-8")
            deny_proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
                input=json.dumps(
                    {
                        "tool_name": "mcp__quotation__match_quotation",
                        "session_id": session_id,
                        "transcript_path": "",
                    }
                ),
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(deny_proc.returncode, 0, msg=deny_proc.stderr)
            deny_payload = json.loads(deny_proc.stdout)
            self.assertEqual(deny_payload["hookSpecificOutput"]["permissionDecision"], "deny")
            self.assertIn("更新", deny_payload["hookSpecificOutput"]["permissionDecisionReason"])

            mark_proc2 = subprocess.run(
                [sys.executable, str(SCRIPTS / "post-knowledge-read-mark.py")],
                input=json.dumps(
                    {
                        "tool_name": "Read",
                        "session_id": session_id,
                        "tool_input": {"file_path": str(kb_path)},
                    }
                ),
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(mark_proc2.returncode, 0, msg=mark_proc2.stderr)
            allow_proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
                input=json.dumps(
                    {
                        "tool_name": "mcp__quotation__match_quotation",
                        "session_id": session_id,
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

    def test_re_read_after_invalidate_resets_match_count(self) -> None:
        from knowledge_effectiveness import (  # noqa: E402
            MATCH_COUNT_LIMIT,
            increment_match_count,
            load_state,
            mark_knowledge_effective_read,
        )

        session_id = "sess-reread-reset"
        mark_knowledge_effective_read(session_id)
        for _ in range(MATCH_COUNT_LIMIT):
            increment_match_count(session_id)

        invalidate_proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-business-rule-knowledge-invalidate.py")],
            input=json.dumps(
                {
                    "tool_name": "mcp__quotation__append_business_rule",
                    "session_id": session_id,
                    "tool_input": {"confirmed": True},
                    "tool_response": {"success": True, "applied": True},
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(invalidate_proc.returncode, 0, msg=invalidate_proc.stderr)

        mark_proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-knowledge-read-mark.py")],
            input=json.dumps(
                {
                    "tool_name": "Read",
                    "session_id": session_id,
                    "tool_input": {
                        "file_path": r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
                    },
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(mark_proc.returncode, 0, msg=mark_proc.stderr)

        state = load_state(session_id)
        assert state is not None
        self.assertEqual(state.get("match_count_since_read"), 0)
        self.assertFalse(state.get("invalidated"))

        allow_proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "pre-match-knowledge-gate.py")],
            input=json.dumps(
                {
                    "tool_name": "mcp__quotation__match_quotation",
                    "session_id": session_id,
                    "transcript_path": "",
                }
            ),
            text=True,
            capture_output=True,
            env=os.environ.copy(),
            check=False,
        )
        self.assertEqual(allow_proc.returncode, 0, msg=allow_proc.stderr)
        self.assertEqual(allow_proc.stdout.strip(), "")


class TestConversationKnowledgeContinuity(unittest.TestCase):
    """K4/K5 — conversation-scoped SP2 inherit after soft refresh."""

    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self._prev_local = os.environ.get("LOCALAPPDATA")
        os.environ["LOCALAPPDATA"] = self._tmpdir.name

    def tearDown(self) -> None:
        if self._prev_local is None:
            os.environ.pop("LOCALAPPDATA", None)
        else:
            os.environ["LOCALAPPDATA"] = self._prev_local
        self._tmpdir.cleanup()

    def test_k4_conversation_inherit_same_hash_allows_match(self) -> None:
        from knowledge_effectiveness import (  # noqa: E402
            knowledge_is_effective,
            save_conversation_knowledge_state,
        )

        conversation_id = "conv-k4"
        kb_hash = "abc123same"
        save_conversation_knowledge_state(
            conversation_id,
            {
                "kb_content_hash": kb_hash,
                "read_at_generation": 5,
                "match_count_since_read": 1,
                "invalidated": False,
                "invalidated_reason": None,
            },
        )

        with patch(
            "knowledge_effectiveness.compute_kb_content_hash",
            return_value=kb_hash,
        ):
            effective, reason = knowledge_is_effective(
                {"session_id": "new-session", "conversation_id": conversation_id},
                transcript_has_read=False,
            )
        self.assertTrue(effective, msg=reason)
        self.assertEqual(reason, "")

    def test_k5_conversation_kb_hash_changed_denies_match(self) -> None:
        from knowledge_effectiveness import (  # noqa: E402
            knowledge_is_effective,
            save_conversation_knowledge_state,
        )

        conversation_id = "conv-k5"
        save_conversation_knowledge_state(
            conversation_id,
            {
                "kb_content_hash": "old-hash",
                "read_at_generation": 4,
                "match_count_since_read": 0,
                "invalidated": True,
                "invalidated_reason": "kb_hash_changed",
            },
        )

        with patch(
            "knowledge_effectiveness.compute_kb_content_hash",
            return_value="new-hash",
        ):
            effective, reason = knowledge_is_effective(
                {"session_id": "new-session", "conversation_id": conversation_id},
                transcript_has_read=True,
            )
        self.assertFalse(effective)
        self.assertEqual(reason, "kb_hash_changed")


if __name__ == "__main__":
    unittest.main()
