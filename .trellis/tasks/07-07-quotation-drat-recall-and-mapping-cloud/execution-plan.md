# Execution Plan — `07-07-quotation-drat-recall-and-mapping-cloud`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | D (parallel workstreams — matcher P0 serial-first, mapping cloud P2) |
| **Plan depth** | Full |
| **Verification profile** | Standard (+ manual match smoke) |
| **Repos** | claude-code-best (spec/skill/scripts) + `D:\CCB-Wanding\vendor\wanding` (Python matcher) |
| **Active phase** | P0 done — P1 ops next |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `get_context.py --mode packages`; `integration/index.md` → `backend/quotation-matching-engine.md`, `integration/price-library.md` |
| trellis-task-execution | Read: | Scenario D template; Phase -1 matrix; Step 3b persist |
| trellis-research | Agent: | `research/d-r1-org-mapping-api-gap-and-cloud-share.md` — Route 2 pending vs Route 1 org gap |
| Parent explore | Read: | `07-06-learn-by-data-price-library-enrich/research/section-d-historical-mapping-import-explore.md` §9 ADR |
| Matcher source | Read: | `wanding_fuzzy_matcher.py` L809-810: bare `\bdrat\b` → `stelldrat`; `_thread_gender` lacks drat; L1301 thread compat gate |
| Merge script | Read: | `vendor/wanding/python/scripts/merge_mapping_import.py` exists; run from `vendor/wanding` root |
| User session | Context: | PT. JINSE row 10; pending `d6e458d7-…`; user confirms knowledge-only fix insufficient |

---

## Task summary

Two user-identified problems + three additional gaps from code review:

| # | Problem | Root cause | Priority |
|---|---------|------------|----------|
| **1** | Historical mapping not cloud-shared | Section D ADR Route 2 = local `mapping_import_pending.jsonl` + manual merge to xlsx; no org API | **P2** |
| **2** | `drat` ≠ threaded elbow in matcher | `\bdrat\b` misrouted to ceiling `stelldrat`; `_thread_gender` ignores `drat`/丝扣 | **P0** |
| **3** | Merge not discoverable | Agent/session path confusion (`python/python/…`); CLI-only, no MCP merge | **P1** |
| **4** | Pending verify UX | Agent once claimed row 10 not written; user needs jsonl + merge checklist | **P1** |
| **5** | Dedup cross-machine | M2/M4 guards read local `load_mapping_df` only; fleet duplicates possible until org | **P2** |

**User decision:** Fix matcher algorithm (not only `append_business_rule`). Cloud mapping is strategic requirement.

**Locked business rule (user 2026-07-07):** `Elbow drat` = **丝扣弯头 / 螺纹弯头** — implement as matcher synonym + thread-gender signal, not knowledge-only.

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm | available | This PRD |
| Research (org API) | trellis-research | **done** | `d-r1-org-mapping-api-gap-and-cloud-share.md` |
| Matcher TDD | superpowers:test-driven-development | available | RED test in `test_wanding_matcher_compat.py` |
| Implement (Python) | trellis-implement | available | Inline edit `vendor/wanding/python` |
| Skill/SOP | trellis-implement | available | `quotation-learn-by-data/SKILL.md` §D |
| MCP tools | trellis-implement | available | `mapping_pending_dispatch.py` |
| AionCore API (P2) | trellis-research → implement | **gap** | Defer P2 until ADR approved |
| Review | code-reviewer | available | trellis-check |
| Deploy | sync-dev-wanding-vendor.ps1 | available | Manual vendor copy |
| UI | N/A | unavailable | Manual Guid match smoke |

**Plan depth:** Full — cross-repo vendor + spec + optional AionCore epic.

---

## Scenario & risk tags

- **Scenario D** — WS-Matcher (P0) and WS-Mapping-Cloud (P2) can parallelize after matcher contract frozen; WS-Ops (P1) serial after merge path confirmed.
- **Risk tags:** `external-api` (org mapping P2), `migration` (xlsx → org bootstrap), `cross-repo` (ccb-installer skill + vendor python).

---

## Phase 0 — Activate & baseline

| Step | Tool | Output |
|------|------|--------|
| `task.py create/start 07-07-quotation-drat-recall-and-mapping-cloud` | shell | in_progress |
| Repro baseline | manual + pytest | Record current `match_quotation` top-5 for `Elbow drat ½" AW` |
| Confirm pending row | Read jsonl | `d6e458d7-268c-4ffe-8d73-efd1f4729ae8` status `pending` |

**Immediate ops (human, no code):** From `D:\CCB-Wanding\vendor\wanding`:

```powershell
python python/scripts/merge_mapping_import.py --dry-run
python python/scripts/merge_mapping_import.py
```

Then re-run `match_quotation` — should show `历史报价` for row 10 keywords **after** merge (does not fix drat recall alone).

---

## Phase 1 — WS-Matcher: drat / 螺纹弯头 recall (P0)

| Workstream | Files | Required output |
|------------|-------|-----------------|
| **M-01** Disambiguate `drat` | `wanding_fuzzy_matcher.py` | Remove bare `\bdrat\b` from `_query_ceiling_category` / `_product_ceiling_category`; keep `steel drat` / `stelldrat` only |
| **M-02** Thread gender | same | Extend `_thread_gender`: `drat`, `丝扣`, `螺纹` (fitting context) → `female`; document AW Faucet Elbow |
| **M-03** Query expansion | same + optional `wanding_business_knowledge.md` | `drat` → `丝扣弯头`/`螺纹弯头`/`内螺纹` when fitting context (`elbow`/`tee`/`aw`); **not** ceiling `stelldrat` |
| **M-04** Product signal | `_product_fitting` / compat | Boost or require `faucet elbow` / `内螺纹弯头` when `q_thread=female` + `q_fit=elbow` |
| **M-05** Tests | `python/test_wanding_matcher_compat.py` or `tests/test_drat_elbow_aw.py` | RED: row 10 keywords → `8010024875` ranks above `8010024350`; GREEN after fix |
| **M-06** Ceiling regression | tests | `steel drat` / `stelldrat` ceiling queries unchanged |

**Design note:** Prefer **code disambiguation** over knowledge-only — user explicitly rejected knowledge-only fix.

**Canonical repro:**

```text
keywords: Elbow drat ½" AW
expected top: 8010024875 (Faucet Elbow AW DN16)
must beat: 8010024350 (90° elbow AW DN16)
```

### TDD contract (Phase 1)

| Level | RED evidence | GREEN command |
|-------|--------------|---------------|
| unit | `test_drat_elbow_aw_recall` fails — 8010024350 at [0] | `pytest python/tests/test_drat_elbow_aw.py -q` |
| integration | `match_quotation_union` end-to-end | `pytest python/tests/test_lesso_dn_spec_fix.py` (no regress) + new case |

---

## Phase 2 — WS-Ops: Section D merge & verify (P1)

| Workstream | Files | Required output |
|------------|-------|-----------------|
| **O-01** Runbook | `ccb-installer/scripts/merge-mapping-pending.ps1` or docs | One-command merge from repo; prints pending count + merged keys |
| **O-02** SKILL §D | `quotation-learn-by-data/SKILL.md` | Step 5: absolute path `vendor/wanding`; post-append verify checklist (read jsonl id, dry-run merge) |
| **O-03** MCP merge (optional) | `mapping_pending_dispatch.py` + quotation MCP | `merge_quotation_mapping_pending(dry_run?, confirmed?)` wrapping existing script logic |
| **O-04** MCP lookup (optional) | same | `lookup_quotation_mapping(search_text)` → M2/M4 preview for agent dedup |
| **O-05** Tests | pytest | merge dry-run on fixture pending jsonl |

**Does not require org API** — unblocks fleet until P2.

---

## Phase 3 — WS-Mapping-Cloud: org-shared historical library (P2)

**Prerequisite:** User approves Route 1 ADR (mirror price-library). Research: `d-r1-org-mapping-api-gap-and-cloud-share.md`.

| Workstream | Layer | Output |
|------------|-------|--------|
| **C-R1** ADR + schema | Trellis spec | `integration/quotation-mapping.md` (new) — fields, revision, permissions |
| **C-01** AionCore API | `AionCore/` migration | `product_mapping` table; `GET /active`, draft CRUD, import, publish |
| **C-02** Org client | `org_mapping_client.py` | org-primary read; LKG fallback |
| **C-03** Matcher read | `mapping_table_matcher.py` | Replace Neon stub path with org client |
| **C-04** MCP write | quotation or dedicated MCP | `append_quotation_mapping_org` with `confirmed` + CSRF (if admin) OR fleet append without price_admin |
| **C-05** Bootstrap | script | Import seed `mapping_table.xlsx` + pending jsonl migration |
| **C-06** AionUI (defer) | optional | Read-only mapping table page (like price-library) |

**Permission model (open question):** Section D was "all learn-by-data users" for pending; org write may need `mapping_admin` or reuse `price_admin` — **decide before C-04**.

---

## Verification profile: **Standard**

Gate chain (per workstream):

1. **code-reviewer** — PASS per phase
2. **pytest** — drat tests + mapping pending tests PASS
3. **Manual match smoke:** Guid → 万鼎报价专家 → `match_quotation("Elbow drat ½\" AW")` → Faucet Elbow recommended
4. **Manual Section D (P1):** append → read jsonl → `merge-mapping-pending.ps1` → match shows `历史报价`
5. **trellis-update-spec** → `quotation-matching-engine.md` + new `quotation-mapping.md` (P2)
6. **implement.jsonl + check.jsonl** + prd AC `[x]`

---

## Parallelization (Scenario D)

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ WS-Matcher (P0)             │     │ WS-Ops (P1)                 │
│ vendor/wanding/python       │     │ ccb-installer skill + script  │
│ wanding_fuzzy_matcher.py    │     │ merge runbook + SKILL §D      │
└──────────────┬──────────────┘     └──────────────┬──────────────┘
               │                                    │
               └──────── serial merge ──────────────┘
                              │
               ┌──────────────▼──────────────┐
               │ Parent: pytest + manual     │
               │ match smoke (row 10)        │
               └──────────────┬──────────────┘
                              │
               ┌──────────────▼──────────────┐
               │ WS-Mapping-Cloud (P2)       │
               │ AionCore + org client       │
               │ (after ADR approval)        │
               └─────────────────────────────┘
```

**Merge rules:**

- Do **not** parallel-edit `wanding_fuzzy_matcher.py` and `mapping_table_matcher.py` org read until M-01..M-05 merged.
- P2 starts only after P0 manual smoke PASS.

---

## Manual steps (human)

- [ ] Run merge for existing pending `d6e458d7-…` (Phase 0)
- [ ] After P0: match_quotation row 10 keywords — screenshot top candidate
- [ ] After P1: learn-by-data Section D end-to-end with verify checklist
- [ ] After P2: second machine sees mapping without local merge (org login)

---

## Recovery & re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| drat fix breaks ceiling `stelldrat` | M-01 + M-06 regression | No |
| Org API scope too large | Defer P2; ship P0+P1 only | **Yes** — scope cut |
| User rejects org write permissions | P2 redesign (pending-only + scheduled fleet merge) | **Yes** |
| Matcher [0] still wrong after thread fix | trellis-research ranking interaction with 07-06 ranking fix | No |

---

## Defer / out of scope

- Re-run full PT. JINSE 9-row learn-by-data eval (optional smoke)
- `append_business_rule` for drat (supplement only, not substitute for M-01..M-04)
- AionUI mapping admin UI in first P2 slice

---

## Approval questions

1. **Priority:** Approve **P0 matcher first** (can ship without P2)?
2. **P2 scope:** Full price-library parity now, or **P1 ops hardening** + defer AionCore to separate epic?
3. **Pending row 10:** Run merge now as ops baseline before matcher fix?

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| P0 Matcher | done | `test_drat_elbow_aw.py` 8/8; compat+ranking 28 pass; code-review PASS; synced vendor |
| P1 Ops | pending | — |
| P2 Cloud | pending | — |
