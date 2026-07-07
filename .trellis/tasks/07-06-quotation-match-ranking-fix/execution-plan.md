# Execution Plan — `07-06-quotation-match-ranking-fix`

| Field | Value |
|-------|--------|
| **Status** | implemented (P1 only; P2/P3 declined) |
| **Scenario** | **C** (bug — wrong `candidates[0]` vs known-good Agent behavior) |
| **Plan depth** | **Standard** |
| **Verification profile** | **Standard** (pytest + code-review + optional manual MCP smoke) |
| **Repos** | `claude-code-best` (`python/`, `data/`, tests); spec/skill notes in `ccb-installer` vertical package |

**PRD:** [`prd.md`](./prd.md)

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `get_context.py --mode packages` → layers backend, frontend, integration |
| trellis-task-execution + skill-selection | Read: | Scenario C playbook; matrix §6 Debug → systematic-debugging |
| Spec trace | Read: | `quotation-matching-engine.md` §2 chain, §4 source, §9 selection_owner |
| Code trace | Read: | `match_dispatch.py`, `match_and_inventory._rank_compatible_candidates`, `_split_tokens`, `llm_selector` (legacy path only) |
| User evidence | — | Screenshot 选型理由 rows 8–10; batch table rows 9–10 wrong [0] |
| systematic-debugging | Read: (discipline) | `research/ranking-root-cause.md` H1–H6 |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 — Repro tests (RED) | pending | `test_quotation_match_ranking_fix.py` |
| P1 — Rank contract (共同 + source) | pending | `_compat_sort_key` / unified sort |
| P2 — Category + token | pending | 波纹管 / conduit / 50卷 |
| P3 — History dampening | pending | 历史 vs 字段 family conflict |
| P4 — Rule dedupe (safety) | pending | `append_business_rule` |
| P5 — Gate + spec | pending | review + pytest + `quotation-matching-engine.md` |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | Read: trellis-before-dev | available | `quotation-matching-engine.md` |
| Debug discipline | Read: superpowers:systematic-debugging | available | `research/ranking-root-cause.md` |
| Implement | Agent: trellis-implement | available | inline after 执行task |
| Review | Agent: code-reviewer | available | trellis-check |
| Test | pytest `python/tests/` | available | `test_lesso_dn_spec_fix.py` pattern |
| Live price lib | org API / local xlsx | available | skip live if CI uses fixture |

---

## Goal alignment (user intent)

> 「正常查询这样才是正确的 — 只需要修复这个」

| Layer | Today (broken for batch) | Target |
|-------|--------------------------|--------|
| Engine `candidates[0]` | Semantic fuzzy beats 共同 / wrong 历史 | Same SKU as knowledgeable Agent (screenshot) |
| Agent session | Often correct via knowledge Read | Unchanged — engine should not depend on it |
| learn-by-data | Compares `[0]` | Passes when engine fixed (no skill change required for MVP) |

---

## Phase 0 — RED regression anchors (no behavior change yet)

| Step | File | Cases |
|------|------|-------|
| R1 | `python/tests/test_quotation_match_ranking_fix.py` | `PVC线管 20` → `8030050068` |
| R2 | same | `PVC直接 20` → `8030020288` |
| R3 | same | `50卷波纹管 DN20` → `8030020808` |

Pattern: mirror `test_lesso_dn_spec_fix.py` — `match_quotation_union` → `candidates[0]["code"]`.

**Required output:** pytest FAIL on rows 9–10 before fix; row 8 PASS (guard).

---

## Phase 1 — Ranking contract (P0 fix)

**Problem:** `_compat_sort_key` uses `(penalty, -bonus, source_rank)` — semantic dominates.

**Change (minimal):**

```text
Option A (recommended): (penalty, source_rank, -bonus, -fuzzy_score)
Option B: large fixed boost when source == 共同 (+1.0 on compat_bonus cap)
```

| File | Action |
|------|--------|
| `python/inventory/services/match_and_inventory.py` | `_compat_sort_key` / `_rank_compatible_candidates` |
| `python/quotation/selection_payloads.py` | Document that `candidates` order == engine rank (no re-sort) |

**Risk:** `packaging` — may reorder other queries; full pytest suite + row 8 guard.

**Required output:** R2 passes if 8030020288 is 共同 in union result.

---

## Phase 2 — Category + token (P1)

| WS | Trigger | Files | Change |
|----|---------|-------|--------|
| **2A Token** | `50卷波纹管` | `wanding_fuzzy_matcher._split_tokens` | Strip qty+unit prefix (`N卷`) before Chinese tokenization; keep `波纹管` whole |
| **2B Fitting** | 波纹管 queries | `_query_fitting`, `_product_fitting` | Add `corrugated` / `波纹管`; hard-filter 直管/给水管 when query has 波纹管 |
| **2C Conduit** | `PVC直接` without 给水 | `_hard_filter_and_bonus` or usage | Prefer 电工套管 family when `PVC` + coupling token and no `给水`/`AW` in keywords |
| **2D Pre-filter** | legacy path only | `llm_selector._apply_candidate_pre_filter` | `has_corrugated` ← `波纹管` (not only 双壁波纹管) — if inventory_agent_tools still used |

**Required output:** R3 GREEN; manual: `match_quotation_batch` row 10 `[0]` = 8030020808.

---

## Phase 3 — History vs field conflict (P1)

When **only one path** hit correct family:

| Condition | Action |
|-----------|--------|
| Top 历史报价 name contains 给水/PPR/PE 盘管 | And query has 波纹管/线管/电工套管 semantics → **demote** 历史 rank or hard-drop |
| 共同 exists for any candidate | **Never** rank 字段-only above 共同 (Phase 1) |

Optional: score mapping path with same `_hard_filter_and_bonus` on mapping `matched_name` before merge.

**Risk:** `external-api` — mapping table content varies; tests use live lib like `test_lesso_dn_spec_fix`.

---

## Phase 4 — Boundary · Safety · Stability (user-requested)

### 4.1 Boundary (what we will / won't change)

| In scope | Out of scope |
|----------|--------------|
| Python engine rank + hard filters | Remapping entire Neon `product_mapping` |
| `append_business_rule` dedupe | Auto-writing org knowledge without `confirmed=true` |
| Regression tests for 3 keywords | Changing learn-by-data to compare `chosen` (defer) |
| Spec § ranking contract update | Re-enabling MCP internal LLM selector |

### 4.2 Safety

| Measure | Implementation |
|---------|----------------|
| **拒绝重复规则导入** | `append_business_rule`: normalize rule text (strip, collapse ws, lower); if equivalent rule exists in doc content → return `{skipped: true, reason: "duplicate"}` **without** `update_doc` |
| **No silent tier writes** | learn-by-data Section C unchanged — metadata only, `confirmed=false` first |
| **Confirmed gate** | Keep `confirmed=true` required for org write (existing) |
| **Version conflict** | Keep `expected_version` on `update_doc` — concurrent edits fail loud |

### 4.3 Stability

| Measure | Why |
|---------|-----|
| **Pinned regression tests** | 3 keywords + row 8 guard — any rank tweak must pass |
| **Sort key change isolated** | One function `_compat_sort_key` — easy revert |
| **No new env flag for MVP** | Avoid dual behavior in prod; use tests not feature flags |
| **Backward compat** | `inventory_agent_tools` path: align sort if still called from non-MCP agents |
| **Cache invalidation** | After deploy: `invalidate_wanding_cache()` documented in smoke note only |

### 4.4 Operational

- Deploy: quotation MCP Python only — `route-b` sync if `D:\claude-code-B` copy needed for installed WanD.
- learn-by-data reruns safe after dedupe — won't bloat `wanding_business_knowledge.md`.

---

## Phase 5 — Verification gate (single chain)

**Profile:** Standard

1. **RED** — `pytest python/tests/test_quotation_match_ranking_fix.py` fails rows 9–10
2. **Implement** P1 → P3 (serial)
3. **GREEN** — same pytest + existing `test_lesso_dn_spec_fix.py` pass
4. **Agent: code-reviewer** PASS
5. **Manual (optional):** `match_quotation_batch` keywords rows 8–10, `show_candidates=true` — compare `[0]` to PRD table
6. **trellis-update-spec** — `quotation-matching-engine.md` §4/§7 rank order
7. `implement.jsonl` + `check.jsonl`

---

## Manual smoke (human)

```text
[ ] quotation MCP: match_quotation_batch show_candidates=true — rows 8–10
[ ] Normal Guid 报价专家: 「50卷波纹管 DN20」— recommended line code 8030020808
[ ] learn-by-data batch table: row 9–10 classification → match (not in-candidates)
[ ] append_business_rule same rule twice → second call skipped duplicate
```

---

## Parallelization

**Not recommended** — single sort-key + shared `_hard_filter_and_bonus`. Serial P1 → P2 → P3.

---

## Recovery / re-approval

| Trigger | Action |
|---------|--------|
| Row 8 regresses | Revert sort key; keep only 2B/2C category filters |
| Live lib codes differ | Add fixture xlsx subset for CI; keep live test optional |
| User wants skill compare `chosen` | New task — out of MVP |

---

## Defer

- learn-by-data SKILL `top` definition change
- Mapping table row cleanup for PPR 历史 noise
- `llm_select_best` unification with MCP path

---

## Approval

Reply **执行task** to start Phase 0 (RED tests) → implement. No application code until approved.
