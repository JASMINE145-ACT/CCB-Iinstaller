# Status — `07-09-idle-session-precipitation`

| Field | Value |
|-------|--------|
| **Status** | done (P2 unified mainline) |
| **Parent** | `07-09-work-routing-execution-contracts` |
| **Last updated** | 2026-07-09 |

## Unified mainline (single track)

```text
turnCompleted → 60s idle → precipitation_worker.py (LLM, separate process)
  → read full transcript + KB + workflow/profile
  → five-lane extract + dedup gates
  → Memory Inbox approve
  → promote: org KB API / personal / golden_path / eval (git)
```

**Stop hook (`ccb-personal-memory`) disabled** — no dual LLM / no auto-append on Stop.  
**LLM failure → no record** (no heuristic fallback).

## Done

- [x] LLM precipitation agent (`precipitation_thinking_client.py`)
- [x] Full transcript excerpt (user + assistant + tools)
- [x] Five-lane gates (`precipitation_gates.py`)
- [x] AionUI IPC + Memory Inbox + 60s debounce
- [x] Promotion on approve (all lanes)
- [x] Org API `append_business_rule` on business approve (`promote_business_rule.py` + dedup)
- [x] Eval path A: `merge-precipitation-eval.py` → `eval/agent_eval_cases.jsonl`
- [x] Stop hook no-op + tests updated (`test_trigger_quality` → worker direct)
- [x] registry `WANd.LEARNING.IDLE.001`（`agent-runtime-registry.yml`）

## Deferred (P3+)

- [ ] org `/api/eval-cases` cloud sync (see `research/eval-cloud-sync.md`)
- [ ] AC6 automated e2e (60s cancel / resume)
- [ ] `task.py validate` (AC0c)

## Verify

```powershell
.\ccb-installer\scripts\smoke-precipitation-dev.ps1
```

Or individually:

```powershell
python ccb-installer/config/skills/ccb-session-precipitation/tests/test_precipitation_worker.py
python ccb-installer/config/skills/ccb-personal-memory/tests/test_personal_memory_stop.py
python ccb-installer/config/skills/ccb-personal-memory/tests/test_trigger_quality.py
python -m pytest python/admin/test_org_knowledge_client.py::OrgKnowledgeClientTests::test_rule_already_in_doc_detects_duplicate -q
```

Manual E2E: AionUI ACP turn → wait 60s → Memory → 待沉淀 → approve (business needs org login).
