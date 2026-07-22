"""Unit tests for select_quotation_candidates validation (no live LLM)."""
from __future__ import annotations

import json
import os
import unittest
from unittest import mock

from quotation.select_dispatch import handle_select_quotation_candidates, validate_selections


ITEMS = [
    {
        "keywords": "直接50",
        "candidates": [
            {"code": "8020020755", "matched_name": "直通 PVC-U", "unit_price": 1219},
            {"code": "8010071381", "matched_name": "PPR 直通", "unit_price": 7604},
        ],
    },
    {
        "keywords": "三通50",
        "candidates": [
            {"code": "8020020343", "matched_name": "等径三通", "unit_price": 2929},
            {"code": "8020022823", "matched_name": "异径三通", "unit_price": 100},
        ],
    },
]


class TestSelectQuotationCandidates(unittest.TestCase):
    def test_ok_when_codes_in_candidates(self) -> None:
        raw = {
            "status": "ok",
            "selections": [
                {"keywords": "直接50", "code": "8020020755", "reason": "口语直接50默认排水直通"},
                {"keywords": "三通50", "code": "8020020343", "reason": "等径顺水三通 dn50"},
            ],
        }
        out = validate_selections(ITEMS, raw)
        self.assertEqual(out["status"], "ok")
        self.assertEqual([s["code"] for s in out["selections"]], ["8020020755", "8020020343"])

    def test_rejects_code_outside_candidates(self) -> None:
        raw = {
            "status": "ok",
            "selections": [
                {"keywords": "直接50", "code": "NOT-REAL", "reason": "错误编码"},
                {"keywords": "三通50", "code": "8020020343", "reason": "等径三通"},
            ],
        }
        out = validate_selections(ITEMS, raw)
        self.assertEqual(out["status"], "unable_to_select")
        self.assertEqual(out["error_code"], "CODE_NOT_IN_CANDIDATES")

    def test_rejects_duplicate_keyword_coverage(self) -> None:
        raw = {
            "status": "ok",
            "selections": [
                {"keywords": "直接50", "code": "8020020755", "reason": "排水直通"},
                {"keywords": "直接50", "code": "8010071381", "reason": "重复关键词"},
            ],
        }
        out = validate_selections(ITEMS, raw)
        self.assertEqual(out["status"], "unable_to_select")
        self.assertEqual(out["error_code"], "SELECTION_COVERAGE_MISMATCH")

    def test_handle_with_injected_llm(self) -> None:
        def fake_llm(_system: str, _user: str):
            return {
                "status": "ok",
                "selections": [
                    {"keywords": "直接50", "code": "8020020755", "reason": "排水直通默认"},
                    {"keywords": "三通50", "code": "8020020343", "reason": "等径三通默认"},
                ],
            }

        out = handle_select_quotation_candidates(
            {"items": ITEMS},
            llm_caller=fake_llm,
        )
        self.assertEqual(out["status"], "ok")
        self.assertEqual(out["selections"][0]["unit_price"], 1219)

    def test_mock_env_json(self) -> None:
        mock_payload = {
            "status": "ok",
            "selections": [
                {"keywords": "直接50", "code": "8020020755", "reason": "mock 选型直接"},
                {"keywords": "三通50", "code": "8020020343", "reason": "mock 选型三通"},
            ],
        }
        with mock.patch.dict(os.environ, {"QUOTATION_SELECT_MOCK_JSON": json.dumps(mock_payload)}):
            out = handle_select_quotation_candidates({"items": ITEMS})
        self.assertEqual(out["status"], "ok")

    def test_unwraps_dollar_text_candidates(self) -> None:
        """Live agents sometimes pass match rows as {\"$text\": \"{...json...}\"}."""
        wrapped = {
            "items": [
                {
                    "keywords": "直接50",
                    "candidates": [
                        {
                            "$text": json.dumps(
                                {
                                    "code": "8020020755",
                                    "matched_name": "直通 PVC-U",
                                    "unit_price": 1219,
                                },
                                ensure_ascii=False,
                            )
                        },
                        {
                            "$text": json.dumps(
                                {
                                    "code": "8010071381",
                                    "matched_name": "PPR 直通",
                                    "unit_price": 7604,
                                },
                                ensure_ascii=False,
                            )
                        },
                    ],
                }
            ]
        }
        mock_payload = {
            "status": "ok",
            "selections": [
                {"keywords": "直接50", "code": "8020020755", "reason": "默认排水直通"},
            ],
        }
        with mock.patch.dict(os.environ, {"QUOTATION_SELECT_MOCK_JSON": json.dumps(mock_payload)}):
            out = handle_select_quotation_candidates(wrapped)
        self.assertEqual(out["status"], "ok")
        self.assertEqual(out["selections"][0]["code"], "8020020755")
        self.assertEqual(out["selections"][0]["unit_price"], 1219)


if __name__ == "__main__":
    unittest.main()
