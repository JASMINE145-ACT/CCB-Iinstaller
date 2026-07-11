#!/usr/bin/env python3
"""Unit tests for ccb-personal-memory Stop hook (unified precipitation: no-op)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL_ROOT / "scripts"
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "transcripts"
sys.path.insert(0, str(SCRIPTS / "lib"))

from memory_store import append_candidate  # noqa: E402
from parse_transcript_personal_memory import extract_candidates  # noqa: E402
from personal_memory_paths import log_path  # noqa: E402
from thinking_client import parse_entries  # noqa: E402


class TestPersonalMemoryStop(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.mkdtemp()
        self._config = Path(self._tmpdir) / ".claude"
        self._env = os.environ.copy()
        self._env["CCB_WANDING_CONFIG_DIR"] = str(self._config)
        self._workflow = self._config / "memory" / "personal" / "workflow.md"

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
        path = log_path(self._config)
        return path.read_text(encoding="utf-8") if path.is_file() else ""

    def test_stop_hook_is_noop_even_with_signal(self) -> None:
        transcript = FIXTURES / "workflow-signal.jsonl"
        proc = self._run_hook({"transcript_path": str(transcript), "hook_event_name": "Stop"})
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertFalse(self._workflow.is_file())
        self.assertIn("unified-precipitation-mainline", self._log_text())

    def test_no_signal_no_file_change(self) -> None:
        transcript = FIXTURES / "no-signal.jsonl"
        before = self._workflow.read_text(encoding="utf-8") if self._workflow.is_file() else ""
        proc = self._run_hook({"transcript_path": str(transcript), "hook_event_name": "Stop"})
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        after = self._workflow.read_text(encoding="utf-8") if self._workflow.is_file() else ""
        self.assertEqual(before, after)

    def test_dedup_existing_line_unchanged(self) -> None:
        self._workflow.parent.mkdir(parents=True, exist_ok=True)
        self._workflow.write_text(
            "- [2026-07-01] 我习惯先查库存再报价\n",
            encoding="utf-8",
        )
        transcript = FIXTURES / "dedup-existing.jsonl"
        proc = self._run_hook({"transcript_path": str(transcript), "hook_event_name": "Stop"})
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertEqual(self._workflow.read_text(encoding="utf-8").count("- ["), 1)

    def test_already_write_skips_append(self) -> None:
        transcript = FIXTURES / "already-write.jsonl"
        proc = self._run_hook({"transcript_path": str(transcript), "hook_event_name": "Stop"})
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertFalse(self._workflow.is_file())

    def test_subagent_stop_is_noop(self) -> None:
        transcript = FIXTURES / "subagent-stop.jsonl"
        proc = self._run_hook(
            {
                "agent_transcript_path": str(transcript),
                "hook_event_name": "SubagentStop",
                "agent_type": "quotation-agent",
            }
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertFalse(self._workflow.is_file())

    def test_business_signal_excluded(self) -> None:
        transcript = FIXTURES / "business-exclude.jsonl"
        proc = self._run_hook({"transcript_path": str(transcript), "hook_event_name": "Stop"})
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertFalse(self._workflow.is_file())

    def test_parse_entries_filters(self) -> None:
        entries = parse_entries(
            {
                "entries": [
                    {"target": "workflow", "text": "ok entry", "evidence": "ev", "confidence": 0.9},
                    {"target": "workflow", "text": "low", "evidence": "ev", "confidence": 0.2},
                    {"target": "workflow", "text": "no evidence", "confidence": 0.99},
                    {"target": "other", "text": "bad target", "evidence": "ev", "confidence": 0.9},
                    {"target": "profile", "text": "称呼陈工", "evidence": "叫我陈工", "confidence": 0.99},
                ]
            }
        )
        self.assertEqual(
            entries,
            [("workflow", "ok entry", "ev"), ("profile", "称呼陈工", "叫我陈工")],
        )

    def test_enqueue_async_returns_fast(self) -> None:
        env = self._env.copy()
        transcript = FIXTURES / "workflow-signal.jsonl"
        started = time.perf_counter()
        proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "post-personal-memory-stop.py")],
            input=json.dumps({"transcript_path": str(transcript), "hook_event_name": "Stop"}),
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )
        elapsed = time.perf_counter() - started
        self.assertEqual(proc.returncode, 0, msg=proc.stderr)
        self.assertLess(elapsed, 2.0)
        self.assertFalse(self._workflow.is_file())

    def test_concurrent_append_both_land(self) -> None:
        self._workflow.parent.mkdir(parents=True, exist_ok=True)
        self._workflow.write_text("# workflow\n", encoding="utf-8")
        errors: list[str] = []

        def worker(body: str) -> None:
            try:
                append_candidate("workflow", body, config_dir=self._config)
            except Exception as exc:  # noqa: BLE001
                errors.append(str(exc))

        threads = [
            threading.Thread(target=worker, args=("并发习惯 A",)),
            threading.Thread(target=worker, args=("并发习惯 B",)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        self.assertEqual(errors, [])
        text = self._workflow.read_text(encoding="utf-8")
        self.assertIn("并发习惯 A", text)
        self.assertIn("并发习惯 B", text)

    def test_extract_candidates_workflow_only(self) -> None:
        items = extract_candidates(FIXTURES / "workflow-signal.jsonl")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].target, "workflow")

    def test_employee_profile_dedup(self) -> None:
        profile_json = self._config / "employee-profile.json"
        profile_json.parent.mkdir(parents=True, exist_ok=True)
        profile_json.write_text(
            json.dumps({"displayName": "祐嘉诚", "department": "IP 部门"}, ensure_ascii=False),
            encoding="utf-8",
        )
        appended = append_candidate(
            "profile",
            "我是祐嘉诚，在 IP 部门",
            config_dir=self._config,
        )
        self.assertFalse(appended)


if __name__ == "__main__":
    unittest.main()
