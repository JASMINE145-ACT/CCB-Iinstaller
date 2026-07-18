# 执行计划 — 报价合并名录 + learn-by-data + 知识库整理

| Field | Value |
|-------|--------|
| **Status** | **done** |
| **Scenario** | B → Phase 3 **K** |
| **Plan depth** | Full |
| **Verification profile** | UI + Standard |
| **Publish readiness** | slug1 **published** center **v14**（CONF ⚠️ 仍在稿内） |
| **Active phase** | closed |
| **Completed** | 2026-07-14（用户 UI Save + finish） |

---

## 已拍板（简练）

**Agent 方案 A / learn-by-data：** Phase 1–2 **done**。

**知识库 Phase 3：** slug1 Layer1 UI Save → center **v14** = shadow **v14**；7 slug deferred；CONF ⚠️ 保留待定稿。

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | org-knowledge / matcher |
| Phase 3 审核 | Read: | `research/phase3-kb-review-gates.md` |
| UI Save 核验 | Shell: | `get_doc` v14；shadow org-meta v14；rules=15 |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase 1 | **done** | DUAL.001 |
| Phase 2 | **done** | PRECIPITATE.001 |
| Phase 3a–3b | **done** | Layer1 seed + parser + tests |
| Phase 3c | **deferred** | CONF 书面定稿 |
| Phase 3d–3e | **done** | UI Save；`smoke-evidence.md` v14 |
| Phase 3f | **deferred** | 其余 7 slug |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.TRADE.SOURCING.DUAL.001` | 同轮价+货源 | quotation-agent | smoke DUAL | **PASS** |
| `WANd.LEARN.PRECIPITATE.001` | A/B/C/D | learn-by-data SKILL | smoke PRECIPITATE | **PASS** |
| `WANd.KB.CANONICAL.001` | inventory；slug1 可回滚 | kb-inventory + org | smoke-evidence Step 3 | **PASS（slug1）** |
| `WANd.KB.LAYER1.SCHEMA.001` | §0–§10；CONF 显式；同义解析 | wanding_business_knowledge + matcher | pytest + v14 sync | **PASS** |
| `WANd.ROUTING.SUPPLIER_DIR.001` | 产品找厂→报价卡 | registry | Guid | **PASS** |

---

## Workstreams

| Phase | P | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|---|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | P0 | dual-call + supplier 移除 | WANd.TRADE.SOURCING.DUAL.001 | routing | done | quotation-agent | Guid smoke | Cross-repo |
| 2 | P0 | learn-by-data A/B/C/D | WANd.LEARN.PRECIPITATE.001 | kb | done | SKILL.md | smoke | Standard |
| 3 | P0 | Layer1 重组 + UI Save | WANd.KB.LAYER1.SCHEMA.001 | kb | done | data/wanding_business_knowledge.md | center v14 | UI |
| 3 | P1 | inventory slug1 | WANd.KB.CANONICAL.001 | kb | done | kb-inventory.md | slug1 only | Standard |
| — | P2 | CONF 定稿 / 7 slug | docs-only/no-runtime-contract | kb | deferred | — | 另开 | — |

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Parser | LAYER1.SCHEMA.001 | 无【】时旧解析 rules=0 | `pytest python/test_knowledge_field_matching_parse.py` | 4 passed |
| Publish | KB.CANONICAL.001 | center≠shadow | get_doc + org-meta both **v14** | smoke-evidence |

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| DUAL.001 | smoke.md §DUAL | 用户 Guid | **PASS** |
| PRECIPITATE.001 | smoke.md §PRECIPITATE | 用户 | **PASS** |
| LAYER1.SCHEMA.001 | pytest + shadow rules=15 | p3b-local-seed-parser-done | **PASS** |
| KB.CANONICAL.001 | get_doc v14 == org-meta v14 | smoke-evidence.md | **PASS（slug1）** |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-13-trade-sourcing-knowledge-consolidation/execution-plan.md` | PASS | pending |

---

## 下一步（非阻塞）

CONF-001/002 定稿；7 slug；append template（P2）。
