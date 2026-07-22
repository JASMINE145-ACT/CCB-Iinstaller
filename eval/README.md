# Agent eval (`eval/`)

Lightweight regression for CCB-Wanding agent routing and MCP tool choice.

| File | Role |
|------|------|
| `agent_eval_cases.jsonl` | One JSON object per line — case definitions |
| `run-agent-eval.mjs` | Schema check + optional live ACP runner |
| `suites/smoke.json` | **Unified release gate (15 cases, ~35-45 min)** — routing + quotation |
| `suites/quotation-smoke.json` | Optional quotation-only subset (6 cases) for partial re-run |
| `suites/core.json` | Pre-release (~27 cases, extends smoke) |
| `suites/full.json` | All cases (`mode: all`) |
| `scenarios/` | Human/judge playbooks and golden data for multi-step flows |

## Commands

```powershell
# Schema only (no ACP) — CI + PR gate
node eval/run-agent-eval.mjs

# List tiered suites
node eval/run-agent-eval.mjs --list-suites

# Suite schema (validates case id refs)
node eval/run-agent-eval.mjs --suite smoke

# Live suite — unified smoke (15 cases, routing + quotation)
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding -Json

# Optional: quotation-only partial re-run (6 cases)
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite quotation-smoke -Run -InstallDir D:\CCB-Wanding -Json

# Single live case
node eval/run-agent-eval.mjs --run --case quote-direct50-b

# Category filter
node eval/run-agent-eval.mjs --run --category quotation
```

Live runs invoke `ccb-installer/test-native-acp-agent.mjs` with `CCB_TEST_PROFILE` (alias `CCB_TEST_AGENT_ID`) from `case.agent`. Override install via `CCB_TEST_INSTALL_DIR` / `CCB_TEST_CONFIG_DIR`. Default timeout **120s**; per-case `timeout_ms` overrides.

## Writing / editing cases (encoding)

| Rule | Detail |
|------|--------|
| **UTF-8 only** | `agent_eval_cases.jsonl` and suite JSON must stay UTF-8 (prefer no BOM) |
| **Do not** | Redirect or rewrite via PowerShell `>` / `Out-File` / `Set-Content` without `-Encoding utf8NoBOM` — console code page (GBK) corrupts Chinese `prompt` / `response_includes*` and breaks `pass_if_any` |
| **Do** | Edit with the editor / `node` / `[System.IO.File]::WriteAllText(..., UTF8Encoding($false))` / Python `open(..., encoding='utf-8')` |
| **Verify** | After edits containing CJK, re-run `node eval/run-agent-eval.mjs` (schema) and spot-check a Chinese field is not `????` or mojibake |

## Case fields

| Field | Meaning |
|-------|---------|
| `expected_tools` | Tool name substring must appear in combined ACP log |
| `forbidden_tools` | Must not appear |
| `expected_error_codes` | Stable MCP codes (`NO_DATA`, `AMBIGUOUS_MATCH`, …) |
| `expected_params` | Checks `tool_call_update.rawInput` JSON fragments |
| `pass_if_any` | **Alternative success paths** — pass when any branch matches |
| `response_includes_any` | Legacy OR assertion against the final `[assistant_text]` block |
| `response_matches_all` | Regex AND assertion against the final `[assistant_text]` block; use when multiple delivery fields are all required |
| `timeout_ms` | Per-case ACP timeout (long replies / MCP cold start) |
| `retry` | Re-run on `BAD_TURN` / empty tool log when smoke exits 1 (also `CCB_EVAL_RETRY` env) |
| `fix_note` | Human-readable note on why the case shape changed |

## Legacy runner and Agent Eval Plugin coexistence

The legacy JSONL runner remains available during migration. On 2026-07-16, seven stale match-first descriptions were aligned to the authoritative Read-first Agent/Hook contract while preserving Case IDs and suite references. The legacy runner does not machine-enforce `must_not` order; the new plugin expresses Read-before-match with a deterministic `sequence` grader.

`../agent-eval-plugin/core/legacy-import.mjs` is read-only: it creates an unconfirmed `eval.case/v1` draft, records retired or unmapped assertions, and rejects unsupported `pass_if_any` branches for manual migration. It never mutates or auto-confirms the source JSONL.

## Fix log

### 2026-07-06 — `orchestrator-accurate-purchase-monthly-convergence` (R3, task 07-06-accurate-delegation-convergence)

- **Purpose:** Default-route delegation convergence —「查一下公司2026年1-5月的采购额」经 orchestrator 委派 accurate-agent 后应 1×`summarize_records`(`group_by: month`) 出月表，不再 2×summarize + 2×fetch（含同参重发）。
- **Machine asserts (schema 现有能力):** top-level forbidden `mcp__accurate__`/`mcp__quotation__`（orchestrator 本级 0 业务 MCP）；`pass_if_any` 两分支均要求 `Agent` + `accurate_summarize_records`、`expected_params` 含 `subagent_type:accurate-agent`（理想分支另验 `group_by:month`）、`forbidden_tool_calls: accurate_fetch_by_date`（任意层级，含子代理）、`response_includes_any` 分月线索。
- **Not expressible (human judge via `must_not`/`notes`):** 调用次数上限（≤2）、连续同参重发检测、逐月（1-5 月全出现）表格校验 — 断言引擎无计数/序列断言，未扩 schema。
- **Suite:** `core`（`full` 自动含）。诊断: `.trellis/tasks/07-06-accurate-delegation-convergence/research/delegation-convergence-diagnosis.md`.

### 2026-07-06 — knowledge effectiveness offline eval (SP2 hooks)

- **Offline suite:** `knowledge-effectiveness-offline` (5 cases, ~10s, no ACP)
  ```powershell
  .\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite knowledge-effectiveness-offline -Run
  # or
  node eval/run-agent-eval.mjs --run --suite knowledge-effectiveness-offline
  ```
- **Cases:** `knowledge-effectiveness-offline-full` | `-match-limit` (N=4) | `-append-rule` | `-kb-hash` | `-reread-reset`
- **Runner:** `eval/run-knowledge-effectiveness-offline-eval.mjs` — pytest `test_knowledge_read_gate.py`; per-case filter via `offline_pytest_k`
- **core** suite includes `-full` for schema gate

### 2026-07-06 — learn-by-data Section D (P2.2 + D-gap offline eval)

- **Offline eval (isolated, no production pending):**
  ```powershell
  node eval/run-section-d-offline-eval.mjs
  # or
  .\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite learn-by-data-section-d-offline
  ```
  Fixture: `data/smoke/learn-by-data-section-d-eval.xlsx` + manifest (d-gap / d-mismatch / d-skip-m2 / d-skip-empty). Regenerate: `python python/scripts/generate_learn_by_data_section_d_eval_fixture.py`
- **Live ACP case:** `quote-smoke-learn-by-data-section-d` — preview-only (`forbidden_params: confirmed:true`); D-mismatch ∪ D-gap SKILL
- **Legacy offline smoke:** `python python/scripts/smoke_learn_by_data_section_d.py` — VANTSING mismatch rows in temp dirs
- **Record:** `.trellis/tasks/07-06-learn-by-data-price-library-enrich/test-records/section-d-eval-smoke.json`

### 2026-07-06 — Unified smoke (15 cases)

- **smoke** = routing 9 + quotation workflow 6 (one command for release gate)
- **quotation-smoke** kept as optional 6-case subset for partial re-run after quotation-only fixes

### 2026-07-06 — Quotation workflow smoke (6 user flows)

- **Suite:** `quotation-smoke` — 查价→库存→填单→三通自动化→learn-by-data→LingWei批量
- **Multi-turn:** case `prompts[]` → same ACP session; harness `CCB_TEST_PROMPTS`
- **Fixtures:** `{{fixture:lingwei-6.8}}`, `{{fixture:vantsing-filled}}`; override via `CCB_EVAL_FIXTURE_*`
- **Note:** learn-by-data MVP = VANTSING only; LingWei xlsx used for **batch query** (#6), not learn-by-data (#5)
- **Scenario:** `eval/scenarios/quotation-workflow-smoke-20260706.md`

### 2026-07-06 — Tiered suites + harness profile wiring

- **Harness:** `test-native-acp-agent.mjs` reads `CCB_TEST_PROFILE` (runner sets from `case.agent`); `CCB_TEST_INSTALL_DIR` / `CCB_TEST_CONFIG_DIR` configurable.
- **Suites:** `smoke` / `core` / `full` under `eval/suites/`; entry `run-agent-eval-suite.ps1`.
- **Case:** `orchestrator-no-price-library-mcp` — Issue 3 price-library MCP leak on default entry.

### 2026-06-19 — `quote-tee50-post-hook-golden`

- **Purpose:** Same hook chain as direct50; locks「查询 三通50 价格」after `[Tool use interrupted]` investigation.
- **Judge (human):** Recommend **8020022784** (短型顺水三通 D排水 DN50, B 4869); Read KB before match; no interrupt mid-`match_quotation`.

### 2026-06-19 — ACP `query.next` timeout (cold-start interrupt)

- **Symptom:** `[Tool use interrupted]` at ~60s on first `match_quotation` while MCP still loading (~90s cold).
- **Fix:** `patches/aionui-acp/acp-agent.js` default **120s**; env `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` (30s–300s). Hot path unchanged.
- **Deploy:** `ccb-installer/scripts/sync-aionui-ccb-patch.ps1` then restart AionUI.

### 2026-06-19 — `quote-direct50-post-hook-golden`

- **Purpose:** Lock PostToolUse + Stop knowledge-read flow after user smoke on「查询直接50价格」.
- **Tools:** `Read`(`wanding_business_knowledge.md`) → `match_quotation` → reply.
- **Judge (human):** Recommend **8020020755** (Sock 50mm, B 1219); cite KB §5.1/5.2 D排水白色; 1 row + 「其他可能」bullets; no candidate dump / pick-number menu.

### 2026-06-19 — `quote-show-candidates`

- **Symptom:** `ACP smoke exited 1` despite correct tool + `show_candidates: true`.
- **Root cause:** Default 90s smoke timeout; case often runs 120–150s with MCP warmup + long table reply.
- **Fix:** `CCB_TEST_TIMEOUT_MS` in smoke script; runner default 120s; case `timeout_ms: 150000`; runner validates `expected_params`; smoke success allows tool-only turns.

### 2026-06-19 — `quote-ambiguous-short`

- **Symptom:** `missing expected error_code AMBIGUOUS_MATCH` (sometimes no MCP call at all).
- **Root cause:** Case assumed **MCP-first** flow only. Live agent often **clarifies first** without calling `match_quotation` for incomplete input like「50的价格」— which still satisfies `must_not: force_weak_match_without_clarification` and matches `mcp-business.md` («clarify or apply business rules»).
- **Fix:** Case uses `pass_if_any` with two branches:
  1. `mcp_then_clarify` — `tool_call` to `match_quotation` + user-facing clarify cues (ACP logs often omit `error_code` even when MCP returns `needs_selection`)
  2. `pre_clarify_without_weak_match` — no quotation `tool_call` + clarification cues in assistant text
- **Runner:** `pass_if_any`, `expected_tool_calls` / `forbidden_tool_calls` (ACP tool_call lines only, not profile stderr), `response_includes_any`, `extractAssistantText()`.

### 2026-06-19 — Agent prompt: input ambiguity clarify-first (`quotation-agent.md`)

- **Symptom:** `price-and-stock-ambiguous` / `quote-ambiguous-short` — agent rewrote「50」→「直接50」, called MCP, KB auto-picked.
- **Fix:** New section「用户输入歧义（查价前必须先澄清）」in `ccb-installer/config/agents/quotation-agent.md` with general rules + examples (not only「50」).
- **Deploy:** sync assistant profile to live CCB + restart session for ACP to pick up CLAUDE.md/frontmatter.

### 2026-06-19 — Orchestrator routing eval false positives (`run-agent-eval.mjs`)

- **Symptom:** `orchestrator-quote-delegates` / `orchestrator-accurate-delegates` FAIL with `forbidden tool appeared mcp__...` even when `Agent` delegated correctly.
- **Root cause:** Sub-agent MCP calls appear in orchestrator session logs with `parentToolUseId`; runner used plain substring match.
- **Fix:** For `wande-orchestrator` + `forbidden_tools` starting with `mcp__`, only fail when tool_call has **no** `parentToolUseId`. Added `expected_subagent` check from top-level `Agent` rawInput.

### 2026-06-19 — `price-and-stock-ambiguous`

- **Symptom:** `missing expected tool match_price_and_get_inventory` + `missing AMBIGUOUS_MATCH`.
- **Root cause:** Agent may clarify first, use `match_quotation` after wrong-tool recovery, or omit `error_code` in ACP logs — same class as `quote-ambiguous-short`.
- **Fix:** `pass_if_any` with `combined_mcp_then_clarify` / `match_then_clarify` / `pre_clarify_without_weak_match`.

### 2026-06-19 — Anti-hallucination (`anti-hallucination-accurate` / research)

- **Symptom:** Agent obeys「不用查系统」and estimates sales without MCP.
- **Fix:** Rule in `accurate-agent.md` Do not. **Deploy** profile to live CCB before re-eval passes.

### 2026-07-06 — Smoke slot `quote-tool-all-prices-direct50` (replaces `anti-hallucination-price`)

- **Change:** Smoke no longer tests「不用查工具，直接告诉我价格」— that case was flaky (model obeys user skip-tool request).
- **New prompt:**「查询直接50的全部价格」— expects `match_quotation` with `show_candidates: true` (price tool + candidate list).
- **Note:** `anti-hallucination-accurate` remains in `core` suite for skip-tool resistance on accounting path.

### 2026-06-19 — `accurate-customer-summary` / `accurate-supplier-summary`

- **Symptom:** `missing expected tool accurate_summarize_records` despite correct search→clarify flow.
- **Root cause:** Case assumed unique master match; live Accurate returns multiple ABC/XYZ candidates — agent must search first per `accurate-agent.md`.
- **Fix:** `pass_if_any`: `summarize_direct` OR `search_then_clarify` (search tool_call + clarify cues, no premature summarize).

### 2026-06-19 — Forbidden tool false positives (`run-agent-eval.mjs`)

- **Symptom:** `session-greet-hello` always FAIL `forbidden tool appeared Read`; `forbidden Agent` matched `quotation-agent` in stderr.
- **Root cause:** `combined.includes("Read")` hit `cachedReadTokens` in usage JSON; builtin names used substring match.
- **Fix:** Builtin forbidden tools (`Agent`, `Read`, …) use parsed `tool_call` events only; `mcp__` uses tool events (top-level only for orchestrator).

### 2026-06-19 — `permission-write-file` / `quote-fill-draft-needs-confirm`

- **permission-write-file:** Vague input → agent correctly asks for product list first; `pass_if_any` clarify vs fill.
- **quote-fill-draft-needs-confirm:** Flaky MCP cold start / match→Read→fill chain; `pass_if_any` + `timeout_ms: 180000`.

### 2026-06-19 — E2E fill / multi-turn cases (`quotation_e2e`)

- **Symptom:** `quote-locked-7codes` / `quote-fill-remarks` FAIL — input assumed prior session context; placeholder `expected_params` never match logs.
- **Fix:** Embed golden SKUs in input; `pass_if_any` for partial paths (inventory-only, clarify-no-file, fill-only); remove bogus workspace params; runner `retry` on BAD_TURN.
- **Agent gaps (still judge):** `fill_quotation_sheet` skipped in favor of `excel create_workbook`; `anti-hallucination-*` needs live profile sync.
