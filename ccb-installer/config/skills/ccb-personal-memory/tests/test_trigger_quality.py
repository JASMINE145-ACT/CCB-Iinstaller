#!/usr/bin/env python3
"""Trigger gate + extraction quality tests (task 07-06 memory-trigger-extraction-quality).

Covers R1 (signal gate), R2 (incremental watermark + cooldown), R3 (evidence
validation), R4 (semantic near-dup), R5 (business veto tightening), R6 (profile
path), R7 (observability), R8 (job hygiene).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL_ROOT / "scripts"
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "transcripts"
sys.path.insert(0, str(SCRIPTS / "lib"))

from learning_status import read_status  # noqa: E402

AGED_ISO = "2020-01-01T00:00:00+00:00"


class TriggerQualityBase(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = Path(tempfile.mkdtemp())
        self._config = self._tmpdir / ".claude"
        self._env = os.environ.copy()
        self._env["CCB_WANDING_CONFIG_DIR"] = str(self._config)
        self._env["CCB_PERSONAL_MEMORY_SYNC"] = "1"
        self._env["CCB_PERSONAL_MEMORY_FORCE_FALLBACK"] = "1"
        self._env.pop("CCB_PERSONAL_MEMORY_THINKING_MOCK", None)
        self._workflow = self._config / "memory" / "personal" / "workflow.md"
        self._profile = self._config / "memory" / "personal" / "profile.md"
        self._jobs = self._config / "memory" / "jobs"
        self._status = self._config / "memory" / ".learning-status.json"
        self._state = self._config / "memory" / ".learning-state.json"
        self._log = self._config / "logs" / "personal-memory-stop.log"

    def _run_hook(self, hook_input: dict[str, object]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPTS / "post-personal-memory-stop.py")],
            input=json.dumps(hook_input),
            text=True,
            capture_output=True,
            env=self._env,
            check=False,
        )

    def _log_text(self) -> str:
        return self._log.read_text(encoding="utf-8") if self._log.is_file() else ""

    def _workflow_text(self) -> str:
        return self._workflow.read_text(encoding="utf-8") if self._workflow.is_file() else ""

    def _copy_fixture(self, name: str) -> Path:
        dest = self._tmpdir / name
        shutil.copy(FIXTURES / name, dest)
        return dest

    def _append_jsonl(self, path: Path, user_text: str) -> None:
        lines = [
            json.dumps(
                {"type": "user", "message": {"role": "user", "content": user_text}},
                ensure_ascii=False,
            ),
            json.dumps(
                {
                    "type": "assistant",
                    "message": {
                        "role": "assistant",
                        "content": [{"type": "text", "text": "好的。"}],
                    },
                },
                ensure_ascii=False,
            ),
        ]
        with path.open("a", encoding="utf-8", newline="\n") as handle:
            for line in lines:
                handle.write(line + "\n")

    def _age_cooldown(self) -> None:
        data = json.loads(self._state.read_text(encoding="utf-8"))
        for entry in data.get("sessions", {}).values():
            if isinstance(entry, dict) and entry.get("lastRunAt"):
                entry["lastRunAt"] = AGED_ISO
        self._state.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def _write_mock(self, entries: list[dict[str, object]]) -> None:
        mock = self._tmpdir / "mock.json"
        mock.write_text(
            json.dumps({"entries": entries}, ensure_ascii=False),
            encoding="utf-8",
        )
        self._env.pop("CCB_PERSONAL_MEMORY_FORCE_FALLBACK", None)
        self._env["CCB_PERSONAL_MEMORY_THINKING_MOCK"] = str(mock)


class TestTriggerGate(TriggerQualityBase):
    """R1/R2/R7/R8 — hook-side gating, watermark, cooldown, hygiene."""

    def test_no_signal_creates_no_job_no_status(self) -> None:
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "no-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-nosig",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertEqual(list(self._jobs.glob("*.json")) if self._jobs.is_dir() else [], [])
        self.assertIsNone(read_status(self._config))
        self.assertIn("skip: no-signal", self._log_text())

    def test_second_stop_without_new_lines_skips(self) -> None:
        transcript = self._copy_fixture("workflow-signal.jsonl")
        hook_input = {
            "transcript_path": str(transcript),
            "hook_event_name": "Stop",
            "session_id": "sess-inc",
        }
        self.assertEqual(self._run_hook(hook_input).returncode, 0)
        self.assertEqual(self._workflow_text().count("- ["), 1)
        self._age_cooldown()
        self.assertEqual(self._run_hook(hook_input).returncode, 0)
        self.assertIn("skip: no-new-lines", self._log_text())
        self.assertEqual(self._workflow_text().count("- ["), 1)

    def test_second_stop_processes_only_new_lines(self) -> None:
        transcript = self._copy_fixture("workflow-signal.jsonl")
        hook_input = {
            "transcript_path": str(transcript),
            "hook_event_name": "Stop",
            "session_id": "sess-inc2",
        }
        self.assertEqual(self._run_hook(hook_input).returncode, 0)
        self._append_jsonl(transcript, "我习惯导出 Excel 前先核对行数")
        self._age_cooldown()
        self.assertEqual(self._run_hook(hook_input).returncode, 0)
        text = self._workflow_text()
        self.assertIn("导出 Excel 前先核对行数", text)
        self.assertEqual(text.count("我习惯先查库存再报价"), 1)
        self.assertEqual(text.count("- ["), 2)

    def test_cooldown_window_skips(self) -> None:
        transcript = self._copy_fixture("workflow-signal.jsonl")
        hook_input = {
            "transcript_path": str(transcript),
            "hook_event_name": "Stop",
            "session_id": "sess-cool",
        }
        self.assertEqual(self._run_hook(hook_input).returncode, 0)
        self._append_jsonl(transcript, "我习惯导出 Excel 前先核对行数")
        self.assertEqual(self._run_hook(hook_input).returncode, 0)
        self.assertIn("skip: cooldown", self._log_text())
        self.assertNotIn("导出 Excel", self._workflow_text())

    def test_job_file_removed_after_run(self) -> None:
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "workflow-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-job",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertIn("我习惯先查库存", self._workflow_text())
        self.assertEqual(list(self._jobs.glob("*.json")), [])

    def test_stale_jobs_cleaned_on_enqueue(self) -> None:
        self._jobs.mkdir(parents=True, exist_ok=True)
        stale = self._jobs / "stale.json"
        stale.write_text("{}", encoding="utf-8")
        old = time.time() - 8 * 24 * 3600
        os.utime(stale, (old, old))
        self._run_hook(
            {
                "transcript_path": str(FIXTURES / "no-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-stale",
            }
        )
        self.assertFalse(stale.exists())

    def test_learn_run_logs_and_status_last_entries(self) -> None:
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "workflow-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-obs",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        log = self._log_text()
        self.assertIn("learn:", log)
        self.assertIn("source=heuristic", log)
        status = read_status(self._config)
        assert status is not None
        self.assertEqual(status.get("status"), "done")
        entries = status.get("lastEntries")
        self.assertIsInstance(entries, list)
        self.assertTrue(any("我习惯先查库存" in str(e) for e in entries or []))


class TestExtractionQuality(TriggerQualityBase):
    """R3/R4/R5/R6 — evidence validation, near-dup, business veto, profile."""

    def test_supplier_habit_not_vetoed(self) -> None:
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "supplier-habit.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-sup",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertIn("我习惯先查供应商库存再报价", self._workflow_text())

    def test_discount_instruction_still_vetoed(self) -> None:
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "discount-veto.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-disc",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertNotIn("折", self._workflow_text())
        self.assertFalse(self._workflow.is_file())

    def test_entry_without_evidence_rejected(self) -> None:
        self._write_mock(
            [{"target": "workflow", "text": "报价之前先看一次库存", "confidence": 0.95}]
        )
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "workflow-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-noev",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertNotIn("报价之前先看一次库存", self._workflow_text())

    def test_entry_with_unlocatable_evidence_rejected(self) -> None:
        self._write_mock(
            [
                {
                    "target": "workflow",
                    "text": "报价之前先看一次库存",
                    "evidence": "今天天气很好适合出去玩",
                    "confidence": 0.95,
                }
            ]
        )
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "workflow-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-badev",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertNotIn("报价之前先看一次库存", self._workflow_text())

    def test_trivial_short_text_rejected(self) -> None:
        self._write_mock(
            [
                {
                    "target": "workflow",
                    "text": "查库存",
                    "evidence": "我习惯先查库存再报价",
                    "confidence": 0.95,
                }
            ]
        )
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "workflow-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-short",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertNotIn("查库存", self._workflow_text())

    def test_near_duplicate_candidate_rejected(self) -> None:
        self._workflow.parent.mkdir(parents=True, exist_ok=True)
        self._workflow.write_text(
            "- [2026-07-01] 先查库存然后再报价\n",
            encoding="utf-8",
        )
        self._write_mock(
            [
                {
                    "target": "workflow",
                    "text": "先查库存再报价",
                    "evidence": "我习惯先查库存再报价",
                    "confidence": 0.95,
                }
            ]
        )
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "workflow-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-dup",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertEqual(self._workflow_text().count("- ["), 1)

    def test_profile_candidate_appends_to_profile_md(self) -> None:
        self._write_mock(
            [
                {
                    "target": "profile",
                    "text": "用户是采购部的陈工，称呼「陈工」",
                    "evidence": "我是采购部的老陈，以后叫我陈工就行",
                    "confidence": 0.95,
                }
            ]
        )
        proc = self._run_hook(
            {
                "transcript_path": str(FIXTURES / "profile-signal.jsonl"),
                "hook_event_name": "Stop",
                "session_id": "sess-prof",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        profile_text = self._profile.read_text(encoding="utf-8") if self._profile.is_file() else ""
        self.assertIn("称呼「陈工」", profile_text)
        self.assertFalse(self._workflow.is_file())


class TestUnitHelpers(TriggerQualityBase):
    """Direct unit coverage for tightened veto + near-dup helper."""

    def test_is_business_dominant_tiers(self) -> None:
        from parse_transcript_personal_memory import is_business_dominant

        self.assertFalse(is_business_dominant("我习惯先查供应商库存再报价"))
        self.assertTrue(is_business_dominant("给这个客户的折扣按9折"))
        self.assertTrue(is_business_dominant("客户的报价单先同步给供应商"))
        self.assertTrue(is_business_dominant("含税价按新口径算"))

    def test_claim_window_second_claim_hits_cooldown(self) -> None:
        """The gate is atomic: once claimed, an immediate re-claim (any transcript
        of the same session) must fall into cooldown — this is what prevents
        concurrent SubagentStop double-extraction (R2)."""
        from learning_state import claim_window

        first = claim_window(
            self._config,
            "sess-claim",
            "sess-claim|a.jsonl",
            count_lines=lambda: 10,
            has_signal=lambda processed: True,
        )
        self.assertEqual(first.decision, "claimed")
        self.assertEqual(first.start_line, 0)
        self.assertEqual(first.total_lines, 10)
        second = claim_window(
            self._config,
            "sess-claim",
            "sess-claim|b.jsonl",
            count_lines=lambda: 20,
            has_signal=lambda processed: True,
        )
        self.assertEqual(second.decision, "cooldown")

    def test_claim_window_no_signal_advances_watermark_without_cooldown(self) -> None:
        from learning_state import claim_window

        skipped = claim_window(
            self._config,
            "sess-nsw",
            "sess-nsw|a.jsonl",
            count_lines=lambda: 5,
            has_signal=lambda processed: False,
        )
        self.assertEqual(skipped.decision, "no-signal")
        # Watermark advanced (screened lines never rescanned) but lastRunAt was
        # not touched, so the next hook is gated by the watermark, not cooldown.
        again = claim_window(
            self._config,
            "sess-nsw",
            "sess-nsw|a.jsonl",
            count_lines=lambda: 5,
            has_signal=lambda processed: True,
        )
        self.assertEqual(again.decision, "no-new-lines")

    def test_memory_store_near_duplicate(self) -> None:
        from memory_store import append_candidate

        self._workflow.parent.mkdir(parents=True, exist_ok=True)
        self._workflow.write_text(
            "- [2026-07-01] 我习惯先查库存然后再报价\n",
            encoding="utf-8",
        )
        appended = append_candidate(
            "workflow",
            "我习惯先查库存再报价",
            config_dir=self._config,
        )
        self.assertFalse(appended)
        distinct = append_candidate(
            "workflow",
            "导出 Excel 前我习惯先核对行数",
            config_dir=self._config,
        )
        self.assertTrue(distinct)


if __name__ == "__main__":
    unittest.main()
