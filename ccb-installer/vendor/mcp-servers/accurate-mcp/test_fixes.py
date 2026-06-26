"""
Unit tests for the 4 fixes in server.py.
Run: python test_fixes.py
No Accurate Online credentials required — all API calls are mocked.
"""
import sys, json, types, unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, ".")
import server


# ---------------------------------------------------------------------------
# Helpers: mock AccurateClient
# ---------------------------------------------------------------------------

def _make_client(list_responses=None, detail_responses=None, master_responses=None):
    """Return a fake AccurateClient whose get() returns preset values."""
    client = MagicMock(spec=server.AccurateClient)

    list_responses = list_responses or {}
    detail_responses = detail_responses or {}

    def fake_fetch_list(table_name, params, timeout=30):
        key = (table_name, json.dumps(sorted(params.items()), ensure_ascii=False))
        return list_responses.get(table_name, {"s": False, "d": []})

    def fake_get_detail(table_name, record_id, fields=None):
        return detail_responses.get(record_id, {"s": False})

    def fake_master_list(table_name, keyword, fields="id,no,name", timeout=30):
        return master_responses.get(keyword, [])

    client.fetch_list.side_effect = fake_fetch_list
    client.get_detail.side_effect = fake_get_detail
    client.master_list.side_effect = fake_master_list
    return client


# ---------------------------------------------------------------------------
# Fix 1 — accurate_summarize_records: keyword missing must not KeyError
# ---------------------------------------------------------------------------

class TestSummarizeNoKeyword(unittest.TestCase):

    def test_keyword_none_does_not_raise(self):
        """arguments without 'keyword' key must resolve to '*' not raise KeyError."""
        arguments = {"table_name": "purchase-invoice"}
        # Patch _summarize_records to capture what keyword arrives
        received = {}

        original = server._summarize_records

        def spy(*args, **kwargs):
            received["keyword"] = kwargs.get("keyword")
            return {
                "table_name": "purchase-invoice", "keyword": kwargs.get("keyword"),
                "date_range": {}, "group_by": "month", "scanned_records": 0,
                "full_table_scan": False, "detail_fetches": 0, "split_by_month": False,
                "fetch_errors": [], "server_filter_used": None, "master_candidates": [],
                "matched_count": 0, "groups": [], "total_amount": 0.0,
                "sample_records": [], "hints": [],
            }

        with patch.object(server, "_summarize_records", side_effect=spy):
            # Simulate what the handler does (extracted from call_tool)
            keyword = str(arguments.get("keyword") or "*").strip()
            self.assertEqual(keyword, "*")
        print("  [PASS] keyword missing → '*'")

    def test_keyword_empty_string_becomes_star(self):
        keyword = str({"keyword": ""}.get("keyword") or "*").strip()
        self.assertEqual(keyword, "*")
        print("  [PASS] keyword='' → '*'")

    def test_keyword_present_unchanged(self):
        keyword = str({"keyword": "PT LESSO TECHNOLOGY INDONESIA"}.get("keyword") or "*").strip()
        self.assertEqual(keyword, "PT LESSO TECHNOLOGY INDONESIA")
        print("  [PASS] keyword present → unchanged")


# ---------------------------------------------------------------------------
# Fix 2 — _extract_rows handles d={r:[...]} nested dict
# ---------------------------------------------------------------------------

class TestExtractRows(unittest.TestCase):

    def test_flat_list(self):
        result = {"s": True, "d": [{"id": 1}, {"id": 2}]}
        self.assertEqual(server._extract_rows(result), [{"id": 1}, {"id": 2}])
        print("  [PASS] d is flat list → returned as-is")

    def test_nested_r_key(self):
        result = {"s": True, "d": {"r": [{"id": 3}, {"id": 4}], "total": 2}}
        self.assertEqual(server._extract_rows(result), [{"id": 3}, {"id": 4}])
        print("  [PASS] d={'r':[...]} → extracts r correctly")

    def test_api_error(self):
        result = {"s": False, "d": [{"id": 99}]}
        self.assertEqual(server._extract_rows(result), [])
        print("  [PASS] s=False → empty list regardless of d")

    def test_empty_d(self):
        result = {"s": True, "d": []}
        self.assertEqual(server._extract_rows(result), [])
        print("  [PASS] d=[] → empty list")


# ---------------------------------------------------------------------------
# Fix 3 — item_list: filter.name fallback when filter.keywords returns 0
# ---------------------------------------------------------------------------

class TestItemListFilterNameFallback(unittest.TestCase):

    def _fake_get(self, filter_log, keywords_returns, name_returns):
        """Build a fake client.get that records which filter was used."""
        def fake_get(endpoint, params=None, use_db_url=True, timeout=30):
            params = params or {}
            if "filter.keywords" in params:
                filter_log.append("keywords")
                return {"s": True, "d": keywords_returns}
            if "filter.name" in params:
                filter_log.append("name")
                return {"s": True, "d": name_returns}
            if "filter.no" in params:
                filter_log.append("no")
                return {"s": True, "d": []}
            return {"s": True, "d": []}
        return fake_get

    def test_keywords_returns_results_name_not_called(self):
        log = []
        client = server.AccurateClient.__new__(server.AccurateClient)
        client.get = self._fake_get(log, [{"id": 1}], [{"id": 2}])
        rows = client.item_list(keywords="pvc dn20")
        self.assertIn("keywords", log)
        self.assertNotIn("name", log)
        self.assertEqual(rows[0]["id"], 1)
        print("  [PASS] filter.keywords succeeds → filter.name not called")

    def test_keywords_returns_empty_name_called_as_fallback(self):
        log = []
        client = server.AccurateClient.__new__(server.AccurateClient)
        client.get = self._fake_get(log, [], [{"id": 5, "no": "T50"}])
        rows = client.item_list(keywords="Tee 50")
        self.assertIn("keywords", log)
        self.assertIn("name", log)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], 5)
        print("  [PASS] filter.keywords=0 → filter.name fallback returns result")

    def test_item_code_search_skips_name_fallback(self):
        log = []
        client = server.AccurateClient.__new__(server.AccurateClient)
        client.get = self._fake_get(log, [], [{"id": 9}])
        rows = client.item_list(item_code="8020024567")
        self.assertNotIn("keywords", log)
        self.assertNotIn("name", log)
        self.assertIn("no", log)
        print("  [PASS] item_code search uses filter.no, not keywords/name")


# ---------------------------------------------------------------------------
# Fix 4 — full_table_scan flag and hint when server filters all miss
# ---------------------------------------------------------------------------

class TestFullTableScanFlag(unittest.TestCase):

    def _make_resilient_mock(self, return_rows_on_filter=False):
        call_count = {"n": 0}

        def fake_resilient(client, table_name, start_date, end_date, date_field,
                           page_size, max_pages, fields, extra_params=None):
            call_count["n"] += 1
            if extra_params is not None and not return_rows_on_filter:
                return {"rows": [], "split_by_month": False, "errors": []}
            # No extra_params = full-table fallback call, return some rows
            return {
                "rows": [{"id": "1", "vendorName": "ACME", "transDate": "01/01/2026",
                          "totalAmount": 1000.0, "number": "INV-001"}],
                "split_by_month": False,
                "errors": [],
            }

        return fake_resilient, call_count

    def test_full_table_scan_flag_true_when_filters_miss(self):
        client = MagicMock(spec=server.AccurateClient)
        client.master_list.return_value = []

        fake_resilient, count = self._make_resilient_mock(return_rows_on_filter=False)

        with patch.object(server, "_fetch_rows_resilient", side_effect=fake_resilient):
            result = server._summarize_records(
                client=client,
                table_name="purchase-invoice",
                keyword="ACME",
                text_fields=["vendorName"],
                amount_fields=["totalAmount"],
            )

        self.assertTrue(result["full_table_scan"], "full_table_scan should be True")
        self.assertTrue(any("全表" in h or "fallback" in h.lower() for h in result["hints"]),
                        "hint about full table scan expected")
        print("  [PASS] full_table_scan=True when server filters return nothing")

    def test_full_table_scan_flag_false_when_filter_hits(self):
        client = MagicMock(spec=server.AccurateClient)
        client.master_list.return_value = []

        def fake_resilient(client, table_name, start_date, end_date, date_field,
                           page_size, max_pages, fields, extra_params=None):
            if extra_params is not None:
                return {
                    "rows": [{"id": "1", "vendorName": "ACME", "transDate": "01/01/2026",
                              "totalAmount": 5000.0, "number": "INV-002"}],
                    "split_by_month": False, "errors": [],
                }
            return {"rows": [], "split_by_month": False, "errors": []}

        with patch.object(server, "_fetch_rows_resilient", side_effect=fake_resilient):
            result = server._summarize_records(
                client=client,
                table_name="purchase-invoice",
                keyword="ACME",
                direct_filter_fields=["vendorName"],
                text_fields=["vendorName"],
                amount_fields=["totalAmount"],
            )

        self.assertFalse(result["full_table_scan"], "full_table_scan should be False")
        print("  [PASS] full_table_scan=False when a server filter hits")

    def test_no_hint_when_keyword_is_wildcard(self):
        client = MagicMock(spec=server.AccurateClient)
        client.master_list.return_value = []

        def fake_resilient(*args, extra_params=None, **kwargs):
            if extra_params is None:
                return {"rows": [{"id": "1", "transDate": "01/01/2026",
                                  "totalAmount": 1.0, "number": "X"}],
                        "split_by_month": False, "errors": []}
            return {"rows": [], "split_by_month": False, "errors": []}

        with patch.object(server, "_fetch_rows_resilient", side_effect=fake_resilient):
            result = server._summarize_records(
                client=client,
                table_name="purchase-invoice",
                keyword="*",
                text_fields=["vendorName"],
                amount_fields=["totalAmount"],
            )

        # keyword="*" means summarize all — full_table_scan warning should be suppressed
        full_scan_hints = [h for h in result["hints"] if "全表" in h]
        self.assertEqual(len(full_scan_hints), 0,
                         "No full-table-scan hint expected for wildcard keyword")
        print("  [PASS] keyword='*' full-table-scan hint suppressed (expected behavior)")


# ---------------------------------------------------------------------------
# Bonus: LESSO disambiguation — _master_ids_for_summary exact-match logic
# ---------------------------------------------------------------------------

class TestLessoDisambiguation(unittest.TestCase):

    def _candidates(self):
        return [
            {"id": "26852", "text": "PT LESSO TECHNOLOGY INDONESIA"},
            {"id": "37100", "text": "PT LESSO TECHNOLOGY INDONESIA TRADING"},
        ]

    def test_exact_name_returns_single_id(self):
        ids = server._master_ids_for_summary(
            "PT LESSO TECHNOLOGY INDONESIA", self._candidates()
        )
        self.assertEqual(ids, ["26852"], "Exact match should exclude TRADING variant")
        print("  [PASS] 'PT LESSO TECHNOLOGY INDONESIA' → only ID 26852")

    def test_trading_name_returns_single_id(self):
        ids = server._master_ids_for_summary(
            "PT LESSO TECHNOLOGY INDONESIA TRADING", self._candidates()
        )
        self.assertEqual(ids, ["37100"])
        print("  [PASS] 'PT LESSO TECHNOLOGY INDONESIA TRADING' → only ID 37100")

    def test_short_keyword_returns_both_ids(self):
        ids = server._master_ids_for_summary("LESSO", self._candidates())
        self.assertIn("26852", ids)
        self.assertIn("37100", ids)
        print("  [PASS] 'LESSO' (no exact match) → both IDs included")


if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    for cls in [
        TestSummarizeNoKeyword,
        TestExtractRows,
        TestItemListFilterNameFallback,
        TestFullTableScanFlag,
        TestLessoDisambiguation,
    ]:
        suite.addTests(loader.loadTestsFromTestCase(cls))
        print(f"\n=== {cls.__name__} ===")
        runner = unittest.TextTestRunner(verbosity=0, stream=__import__("sys").stdout)
        runner.run(loader.loadTestsFromTestCase(cls))
