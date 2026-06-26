# Agent eval (`eval/`)

Lightweight regression for CCB-Wanding agent routing and MCP tool choice.

| File | Role |
|------|------|
| `agent_eval_cases.jsonl` | One JSON object per line — case definitions |
| `run-agent-eval.mjs` | Schema check + optional live ACP runner |
| `scenarios/` | Human/judge playbooks and golden data for multi-step flows |

## Commands

```powershell
# Schema only (no ACP)
node eval/run-agent-eval.mjs

# Single live case
node eval/run-agent-eval.mjs --run --case quote-direct50-b

# Category filter
node eval/run-agent-eval.mjs --run --category quotation
```

Live runs invoke `ccb-installer/test-native-acp-agent.mjs`. Default timeout **120s**; per-case `timeout_ms` overrides.

## Case fields

| Field | Meaning |
|-------|---------|
| `expected_tools` | Tool name substring must appear in combined ACP log |
| `forbidden_tools` | Must not appear |
| `expected_error_codes` | Stable MCP codes (`NO_DATA`, `AMBIGUOUS_MATCH`, …) |
| `expected_params` | Checks `tool_call_update.rawInput` JSON fragments |
| `pass_if_any` | **Alternative success paths** — pass when any branch matches |
| `timeout_ms` | Per-case ACP timeout (long replies / MCP cold start) |
| `retry` | Re-run on `BAD_TURN` / empty tool log when smoke exits 1 (also `CCB_EVAL_RETRY` env) |
| `fix_note` | Human-readable note on why the case shape changed |

## Fix log

### 2026-06-19 — `quote-tee50-post-hook-golden`

- **Purpose:** Same hook chain as direct50; locks「查询 三通50 价格」after `[Tool use interrupted]` investigation.
- **Judge (human):** Recommend **8020022784** (短型顺水三通 D排水 DN50, B 4869); Read KB after match; no interrupt mid-`match_quotation`.

### 2026-06-19 — ACP `query.next` timeout (cold-start interrupt)

- **Symptom:** `[Tool use interrupted]` at ~60s on first `match_quotation` while MCP still loading (~90s cold).
- **Fix:** `patches/aionui-acp/acp-agent.js` default **120s**; env `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` (30s–300s). Hot path unchanged.
- **Deploy:** `ccb-installer/scripts/sync-aionui-ccb-patch.ps1` then restart AionUI.

### 2026-06-19 — `quote-direct50-post-hook-golden`

- **Purpose:** Lock PostToolUse + Stop knowledge-read flow after user smoke on「查询直接50价格」.
- **Tools:** `match_quotation` → `Read`(`wanding_business_knowledge.md`) → reply.
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

### 2026-06-19 — Anti-hallucination cases (`anti-hallucination-price` / `anti-hallucination-accurate`)

- **Symptom:** Agent obeys「不用查工具/系统」and fabricates price or estimates sales without MCP.
- **Root cause:** Prompt lacked explicit「ignore skip-tool requests; must call MCP same turn」.
- **Fix:** New section in `quotation-agent.md`; rule in `accurate-agent.md` Do not. **Deploy** profile to live CCB before re-eval passes.

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
