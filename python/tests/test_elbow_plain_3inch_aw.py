"""WANd.MATCH.ELBOW_PLAIN.001 — plain Elbow 3\" AW recalls DN75 AW 90° elbow."""
from __future__ import annotations

import inventory.services.wanding_fuzzy_matcher as matcher
from inventory.services.match_and_inventory import match_quotation_union
from inventory.services.wanding_fuzzy_matcher import _apply_knowledge_expansion

TARGET_CODE = "8010024354"


def setup_function() -> None:
    # Force re-load of field-matching rules after parser change / knowledge edits.
    matcher._FIELD_MATCHING_RULES_CACHE.clear()


def test_plain_elbow_knowledge_expansion_omits_threaded_terms() -> None:
    out = _apply_knowledge_expansion('Elbow 3" AW 3"')
    assert "丝扣弯头" not in out
    assert "螺纹弯头" not in out
    assert "内螺纹" not in out


def test_match_quotation_union_plain_elbow_3inch_aw_includes_dn75() -> None:
    candidates = match_quotation_union('Elbow 3" AW 3"', customer_level="B")
    codes = {str(c.get("code") or "") for c in candidates}
    assert TARGET_CODE in codes, f"expected {TARGET_CODE} in {[c.get('code') for c in candidates[:10]]}"
