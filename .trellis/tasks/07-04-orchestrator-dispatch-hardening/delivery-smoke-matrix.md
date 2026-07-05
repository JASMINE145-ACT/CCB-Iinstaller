# Delivery smoke matrix — orchestrator dispatch hardening

**Task:** `07-04-orchestrator-dispatch-hardening` · **Date:** 2026-07-04  
**Harness:** `ccb-installer/test-native-acp-agent.mjs` (CLI partial) + manual AionUI (authoritative for AC3/AC4)

## Environment notes

| Item | Value |
|------|--------|
| CCB install (target) | `D:\CCB-Wanding` |
| Config | `%LOCALAPPDATA%\CCB-Wanding\.claude` |
| Route B | `CCB_TEST_ROUTE_ENTRY=1` (required for `bypassPermissions`) |
| Model | `minimax-m3` via settings env |
| CLI limitation | No Guid card UI; specialist cases use handoff file `.aionui-next-assistant-profile.json` |

**Known harness gaps (2026-07-04):**

- Direct `D:\CCB-Wanding\dist\cli.js --acp` without route-b fails: `bypassPermissions requires a local ACP bypass opt-in`
- Route-b `walkUp` may resolve install to repo `ccb-installer` (stderr `install=…`) — UI smoke remains canonical
- CLI does not assert subagent sync completion or table shape (only `completed_tools` + `end_turn`)

---

## Matrix

| # | Session | Prompt | Expect | CLI run | Result | Evidence / notes |
|---|---------|--------|--------|---------|--------|------------------|
| 1 | Default (`wande-orchestrator`) | 查直接50价格 | `Agent(quotation-agent)` same turn → price | route-b, `CCB_TEST_EXPECT_TOOL=Agent`, 120s | **FAIL (timeout)** | Model emitted many `agent_thought_chunk`; no `end_turn` within 120s; `completed_tools` empty at kill |
| 2 | Default | 1-5月销售额 | `Agent(accurate-agent)` → table | — | **pending** | Manual AionUI |
| 3 | Guid handoff `quotation-agent` | 查直接50价格 | direct `mcp__quotation__match_quotation`, no `Agent` | route-b, profile handoff | **FAIL** | Profile bound ✓; `completed_tools` empty; model used `AskUserQuestion`, cited orchestrator L0 rules /「不得直接调用业务 MCP」 |
| 4 | Guid handoff `accurate-agent` | 1-5月销售额 | direct accurate MCP | — | **pending** | Manual AionUI |
| 5 | Default | 做个 Word | `Agent(word-creator)` → docx path | — | **pending** | Blocked by P4 until WS C deployed |
| 6 | Guid quotation idle resume | 查库存 batch | profile `quotation-agent`, no orchestrator guard | — | **pending** | Verify 06-29 fix (handoff TTL 300s); manual idle ≥5min |
| **7** | **Default main entry** (`wande-orchestrator`) | 查直接50价格 | `Agent(quotation-agent)`; **no** `mcp__price-library__*` in tool list | — | **fixed 2026-07-04** | User: main entry still hit price-library; root cause ACP param overlay; CCB strip + guard deployed |

---

## CLI command recipes

```powershell
# Case 1 — default orchestrator delegation
$env:CCB_TEST_ROUTE_ENTRY='1'
$env:CCB_TEST_BYPASS='1'
$env:CCB_TEST_PROFILE=''
$env:CCB_TEST_PROMPT='查直接50价格'
$env:CCB_TEST_EXPECT_TOOL='Agent'
$env:CCB_TEST_TIMEOUT_MS='180000'
node d:\Projects\claude-code-best\ccb-installer\test-native-acp-agent.mjs

# Case 3 — specialist direct
$env:CCB_TEST_PROFILE='quotation-agent'
$env:CCB_TEST_EXPECT_TOOL='mcp__quotation__match_quotation'
$env:CCB_TEST_FORBID_TEXT='不得直接调用业务 MCP'
node d:\Projects\claude-code-best\ccb-installer\test-native-acp-agent.mjs
```

---

## Root-cause hypotheses (baseline)

| Symptom | Likely cause | Layer |
|---------|--------------|-------|
| Case 3: specialist reads orchestrator guard text | L0 `CLAUDE.md` / global persona bleed into specialist session; `userContextOverride` not isolating router rules | CCB session inject + config |
| Case 3: no `match_quotation` | Model chose `AskUserQuestion` over MCP; may be model/prompt, not tool ACL | runtime + model |
| Case 1: timeout without `Agent` | Orchestrator over-thinks on `minimax-m3`; delegation index present but not acted | model + eval gap |
| **Main entry 查价 → price-library MCP** | **Fixed 2026-07-04:** ACP `mcpServers` param overlay + guard only blocked quotation/accurate; orchestrator saw `price-library` tools | CCB `filterMcpConfigsForOrchestratorSession` + guard prefix |
| Route install path drift | `walkUpForInstall` from patch dir finds `ccb-installer` not `D:\CCB-Wanding` | route-b / deploy |

---

## WS B — idle resume (verify-only)

**06-29 delivery:** code shipped 2026-06-29 (`agent.ts` rehydrate fix, handoff TTL 300s, AionUI `ccbPresetConversationExtra`).  
**This task:** manual smoke only — preset 万鼎报价专家 → idle ≥5min → reopen → `查库存` / `get_inventory_by_code_batch`.  
**Pass log snippet:** `[ACP] agent session profile applied: quotation-agent` and no orchestrator MCP guard.

---

## Next actions

1. Manual AionUI matrix rows 2, 4, 5, 6 on `D:\CCB-Wanding` + dev AionUI
2. WS C: orchestrator `filterDelegatable` bypass → re-run case 5
3. Investigate case 3 L0 bleed (may need separate P0 if reproducible in UI)
4. WS D eval scenario for quantified default vs Guid comparison
