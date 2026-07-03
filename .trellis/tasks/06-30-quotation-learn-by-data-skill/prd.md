# quotation-learn-by-data-skill

## Goal

Build a `/learn-by-data` skill for the quotation agent: given a previously-human-quoted Excel, agent re-quotes each inquiry line with `match_quotation_batch`, compares its top candidate against the human's actual material_code, and produces two outputs — (A) knowledge snippets ready for `append_business_rule` confirmation, and (B) a severe-flag table for codes not found in any candidate.

## Requirements

### Trigger & discovery (wired — not optional)

- **Primary trigger**: user types `/learn-by-data` or says「按数据学习 / 复盘报价」in a **quotation-agent** Guid session.
- **Discovery mechanism (decided)**:
  1. `ccb-installer/config/agents/quotation-agent.md` frontmatter adds `skills: [quotation-learn-by-data]` (same pattern as `ppt-creator` → `ppt-master`).
  2. Agent body adds one row in §工具决策表: `/learn-by-data` → `Skill(quotation-learn-by-data)`; **exception** to「`match_quotation_batch` 仅兜底」— this skill **must** use batch for re-quote loops.
  3. Skill `SKILL.md` frontmatter `description` includes trigger phrases: `/learn-by-data`, `learn-by-data`, `按数据学习`, `复盘报价`.
- **Deploy target**: `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\` via extended `deploy-ccb-skills.ps1` (not `deploy-seed-agents.ps1` alone — that deploys agent md, not skill trees).

### Step 1 — Parse (template-aware)

**Phase 1 (MVP): VANTSING filled quote only.**

Detect VANTSING when sheet has `Total Excluding PPN` marker and data region starts row 8 (`python/quotation/layout.py` → `VANTSING_LAYOUT`). Use **fixed 1-based column map** — do **not** rely on LLM column guessing for MVP:

| Field | VANTSING col | Excel | Use |
|-------|-------------|-------|-----|
| `inquiry_name` | 2 | B | keywords (part 1) |
| `inquiry_spec` | 3 | C | keywords (part 2) |
| `actual_code` | 6 | F | human-chosen material code (`product_no_col`) |
| `data_start_row` | — | 8 | first data row |
| data end | — | row before `Total Excluding PPN` | skip footer |

- `keywords` per row = trim(`inquiry_name` + ` ` + `inquiry_spec`); skip empty-keyword rows.
- **Optional sanity check**: call `parse_excel_smart` with `max_rows=25` once to show user a preview; if fixed-map row count ≠ visible data rows, **stop and ask user** to confirm column map (1 blocking round).
- **Phase 2 (out of scope for MVP)**: LINGWEI / unknown layouts → `parse_excel_smart` + LLM column ID (see Out of Scope).

### Step 2 — Re-quote

- Call `match_quotation_batch` with `keywords_list` in batches of ≤10 (`MATCH_QUOTATION_BATCH_LIMIT`).
- **Always** pass `show_candidates=true` on every batch (returns up to 15 candidates per row — required for Step 3 membership check; default payload truncates at 10).
- Continue with `remaining_keywords` until all rows processed.
- `customer_level`: read from sheet header / user context if explicit (青山→`D`, 大唐→`E`, etc. per `quotation-agent.md`); else default `B`. Do **not** infer level from unit price.
- Must Read `wanding_business_knowledge.md` before first batch (existing PreToolUse gate — session-once).
- **Note**: re-match uses current price library (may be `bundled_seed` when `PRICE_USE_BUNDLED_FIRST=1`). This skill compares **material codes only**, not unit prices.

### Step 3 — Compare (payload-accurate)

For each row, let `agent_top_code = results[i].candidates[0].code` (or empty if `unmatched` / `candidate_count=0`).

**Membership check (`actual_code ∈ candidates`)** — use full candidate list from tool response (`candidates` array, up to 15 with `show_candidates=true`). If still ambiguous:

1. Scan all returned `candidates[].code` for exact match to `actual_code`.
2. If no match but `candidates_truncated=true`, re-run **single** `match_quotation` for that row's `keywords` with `show_candidates=true` before classifying.
3. If still no match, call `get_inventory_by_code(actual_code)` — if found, treat as **not-in-candidates** (human code valid but agent ranking missed it); if not found, flag **invalid actual_code** in Section B remark column.

Classification:

| Condition | Path |
|-----------|------|
| `agent_top_code == actual_code` (both non-empty) | **match** → skip |
| mismatch + `actual_code` found in candidates (steps 1–2) | **in-candidates** |
| mismatch + `actual_code` not in any candidate (or 0 candidates) | **not-in-candidates** |

**Do not use `product_type` for classification** — match payload does not expose it (`code`, `matched_name`, `unit_price`, `source`, `description_english`, `indonesian_name`, optional `supplier` only).

### Step 4 — Output

- **Per-batch discipline**: output comparison table for each 10-row batch **before** next `match_quotation_batch` call or reasoning — prevents missed rows on 20–50-item Excels.
- **Section A: 知识片段建议** — in-candidates mismatches:
  - **Auto-draft** when obvious diff from candidate fields: different brand keyword in `matched_name` / `description_english`, or ≥2 DN/PN/spec tokens differ between `actual_code` row name vs `candidates[0]` (compare via `matched_name` text or optional `get_product_price_tiers` for both codes — **spec/name only, not price**).
  - **Ambiguous** → structured comparison table; prompt user to write rule text.
  - **Write routing**: fleet-wide selection rule → `append_business_rule`; customer/project-specific → suggest `memory/business/customers.md` (do not auto-append to org).
- **Section B: ⚠️ 严重标记（料号未在候选中）** — table: 关键词 | 实际料号 | Agent最佳候选 | 备注 (`人工核查` / `实际料号无效`). Output Section B when batch loop completes; **does not end session** if Section A has pending rule confirmations.
- 0-candidate rows → Section B with Agent最佳候选 = `无候选`.

### append_business_rule flow

- Propose `append_business_rule(confirmed=false)` per draft; **same-turn** markdown preview of `rule_text` + ask 确认 (per `quotation-agent.md` 硬约束).
- `confirmed=true` only after user says 确认/同意; requires org session (CSRF). Dev smoke **must pass** preview path; `confirmed=true` is optional/best-effort.

## Acceptance Criteria

- [ ] `quotation-agent.md` has `skills: [quotation-learn-by-data]` and §工具决策表 `/learn-by-data` row.
- [ ] `deploy-ccb-skills.ps1` copies skill to `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\`; `Test-Path` passes after deploy.
- [ ] Skill `SKILL.md` loads via `Skill(quotation-learn-by-data)` and walks agent through all 4 steps.
- [ ] VANTSING filled sheet: fixed col map (B/C → keywords, F → actual_code, rows 8..Total-1) — no LLM column guess on MVP path.
- [ ] Agent calls `match_quotation_batch` with `show_candidates=true`, ≤10/batch, continues via `remaining_keywords`.
- [ ] In-candidates mismatches produce at least one draft knowledge snippet (auto-draft or user-prompted table).
- [ ] Not-in-candidates rows appear in Section B (count = non-match rows; none silently dropped).
- [ ] Agent proposes `append_business_rule(confirmed=false)` with visible `rule_text` preview before any `confirmed=true`.
- [ ] E2E smoke: `data/smoke/learn-by-data-vantsing-filled.xlsx` (≥15 rows covering match / in-candidates mismatch / not-in-candidates / 0-candidate) → full report with Sections A and B.

## Definition of Done

- `ccb-installer/config/skills/quotation-learn-by-data/SKILL.md` written (frontmatter + 4-step SOP + VANTSING col map + output templates).
- `quotation-agent.md` updated (`skills` frontmatter + tool table exception).
- `deploy-ccb-skills.ps1` extended (or `deploy-quotation-learn-by-data-skill.ps1` added and called from it).
- Smoke fixture `data/smoke/learn-by-data-vantsing-filled.xlsx` committed (synthetic or redacted from real fill).
- Manual smoke test run in quotation-agent Guid session.
- Spec updated: `.trellis/spec/integration/agents-unified-model.md` § learn-by-data.

## Decision (ADR-lite)

**Context**: Need systematic quotation quality learning loop; 2 alternative architectures considered.

**Decision**: Pure agent workflow (no new MCP tool). Agent uses existing tools; LLM does comparison and rule drafting; mitigated by (a) per-batch table-first output, (b) `show_candidates=true`, (c) VANTSING fixed column map for MVP.

**Consequences**: Faster to ship; row completeness relies on batch discipline; classification accuracy improved vs naive PRD by candidate truncation fix. Dedicated MCP `compare_quotation_learning` deferred until MVP smoke shows >10% misclassification on real sheets.

## Out of Scope

- New MCP tools or changes to quotation-server `dist/index.js`.
- LINGWEI / customer-format layout detection (**Phase 2** — after VANTSING MVP validated).
- Auto-append to knowledge base without user confirmation.
- Price delta analysis (only item/code mismatch).
- Creating work-tasks or issues automatically.
- Processing multiple Excels in one session.

## Technical Notes

### Paths & deploy

| Item | Path |
|------|------|
| Skill source | `ccb-installer/config/skills/quotation-learn-by-data/SKILL.md` |
| Live deploy | `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\` |
| Deploy script | Extend `ccb-installer/scripts/deploy-ccb-skills.ps1` (mirror `deploy-subagent-gate-skill.ps1` copy pattern) |
| Agent seed | `deploy-seed-agents.ps1 -ForceMd` after `quotation-agent.md` edit |
| Spec | `.trellis/spec/integration/agents-unified-model.md` § learn-by-data |

### MCP tools (no changes)

`parse_excel_smart`, `match_quotation_batch`, `match_quotation` (single-row fallback), `get_inventory_by_code`, `get_product_price_tiers` (name/spec diff only), `append_business_rule`.

Agent has `quotation` + `excel` MCP only. No Bash. All orchestration in SKILL.md SOP.

### Match payload reference (`selection_payloads.py`)

- Default `candidates` cap: **10** (`show_candidates=false`).
- With `show_candidates=true`: cap **15**; set `candidates_truncated` when more exist.
- Candidate fields: `code`, `matched_name`, `unit_price`, `source`, `description_english`, `indonesian_name`, optional `supplier`. **No `product_type`.**

### Auto-draft heuristic (revised)

Trigger auto-draft when **any** of:

1. Brand token in `matched_name`/`description_english` differs between actual vs top candidate.
2. ≥2 DN/PN/spec number tokens differ (regex on candidate names or `get_product_price_tiers` description fields).
3. `source` differs materially (e.g. human picked 历史报价 code but agent top is 字段匹配 only) **and** names share same product family.

Otherwise → ambiguous table for user.

### Smoke fixture

Create `data/smoke/learn-by-data-vantsing-filled.xlsx` with documented rows:

| Row kind | Purpose |
|----------|---------|
| ≥3 match | agent_top == actual |
| ≥3 in-candidates mismatch | actual in candidates[1..14] but not [0] |
| ≥3 not-in-candidates | actual valid code not in candidate list |
| ≥1 zero-candidate | keywords with no match |
| ≥15 total | exercises 2-batch loop |

## Implementation Plan

1. **SKILL.md** — frontmatter triggers; VANTSING col map; 4-step SOP; batch table templates; compare + membership algorithm; Section A/B markdown templates; append_business_rule + memory routing; ROE note (complete all batches before final summary).
2. **quotation-agent.md** — `skills: [quotation-learn-by-data]`; tool table `/learn-by-data` exception.
3. **deploy-ccb-skills.ps1** — add quotation-learn-by-data copy step.
4. **Smoke fixture** — `data/smoke/learn-by-data-vantsing-filled.xlsx`.
5. **agents-unified-model.md** § learn-by-data — trigger, deploy, VANTSING-only MVP scope.
6. **Manual smoke** — quotation-agent Guid session on fixture file.
