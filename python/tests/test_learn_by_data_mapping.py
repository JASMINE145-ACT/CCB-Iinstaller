"""Tests for learn-by-data Section D mapping helpers."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from quotation.learn_by_data_mapping import (
    append_mapping_pending_row,
    build_learn_by_data_mapping_row,
    check_learn_by_data_mapping_guards,
    is_d_mismatch_row,
    is_section_d_eligible,
    load_mapping_pending_entries,
    mapping_has_keyword_code,
    mapping_search_text,
    normalized_mapping_key,
    section_d_trigger,
)
from quotation.mapping_pending_dispatch import handle_append_quotation_mapping_pending


def test_is_d_mismatch_row() -> None:
    assert is_d_mismatch_row(agent_pick_code="801", sheet_product_code="802")
    assert not is_d_mismatch_row(agent_pick_code="801", sheet_product_code="801")
    assert is_d_mismatch_row(agent_pick_code="", sheet_product_code="802")
    assert not is_d_mismatch_row(agent_pick_code="801", sheet_product_code="")


def test_section_d_trigger_mismatch_and_gap() -> None:
    empty_df = pd.DataFrame()
    assert section_d_trigger(agent_pick_code="801", sheet_product_code="802") == "mismatch"
    assert section_d_trigger(
        agent_pick_code="8030050068",
        sheet_product_code="8030050068",
        inquiry_name="PVC线管",
        inquiry_spec="20",
        mapping_df=empty_df,
    ) == "gap"
    assert section_d_trigger(
        agent_pick_code="8030050068",
        sheet_product_code="8030050068",
        inquiry_name="PVC线管",
        inquiry_spec="20",
        mapping_df=pd.DataFrame(
            [
                {
                    "search_text": "PVC线管 20",
                    "code": "8030050068",
                    "matched_name": "existing",
                    "norm_text": "pvc线管 20",
                    "spec_tokens": frozenset(),
                }
            ]
        ),
    ) is None
    assert not is_section_d_eligible(
        agent_pick_code="8030050068",
        sheet_product_code="8030050068",
        inquiry_name="PVC线管",
        inquiry_spec="20",
        mapping_df=pd.DataFrame(
            [
                {
                    "search_text": "PVC线管 20",
                    "code": "8030050068",
                    "matched_name": "existing",
                    "norm_text": "pvc线管 20",
                    "spec_tokens": frozenset(),
                }
            ]
        ),
    )
    assert mapping_has_keyword_code(
        pd.DataFrame(
            [
                {
                    "search_text": "PVC线管 20",
                    "code": "8030050068",
                    "matched_name": "existing",
                    "norm_text": "pvc线管 20",
                    "spec_tokens": frozenset(),
                }
            ]
        ),
        inquiry_name="PVC线管",
        inquiry_spec="20",
        sheet_product_code="8030050068",
    )


def test_build_learn_by_data_mapping_row_from_sheet_columns() -> None:
    row = build_learn_by_data_mapping_row(
        inquiry_name="PVC线管",
        inquiry_spec="20",
        sheet_product_code="8030050068",
        quote_name="PVC电线管(B级)白色 dn20",
        source_file="PO 韩总7.1报价单 .xlsx",
        source_sheet="Sheet1",
        source_row=8,
        agent_pick_code="8030020808",
    )
    assert row["product_code"] == "8030050068"
    assert row["quotation_name"] == "PVC电线管(B级)白色 dn20"
    assert row["search_text"] == mapping_search_text("PVC线管", "20")


def test_guard_skips_existing_mapping() -> None:
    df = pd.DataFrame(
        [
            {
                "search_text": "PVC线管 20",
                "code": "8030050068",
                "matched_name": "existing",
                "norm_text": "pvc线管 20",
                "spec_tokens": frozenset(),
            }
        ]
    )
    result = check_learn_by_data_mapping_guards(
        inquiry_name="PVC线管",
        inquiry_spec="20",
        sheet_product_code="8030050068",
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=8,
        mapping_df=df,
        pending_entries=[],
    )
    assert result["action"] == "skip"
    assert result["reason"] == "mapping_already_exists"


def test_guard_confirm_overwrite_on_keyword_conflict() -> None:
    df = pd.DataFrame(
        [
            {
                "search_text": "50卷波纹管 DN20",
                "code": "8010062265",
                "matched_name": "old",
                "norm_text": normalized_mapping_key("50卷波纹管", "DN20"),
                "spec_tokens": frozenset(),
            }
        ]
    )
    result = check_learn_by_data_mapping_guards(
        inquiry_name="50卷波纹管",
        inquiry_spec="DN20",
        sheet_product_code="8030020808",
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=10,
        mapping_df=df,
        pending_entries=[],
    )
    assert result["action"] == "confirm_overwrite"
    assert result["existing_product_code"] == "8010062265"


def test_guard_rejects_invalid_product_code(monkeypatch) -> None:
    monkeypatch.setattr("quotation.learn_by_data_mapping.sheet_product_code_is_valid", lambda _c: False)
    result = check_learn_by_data_mapping_guards(
        inquiry_name="PVC线管",
        inquiry_spec="20",
        sheet_product_code="9999999999",
        source_file="quote.xlsx",
        source_sheet="Sheet1",
        source_row=8,
        mapping_df=pd.DataFrame(),
        pending_entries=[],
    )
    assert result["action"] == "reject"
    assert result["reason"] == "invalid_sheet_product_code"


def test_append_pending_and_dispatch_preview(tmp_path: Path, monkeypatch) -> None:
    pending = tmp_path / "mapping_import_pending.jsonl"
    monkeypatch.setattr("quotation.learn_by_data_mapping.resolve_mapping_pending_path", lambda: pending)
    monkeypatch.setattr("quotation.mapping_pending_dispatch.load_mapping_pending_entries", lambda: [])
    monkeypatch.setattr("admin.org_mapping_client.is_org_mapping_configured", lambda: False)

    preview = handle_append_quotation_mapping_pending(
        {
            "inquiry_name": "PVC直通",
            "inquiry_spec": "20",
            "product_code": "8030020288",
            "quotation_name": "管直通",
            "source_file": "quote.xlsx",
            "source_sheet": "Sheet1",
            "source_row": 9,
            "confirmed": False,
        }
    )
    assert preview["requires_confirmation"] is True
    assert preview["proposed_row"]["product_code"] == "8030020288"

    applied = handle_append_quotation_mapping_pending(
        {
            "inquiry_name": "PVC直通",
            "inquiry_spec": "20",
            "product_code": "8030020288",
            "quotation_name": "管直通",
            "source_file": "quote.xlsx",
            "source_sheet": "Sheet1",
            "source_row": 9,
            "confirmed": True,
        }
    )
    assert applied["applied"] is True
    entries = load_mapping_pending_entries(pending)
    assert len(entries) == 1
    assert entries[0]["row"]["product_code"] == "8030020288"


def test_pending_rejects_duplicate_source_row(tmp_path: Path, monkeypatch) -> None:
    pending = tmp_path / "mapping_import_pending.jsonl"
    monkeypatch.setattr("quotation.learn_by_data_mapping.sheet_product_code_is_valid", lambda _c: True)
    append_mapping_pending_row(
        {
            "inquiry_name": "A",
            "inquiry_spec": "",
            "product_code": "8030050068",
            "quotation_name": "n",
            "source_file": "q.xlsx",
            "source_sheet": "S1",
            "source_row": 8,
        },
        path=pending,
    )
    monkeypatch.setattr(
        "quotation.mapping_pending_dispatch.load_mapping_pending_entries",
        lambda: load_mapping_pending_entries(pending),
    )

    result = handle_append_quotation_mapping_pending(
        {
            "product_code": "8030020288",
            "source_file": "q.xlsx",
            "source_sheet": "S1",
            "source_row": 8,
            "confirmed": False,
        }
    )
    assert result["applied"] is False
    assert result["guard"]["reason"] == "duplicate_source_provenance"
