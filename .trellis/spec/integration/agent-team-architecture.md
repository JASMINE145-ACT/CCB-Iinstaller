# WanD Agent Team — Architecture & Calling Model

> **Purpose:** One readable map of how the **main agent** (`wande-orchestrator`) and **specialist subagents** work together — entry paths, session binding, delegation, guards, and hooks.  
> **Audience:** Anyone changing routing, Guid cards, `Agent()` behavior, or subagent hooks.  
> **Deep dive:** [`agents-unified-model.md`](./agents-unified-model.md) (canonical, 1000+ lines). **Hook index:** [`agent-hooks-overview.md`](./agent-hooks-overview.md).

**Last updated:** 2026-07-11

---

## When to read this doc

| You are… | Read this first, then… |
|----------|-------------------------|
| New to WanD agents | This doc → `agents-unified-model.md` § Four-layer model |
| Debugging orchestrator vs Guid direct | § Two entry paths + § Failure modes + § UI observability |
| Adding a specialist agent | [`../agent-expansion-template.md`](../agent-expansion-template.md) + § Roster |
| Fixing subagent hook / Read gate loops | § Hook layer + [`agent-hooks-overview.md`](./agent-hooks-overview.md) |
| Hardening delegation quality | Trellis `07-04-orchestrator-dispatch-hardening` + § Delegation mechanics |
| Changing default-session **identity** (entry vs router wording) | Trellis `07-11-orchestrator-employee-primary-entry` + § Glossary below |

---

## Glossary (entry vs routing)

| Term | Meaning |
|------|---------|
| **Employee primary entry** | Product identity of `wande-orchestrator`: default-session work assistant for the logged-in employee (`WANd.ENTRY.IDENTITY.001`) |
| **Routing / `Agent()`** | Implementation **tool** the entry agent uses to delegate business/domain work (`WANd.ROUTING.ASSIGNMENT.001`) — not the sole identity |
| **Specialist** | Domain agent with business MCP (quotation, accurate, work-tasks, office, research, …) |
| **Router-only (legacy phrase)** | Prefer **entry + routing tool**. Keep “no business MCP on default session” as a **safety** rule, not as the agent’s product name |

Registry: [`contracts/agent-runtime-registry.yml`](./contracts/agent-runtime-registry.yml) (`WANd.ENTRY.*`, `WANd.ROUTING.*`).

---

## One-line mental model

WanD runs a **fixed business agent catalog**: an **employee primary entry** (`wande-orchestrator`, no business MCP) plus **specialists** (quotation, accurate, office, research, work-tasks, …). Users enter via either **default-session** (entry → `Agent()` routing tool → specialist) or **Guid card direct** (specialist calls MCP itself, no `Agent()` targets).

This is **not** the generic Claude Code Explore/Plan subagent pool — it is product-specific catalog + runtime hard rules.

---

## Team roster

Canonical storage:

```text
%LOCALAPPDATA%\CCB-Wanding\.claude\agents\
  <agent-id>.md           ← L1 persona + mcpServers + hooks (CCB runtime authority)
  <agent-id>.aionui.json  ← L2 UI: display_name, guid_primary, delegatable, prompts
```

Bundled WanD vertical seeds: `ccb-installer/packages/vertical/com.wanding.trade/agents/`  
Office / research seeds: `ccb-installer/config/agents/`

```
┌─────────────────────────────────────────────────────────────┐
│                    WanD Agent Team                          │
├─────────────────────────────────────────────────────────────┤
│  🧭 wande-orchestrator   Employee primary entry — no biz MCP │
│                                                             │
│  Business specialists (Guid + delegatable)                    │
│    💰 quotation-agent     Pricing, inventory, quotation     │
│    📊 accurate-agent      Accurate purchase/sales totals    │
│    🏷️ price-library-agent Price library admin (see below)  │
│                                                             │
│  Office / research (delegatable from router)                │
│    word-creator, excel-creator, ppt-creator                 │
│    research-agent                                           │
│                                                             │
│  Platform built-ins (Explore/Plan/cowork) — router should   │
│  prefer WanD specialists when intent matches                │
└─────────────────────────────────────────────────────────────┘
```

### `delegatable` sidecar semantics

| Agent | `delegatable` | Behavior |
|-------|---------------|----------|
| `wande-orchestrator` | `false` | Primary entry — not an `Agent()` target (uses routing; is not a delegatee) |
| `quotation-agent`, `accurate-agent`, office agents | `true` | Default session may `Agent(id)`; Guid direct also works |
| `price-library-agent` | `false` (P1) | **Guid admin only** — orchestrator must not delegate until P1.5 + `price_admin` gate |

Orchestrator sessions may **bypass** `delegatable:false` for router-approved office presets via `filterDelegatableCustomAgents(..., { orchestratorSession: true })` + `getRouterDelegatableAgentIds()` (from `getAgentFleetPolicy()` / `package-registry.snapshot.json`, legacy fallback in `packageRegistry.ts`). See Trellis `07-04-orchestrator-dispatch-hardening`, `07-08-platform-agent-registry-acp-lint`.

AionUI **「创建团队」** Leader list and Guid sidebar project the same CCB catalog via **`fetchAssistantsCatalog.ts`** (`aionui-src/packages/desktop/src/common/assistants/`) + `useConversationAgents.ts` — not in this meta repo. Legacy spec name `ccbAgentCatalog.ts` is deprecated. See [`../frontend/file-map.md`](../frontend/file-map.md) §7 and `agents-unified-model.md` § Team / conversation catalog unification.

---

## Two entry paths

The same specialist can be reached two ways. Runtime behavior **differs** — do not assume one path implies the other.

### Path A — Default session (team / delegation mode)

```text
User opens WanD default / non-preset Guid send
        │
        ▼
  wande-orchestrator bound at session/new
        │
        │  Intent → routing table → Agent(subagent_type=…)
        ▼
  runAgent() spawns specialist (sync, same turn)
        │
        │  Specialist calls business MCP
        ▼
  Orchestrator verbatim forwards tables/paths to user
```

**Contract:** Orchestrator must **not** call `mcp__quotation__*`, `mcp__accurate__*`, `mcp__price-library__*` directly. It delegates via `Agent()`.

### Path B — Guid preset card (specialist direct mode)

```text
User taps「万鼎报价专家」/「万鼎账务专家」card
        │
        ▼
  quotation-agent | accurate-agent bound (isSpecialistDirectSession=true)
        │
        │  activeAgents = []  →  no Agent() targets exposed
        │  L1: "You ARE the specialist — call MCP directly"
        ▼
  Model calls mcp__* itself — no delegation layer
```

**Contract:** `createSession` sets `sessionDelegatableAgents = []` when `isSpecialistDirectSession`. L1 body must state specialist identity to block L0 CLAUDE.md orchestrator-rule bleed.

```text
                    Path A                    Path B
              ─────────────────           ─────────────────
Entry         Default primary entry       Guid specialist card
Bound agent   wande-orchestrator          quotation-agent / …
Agent() tool  Yes (filtered catalog)      Hidden ([])
Business MCP  Subagent only               Main session directly
Typical use   Mixed intent, office        Fast quotation / accounting
```

**Related tasks:** `07-04-orchestrator-dispatch-hardening`, `06-29-specialist-session-resume-profile-drift`

---

## Session binding (AionUI → CCB)

```text
AionUI: user selects Guid / default send
    │
    ├─ stageCcbAssistantProfileFromConversation()
    │     → .aionui-next-assistant-profile.json (300s TTL)
    │
    ▼
CCB: AcpAgent.createSession() @ session/new
    │
    ├─ resolveAssistantProfileIdFromMeta / consumeNextAssistantProfileId
    ├─ load agents/<id>.md + sidecar
    ├─ resolveSessionUserContextOverride()     ← block L0 persona bleed
    ├─ filterMcpConfigsForOrchestratorSession() ← strip business MCP on router
    ├─ filterDelegatableCustomAgents()          ← Agent() catalog
    ├─ appendWanDDelegationIndex()              ← inject delegation index (router only)
    └─ merge employee profile (session/new)     ← Settings → employee-profile.json
```

**Idle resume:** Specialist Guid sessions must re-bind the same profile after aioncore idle kill — not drift back to `wande-orchestrator`. Mechanisms: `resolveCcbProfileIdFromConversationExtra`, `inferCcbSpecialistProfileFromConversation`, `stageCcbAssistantProfileFromConversation`. Symptom when broken: `wande-orchestrator 不得直接调用业务 MCP` on a quotation card chat.

Detail: [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md), `agents-unified-model.md` § Specialist session resume.

### Key runtime functions (`agentSessionProfile.ts`)

| Function | Role |
|----------|------|
| `isSpecialistDirectSession` | Guid card with MCP allowlist → direct specialist |
| `isWandeOrchestratorSession` | Default employee primary-entry session |
| `resolveSessionUserContextOverride` | L1 system prompt vs L0 fallback |
| `filterDelegatableCustomAgents` | Who appears in `Agent()` list |
| `appendWanDDelegationIndex` | Auto-generated specialist catalog in router prompt |
| `filterMcpConfigsForOrchestratorSession` | Remove business MCP servers on router |
| `evaluateOrchestratorToolGuard` | Block direct business MCP + `TaskOutput` on router |
| `sanitizeOrchestratorAgentInput` | Strip `run_in_background` on router `Agent()` calls |

---

## Delegation mechanics (`Agent()` → subagent)

When the router calls `Agent(quotation-agent)`:

> **Source:** `ccb-installer/claude-code-b-src/packages/builtin-tools/src/tools/AgentTool/runAgent.ts` (CCB overlay; deploy via `sync-claude-code-b-mcp-prefetch.ps1` before live `D:\claude-code-B\dist` reflects it).

```text
┌──────────────┐     Agent tool      ┌─────────────────────┐
│ orchestrator │ ──────────────────▶ │ runAgent.ts         │
│ (parent)     │   sync, no bg       │                     │
└──────────────┘                     │ 1. Load L1 .md body │
       │                             │ 2. registerFrontmatterHooks
       │                             │    (Stop → SubagentStop)
       │                             │ 3. New agentId + subagents/agent-*.jsonl
       │                             │ 4. MCP from md mcpServers
       │                             │ 5. mergeEmployeeProfile (P9)
       │                             └──────────┬──────────┘
       │                                        │
       │◀──────── subagent full output ─────────┘
       ▼
  Verbatim forward (same turn — no「请稍候」placeholder)
```

### Router hard rules (code + L1 prompt)

| Rule | Implementation |
|------|----------------|
| No direct business MCP on router | `evaluateOrchestratorToolGuard`, `filterMcpConfigsForOrchestratorSession` |
| No `TaskOutput` polling | `evaluateOrchestratorToolGuard` |
| No background `Agent()` | `sanitizeOrchestratorAgentInput`; `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` (`wanDEnvBootstrap`) |
| Sync delegation only | `wande-orchestrator.md` playbooks (quotation, office, accurate) |
| Independent MCP repeat guard | `mcpToolRepeatGuard.ts` scopes by `context.agentId` |

### Subagent context asymmetry (fixed 2026-07-05)

Main session gets employee profile at `session/new`. Delegated subagents get the same block via `mergeEmployeeProfileIntoResolvedUserContext` in overlay `runAgent.ts` (after `omitClaudeMd`, ~L400–412) + `employeeProfile.ts`. Task: `07-06-employee-profile-settings-prompt` P9.

---

## Work Routing vs Execution (domain split)

Runtime behavior splits into two domains plus UI observability. **Full contract map + decision tree:** [`work-routing-execution-contracts.md`](./work-routing-execution-contracts.md) · registry [`contracts/agent-runtime-registry.yml`](./contracts/agent-runtime-registry.yml).

```text
Routing (who)          Execution (how)              Observability (show)
─────────────────      ─────────────────────      ──────────────────────
L1 playbook            runAgent.ts sync spawn       DelegationRun B0
evaluateOrchestrator   admission / no bg Agent      nested View Steps
ToolGuard              hooks + jsonl paths          SubagentDrawer
:roe-judge reviewer
```

| Question you're answering | Domain | Start here |
|---------------------------|--------|------------|
| Should orchestrator call MCP or `Agent()`? | Routing | `WANd.ROUTING.ASSIGNMENT.001` |
| Is subagent output ROE-compliant? | Routing | `WANd.ROUTING.REVIEWER.001` |
| Sync spawn, profile merge, transcript? | Execution | `WANd.RUN.EXECUTION.001` |
| View Steps tree / blocked status? | Observability | `WANd.OBSERVE.DELEGATION.001` |

**Rule:** Do not fix Execution admission in playbook prose, or Routing guards in View Steps components. Task: `07-09-work-routing-execution-contracts`.

---

## Hook layer (subagent delivery gate)

Delegated specialists and Guid-direct specialists share the same **product hooks** (`ccb-subagent-gate`, `ccb-personal-memory`). There is no separate `SubagentStop:` frontmatter key — agent `.md` declares `Stop:`; the runtime maps it to subagent stop when spawned via `Agent()`.

```text
Subagent turn
─────────────
PreToolUse   → Business gates (e.g. Read knowledge before match_quotation)
PostToolUse  → Nudges + session flags (transcript flush race mitigation)
Stop         → post-personal-memory-stop.py → subagent-gate.sh → roe-judge
```

### Transcript paths (important for PreToolUse)

| Transcript | Path pattern | Scanned by |
|------------|--------------|------------|
| Parent session | `{session}.jsonl` | PreToolUse default `transcript_path` |
| Subagent | `{session}/subagents/agent-{agentId}.jsonl` | Must be **derived** or passed as `agent_transcript_path` |

PreToolUse hooks that deny tools based on prior `Read` must check: parent path + derived subagent path + session flag (PostToolUse mark). Otherwise: infinite deny loop after Read in subagent. Shared lib: `hook_transcript.py`. Task: `07-07-quotation-match-acp-upstream-error` Track B.

Full matrix: [`agent-hooks-overview.md`](./agent-hooks-overview.md)

---

## Five-layer configuration (summary)

Do not mix layers. Full table: `agents-unified-model.md` § Four-layer configuration model.

| Layer | Source | Consumer | Responsibility |
|-------|--------|----------|----------------|
| **L0** | `CLAUDE.md` / index | All sessions (fallback) | Paths, tool discipline — **no** business routing |
| **L1** | `agents/<id>.md` body | CCB `customSystemPrompt` | Persona; router adds delegation index; specialists say「direct MCP」 |
| **L2** | `*.aionui.json` | AionUI shell | `display_name`, `guid_primary`, `delegatable` — **no** runtime `claude_md` |
| **L3** | md `mcpServers` | Session + `Agent()` spawn | Primary MCP source |
| **L4** | `vendor/wanding/data/*.md` | Specialist on demand | Business SOP — Read when triggered, not at session start |

**Router:** L1 = delegate only; L3 = no business MCP; runtime filter strips forbidden servers.  
**Specialist:** L1 first paragraph =「You ARE the specialist」; L3 = `quotation` / `accurate` / etc.

---

## Cross-cutting infrastructure

| Concern | Main agent | Delegated subagent |
|---------|------------|-------------------|
| Employee profile | `session/new` merge | `runAgent` merge (P9) |
| Personal memory | Stop hook → background worker | SubagentStop → same hooks |
| MCP warmup | `scheduleWanDMcpWarmup` on session/new | Inherits; cold start still possible |
| ROE delivery gate | Router: off | Specialists: `:roe-judge` block on Stop |
| Eval regression | `eval/agent_eval_cases.jsonl` | Cases for direct vs delegation paths |

---

## Example: quotation via Path A (delegation)

```text
User: "查直接50价格"
  │
  ▼
[wande-orchestrator]
  tool: Agent(subagent_type=quotation-agent, prompt="查直接50价格")
  │
  ▼
[quotation-agent subagent]
  PreToolUse: deny match until Read(wanding_business_knowledge.md)
  tool: Read(…)
  PostToolUse: mark session flag (data-md-read-gate / knowledge-read-gate pattern)
  tool: mcp__quotation__match_quotation
  Stop: roe-judge PASS
  │
  ▼
[wande-orchestrator]
  Same turn: verbatim forward price table to user
```

Path B skips orchestrator and the first `Agent()` hop; the subagent hook chain still runs on the main specialist session.

---

## UI observability — runtime tree vs AionUI (2026-07-06)

**Runtime (CCB / ACP) follows the diagram above.** When Path A delegation succeeds, the orchestrator calls `Agent(quotation-agent)` synchronously; the subagent runs `Read` + `mcp__quotation__*` under its own `agentId` and transcript (`subagents/agent-*.jsonl`); the orchestrator verbatim-forwards the result in the same turn. `wrapCanUseToolForWandeOrchestrator` **intentionally bypasses** orchestrator guards when `context.agentId` is set — child MCP and SOP reads are expected there, not router violations.

**AionUI View Steps (shipped B0, 2026-07-06):** `buildDelegationRuns` nests child tools under `Agent()` headers. Guid-direct sessions still show flat orphan steps (no fake delegation frame).

```text
RUNTIME (authoritative)                 AionUI View Steps (shipped B0)
═══════════════════════                 ═════════════════════════════════

[wande-orchestrator]                      ▼ 委派 → 万鼎报价专家 · done · 2 tools
  Agent(quotation-agent)                      ├─ Read …knowledge.md
    [quotation-agent child]                   └─ match_quotation
      Read → match_quotation                Reply   orchestrator 转发报价
  forward table
```

| Surface | What it shows | Status |
|---------|---------------|--------|
| **View Steps** (`MessageToolGroupSummary`) | Nested `DelegationRun` groups + running chip | **Shipped** — B0 reducer |
| **SubagentDrawer** | Task prompt + nested timeline when `turnToolMessages` passed | **Partial** — wiring caller-side |
| **CCB / eval logs** | `parentToolUseId` on child tool events | Authoritative for top-level vs subagent scope |

**How to tell delegation worked:**

1. View Steps shows `委派 → {displayLabel}` group with nested Read/MCP rows.
2. Agent output metadata shows `tool_uses: N` and an `agentId`.
3. ACP stderr: `[ACP] agent session profile applied: wande-orchestrator` on session/new.
4. Eval: subagent `mcp__quotation__*` after successful `Agent()` is **not** a spec violation (`!parentToolUseId` guard is top-level only).

**Deferred:** B1 CCB bridge `_meta.delegationRun`; unified expandable nested renderer; operator-language child labels. See [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) §3.4c.

**Delegation reliability** (model sometimes skips `Agent()`, timeouts) remains separate — task `07-04-orchestrator-dispatch-hardening`.

---

## Failure modes (quick triage)

| Symptom | Likely cause | Where to look |
|---------|--------------|---------------|
| Specialist card debates `Agent()` vs direct MCP | L0 bleed; `isSpecialistDirectSession` not applied | L1 body, `resolveSessionUserContextOverride`, CCB deploy |
| Resume →「orchestrator 不得调业务 MCP」 | Profile drift to router after idle | `06-29-specialist-session-resume-profile-drift`, warmup staging |
| Delegation ~120s delay | `subagent-gate.sh` stdin hang (orchestrator pipe) | `subagent-gate.sh` timeout cat pattern |
| Read knowledge but match still denied | PreToolUse scans parent transcript only | `hook_transcript.py`, `07-07` hook parity audit |
| View Steps shows Read + MCP without Agent row | UI flat list; child steps not nested under `Agent()` | § UI observability; expand Agent step / check `subagent_type` + `tool_uses` |
| Router calls `mcp__quotation__*` **at top level** (no `parentToolUseId`) | MCP filter / guard gap or model skipped `Agent()` | `filterMcpConfigsForOrchestratorSession`, `evaluateOrchestratorToolGuard`, eval logs |
| Read + MCP under `Agent()` only | **Normal Path A** when delegation succeeded | Not a router violation — child `context.agentId` |
|「请稍候」with no table | Background Agent or TaskOutput | `sanitizeOrchestratorAgentInput`, orchestrator playbooks |
| Delegation slower / erratic vs Guid | Model + eval gap | `07-04-orchestrator-dispatch-hardening`, `eval/scenarios/orchestrator-delegation-vs-direct-20260704.md` |

---

## WanD team vs generic Claude subagents

| | WanD agent team | Generic Claude Code agents |
|--|-----------------|----------------------------|
| Catalog | Fixed bundled + user agents under `.claude/agents/` | Explore/Plan/Bash built-ins |
| Entry binding | AionUI Guid + session profile handoff | CLI / IDE default |
| Delegation | `Agent(subagent_type=<business-id>)` | `Agent` / `Task` |
| Runtime guards | Orchestrator MCP guard + product hooks | Minimal |
| UI | Guid cards, Team leader list, sidecar metadata | N/A |

---

## Related Trellis tasks

| Task | Topic |
|------|-------|
| `07-04-orchestrator-dispatch-hardening` | Delegation smoke matrix, delegatable bypass, eval |
| `07-06-employee-profile-settings-prompt` | Main + subagent profile injection (P9) |
| `07-07-quotation-match-acp-upstream-error` | Hook transcript parity (Track B) |
| `06-29-specialist-session-resume-profile-drift` | Idle resume profile re-bind |
| `07-01-price-library-admin-agent` | `delegatable:false` phased orchestrator routing |
| `07-03-platform-business-decoupling` | Package registry, agent ID decoupling |
| `07-06-delegation-nested-view-steps` | View Steps nested delegation + **DelegationRun B0** (frontend reducer; B1 bridge deferred) |
| `07-09-work-routing-execution-contracts` | Routing vs Execution domain docs + `agent-runtime-registry.yml` |
| `07-09-idle-session-precipitation` | Idle 60s 五车道沉淀（Learning 域；子 task） |

---

## Related spec docs

| Doc | Use for |
|-----|---------|
| [`agents-unified-model.md`](./agents-unified-model.md) | Canonical deep reference (layers, hangs, ROE, encoding, deploy) |
| [`agent-hooks-overview.md`](./agent-hooks-overview.md) | Per-agent hook matrix |
| [`work-routing-execution-contracts.md`](./work-routing-execution-contracts.md) | Routing vs Execution domains + change decision tree |
| [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) | `session/new`, permissions, employee profile |
| [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) | Profile handoff, warmup, idle |
| [`../agent-expansion-template.md`](../agent-expansion-template.md) | Adding a new specialist |
| [`price-library.md`](./price-library.md) | Price library agent routing phases |

---

## Maintenance

When changing team behavior, update **this doc** if the mental model or entry paths change; put detail in `agents-unified-model.md`. Add eval cases in `eval/agent_eval_cases.jsonl` when L1 routing or tool choice changes.
