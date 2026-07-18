# Phase 3b+ — local seed + parser fix (2026-07-14)

| Field | Value |
|-------|--------|
| **Contracts** | `WANd.KB.LAYER1.SCHEMA.001` |
| **Center UI Save** | **NOT done**（CONF blocked） |

## Changed

| Path | Change |
|------|--------|
| `data/wanding_business_knowledge.md` | Layer1 重组写入 **repo seed**；CONF ⚠️ 保留 |
| `data/wanding_business_knowledge.restructured.md` | 与 seed 同步 |
| `python/.../wanding_fuzzy_matcher.py` | `_parse_field_matching_rules_from_content`；兼容无【】 markdown 标题 |
| `python/test_knowledge_field_matching_parse.py` | 4 tests |

## Verification

| Gate | Result |
|------|--------|
| code-reviewer | **PASS** — Layer A PASS, Layer B N/A |
| pytest | `python/test_knowledge_field_matching_parse.py` → **4 passed** |

## Still blocked

CONF-001 / CONF-002 → UI Save → `smoke-evidence.md` center/shadow/Guid
