# Test record — Hook transcript parity matrix

**Task:** `07-07-quotation-match-acp-upstream-error` (Track B)  
**Date:** 2026-07-05  
**Status:** P5 GREEN (manual smoke pending)

## Matrix

| Hook | Test file | Case | Expected | Result | Notes |
|------|-----------|------|----------|--------|-------|
| `pre-match-knowledge-gate` | `test_knowledge_read_gate.py` | subagent derive | allow after Read in agent jsonl | ✅ | 17/17 |
| `pre-match-knowledge-gate` | same | session flag | allow without transcript | ✅ | post-knowledge-read-mark |
| `pre-price-library-data-md-gate` | `test_price_library_data_md_gate.py` | block without read | deny | ✅ | |
| `pre-price-library-data-md-gate` | same | subagent derive | allow | ✅ | P5B |
| `pre-price-library-data-md-gate` | same | session flag | allow | ✅ | P5B |
| `pre-price-library-data-md-gate` | subprocess | deny→mark→allow | PASS | ✅ | P5C |

## Command log

```text
python -m unittest discover -s ccb-installer/config/skills/ccb-subagent-gate/tests -q
# Ran 24 tests in ~2.7s — OK
```

## Manual smoke log

| Scenario | Session type | Steps | Pass? | Operator / date |
|----------|--------------|-------|-------|-----------------|
| Quotation knowledge | Guid 报价专家 新会话 | 查价→Read→再查价 | ⏳ | |
| Price library data.Md | 价格库 admin 新会话 | Read data.Md→upsert | ⏳ | |

## Review / deploy evidence

| Gate | ID / command | Result |
|------|--------------|--------|
| code-review | 0317d642 | PASS |
| unittest | discover -s …/tests -q | 24/24 OK |
| deploy | deploy-subagent-gate-skill.ps1 + deploy-seed-agents -ForceMd | OK |
