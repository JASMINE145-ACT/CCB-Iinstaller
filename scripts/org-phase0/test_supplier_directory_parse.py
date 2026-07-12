# -*- coding: utf-8 -*-
"""Unit tests for supplier directory HTML parse + name_key (seed contract)."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

from supplier_directory_parse import (
    default_html_path,
    extract_distance_km,
    flat_products,
    load_html,
    normalize_name_key,
    parse_suppliers_from_html,
    parse_vehicles_from_html,
    products_summary,
    split_products_grouped,
)


class TestNormalize(unittest.TestCase):
    def test_ascii_lower_collapse(self):
        self.assertEqual(normalize_name_key("  HAKUNA  "), "hakuna")

    def test_cjk_preserved(self):
        self.assertEqual(normalize_name_key("双林"), "双林")


class TestDistance(unittest.TestCase):
    def test_extract_km(self):
        km, notes = extract_distance_km("距仓库约17km")
        self.assertEqual(km, 17)
        self.assertEqual(notes, "")

    def test_extract_km_with_trailing_entity(self):
        km, notes = extract_distance_km("PT. Ling Wei Gong Cheng Jianzhu Maoyi")
        self.assertIsNone(km)
        self.assertIn("Ling Wei", notes)


class TestProducts(unittest.TestCase):
    def test_grouped_no_leading_delimiters_in_summary(self):
        raw = ";;双壁波纹管;;双壁波纹管 内径ID100-600mm;;螺旋缠绕管;;螺旋缠绕管 内径ID800"
        grouped = split_products_grouped(raw)
        summary = products_summary(raw, grouped)
        self.assertNotIn(";;", summary)
        self.assertIn("双壁波纹管", summary)

    def test_flat_products(self):
        items = flat_products("钢管、方管、镀锌方管")
        self.assertEqual(len(items), 3)


class TestParseHtml(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = default_html_path()
        if not path.is_file():
            raise unittest.SkipTest(f"missing {path}")
        cls.html = load_html(path)

    def test_supplier_count_and_keys(self):
        rows = parse_suppliers_from_html(self.html)
        self.assertGreaterEqual(len(rows), 27)
        names = {r["name_zh"] for r in rows}
        self.assertIn("双林", names)
        self.assertIn("HAKUNA", names)
        self.assertIn("三信", names)
        keys = [r["name_key"] for r in rows]
        self.assertEqual(len(keys), len(set(keys)), "duplicate name_key")

    def test_shuanglin_address(self):
        rows = parse_suppliers_from_html(self.html)
        row = next(r for r in rows if r["name_zh"] == "双林")
        self.assertIn("KITIC DELTAMAS", row["address"])
        self.assertIn("Bekasi", row["address"])
        self.assertEqual(row["distance_km"], 70)
        self.assertNotIn(";;", row["products_summary"])

    def test_gsmi_distance(self):
        rows = parse_suppliers_from_html(self.html)
        row = next(r for r in rows if r["name_zh"] == "GSMI")
        self.assertEqual(row["distance_km"], 17)

    def test_lingwei_overlay_locations(self):
        rows = parse_suppliers_from_html(self.html)
        row = next(r for r in rows if r["name_zh"] == "凌威")
        locs = json.loads(row["locations_json"])
        self.assertEqual(len(locs), 2)
        self.assertEqual(row["distance_km"], 7)
        self.assertIn("PT. Ling Wei", row["notes"])

    def test_all_field_keys_present(self):
        rows = parse_suppliers_from_html(self.html)
        row = rows[0]
        for key in (
            "spec",
            "tech_params",
            "material",
            "price_note",
            "moq",
            "lead_days",
            "qualification",
            "products_json",
            "locations_json",
        ):
            self.assertIn(key, row)

    def test_seed_version_two(self):
        rows = parse_suppliers_from_html(self.html)
        self.assertEqual(rows[0]["seed_version"], 2)

    def test_vehicles_ten(self):
        rows = parse_vehicles_from_html(self.html)
        self.assertEqual(len(rows), 10)
        self.assertEqual(rows[0]["seed_key"], "lalamove:1")
        self.assertEqual(rows[-1]["seed_key"], "lalamove:10")


if __name__ == "__main__":
    unittest.main()
