# Execution Plan — `07-06-learn-by-data-price-library-enrich`

| Field | Value |
|-------|--------|
| **Status** | approved |
| **Approved** | 2026-07-06 |
| **Scenario** | A |
| **Plan depth** | Standard |
| **Verification profile** | Standard (+ manual price_admin smoke) |
| **Status** | approved |
| **Active phase** | P2.2 implemented — pending deploy/smoke |
| **Repos** | claude-code-best only |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `get_context.py --mode packages` → layers backend/frontend/integration; read `integration/index.md`, `backend/mcp-business.md`, `integration/price-library.md`, `integration/agents-unified-model.md` § learn-by-data |
| trellis-task-execution | Read: | Step 1–3 template; Scenario A classification |
| Parent PRD | Read: | `.trellis/tasks/06-30-quotation-learn-by-data-skill/prd.md` — MVP Section A/B + ADR「no new MCP」 |
| Skill source | Read: | `ccb-installer/packages/vertical/com.wanding.trade/skills/quotation-learn-by-data/SKILL.md` |
| Price admin fields | Read: | `python/admin/org_price_admin_payloads.py` — `source_file/sheet/row`, `superseded_by_source` in `UPDATABLE_FIELD_NAMES` |
| MCP gap | Read: | `mcp_servers/price-library-server/dist/index.js` — `priceFieldProperties` **missing** `source_*`, `superseded_by_source` |
| Agent allowlist | Read: | `quotation-agent.aionui.json` — MCP `quotation` + `excel` only |

---

## Task summary

**Extend learn-by-data** with a third output path:

1. **R1 (refine Section B):** `actual_code ∉ candidates` + in org price library → normal ⚠️ (`人工核查`).
2. **R2 (new Section C):** same row + `top_code` missing from price library → `upsert_price_library_item` preview with provenance + descriptions + tier price.

This **supersedes** MVP ADR item「no price-library MCP on quotation-agent」— scoped to learn-by-data + two-phase confirm only.

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm | available | PRD §R1–R3 (this task) |
| Research | trellis-research | available | `research/price-library-upsert-field-map.md` in main session |
| Skill SOP | trellis-implement | available | Inline SKILL.md edit |
| MCP schema | trellis-implement | available | Hand-edit `mcp_servers/price-library-server` source + rebuild dist |
| Python upsert | existing `handle_upsert_price_library_item` | available | No new Python tool unless proxy chosen |
| TDD | superpowers:test-driven-development | available | `python/tests/test_org_price_admin_client.py` pattern |
| Review | code-reviewer | available | trellis-check |
| Verify | agent-eval smoke | available | `quote-smoke-learn-by-data-vantsing` + manual price_admin |
| UI | N/A | unavailable | Manual Guid smoke only |

**Plan depth:** Standard (skill + MCP schema + agent allowlist + tests + spec).

---

## Scenario & risk tags

- **Scenario A** — clear extension of completed MVP; PRD defines AC.
- **Risk tags:** `external-api` (org price library), `packaging` (deploy-ccb-skills + seed agents), `migration` (ADR change from「no MCP changes」).

---

## Classification matrix (target behavior)

```text
actual_code ∉ candidates?
  ├─ actual in price library (get_product_price_tiers) → Section B, 人工核查
  ├─ actual NOT in price library → Section B, 实际料号无效
  └─ if top_code non-empty AND top NOT in price library → Section C upsert preview
       (orthogonal to actual_code PL presence; both tables may apply on same row)
```

**0 candidates:** Section B `无候选` only — no Section C.

---

## Phase 0 — Activate & research

| Step | Tool | Output |
|------|------|--------|
| `task.py create/start 07-06-learn-by-data-price-library-enrich` | shell | in_progress |
| Field map + ADR delta | research doc | `research/price-library-upsert-field-map.md` |
| Confirm `get_product_price_tiers` not-found shape | read `python/quotation/price_tiers.py` | documented in research |

---

## Phase 1 — MCP schema (P0)

| Workstream | Files | Output |
|------------|-------|--------|
| Extend upsert JSON schema | `mcp_servers/price-library-server/` (source + dist sync) | `source_file`, `source_sheet`, `source_row`, `superseded_by_source` exposed in `priceFieldProperties` |
| Regression | `python/tests/test_org_price_admin_client.py` | upsert preview includes source fields |

**Risk:** MCP TS source may live only in dist — mirror pattern from quotation-server if no src tree.

**Required output:** ListTools shows new properties; Python handler already accepts them.

---

## Phase 2 — Skill + agent wiring (P0)

| Workstream | Files | Output |
|------------|-------|--------|
| SKILL Step 3–4 | `packages/vertical/.../skills/quotation-learn-by-data/SKILL.md` (+ legacy `ccb-installer/config/skills/` mirror if still used) | Section B oracle → PL; Section C template + two-phase upsert SOP |
| Tool table | `quotation-agent.md` | Row: Section C → `upsert_price_library_item` + Read `data/data.Md` if field semantics unclear |
| MCP allowlist | `quotation-agent.aionui.json` + fleet defaults if registry-driven | Add **`price-library`** MCP (narrow: upsert + get_draft only in skill text — not full admin SOP) |
| Slash / deploy | `deploy-ccb-skills.ps1`, `deploy-seed-agents.ps1` | Live LOCALAPPDATA paths updated |

**Design choice (recommended):** Add `price-library` to quotation-agent `mcp_allowlist` rather than new quotation MCP proxy — reuses `price-library-edit` two-phase contract; org API enforces `price_admin`.

**Alternative (defer):** Hand off Section C table to `price-library-agent` — worse UX, skip unless user rejects allowlist change.

---

## Phase 3 — Fixtures & automated tests (P1)

| Workstream | Test level | RED / GREEN |
|------------|------------|-------------|
| Fixture generator | unit | Extend `generate_learn_by_data_smoke_fixture.py` + manifest scenario `top-missing-from-pl` |
| Field builder helper (optional) | unit | Pure function `build_learn_by_data_upsert_fields(row, candidate, file_meta)` in `python/quotation/` — TDD if logic non-trivial |
| Agent eval | smoke | Extend or add `quote-smoke-learn-by-data-pl-enrich` — expect `upsert_price_library_item` with `confirmed=false` OR Section C markdown marker |

**Regression target:** Existing 16-row fixture Section A/B counts unchanged except documented new row.

---

## Phase 4 — Spec & release chain (P2)

| Doc | Change |
|-----|--------|
| `.trellis/spec/integration/agents-unified-model.md` | § learn-by-data Phase 2 (Section C) |
| `.trellis/spec/integration/price-library.md` | learn-by-data provenance upsert cross-link |
| `wanding-packaging-whitelist.md` | if skill path unchanged — note only |

Deploy verify: `deploy-ccb-skills.ps1` → `Test-Path` skill; `deploy-seed-agents.ps1 -ForceMd` → quotation-agent allowlist; `sync-dev-wanding-vendor.ps1` if Python touched.

---

## TDD contract

| Workstream | Level | RED evidence | GREEN command |
|------------|-------|--------------|---------------|
| MCP schema fields | unit | test expects source fields in upsert preview | `pytest python/tests/test_org_price_admin_client.py -k upsert` |
| Learn-by-data helper | unit | optional — failing field map test | `pytest python/tests/test_learn_by_data_*.py` |
| Smoke eval | integration | case expects Section C tool or marker | `run-agent-eval-suite.ps1 -Suite quotation-smoke` |

---

## Verification profile: **Standard**

Gate chain (sequential):

1. **code-reviewer** — PASS
2. **pytest** — upsert + any new learn-by-data tests PASS
3. **agent-eval** — quotation-smoke learn-by-data case PASS (preview path)
4. **Manual (price_admin):** Guid → 万鼎报价专家 → `/learn-by-data` + VANTSING fixture row with top missing from PL → Section C preview → confirm upsert → `get_price_library_draft` shows row with `source_file/sheet/row`
5. **Manual (non-admin):** Same flow → preview only, no draft mutation
6. **trellis-update-spec** → agents-unified-model + price-library
7. **implement.jsonl + check.jsonl** + prd AC `[x]`

---

## Parallelization

**Not applicable** — single repo, serial phases. Do not parallel-edit SKILL.md and MCP schema without merging classification matrix first.

---

## Manual steps (human)

- [ ] price_admin account: Section C two-phase upsert + draft row field check
- [ ] non-price_admin: preview-only path
- [ ] After publish (optional): new quotation session sees ingested code in match (out of scope for same turn)

---

## Recovery & re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Org API 403 on upsert | Document JWT/price_admin; skip confirmed=true in eval | No |
| MCP schema drift vs Python | Phase 1 | No |
| User rejects quotation-agent + price-library coupling | Research: proxy tool or handoff to price-library-agent | **Yes** — architecture fork |

---

## Defer / out of scope

- LINGWEI learn-by-data layout
- Auto-publish draft
- Matcher algorithm changes
- aionui-src changes (unless skill picker copy requested later)

---

## Open question for approval

**Quotation-agent MCP allowlist + `price-library`:** Acceptable for learn-by-data write path? (Org API still gates `price_admin`.)

If **no** → switch Phase 2 to price-library-agent handoff (Section C export table only).

---

## Phase 2.2 — Section D 历史报价库导入（**已批准** 2026-07-06）

**Research:** `research/section-d-historical-mapping-import-explore.md` §9 ADR

| Decision | Value |
|----------|--------|
| Row scope | **D-mismatch ∪ D-gap** |
| M4 conflict | **Allow overwrite** after preview + confirm |
| Write path | **Route 2** pending + merge script |
| Permission | **SKILL for all** learn-by-data users (no price_admin) |
| Fields | VANTSING B/C/F/G + source provenance |

| Field | Value |
|-------|--------|
| Scenario | A extension |
| Plan depth | Standard |
| Verification | Standard — pytest + manual mismatch smoke + post-merge `match_quotation` 历史报价 hit |

### Phase 2.2 workstreams

| Phase | Work | Tool | Output |
|-------|------|------|--------|
| **D-01** | `build_learn_by_data_mapping_row` + guards M1–M5 | TDD | `python/quotation/learn_by_data_mapping.py` + tests |
| **D-02** | `append_quotation_mapping_pending` MCP (`confirmed`) | trellis-implement | pending jsonl under `%APPDATA%/CCB-Wanding/data/` |
| **D-03** | SKILL Section D（主交付） | SKILL | mismatch 表 + M1–M5 + 全员可用 |
| **D-04** | `merge-mapping-import.py` + `invalidate_mapping_cache` | script | merge into `MAPPING_TABLE_PATH` |
| **D-05** | eval + registry test | pytest | forbidden 不碰 canonical xlsx |
| **D-06** | spec § mapping write-back | trellis-check | `quotation-matching-engine.md` |

**Deferred:** D-R1 org Neon write API（路线 1 升舱）

**Gate chain:** code-review → pytest → deploy-ccb-skills → manual learn-by-data Section D smoke

**Wait:** User says **执行 Phase 2.2** to start implementation.
