"""Unit tests for knowledge-field synonym expansion parsing (WANd.KB.LAYER1.SCHEMA.001)."""
from __future__ import annotations

from pathlib import Path

from inventory.services.wanding_fuzzy_matcher import (
    _apply_knowledge_expansion,
    _parse_field_matching_rules_from_content,
)

REPO_KB = Path(__file__).resolve().parents[1] / "data" / "wanding_business_knowledge.md"


def test_parse_bracket_header_section():
    md = """
## other
- ignore → skip

## 【字段匹配同义与规格】
- half bend 半弯 → 45°弯头
- hose 软管 → 软管

## 8) next
- foo → bar
"""
    rules = _parse_field_matching_rules_from_content(md)
    assert len(rules) == 2
    assert rules[0][0] == ["half", "bend", "半弯"]
    assert "45°弯头" in rules[0][1]


def test_parse_markdown_header_without_brackets():
    """Legacy heading without 【】 must still parse (latent bug fix)."""
    md = """
## 6) 字段匹配同义与规格
- welding machine 热熔器 → 焊接机
- conduit electrical 电线管 → 电线管 B管

## 7) 待处理
- x → y
"""
    rules = _parse_field_matching_rules_from_content(md)
    assert len(rules) == 2
    assert any("热熔器" in src for sources, _targets in rules for src in sources)
    assert any("焊接机" in tgt for _sources, targets in rules for tgt in targets)


def test_repo_seed_knowledge_parses_enough_rules():
    content = REPO_KB.read_text(encoding="utf-8")
    rules = _parse_field_matching_rules_from_content(content)
    assert len(rules) >= 10, f"expected >=10 synonym rules, got {len(rules)}"


def test_apply_expansion_uses_parsed_rules(monkeypatch):
    md = """
## 【字段匹配同义与规格】
- elbow drat drat → 丝扣弯头 螺纹弯头
"""
    monkeypatch.setattr(
        "inventory.services.wanding_fuzzy_matcher._load_field_matching_rules_from_knowledge",
        lambda: _parse_field_matching_rules_from_content(md),
    )
    out = _apply_knowledge_expansion("Elbow drat 1/2")
    assert "丝扣弯头" in out or "螺纹弯头" in out


def test_slash_separates_source_phrases_not_tokens():
    """WANd.MATCH.FIELD_RULE_PARSE.001 — `/` keeps multi-word phrases intact."""
    md = """
## 【字段匹配同义与规格】
- elbow drat / drat → 丝扣弯头 螺纹弯头
- elbow 弯 → 弯头
"""
    rules = _parse_field_matching_rules_from_content(md)
    by_targets = {tuple(t): s for s, t in rules}
    threaded = by_targets[("丝扣弯头", "螺纹弯头")]
    assert threaded == ["elbow drat", "drat"]
    assert "elbow" not in threaded
    assert "/" not in threaded
    plain = by_targets[("弯头",)]
    assert plain == ["elbow", "弯"]


def test_plain_elbow_does_not_inherit_drat_slash_rule(monkeypatch):
    """Bare Elbow must not match source phrase 'elbow drat' via token 'elbow'."""
    md = """
## 【字段匹配同义与规格】
- elbow drat / drat → 丝扣弯头 螺纹弯头
- elbow 弯 → 弯头
"""
    monkeypatch.setattr(
        "inventory.services.wanding_fuzzy_matcher._load_field_matching_rules_from_knowledge",
        lambda: _parse_field_matching_rules_from_content(md),
    )
    plain = _apply_knowledge_expansion('Elbow 3" AW 3"')
    assert "丝扣弯头" not in plain
    assert "螺纹弯头" not in plain
    assert "弯头" in plain
    drat = _apply_knowledge_expansion('Elbow drat 1/2" AW')
    assert "丝扣弯头" in drat or "螺纹弯头" in drat
