# -*- coding: utf-8 -*-
from __future__ import annotations

import unittest
from unittest.mock import patch

from quotation.fill_enrich import (
    enrich_fill_item,
    extract_brand_from_chinese,
    extract_brand_from_english,
    extract_satuan_from_text,
    infer_default_satuan,
    resolve_quote_specification,
)


class TestFillEnrich(unittest.TestCase):
    def test_extract_brand_from_english(self) -> None:
        self.assertEqual(
            extract_brand_from_english("PVC-U ELBOW DN50 UPVC - LESSO"),
            "LESSO",
        )

    def test_extract_brand_from_chinese(self) -> None:
        self.assertEqual(
            extract_brand_from_chinese("正三通印尼(日标)PVC-U管件 联塑"),
            "联塑",
        )

    def test_extract_satuan_from_chinese(self) -> None:
        self.assertEqual(extract_satuan_from_text("PE 管 125mm/6m 根"), "根")

    @patch("quotation.spec_extract.extract_spec_from_quote_name_llm", return_value="dn50")
    def test_resolve_quote_specification_uses_llm_when_agent_spec_bad(self, _mock_llm) -> None:
        name = "直通(管箍)PVC-U排水配件白色 dn50"
        spec = resolve_quote_specification(name, "50 (管箍) PVC-U")
        self.assertEqual(spec, "dn50")

    @patch("quotation.spec_extract.extract_spec_from_quote_name_llm", return_value="dn50")
    def test_resolve_quote_specification_avoids_full_name(self, _mock_llm) -> None:
        name = "直通(管箍)PVC-U排水配件白色 dn50"
        spec = resolve_quote_specification(name, name)
        self.assertEqual(spec, "dn50")

    def test_resolve_quote_specification_keeps_good_agent_spec(self) -> None:
        self.assertEqual(resolve_quote_specification("any name", "dn110"), "dn110")

    @patch("quotation.spec_extract.extract_spec_from_quote_name_llm", return_value="dn50")
    def test_enrich_fill_item_from_price_row(self, _mock_llm) -> None:
        enriched = enrich_fill_item(
            {
                "row": 8,
                "code": "8020020755",
                "quote_name": "直通(管箍)PVC-U排水配件白色 dn50",
                "unit_price": 1519,
                "qty": 1,
                "specification": "50 (管箍) PVC-U",
            },
            price_row={
                "description_english": "PVC-U Coupling DN50 White - LESSO",
                "matched_name": "直通(管箍)PVC-U排水配件白色 dn50",
            },
            inquiry_unit="个",
        )
        self.assertEqual(enriched["indonesian_name"], "PVC-U Coupling DN50 White - LESSO")
        self.assertEqual(enriched["brand"], "LESSO")
        self.assertEqual(enriched["satuan"], "个")
        self.assertEqual(enriched["specification"], "dn50")

    def test_enrich_overrides_chinese_indonesian_name_with_english(self) -> None:
        enriched = enrich_fill_item(
            {
                "row": 8,
                "code": "8020020755",
                "quote_name": "直通(管箍)PVC-U排水配件白色 dn50",
                "indonesian_name": "直通(管箍)PVC-U排水配件白色 dn50",
                "unit_price": 1519,
                "qty": 1,
            },
            price_row={
                "description_english": "PVC-U Coupling DN50 White - LESSO",
            },
        )
        self.assertEqual(enriched["indonesian_name"], "PVC-U Coupling DN50 White - LESSO")

    def test_infer_default_satuan_pe_pipe(self) -> None:
        self.assertEqual(
            infer_default_satuan(
                "给水用聚乙烯HDPE直管(1.6MPa)黑色 dn25 6M (ISO 21003)",
                "25mm ISO 21003",
                "PE 管 pipe",
            ),
            "根",
        )

    def test_enrich_fill_item_pe_pipe_gets_satuan(self) -> None:
        enriched = enrich_fill_item(
            {
                "row": 14,
                "code": "8010036529",
                "quote_name": "给水用聚乙烯HDPE直管(1.6MPa)黑色 dn25 6M (ISO 21003)",
                "unit_price": 31391,
                "qty": 1,
                "specification": "25mm ISO 21003",
            },
            inquiry_spec="25mm ISO 21003",
            inquiry_unit="",
        )
        self.assertEqual(enriched["satuan"], "根")


if __name__ == "__main__":
    unittest.main()
