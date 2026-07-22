#!/usr/bin/env python3
"""Unit tests for precipitation_outcome atomic writer."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_LIB = Path(__file__).resolve().parents[1] / "scripts" / "lib"
sys.path.insert(0, str(SCRIPT_LIB))

from precipitation_outcome import read_run_outcome, write_run_outcome  # noqa: E402


class TestPrecipitationOutcome(unittest.TestCase):
    def test_write_and_read_proposals(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp)
            path = write_run_outcome(
                config,
                run_id="turn-1",
                session_id="sess-a",
                conversation_id="conv-a",
                lease_id="lease-1",
                review_through_turn_id="turn-1",
                outcome="proposals",
                proposal_count=2,
            )
            self.assertTrue(path.is_file())
            data = read_run_outcome(config, "turn-1")
            assert data is not None
            self.assertEqual(data["outcome"], "proposals")
            self.assertEqual(data["proposalCount"], 2)
            self.assertEqual(data["leaseId"], "lease-1")
            self.assertFalse(data["retryable"])

    def test_retryable_error_default(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp)
            write_run_outcome(
                config,
                run_id="t2",
                session_id="s",
                outcome="retryable_error",
                error_code="llm_failed",
            )
            data = read_run_outcome(config, "t2")
            assert data is not None
            self.assertTrue(data["retryable"])
            self.assertEqual(data["errorCode"], "llm_failed")

    def test_atomic_replace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp)
            write_run_outcome(config, run_id="t3", session_id="s", outcome="no_proposals")
            write_run_outcome(
                config,
                run_id="t3",
                session_id="s",
                outcome="proposals",
                proposal_count=1,
            )
            raw = (config / "learning" / "precipitation_runs" / "t3.outcome.json").read_text(
                encoding="utf-8"
            )
            data = json.loads(raw)
            self.assertEqual(data["outcome"], "proposals")


if __name__ == "__main__":
    unittest.main()
