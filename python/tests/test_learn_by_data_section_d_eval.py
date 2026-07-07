# -*- coding: utf-8 -*-
"""Offline eval for learn-by-data Section D (D-mismatch ∪ D-gap) — isolated, no production writes."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from quotation.learn_by_data_mapping import check_learn_by_data_mapping_guards, section_d_trigger

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "data" / "smoke" / "learn-by-data-section-d-eval.xlsx"
MANIFEST = ROOT / "data" / "smoke" / "learn-by-data-section-d-eval.manifest.json"
SMOKE_SCRIPT = ROOT / "python" / "scripts" / "smoke_learn_by_data_section_d.py"
GENERATOR = ROOT / "python" / "scripts" / "generate_learn_by_data_section_d_eval_fixture.py"


@pytest.fixture
def section_d_manifest() -> dict:
    if not MANIFEST.is_file():
        pytest.skip(f"manifest missing — run {GENERATOR.relative_to(ROOT)}")
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def test_section_d_eval_manifest_has_four_scenarios(section_d_manifest: dict) -> None:
    scenarios = section_d_manifest.get("scenarios") or {}
    assert scenarios.get("d-gap") == 1
    assert scenarios.get("d-mismatch") == 1
    assert scenarios.get("d-skip-m2") == 1
    assert scenarios.get("d-skip-empty") == 1


def test_section_d_eval_manifest_trigger_expectations(section_d_manifest: dict) -> None:
    by_scenario = {row["scenario"]: row for row in section_d_manifest["rows"]}
    assert by_scenario["d-gap"]["expected_section_d_trigger"] == "gap"
    assert by_scenario["d-mismatch"]["expected_section_d_trigger"] == "mismatch"
    assert by_scenario["d-skip-m2"]["expected_section_d_trigger"] is None
    assert by_scenario["d-skip-empty"]["expected_section_d_trigger"] is None


def test_section_d_eval_manifest_rows_match_trigger_logic(section_d_manifest: dict) -> None:
    from inventory.config import config
    from inventory.services.mapping_table_matcher import load_mapping_df

    mapping_df = load_mapping_df(config.MAPPING_TABLE_PATH)
    for row in section_d_manifest["rows"]:
        keywords = row["keywords"]
        parts = keywords.split(" ", 1)
        inquiry_name = parts[0]
        inquiry_spec = parts[1] if len(parts) > 1 else ""
        agent_pick = str(row.get("agent_pick_for_eval") or "")
        actual = str(row.get("actual_code") or "")
        expected = row.get("expected_section_d_trigger")
        trigger = section_d_trigger(
            agent_pick_code=agent_pick,
            sheet_product_code=actual,
            inquiry_name=inquiry_name,
            inquiry_spec=inquiry_spec,
            mapping_df=mapping_df,
        )
        assert trigger == expected, f"row {row['row']} scenario {row['scenario']}"


def test_section_d_skip_m2_guard_skips_without_pending_write(section_d_manifest: dict) -> None:
    from inventory.config import config
    from inventory.services.mapping_table_matcher import load_mapping_df

    row = next(r for r in section_d_manifest["rows"] if r["scenario"] == "d-skip-m2")
    parts = row["keywords"].split(" ", 1)
    guard = check_learn_by_data_mapping_guards(
        inquiry_name=parts[0],
        inquiry_spec=parts[1] if len(parts) > 1 else "",
        sheet_product_code=row["actual_code"],
        source_file="eval-isolated.xlsx",
        source_sheet="Sheet1",
        source_row=row["row"],
        mapping_df=load_mapping_df(config.MAPPING_TABLE_PATH),
        pending_entries=[],
    )
    assert guard["action"] == "skip"
    assert guard["reason"] == "mapping_already_exists"


def test_section_d_offline_smoke_isolated_fixture() -> None:
    if not FIXTURE.is_file():
        pytest.skip(f"fixture missing — run {GENERATOR.relative_to(ROOT)}")
    proc = subprocess.run(
        [sys.executable, str(SMOKE_SCRIPT), str(FIXTURE), "--eval-manifest", str(MANIFEST)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    text = proc.stdout.strip()
    start = text.rfind('{\n  "fixture"')
    if start < 0:
        start = text.rfind("{")
    payload = json.loads(text[start:])
    assert payload["pass"] is True
    assert payload.get("gap_applied_n", 0) >= 1
    assert payload.get("mismatch_applied_n", 0) >= 1
    assert payload.get("skipped_or_rejected", 0) >= 2
