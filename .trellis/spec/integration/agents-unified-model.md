# CCB Agents Unified Model

> Canonical storage for CCB assistant/agent configuration in AionUI + CCB-Wanding.  
> Read this when changing assistant catalog I/O, migration, session handoff, or dual-read bridges.

---

## Overview

CCB assistants are stored as **canonical agent records** under:

```
%LOCALAPPDATA%\CCB-Wanding\.claude\agents\
  <agent-id>.md              ← Claude Code agent markdown (frontmatter + system prompt body)
  <agent-id>.aionui.json     ← AionUI sidecar (UI-only / shell metadata)
```

Legacy `assistants/*.json` profiles remain for **orphan dual-read** only. New saves go through the agent path when the profile normalizes successfully.

| Layer | Module | Role |
|-------|--------|------|
| Agent I/O | `aionui-src/.../ccbAgents.ts` | Read/write `agents/*.md` + `*.aionui.json` |
| Profile adapter | `aionui-src/.../ccbAgentCatalog.ts` | Map agent ↔ assistant UI shapes |
| Legacy profile I/O | `aionui-src/.../ccbAssistantProfiles.ts` | Read/write `assistants/*.json` (orphans) |
| Migration | `aionui-src/.../ccbAgentMigration.ts` | One-shot `assistants/*.json` → agents |
| Session handoff | `aionui-src/.../ccbAgentSession.ts` | Stage next session agent id on disk |
| IPC bridges | `ccbAgentsBridge.ts`, `ccbAssistantProfilesBridge.ts` | Renderer entry points |

---

## Canonical agent markdown + sidecar

### `agents/<id>.md`

Claude Code–compatible agent file:

- YAML frontmatter: `name`, optional `description`, `model`, `permissionMode`, `skills`
- Markdown body: system prompt (runtime authority for agent instructions)

### `agents/<id>.aionui.json` (sidecar)

Shell-owned metadata not carried in frontmatter:

| Field | Purpose |
|-------|---------|
| `agent_id` | Stable id (matches md basename) |
| `guid_primary` | Show on Guid preset cards when `true` |
| `delegatable` | Subagent/delegation eligibility (default `true`) |
| `enabled` | Catalog visibility / session eligibility |
| `avatar`, `sort_order` | Assistant Settings UI |
| `display_name` | Guid / Settings card title (Chinese product name) |
| `recommended_prompts` | Guid quick-prompt chips |
| `claude_md` | ~~Per-agent CLAUDE.md supplement~~ **removed (2026-06-17)** — persona lives in L1 `.md` body only |
| `mcp_allowlist` | MCP mirror for AionUI; CCB runtime prefers frontmatter `mcpServers` when present |
| `skills.enabled` / `skills.disabled` | Skill allow/deny lists |
| `source` | `user` \| `bundled` \| `imported` |
| `created_at`, `updated_at` | Catalog timestamps |

CCB runtime reads the md file; AionUI reads md + sidecar and projects into `Assistant` / `AssistantDetail` via `ccbAgentCatalog.ts`.

---

## Four-layer configuration model

WanD and office agents use **five logical layers** (L0–L4). Do not mix persona into L0 or route business SOP into L1.

| Layer | File | Consumer | Responsibility |
|-------|------|----------|----------------|
| **L0 Environment** | `CLAUDE.md` / `ccb-wanding-claude-index.md` | All sessions (fallback) | Paths, language, tool discipline, memory rules — **no** business persona or task routing |
| **L1 Persona** | `agents/<id>.md` body | CCB `customSystemPrompt` | Agent identity; orchestrator adds delegation index; **specialists** declare「直接调 MCP，勿委派」 |
| **L2 Runtime** | `agents/<id>.aionui.json` | AionUI shell | `display_name`, `avatar`, `guid_primary`, `delegatable`, `recommended_prompts`; **no** runtime `claude_md` |
| **L3 MCP** | md frontmatter `mcpServers` | CCB session + `Agent()` spawn | Primary MCP source (2026-06-17); sidecar `mcp_allowlist` is mirror/fallback |
| **L4 Business SOP** | `vendor/wanding/data/*.md` | Specialist runtime | Canonical handbooks; quotation/accurate workflow SOP **inlined in L1** (2026-06-16e); `wanding_business_knowledge.md` still **Read on demand** |

### Data handbook ↔ agent matrix

Base path: `D:\CCB-Wanding\vendor\wanding\data\` (install `vendor\wanding\data\`).

| Agent | Handbooks | Notes |
|-------|-----------|-------|
| `wande-orchestrator` | *(none)* | Must **not** Read business SOP; delegates via `Agent()` |
| `quotation-agent` | `wanding_business_knowledge.md` (on demand via `selection_context.knowledge_source`; **not** inlined in MCP JSON); `ccb-wanding-quotation.md` = **maint source** (inlined in L1) | Guid card = **direct fast quotation MCP session**; match default **10** candidates/line; frontmatter MCP = `quotation` + `excel` (excel = post-fill supplement only) |
| `accurate-agent` | `ccb-wanding-accurate.md` = **maint source** (inlined in L1) | Guid card = **direct** accurate MCP session; `mcpServers: [accurate]` for `Agent()` spawn only |
| Maintenance / debug | `data.Md` | Data contract only; not routine agent runtime |
| Ops docs (not agent SOP) | `ccb-wanding-pricing-system.md`, `ccb-wanding-update-server.md` | Developer / release docs |

### Memory on-demand design (2026-06-17)

所有 agent 遵循同一原则：**不在会话开始预读 memory；触发条件出现时才 Read 对应文件**。

| Agent | 触发条件 | 读取文件 |
|-------|---------|---------|
| `quotation-agent` | 客户名/等级偏好 | `memory/business/customers.md` |
| `quotation-agent` | 多候选/过往纠偏 | `memory/business/products.md` |
| `quotation-agent` | 折扣/含税口径 | `memory/business/pricing.md` |
| `accurate-agent` | 特定客户/供应商历史约定 | `memory/business/customers.md` |
| `accurate-agent` | 含税/利润率规则 | `memory/business/pricing.md` |
| `wande-orchestrator` | 个人工作偏好/惯例 | `memory/personal/workflow.md` |
| `wande-orchestrator` | 路由需要了解用户背景 | `memory/personal/profile.md` |

L0 CLAUDE.md 只保留写入规则和路径说明；强制预读指令已移除（2026-06-17）。 
各 agent L1 文件维护自己的触发规则和写入指引。Office agent（word/excel/ppt）不读 business memory。

### Fast path vs delivery path (2026-06-18g)

High-frequency chat agents should load the smallest MCP set that can produce a valid answer. Artifact delivery or post-processing should be a separate entry when it needs heavier tools.

| Agent/path | MCP | Reason |
|------------|-----|--------|
| `quotation-agent` | `quotation`, `excel` | Match/fill via `quotation`; **excel** (haris/openpyxl) post-fill read/verify/single-cell patch only |
| `word-creator` | `office-word` | Direct Word artifact generation; direct session warmup may prestart `office-word` |
| `excel-creator` | `excel` | Direct Excel artifact generation; direct session warmup may prestart `excel` |

Do not add supplemental MCP to the default fast path unless it is required in normal turns and appears in both frontmatter `mcpServers` and sidecar `mcp_allowlist`.

### Agent eval regression contract (2026-06-19)

Agent routing and tool-choice behavior now has a lightweight regression suite:

```text
eval/agent_eval_cases.jsonl
eval/run-agent-eval.mjs
```

Use it when changing:

| Change | Eval expectation |
|--------|------------------|
| `agents/<id>.md` L1 routing/persona | Add/update cases for direct specialist vs orchestrator delegation. |
| MCP tool descriptions or tool surface | Add/update `expected_tools`, `forbidden_tools`, and `expected_error_codes`. |
| Model defaults or permission modes | Run at least one live case for affected direct specialist cards. |
| Quotation / inventory / Accurate business rules | Add cases for no-data, ambiguous match, and anti-hallucination behavior. |

Case shape is intentionally small and deterministic:

```json
{
  "id": "quote-direct50-b",
  "category": "quotation",
  "agent": "quotation-agent",
  "input": "查一下直接50的B级价格",
  "expected_tools": ["mcp__quotation__match_quotation"],
  "expected_params": { "customer_level": "B" },
  "forbidden_tools": ["Agent"],
  "must_not": ["fabricate_price", "delegate_agent"],
  "risk_level": "read_only"
}
```

Run modes:

```powershell
# Schema only; no live ACP/API call.
node eval/run-agent-eval.mjs

# Live ACP single case. The runner passes case.agent as CCB_TEST_AGENT_ID.
node eval/run-agent-eval.mjs --run --case quote-direct50-b

# Live ACP category.
node eval/run-agent-eval.mjs --run --category quotation
```

`expected_tools` / `forbidden_tools` are checked from ACP update logs. `must_not` is a semantic checklist for human review or a future judge. Keep this as a regression guard, not a full evaluation platform.

### Global CLAUDE.md slimming (2026-06)

- `ccb-wanding-claude-index.md` no longer contains「角色定位」or「任务路由」— those live in `wande-orchestrator` L1/L2.
- `ensure-wanding-settings.ps1` injects slim index into `CLAUDE.md` CCB-WANDING-TOOLING block.
- `deploy-seed-agents.ps1` / `deploy-seed-agents.mjs` always overwrites `.aionui.json`; skips existing `.md` unless `-ForceMd` or GBK corruption detected.

---

## L1 self-contained model (2026-06-17)

**Goal:** L1 `.md` is the single runtime persona source; sidecar is UI-only.

| Phase | Change |
|-------|--------|
| **P0 (AionUI)** | `ccbAgentInputFromProfile` / `saveCcbAgent` fold legacy `claude_md` into `.md` body; sidecar no longer writes `claude_md` |
| **P0.5** | All writers of `agents/*.md` must UTF-8 no-BOM; `deploy-seed-agents.mjs` for safe deploy; GBK guard in deploy |
| **P1a seeds** | Keep-set sidecars cleared of `claude_md`; L1 bodies self-contained (incl. `word-form-creator`) |
| **P1b (CCB)** | `resolveSessionUserContextOverride`: when L1 `system_prompt` exists, ignore sidecar `claude_md`; orchestrator gets `{ currentDate }` only; specialists get minimal L0 blocker |
| **P1c (AionUI)** | `migration.ccbWandingL1SelfContained_v1` merges live sidecar → body and clears sidecar |
| **P2 (partial)** | `projectAgentToProfile` reads `mcpServers` from frontmatter with sidecar fallback |
| **P3** | Orchestrator verbatim passthrough (tables/paths copied from sub-agent; no summarize placeholders) |

**P1b gate:** Deploy P1b overlay only after P1a L1 verified clean (UTF-8 readable, body non-empty).

**Encoding:** Any script writing `agents/*.md` must use UTF-8 without BOM — see `config/agents/README.md`.

---

## Quotation/Accurate「卡住」at MCP execute (2026-06-17)

**Symptom:** UI shows `Agent → quotation-agent` then `mcp__quotation__match_quotation execute` with no reply for 60–90s (or ~120s on orchestrator delegation).

**Root causes (not L1 unified model regression):**

| Cause | Symptom pattern | Evidence | Mitigation |
|-------|-----------------|----------|------------|
| **Stop hook stdin hang (orchestrator delegation)** | MCP tool finishes but orchestrator waits **~120s** before showing sub-agent result; **direct Guid card sessions OK** | `subagent-gate.sh` `HOOK_INPUT="$(cat)"` inherits subagent IPC pipe; orchestrator side keeps pipe open → `cat` blocks until hook **120s timeout** | `HOOK_INPUT="$(timeout 8 cat 2>/dev/null \|\| echo '{}')"` in `ccb-subagent-gate/scripts/subagent-gate.sh`; redeploy via `deploy-subagent-gate-skill.ps1` |
| **Quotation MCP cold start** | First `match_quotation` slow (~90s); warm calls ~4–5s; affects **direct** and delegated paths | Direct MCP test: `test-quotation-mcp-timing.mjs` | `scheduleWanDMcpWarmup()` on session/new — overlay `wanDMcpWarmup.ts` |
| **query.next timeout < MCP cold start** | Tool card `[Tool use interrupted]` at **~60s** while MCP still loading; warm path OK | `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` was 60000 in `patches/aionui-acp/acp-agent.js` | Default **120000** ms; env override `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` (30s–300s). Hot path unchanged — only raises abort ceiling. Sync via `sync-aionui-ccb-patch.ps1` |
| **ACP permission prompt** | Stuck at permission UI | Native ACP smoke logs `[permission] mcp__quotation__match_quotation` | Auto-allow `mcp__quotation__*` / `mcp__accurate__*` in `permissions.ts` |
| **Wrong Python path when env missing** | MCP error in logs | `can't open ... aionui-src\python\main.py` | `settings.json` `mcpServers.quotation.env.CCB_PROJECT_ROOT` → `D:\CCB-Wanding\vendor\wanding` |
| **settings.json UTF-8 BOM** | Agents disappear / parse fails | `JSON.parse` fails without BOM strip | Strip BOM on read; UTF-8 no-BOM writes |

**Orchestrator delegation hang (fixed 2026-06-17):** subagent `Stop` hook → `subagent-gate.sh` → `cat` on stdin inherited from subagent IPC (orchestrator pipe still open) → hook blocks until CCB kills it at 120s → only then does orchestrator receive the delegated result. Direct specialist cards use ACP stdin that closes normally, so the same hook exits immediately.

**Deploy:** `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` (includes `wanDMcpWarmup.ts` + `permissions.ts`).

**Smoke scripts:** `ccb-installer/scripts/test-quotation-mcp-timing.mjs` (with live settings env).

---

## Specialist direct session (2026-06-15)

When the user opens a **Guid preset card** for `quotation-agent` or `accurate-agent`, the session is a **specialist direct session** — not a sub-delegation from `wande-orchestrator`. The model must call business MCP tools itself.

### Symptom (bug class)

User selects **万鼎账务专家** / **万鼎报价专家** but model thinking cites global CLAUDE.md「主会话 orchestrator 不直接调用业务 MCP」and debates `Agent()` delegation vs direct MCP — **empty-shell specialist**.

### Root causes

| Cause | Mechanism |
|-------|-----------|
| Global CLAUDE.md bleed | `userContextOverride` undefined → QueryEngine falls back to `getUserContext()` (L0 index still mentions orchestrator routing) |
| Delegation targets visible | Specialist session still exposes `Agent()` with `quotation-agent` / `accurate-agent` in `activeAgents` |
| Stale live `.md` | `deploy-seed-agents.ps1` skips user `.md`; L1 lacks「You ARE the specialist」identity block |

### CCB runtime contract (`agentSessionProfile.ts` + `agent.ts`)

| Function | Behavior |
|----------|----------|
| `isSpecialistDirectSession(sessionProfileId, profile)` | `true` when profile has non-empty `defaults.mcp.enabled` and id ≠ `wande-orchestrator` |
| `resolveSessionUserContextOverride(...)` | When L1 `system_prompt` present: specialist minimal L0 blocker or `{ currentDate }` only; **legacy** sidecar `claude_md` only when L1 body empty |
| `createSession` agents list | `sessionDelegatableAgents = []` when `isSpecialistDirectSession` — **no** `Agent()` targets in specialist card sessions |

```typescript
// claude-code-B/src/services/acp/agentSessionProfile.ts
export function isSpecialistDirectSession(
  sessionProfileId: string | undefined,
  profile: CcbAssistantProfile | null | undefined,
): boolean

export function resolveSessionUserContextOverride(args: {
  assistantProfile: CcbAssistantProfile | null | undefined
  sessionProfileId: string | undefined
  presetContext?: string
}): { [k: string]: string } | undefined
```

### L1 / L2 seed requirements (quotation + accurate)

**L1 (`agents/<id>.md` body)** — first paragraph must state:

- You **are** the specialist for this session (not `wande-orchestrator`)
- User selected the Guid card; **call MCP directly**
- Do **not** delegate via `Agent()` tool
- Ignore L0「orchestrator 不直接调用业务 MCP」— that applies only to default router sessions

**L2 (sidecar)** — UI metadata only (`display_name`, `guid_primary`, `mcp_allowlist` mirror). **Do not** store runtime persona in `claude_md` (removed 2026-06-17).

Handbook section title in L1: **业务知识库（按需 Read，不要预读）** for quotation; accurate has no separate handbook Read.

### Validation & error matrix

| Condition | Log / symptom | Fix |
|-----------|---------------|-----|
| Profile bound | `[ACP] agent session profile applied: accurate-agent` | OK |
| Wrong profile | `... applied: wande-orchestrator` on specialist card chat | New conversation; check handoff race / old session |
| Profile id set, files missing | `[ACP] session profile 'accurate-agent' not found` + placeholder userContext | Run `deploy-seed-agents.ps1`; patch live `.md` |
| Global bleed | Model quotes L0 orchestrator routing | Deploy P1b CCB; verify L1 body has specialist identity (not sidecar `claude_md`) |
| Delegation debate | Model considers `Agent(accurate-agent)` while already in accurate session | Deploy CCB with `isSpecialistDirectSession` → `agents: []` |

### Good / base / bad cases

- **Good:** New Guid chat → **万鼎账务专家** →「查询 1-5 月销售数据」→ direct `accurate_summarize_records`; no delegation thinking
- **Base:** Default Guid send (no card) → orchestrator → `Agent(accurate-agent)` for accounting questions
- **Bad:** Specialist card session → model reads L0 index → debates orchestrator rules while accurate MCP is in tool list

### Tests

| File | Assertion |
|------|-----------|
| `agentSessionProfile.test.ts` | `isSpecialistDirectSession`, `resolveSessionUserContextOverride` (sidecar + missing profile) |
| `agent.test.ts` | Profile `userContextOverride`; missing profile blocks global CLAUDE |

Deploy: `bun run build` → `deploy-claude-code-b-to-wanding.ps1` → `deploy-seed-agents.ps1` → **patch live `.md` if skipped** → restart AionUI → **new** specialist conversation.

---

## Subagent delivery gate (2026-06-18)

Runtime hard gate for WanD keep-set specialists — replaces「靠模型自觉跑 Delivery Gate」with hook-enforced validation.

### Problem class

Subagents (and historically Guid direct sessions without hooks) skip delivery QA and claim completion with empty docs, placeholder leaks, or fabricated MCP results.

### Architecture

| Layer | Location | Role |
|-------|----------|------|
| Hook entry | `agents/quotation-agent.md` frontmatter | `PostToolUse` (match) + `Stop` (gate) |
| Skill | `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\ccb-subagent-gate\` | Router + validators + `config/modes.json` |
| Delegation | `runAgent.ts` → `registerFrontmatterHooks(..., isAgent=true)` | `Stop` → `SubagentStop`, keyed by subagent `agentId` |
| Guid direct | `agent.ts` `createSession` → `registerSessionGateHooks` | `Stop` on main thread, keyed by `sessionId`; `setMainThreadAgentType(profileId)` |
| Cleanup | `teardownSession` / `runAgent` finally | `clearSessionHooks` |

### Validation modes (`config/modes.json`)

| Agent class | v1 mode | On failure |
|-------------|---------|------------|
| `word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator` | `block` | `exit 2` → query continues with blocking error (`word-creator` uses `word-creator-mcp.sh` — office-word MCP evidence, not officecli PAGE gate) |
| `quotation-agent` | `off` | MCP evidence validator disabled (2026-06-18 false REJECT) |
| `quotation-agent:knowledge` | `warn` (2026-06-19) | multi-candidate match without Read → `.claude/logs/subagent-gate-warn.log`, `exit 0` |
| `accurate-agent` | `warn` | log to `.claude/logs/subagent-gate-warn.log`, `exit 0` |
| `wande-orchestrator`, `cowork` | `off` / no-op | — |

PostToolUse `post-match-knowledge-nudge.py` runs on `mcp__quotation__match_quotation|match_quotation_batch` when `candidate_count > 1`; session dedupe ~45s so parallel matches get one nudge. Upgrade `quotation-agent:knowledge` to `block` only after warn false-positive review. Do **not** re-enable legacy `quotation-agent` MCP-only gate without delegated route-b smoke.

### Deploy

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1
.\ccb-installer\scripts\patch-subagent-gate-hooks.ps1   # live office agents without repo seeds
cd D:\claude-code-B; bun run build
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1
```

### Smoke matrix

| Scenario | Path | Expected |
|----------|------|----------|
| Empty docx | `Agent(word-creator)` | Hook blocks (`exit 2`) |
| Empty docx | Guid Word card | Hook blocks after `createSession` registration |
| Price claim, no MCP | quotation (either path) | MCP gate `off`; knowledge gate may warn if multi-match without Read |
| Multi-match, no Read, claims price | quotation Guid direct | Warn log line from `quotation-knowledge-read.sh` |
| Multi-match + Read + 1-pick reply | quotation | Pass |
| Valid MCP quotation | either path | Pass |

### Tests

| File | Assertion |
|------|-----------|
| `ccb-subagent-gate/tests/run-tests.sh` | Office block + quotation knowledge warn + Stop vs SubagentStop |
| `ccb-subagent-gate/tests/test_knowledge_read_gate.py` | PostToolUse nudge + transcript parser |
| `sessionGateHooks.test.ts` | `shouldRegisterSessionGateHooks`, profile lookup |

---

## Office preset empty L1 body bug (2026-06-16)

### Symptom

`Agent(subagent_type=word-creator)` (and other AionUI-originated office presets) delegated by `wande-orchestrator` skips mandated workflow steps and prematurely reports completion with incomplete output — even though the same preset works correctly when opened as a **Guid direct session**. *(Historical: word-creator previously used `officecli-docx` Delivery Gate; as of 2026-06-18c word-creator uses `office-word` MCP only — see § Word Creator MCP-only below.)*

### Root cause

`seedBuiltinAssistantsToCcbProfiles` / `ccbAgentInputFromProfile` (AionUI seeding pipeline that converts `builtin-assistants/assistants.json` entries into CCB agent records) only ever wrote the **L2 sidecar** `claude_md` field on `agents/<id>.aionui.json`. It never backfilled the **L1** `agents/<id>.md` body — so the canonical `.md` shipped with frontmatter only (`name` / `description` / `skills`) and an empty body.

`Agent()` sub-spawn reads **L1** (`.md` body) as the system prompt; L2 sidecar `claude_md` is only consumed via `resolveSessionUserContextOverride` for **direct/preset sessions** (see § Specialist direct session). Result: subagent delegation silently lost the entire persona + Delivery Gate enforcement text, while direct sessions looked fine — a two-tier bug that's invisible unless you diff `.md` line counts against the sidecar.

### Affected vs. unaffected

| File | Lines (before fix) | Status |
|------|---------------------|--------|
| `cowork.md`, `excel-creator.md`, `ppt-creator.md`, `word-creator.md`, `word-form-creator.md` | 6 (frontmatter only) | **bug** — AionUI-seeded, `source: bundled` |
| `accurate-agent.md`, `quotation-agent.md`, `wande-orchestrator.md` | 100–218 | OK — hand-authored directly under `ccb-installer/config/agents/`, deployed via `deploy-seed-agents.ps1`, never passed through the conversion pipeline |
| `my-custom.md` | 6 | **not a bug** — `source: "user"`, sidecar has no `claude_md` at all; genuinely empty user-created agent |

### Fix applied (live data, 2026-06-16)

Manually backfilled the `.md` body for the 5 affected `source: bundled` agents from their sidecar `claude_md` field (`\r\n` → markdown body), under `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`. This is a **live-file patch only** — it does not change the seeding pipeline source, so a future re-seed / `migration.ccbAgentsUnified_v1`-style run on a fresh profile could reproduce empty bodies again.

**Resolved (2026-06-17):** P0 patched `ccbAgentInputFromProfile` / `saveCcbAgent` in aionui-src — legacy `claude_md` folds into L1 body on save; sidecar no longer stores runtime persona. Live migration: `migration.ccbWandingL1SelfContained_v1`.

---

## Specialist agent md body GBK corruption bug (2026-06-17)

### Symptom

`Agent(subagent_type=accurate-agent)` / `Agent(subagent_type=quotation-agent)` delegated by `wande-orchestrator` behaves erratically — wrong tool calls, ignores SOP, may claim to be the orchestrator, or produces no result. The **same specialist works correctly when opened as a Guid direct session** (preset card).

### Root cause

`accurate-agent.md` and `quotation-agent.md` live files under `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` were written by a PowerShell 5.1 script without `-Encoding UTF8`. PowerShell 5.1's default encoding on Chinese Windows is the system ANSI codepage (GBK / GB18030). The resulting file appears to be UTF-8 on disk but the multi-byte sequences are GBK-encoded — so the content is corrupt when read as UTF-8.

| Session path | What the model reads | Effect |
|-------------|---------------------|--------|
| **Guid direct card** | Corrupted md body **+ clean sidecar `claude_md`** (via `resolveSessionUserContextOverride`) | Sidecar patches over the corrupted body; specialist works |
| **Orchestrator subagent** | Corrupted md body **only** (subagent spawn does not call `resolveSessionUserContextOverride`) | Model reads garbled identity rules; behavior is undefined |

Visible corruption in the body: Chinese characters like `万鼎` become `涓囬紟`, em-dash `—` becomes `鈥?`, key rule blocks like `「主会话 orchestrator 不直接调用业务 MCP」` become `銆屼富浼氳瘽 orchestrator 涓嶇洿鎺ヨ皟鐢ㄤ笟鍔?MCP銆嶁€?` — unreadable by the model.

This is the **asymmetry**: sidecar `claude_md` (stored as JSON string) is read back through `JSON.parse` which handles any byte sequence; but `.md` body files are read as raw filesystem text and must be valid UTF-8.

### Affected

`accurate-agent.md` and `quotation-agent.md` (any time a PowerShell script patches or rewrites them without `-Encoding UTF8`). Source files under `ccb-installer/config/agents/` were always clean (written by git on Unix-style tooling). The sidecar `.aionui.json` files were not affected.

### Fix applied (live data, 2026-06-17)

Force-copied the clean source files over the corrupted live files:

```powershell
Copy-Item "D:\Projects\claude-code-best\ccb-installer\config\agents\accurate-agent.md" `
    "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\accurate-agent.md" -Force
Copy-Item "D:\Projects\claude-code-best\ccb-installer\config\agents\quotation-agent.md" `
    "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md" -Force
```

Verify: `Get-Content <file> -Encoding UTF8 | Select-Object -First 5` must show readable Chinese on description line.

### Prevention — deploy-seed-agents.ps1 corruption guard

`deploy-seed-agents.ps1` normally skips existing `.md` files (user-wins policy). The script now additionally detects corruption on the description line and force-overwrites if the live file is corrupt:

```powershell
# If file exists but description line contains known GBK corruption markers → force overwrite
$descLine = Get-Content $dest -Encoding UTF8 -TotalCount 5 | Where-Object { $_ -match '^description:' }
if ($descLine -match '涓囬紟|鈥?|銆?') {
    # corrupted — treat as missing
}
```

Any PowerShell script that writes `.md` agent files must use `Set-Content -Encoding UTF8` or `[System.IO.File]::WriteAllText($path, $text, [System.Text.Encoding]::UTF8)` (no-BOM UTF-8 — see also § Agent markdown UTF-8 BOM).

---

## Role flags

| Flag | Storage | Consumer |
|------|---------|----------|
| `guid_primary` | sidecar | Explicit Guid card when `true`; **bundled** presets also show on Guid by catalog rule |
| `delegatable` | sidecar | CCB `filterDelegatableCustomAgents` + future subagent picker |
| `enabled` | sidecar | Assistant Settings list + conversation selectors |
| `display_name` | sidecar | UI title (falls back to md frontmatter `name`; keep `name` = agent id stem for CCB `Agent()` tool) |

**Guid catalog rule** (`filterGuidCatalogAgents` in `ccbAgentCatalog.ts`):

- Show: all **enabled** agents with `source: bundled` (matches pre-unification preset cards)
- Hide: `wande-orchestrator` only (default session router — no Guid card)
- Show: `quotation-agent`, `accurate-agent` as Guid shortcut cards + office bundled presets
- Default Guid send (non-preset) stages `wande-orchestrator`; router may **Agent()** delegate to all keep-set specialists
- Show: user agents only when `guid_primary === true`

**Repair migration** (`migration.ccbAgentsGuidCatalog_v1`): one-shot backfill `guid_primary` on bundled agents after `ccbAgentsUnified_v1` (fixes Guid showing only 3 seed cards).

Set on bundled seed agents via sidecar during migration or `deploy-seed-agents.ps1`.

---

## Session handoff file

When aioncore does not forward `acp_meta.ccbAgentId` / `ccbAssistantProfileId` into ACP `_meta`, AionUI stages the next agent id on disk:

```
%LOCALAPPDATA%\CCB-Wanding\.claude\.aionui-next-assistant-profile.json
```

Payload shape:

```json
{
  "profile_id": "<normalized-agent-id>",
  "staged_at": "<ISO-8601>"
}
```

- **Write path (unified):** `stageNextSessionAgent()` in `ccbAgentSession.ts`
- **IPC:** `ccbAgentsService.stageNextSessionAgent` (primary) and `ccbAssistantProfilesService.stageNextSessionProfile` (legacy wrapper — also calls `stageNextSessionAgent`)
- **Read path:** CCB `claude-code-B` consumes the file at session/new and clears after apply

Constant: `CCB_NEXT_ASSISTANT_PROFILE_FILE` in `ccbAssistantProfileSession.ts` (shared filename).

---

## Dual-read bridges

`ccbAssistantProfilesBridge.ts` keeps the legacy IPC surface while delegating to agents:

| Operation | Order |
|-----------|-------|
| **list** | `listCcbAgents()` → map to profiles; append legacy `assistants/*.json` orphans (ids not in agents) |
| **get** | `getCcbAgent(id)` first; else `getCcbAssistantProfile(id)` |
| **save** | Normalize profile → `saveCcbAgent(ccbAgentInputFromProfile(...))`; on failure or non-normalizable input → `saveCcbAssistantProfile` (true legacy orphan path) |
| **delete** | `deleteCcbAgent` if agent exists; else `deleteCcbAssistantProfile` |
| **stage next session** | `stageNextSessionAgent(profile_id)` |

`ccbAgentsBridge.ts` is the direct agent authority API (no legacy fallback).

When `listCcbAgents()` returns empty (CCB not installed), list falls back entirely to legacy profiles.

---

## Migration

> **Startup hook (2026-06-26):** `packages/desktop/src/process/utils/runBackendMigrations.ts` runs `CCB_MIGRATION_STEPS` after legacy `MIGRATION_STEPS`. Log prefix: `[AionUi] CCB migration step completed: <name>`. Requires **full app restart** (main process); renderer HMR is insufficient.

**Chain order in `CCB_MIGRATION_STEPS`:**

1. `migrateAionUiRuntimeConfigToCcb`
2. `migrateAssistantProfilesToCcbAgentsWithFlag`
3. `repairGuidCatalogFlagsWithFlag`
4. `pruneBundledAgentsNotInKeepSetWithFlag`
5. `repairWanDSubagentMcpServersWithFlag`
6. `repairWanDSpecialistGuidCardsWithFlag`
7. `repairOfficeAgentAgentTypeIdsWithFlag`
8. `repairWordCreatorOfficeWordMcpWithFlag`
9. `repairExcelCreatorExcelMcpWithFlag`
10. `repairWanDL1SelfContainedWithFlag`
11. `repairAgentMarkdownBomWithFlag`

- Flag: `migration.ccbAgentsUnified_v1` in AionUI local config
- Trigger: `migrateAssistantProfilesToCcbAgentsWithFlag()` during backend migrations
- Action: For each `assistants/<id>.json` without a matching agent, write `agents/<id>.md` + sidecar via `saveCcbAgent(ccbAgentInputFromProfile(profile))`
- Skip: invalid profiles, ids that already have agent records
- Log prefix: `[migration.ccbAgentsUnified]`
- **Does not delete** legacy `assistants/*.json` (orphan dual-read only)

**Guid catalog repair** (after unified migration):

- Flag: `migration.ccbAgentsGuidCatalog_v1`
- Trigger: `repairGuidCatalogFlagsWithFlag()` in `runBackendMigrations.ts` (step after unified migration)
- Action: set `guid_primary: true` on all `source: bundled` agents except `wande-orchestrator` (legacy); specialist cards re-enabled via `migration.ccbWandingSpecialistGuidCards_v1`
- Log prefix: `[migration.ccbAgentsGuidCatalog]`

**WanD preset prune** (office + routing keep set):

- Flag: `migration.ccbWandingPrunePresets_v1`
- Trigger: `pruneBundledAgentsNotInKeepSetWithFlag()` after Guid catalog repair
- Keep: `CCB_WANDING_KEEP_AGENT_IDS` in `ccbAgentCatalog.ts` — `wande-orchestrator`, `quotation-agent`, `accurate-agent`, `cowork`, `word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator`
- Delete: other `source: bundled` agents (`unlink` `.md` + `.aionui.json` + orphan `assistants/<id>.json`; `ENOENT` ignored)
- AionCore seed filter: `seedBuiltinAssistantsToCcbProfiles` skips builtins not in keep set

**Default session routing** (Guid Claude Code badge, no preset card):

- Constant: `CCB_DEFAULT_SESSION_AGENT_ID` = `wande-orchestrator`
- AionUI: `useGuidSend` builds `ccbDefaultRouteExtra` separately from preset extra; stages orchestrator when `ccbAuthorityActive && !is_preset`
- Warmup fallback: `warmupConversation` stages `wande-orchestrator` when extra has no agent id
- CCB: `resolveDefaultSessionAgentId()` in `createSession` when handoff + meta are empty
- Orchestrator `mcp_allowlist: []` → main session has no quotation/accurate MCP; delegation via `Agent(quotation-agent|accurate-agent)`
- **Subagent MCP:** `Agent()` spawn reads md frontmatter `mcpServers` (not sidecar `mcp_allowlist`). Seeds/migration must set `mcpServers: [quotation|accurate]` on specialist `.md` files. String-reference specs (e.g. `mcpServers: [quotation]`) are resolved via `getMcpConfigByName()` in `runAgent.ts`. **Config path split (fixed 2026-06-16):** `getMcpConfigByName` reads `.claude.json` via `getGlobalConfig()`; CCB-Wanding MCPs live in `settings.json`. Fix: `settings.json` fallback added at end of `getMcpConfigByName` in `D:\claude-code-B\src\services\mcp\config.ts` — calls `loadMcpConfigsFromSettings()` before returning `null`.
- **SOP tool examples (fixed 2026-06-18):** `quotation-agent.md` + `data/ccb-wanding-quotation.md` must show **direct** `mcp__quotation__*` tool calls (params JSON only). **Do not** document `ExecuteExtraTool({tool_name:…})` — Wanding ACP sets `ENABLE_SEARCH_EXTRA_TOOLS=false`; indirect calls fail and mislead the model. See [`route-b-status.md`](../backend/route-b-status.md) Update 2026-06-18.
- **Knowledge base path doubling (fixed 2026-06-17):** `quotation-agent.md` 业务知识库 section previously specified only `Base path: D:\CCB-Wanding\vendor\wanding\data\` (no filename), causing the model to double-concatenate path + filename in its Read call (garbled path). Additionally, the model would preemptively probe with `ls`/`dir` bash commands before Read — these always fail on Windows absolute paths. Fix: section now specifies the full absolute path `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` with explicit constraints: Read tool only, no bash probing, no re-concatenation.
- **Office preset Agent id (fixed 2026-06-18b):** frontmatter `name` on office agents must equal `agent_id` (`word-creator`, `ppt-creator`, …) for `Agent(subagent_type)`; Guid display title goes in sidecar `display_name`. Migration: `migration.ccbWandingOfficeAgentTypeIds_v1` in `ccbAgentMigration.ts`.
- **Word Creator MCP-only (2026-06-18c):** `word-creator` uses **only** `office-word` MCP — no `officecli-docx` skill. Seed: `ccb-installer/config/agents/word-creator.md` + `.aionui.json` (`mcp_allowlist: ["office-word"]`, `skills.enabled: []`, frontmatter `mcpServers: [office-word]`). Tools: direct `mcp__office-word__*` (same contract as quotation SOP — no `ExecuteExtraTool`). Migration: `repairWordCreatorOfficeWordMcp` (`migration.ccbWandingWordCreatorOfficeWord_v1`). `ccbAgents.serializeAgentMarkdown` persists `mcpServers` from `mcp_allowlist`. **Not changed:** `word-form-creator` still uses `officecli-word-form` skill. **Stale:** legacy `assistants/word-creator.json` may still list `officecli-docx` — runtime reads `agents/word-creator.*` first via `getProfileWithAgentDelegation`. **Old conversations** opened before switch may still inject officecli rules in first message; model may fall back to Bash `officecli` — use **new Guid session** after restart. See [`route-b-status.md`](../backend/route-b-status.md) Update 2026-06-18c.
- **Agent markdown UTF-8 BOM (fixed 2026-06-17):** PowerShell `Set-Content -Encoding UTF8` (e.g. `patch-subagent-gate-hooks.ps1`) writes BOM before `---`, so `loadAgentsDir` frontmatter regex fails and `quotation-agent` / `accurate-agent` disappear from `Agent()` list. Fix: `repairAgentMarkdownBomIfNeeded()` in `agentSessionProfile.ts` (called before `getAgentDefinitionsWithOverrides` in `agent.ts`); AionUI migration `migration.ccbWandingAgentMdBom_v1`; patch script now uses UTF-8 no-BOM. Symptom: orchestrator says「未挂载 quotation-agent」while office agents still delegate.
- Sidecar `claude_md` on orchestrator overrides global WanD `CLAUDE.md` routing index

**Subagent model override (Thinking switch, 2026-06-17):**

- Model resolution priority for a delegated sub-agent: env `CLAUDE_CODE_SUBAGENT_MODEL` (global) → `Agent()` tool `model` param (per-call) → agent `.md` frontmatter `model:` (pinned, e.g. `quotation-agent`/`accurate-agent` = `minimax-m3`) → `inherit` (main session model).
- Telling the model "请调用 thinking model" in chat text does **nothing** by itself — it only reaches the sub-agent's task prompt, not the model selector. The only reliable switch is the orchestrator passing `"model": "minimax-m3-thinking"` in the same `Agent()` call.
- `wande-orchestrator.md` (`ccb-installer/config/agents/wande-orchestrator.md` + live `.md`) carries a **"Thinking model switch"** rule: explicit keyword list (`thinking`/`深度推理`/`仔细想`/`认真分析`/`深入分析`/`复杂情况`/`多方案比较`/`再三确认`) → add `model` override to that turn's delegation call only; default stays fast; not sticky across turns unless the user asks for a standing session preference.
- Same class of fix as the empty-L1-body bug above: a capability that only works if it's wired into the **tool-call parameters** the orchestrator actually emits, not into prose the model is expected to interpret on its own.

**Orchestrator sync delegation + Word MCP efficiency (2026-06-17):**

- **Symptom:** `Agent(word-creator)` runs 50+ `mcp__office-word__*` steps; orchestrator replies「后台制作中 / 请稍候」before the Agent tool returns — user never sees `.docx` path. Quotation/Accurate: orchestrator uses **TaskOutput** to poll background agents (extra LLM round, stuck feel); Accurate subagent hits repeat guard on 3rd `accurate_summarize_records` because main + subagent shared one counter; orchestrator may tell user to「授权 Accurate MCP」.
- **Root cause:** (1) orchestrator may pass `run_in_background: true` on `Agent()`; (2) prompt allowed office placeholders unlike Accurate playbook; (3) repeat guard keyed only by `sessionId` — main orchestrator tool attempts counted against subagent MCP calls; (4) word-creator had no table-first / call-budget rules; (5) no runtime block on orchestrator `TaskOutput`.
- **Fix:** `agentSessionProfile.ts` — `sanitizeOrchestratorAgentInput()` strips `run_in_background` on orchestrator `Agent()` calls; `evaluateOrchestratorToolGuard()` blocks `TaskOutput` with sync-wait message (no「授权 MCP」). `mcpToolRepeatGuard.ts` — `repeatGuardScopeKey(sessionId, context.agentId)` so main vs subagent get independent repeat counters; exempt `mcp__office-word__*`. **`wanDEnvBootstrap.ts` + `ensureWanDSyncSubagents()`** — set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` before `AgentTool` module load so ACP never returns `Async agent launched` for delegated specialists (root cause of Accurate「查询还在进行中」with no table). Seeds: `wande-orchestrator.md`, `accurate-agent.md` (sales-invoice 全公司月报). Tests: 15/15 ACP unit tests. **Smoke:** new Guid →「1-5月销售额」→ sync `Agent(accurate-agent)` → Markdown table in same turn; no TaskOutput / no output-file Read.

- Flag: `migration.ccbWandingMcpServers_v1`
- Action: `repairWanDSubagentMcpServersWithFlag()` — injects `mcpServers` into live `quotation-agent.md` / `accurate-agent.md` when user md blocks seed deploy

**Office preset delegatable boundary:**

- Flag: `migration.ccbWandingOfficeDelegatable_v1`
- Action: `repairOfficePresetDelegatableWithFlag()` — originally set `delegatable: false` on `CCB_WANDING_OFFICE_PRESET_IDS` (cowork, word-*, ppt-*, excel-*)
- CCB: `filterDelegatableCustomAgents` removes non-delegatable custom agents from `Agent()` list; `buildWanDDelegationIndex` injects WanD specialist catalog into orchestrator system prompt at `createSession`
- **Applied then reverted (2026-06-17):** `delegatable: false` was initially set on all office presets to prevent non-WanD sessions from using them. **Reverted to `delegatable: true`** because `filterDelegatableCustomAgents` applies uniformly to ALL sessions — including the orchestrator itself — causing `Agent(word-creator)` / `Agent(ppt-creator)` etc. to fail with runtime rejection ("连续 2 次拒绝"). The migration flag `ccbWandingOfficeDelegatable_v1` should NOT be applied. Proper fix requires CCB source change: `filterDelegatableCustomAgents` should bypass `delegatable` check when `isWandeOrchestratorSession(sessionProfileId)` and `CCB_ROUTER_DELEGATABLE_AGENT_IDS.has(lookupId)`.
- **Current state (2026-06-17):** all office preset sidecars (`cowork`, `word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator`) have `delegatable: true` in both live sidecars and source `ccb-installer/config/agents/*.aionui.json`.

**Subagent UI (AionUI):**

- ACP `Agent` tool maps to `kind: think` with `rawInput.subagent_type` (see `bridge.ts` `toolInfoFromToolUse`)
- `MessageAcpToolCall` + `SubagentDrawer` — MVP shows task prompt + tool_call content; nested child tool timeline is follow-up

**Markdown parsing:** `ccbAgents.ts` supports YAML block scalars (`description: |`) so seed agent descriptions do not render as a lone `|` in Guid cards.

---

## Renderer authority routing

When CCB authority is active:

- Assistant Settings / conversation selectors prefer `ccbAgentsService` (or profile bridge dual-read)
- Saves must hit agent storage first (bridge save delegation enforces this for new agents)
- Legacy `/api/assistants` mirroring is best-effort compatibility only

See also:

- [`aionui-config-inventory.md`](./aionui-config-inventory.md) — ownership map
- [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) — 4-layer chain + handoff
- Task `06-14-ccb-assistant-catalog-authority` — catalog authority PRD

---

## Verification

| Test file | Covers |
|-----------|--------|
| `tests/unit/common-config/ccbAgents.test.ts` | md + sidecar round-trip, multiline `description: \|` |
| `tests/unit/common-config/ccbAgentCatalog.test.ts` | `filterGuidCatalogAgents` (bundled vs specialist hide) |
| `tests/unit/common-config/ccbAgentMigration.test.ts` | legacy → agent migration, mcpServers repair, office delegatable |
| `tests/unit/renderer/agentToolCallUtils.test.ts` | Agent delegation tool card detection |
| `tests/unit/process/bridge/ccbAssistantProfilesBridge.test.ts` | save-new-agent-via-wrapper, stage handoff |
| `claude-code-B/.../agentSessionProfile.test.ts` | CCB dual-read, delegatable filter, delegation index, **specialist direct session** |
| `claude-code-B/.../agent.test.ts` | Profile `userContextOverride`, missing-profile global CLAUDE block |
| `claude-code-B/.../bridge.test.ts` | Agent tool → `kind: think` (protocol probe for Subagent Drawer) |

```powershell
cd D:\Projects\aionui-src
.\node_modules\.bin\vitest.exe run tests/unit/process/bridge/ccbAssistantProfilesBridge.test.ts --reporter=dot

cd D:\claude-code-B
bun test src/services/acp/__tests__/agentSessionProfile.test.ts
```

### Manual smoke (post-deploy)

1. Deploy backend: `deploy-claude-code-b-to-wanding.ps1 -Backup`
2. Deploy seed agents: `ccb-installer\scripts\deploy-seed-agents.ps1`
3. Restart AionUI dev (`start-aionui-dev.ps1`) — migrations `ccbAgentsUnified_v1` then `ccbAgentsGuidCatalog_v1`
4. Guid: ~21 builtin cards with emoji + Chinese name + description (not only 3 English seed ids)
5. Guid lists `quotation-agent` / `accurate-agent` shortcut cards + office presets (~7 cards); **not** `wande-orchestrator`
6. Optional: `wande-orchestrator` card titled **万鼎协作** (🤝) via sidecar `display_name`
7. Open orchestrator chat → ask pricing question → CCB log: `Agent(subagent_type=quotation-agent)`
8. Subagent spawn log: `mcp__quotation__*` tool calls (requires `mcpServers` on specialist `.md`)
9. AionUI: Agent tool card shows「查看执行」→ SubagentDrawer with task prompt
10. **Specialist card (direct session):** New chat → **万鼎账务专家** →「查询 1-5 月销售数据」→ CCB log `agent session profile applied: accurate-agent`; direct `accurate_summarize_records` (no `Agent()` delegation debate)
11. **Specialist card:** Same for **万鼎报价专家** → direct `mcp__quotation__*` (no orchestrator persona in thinking)

### Agent format audit (2026-06-17)

Baseline audit of all live agents under `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`:

| Agent | Body lines | mcpServers | skills | model | hooks | delegatable | source |
|-------|-----------|------------|--------|-------|-------|-------------|--------|
| accurate-agent | 241 | accurate | — | minimax-m3 | ✓ | true | bundled |
| quotation-agent | 218 | quotation, excel | — | minimax-m3 | ✓ | true | bundled |
| wande-orchestrator | 120 | — (correct) | — | minimax-m3 | — (correct) | false | bundled |
| word-creator | 100 | office-word | — | — | ✓ | true | bundled |
| excel-creator | 92 | excel | — | — | ✓ | true | bundled |
| ppt-creator | 32 | — | ppt-master | — | ✓ | true | bundled |
| word-form-creator | 24 | — | officecli-word-form | — | ✓ | true | bundled |
| cowork | 28 | — | 4× skill | — | ✓ | true | bundled |
| my-custom | 2 | — | — | — | — | true | user |

**Fixes applied (2026-06-17):**
- `delegatable: false` initially set on office presets, then **reverted to `true`** — `filterDelegatableCustomAgents` blocks orchestrator delegation too (see § Office preset delegatable boundary for root cause and required CCB fix)
- `word-form-creator.aionui.json` added to `ccb-installer/config/agents/` (was absent from source)
- `accurate-agent.md` + `quotation-agent.md` live files restored from clean source (GBK corruption — see § Specialist agent md body GBK corruption bug)
- `word-form-creator.md` live file synced from source (skills field was string, source is array)
- `subagent-gate.sh` `HOOK_INPUT="$(timeout 8 cat …)"` — stops orchestrator subagent delegation from hanging 120s waiting for Stop hook (see § Quotation/Accurate「卡住」at MCP execute)

**Format norms (reference):**
- Specialists (accurate, quotation): `mcpServers` + `model` + `hooks` — all three required
- Office MCP agents (word-creator, excel-creator): `mcpServers` + `hooks`; no model pin (inherits session model)
- Office skill agents (ppt-creator, word-form-creator, cowork): `skills` array + `hooks`; no mcpServers
- Orchestrator: `model` only; no mcpServers, no hooks (intentional)
- `skills` field must be YAML array (`- skill-name`), not bare string

### Open follow-up

- Remove `ccbAssistantProfilesService` thin wrapper after manual smoke PASS (see plan `remove-thin-wrapper`)
- Solo chat Agent sub-turn UI polish (non-blocking)
- ~~**Fix `ccbAgentInputFromProfile` to backfill `.md` body**~~ **Done (2026-06-17)** — see § L1 self-contained model
