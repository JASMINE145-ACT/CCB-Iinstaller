# CCB Agents Unified Model

> Canonical storage for CCB assistant/agent configuration in AionUI + CCB-Wanding.  
> Read this when changing assistant catalog I/O, migration, session handoff, or dual-read bridges.  
> **Team / routing overview (shorter):** [`agent-team-architecture.md`](./agent-team-architecture.md) — main vs subagent paths, delegation, hooks map, **UI observability (flat View Steps)**.

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

**Avatar conventions (2026-06-29):** Each Guid card uses a **unique** sidecar `avatar` emoji. Bundled defaults: `quotation-agent` 💰, `accurate-agent` 📊, `excel-creator` 📈, `ppt-creator` 📽️, `word-creator` 📝. Any UI that lists preset assistants under CCB authority must load catalog via **`fetchAssistantsCatalog`** (`ASSISTANTS_LIST_SWR_KEY` = `assistants.list`), **not** raw backend `/api/assistants` — CCB authority stores agents on disk only. Consumers: `usePresetAssistantInfo` (sidebar), **`useConversationAgents`** (Team Create / cron / conversation agent picker). Resolve id from `ccb_agent_id` / `preset_assistant_id`; fallback `ccbAgentsService.getAgent`.

### Sidebar avatar fix (2026-06-29)

**Symptom:** Left sider「对话」list shows the same orange Claude star for every CCB Guid session; Guid preset cards show correct emoji (💰 📊 📽️ …).

**Root cause (two bugs):**

| # | Bug | Effect |
|---|-----|--------|
| 1 | `ppt-creator.aionui.json` shared `avatar: 📊` with `accurate-agent` | PPT card looked like 账务 on Guid picker |
| 2 | `usePresetAssistantInfo` used `useSWR('assistants')` → backend `/api/assistants` | Under CCB authority, avatars live in `ccbAgentsService` / `*.aionui.json` only → lookup miss → `getAgentLogo('claude')` fallback |

**Shipped (aionui-src + ccb-installer seed):**

| File | Change |
|------|--------|
| `ccb-installer/config/agents/ppt-creator.aionui.json` | `avatar` → **📽️** |
| `renderer/hooks/agent/usePresetAssistantInfo.ts` | `resolvePresetId` reads `ccb_agent_id` / `acp_meta`; catalog via **`fetchAssistantsCatalog`**; fallback **`ccbAgentsService.getAgent`** |
| `common/utils/ccbPresetConversationExtra.ts` | New sessions also set top-level `preset_assistant_id` |
| Tests | `tests/unit/renderer/usePresetAssistantInfo.test.ts`, `ccbPresetConversationExtra.test.ts` — **PASS** |

**Deploy / verify:**

```powershell
# Sidecar emoji (PPT 📽️)
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\deploy-seed-agents.ps1

# Renderer (sidebar icons) — canonical dev only
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -BuildAioncore:$false
```

1. Guid cards: five distinct emoji (PPT ≠ 账务).
2. Sidebar: open **万鼎报价专家** → new chat → row icon **💰** (not Claude star).
3. Repeat for 账务 **📊**, PPT **📽️**, Excel **📈**, Word **📝**.
4. Old sessions with `ccb_agent_id` in DB should pick up emoji after renderer reload (no re-login).
5. **Default Guid send (no card):** sidebar row shows **🧭** (wande-orchestrator), not Claude star — requires aionui `useGuidSend` + `resolveSidebarPresetLookupId` (2026-07-06).

### Sidebar default-route icon fix (2026-07-06)

**Symptom:** Guid 默认会话（未选助手卡片）创建的「你好」等在侧边栏显示 Claude / Gemini / Aion 混用 logo，而非工作助手 🧭。

**Root cause:** `useGuidSend` 未写入 `ccb_agent_id`；`usePresetAssistantInfo` 无 legacy 推断 → 回退 `getAgentLogo(backend)`.

**Shipped (aionui-src):**

| File | Change |
|------|--------|
| `renderer/pages/guid/hooks/useGuidSend.ts` | CCB + Claude execution engine → `buildCcbPresetConversationExtra(wande-orchestrator)` + stage profile |
| `renderer/hooks/agent/usePresetAssistantInfo.ts` | `resolveSidebarPresetLookupId` — legacy claude ACP + CCB authority → 🧭 via `ccbAgentsService.getAgent` |
| Tests | `useGuidSend.dom.test.ts`, `usePresetAssistantInfo.test.ts` — **25/25 PASS** (with `ccbPresetConversationExtra.test.ts`) |

**Verify:** restart dev → Guid 直接发「你好」→ 侧边栏 🧭；点「万鼎报价专家」→ 💰；旧 claude 会话（无 ccb_agent_id）→ 🧭。

### Team / conversation catalog unification (2026-06-29)

**Symptom:**「创建团队」Leader 列表仍显示上游 AionUI 内置助手（Morph PPT、Dashboard Creator、HUMAN 3.0 Coach…），而非万鼎 CCB 助手（万鼎报价专家 💰、PPT 演示助手 📽️ …）。

**Root cause:** `useConversationAgents` 使用独立 SWR key `assistants.presets` + `ipcBridge.assistants.list` → `/api/assistants`，绕过了 CCB disk catalog。侧边栏已在 `usePresetAssistantInfo` 修过；Team / 定时任务 / 对话 agent 选择器仍走旧路径。

**Shipped (aionui-src):**

| File | Change |
|------|--------|
| `renderer/pages/conversation/hooks/useConversationAgents.ts` | Preset 源改为 **`fetchAssistantsCatalog`** + 共享 **`ASSISTANTS_LIST_SWR_KEY`**；`enabled !== false` 在 **return** 侧过滤（不污染共享 SWR cache）；`refresh()` 同时 invalidate CLI + preset |
| Tests | `tests/unit/renderer/useConversationAgents.dom.test.ts` — **PASS** |

**Consumers fixed by this hook:**

| UI | Path |
|----|------|
| Team Create → Leader picker | `TeamCreateModal.tsx` |
| Cron → Create task | `CreateTaskDialog.tsx` |
| Conversation layout / agent status | `ChatLayout`, `MessageAgentStatus` |

**Deploy / verify:**

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -BuildAioncore:$false
```

1. 打开「创建团队」→ Leader 列表应出现 **万鼎报价专家**、**PPT 演示助手** 等 CCB 助手（emoji 正确），**不应**再出现 Morph PPT / Dashboard Creator。
2. CLI 引擎（Claude Code 等）仍保留在列表顶部。
3. 与 Guid 卡片、侧边栏 emoji 一致。

---

## Four-layer configuration model

WanD and office agents use **five logical layers** (L0–L4). Do not mix persona into L0 or route business SOP into L1.

| Layer | File | Consumer | Responsibility |
|-------|------|----------|----------------|
| **L0 Environment** | `CLAUDE.md` / `ccb-wanding-claude-index.md` | All sessions (fallback) | Paths, language, tool discipline, memory rules — **no** business persona or task routing |
| **L1 Persona** | `agents/<id>.md` body | CCB `customSystemPrompt` | Agent identity; orchestrator adds delegation index; **specialists** declare「直接调 MCP，勿委派」 |
| **L2 Runtime** | `agents/<id>.aionui.json` | AionUI shell | `display_name`, `avatar`, `guid_primary`, `delegatable`, `recommended_prompts`; **no** runtime `claude_md` |
| **L3 MCP** | md frontmatter `mcpServers` | CCB session + `Agent()` spawn | Primary MCP source (2026-06-17); sidecar `mcp_allowlist` is mirror/fallback |
| **L4 Business SOP** | `vendor/wanding/data/*.md` | Specialist runtime | Canonical handbooks; quotation/accurate workflow SOP **inlined in L1** (2026-06-16e); `wanding_business_knowledge.md` = **center authority via org API**, local file = **shadow Read-only** (2026-06-28) |

### Data handbook ↔ agent matrix

Base path: `D:\CCB-Wanding\vendor\wanding\data\` (install `vendor\wanding\data\`).

| Agent | Handbooks | Notes |
|-------|-----------|-------|
| `wande-orchestrator` | *(none)* | Must **not** Read business SOP; delegates via `Agent()` |
| `quotation-agent` | `wanding_business_knowledge.md` shadow **Read on demand**; `data.Md` **Read on demand** for `get_product_price_tiers`; `ccb-wanding-quotation.md` = **maint** — L1 slim seed + **Read §价格口径映射 on demand** (2026-06-28); org knowledge append via MCP | Guid card = direct quotation MCP; **multi-candidate = 1 推荐 + bullet**; MCP = `quotation` + `excel` |
| `accurate-agent` | `ccb-wanding-accurate.md` = **maint source** (inlined in L1) | Guid card = **direct** accurate MCP session; `mcpServers: [accurate]` for `Agent()` spawn only |
| Maintenance / debug | `data.Md` maint in repo `data/` + vendor shadow | Routine **single-tier** `match_quotation` does not Read; **multi-tier** `get_product_price_tiers` requires Read |
| Ops docs (not agent SOP) | `ccb-wanding-pricing-system.md`, `ccb-wanding-update-server.md` | Developer / release docs |

### Memory on-demand design (2026-06-17)

所有 agent 遵循同一原则：**不在会话开始预读 memory；触发条件出现时才 Read 对应文件**。

| Agent | 触发条件 | 读取文件 |
|-------|---------|---------|
| `quotation-agent` | 多候选选型 / 品类语义 / 用户纠偏 | `vendor/wanding/data/wanding_business_knowledge.md` (shadow) |
| `quotation-agent` | 调用 `get_product_price_tiers`（多档一览 / 档位含义） | `vendor/wanding/data/data.Md` — 用 `product_type` 对照 §来源映射 |
| `quotation-agent` | 客户名/等级偏好 | `memory/business/customers.md` |
| `quotation-agent` | 多候选/过往纠偏（会话 memory） | `memory/business/products.md` |
| `quotation-agent` | 折扣/含税口径 | `memory/business/pricing.md` |
| `accurate-agent` | 特定客户/供应商历史约定 | `memory/business/customers.md` |
| `accurate-agent` | 含税/利润率规则 | `memory/business/pricing.md` |
| `wande-orchestrator` | 个人工作偏好/惯例 | `memory/personal/workflow.md` |
| `wande-orchestrator` | 路由需要了解用户背景 | `memory/personal/profile.md` |

L0 CLAUDE.md 只保留写入规则和路径说明；强制预读指令已移除（2026-06-17）。 
各 agent L1 文件维护自己的触发规则和写入指引。Office agent（word/excel/ppt）不读 business memory。

### Personal memory Stop hook (1.1.7)

**Task:** `07-06-ccb-memory-auto-accumulation`

| Layer | Source | When |
|-------|--------|------|
| Structured identity | Settings → `employee-profile.json` | Session start (`userContextOverride`) **and** Agent-tool `runAgent` merge (P9, 2026-07-05) |
| Work habits | `memory/personal/workflow.md` | Stop/SubagentStop → **background** minimax-m3-thinking extract |

- Skill: `ccb-personal-memory` — `post-personal-memory-stop.py` **enqueues only** (before `subagent-gate.sh`); `personal-memory-worker.py` runs detached.
- Primary: Anthropic-compatible Messages API (`minimax-m3-thinking`); fallback: keyword heuristics inside worker.
- Status: `.claude/memory/.learning-status.json` → AionUI banner「Agent 正在学习记录您的习惯」while `learning` (stale 90s).
- Agents: `wande-orchestrator` (Stop), `quotation-agent`, `accurate-agent` (SubagentStop via same Stop hooks).
- Seed: `ensure-wanding-settings.ps1` → `memory/personal/*` only (no `business/` seed in 1.1.7).
- Manual: `/记住` → personal paths only. Business/org rules stay on `append_business_rule`.
- **UI (P6):** AionUI sider **记忆** → `/memory` tabs personal \| business; browse/edit files under `.claude/memory/` (path-jailed IPC).

**Trigger gate + extraction quality redesign (2026-07-06, task `07-06-memory-trigger-extraction-quality`):**

User complaint「不知道什么时候触发 / 提取一些没用信息」traced to real defects (diagnosis with file:line: `.trellis/tasks/07-06-memory-trigger-extraction-quality/research/trigger-extraction-diagnosis.md`). Contracts now in force:

- **Hook decision chain (sync, regex-only, single transcript read, no network):** `cooldown → no-new-lines → no-signal → enqueue`. Every skip is logged with reason (`skip: cooldown|no-new-lines|no-signal`); a skip writes **no** status (would clobber a concurrent worker's `learning` banner) and spawns nothing — banner appears only when the LLM is actually called.
- **State file** `.claude/memory/.learning-state.json` (new): `{"sessions": {"<sessionId>|<transcript-filename>": {"processedLines": int, "lastRunAt": ISO-8601}}}`. Composite key because SubagentStop transcripts have independent line counts. Whole decide→advance sequence runs under one `_FileLock` (`learning_state.claim_window`) — optimistic watermark pre-write at enqueue so concurrent Stop/SubagentStop can't double-extract (trade-off: a crashed worker's window is not retried; 宁少勿重). Cooldown = 60s per sessionId (prefix match over composite keys). Corrupt state → fail-open (full scan); >50 sessions pruned oldest-first.
- **Status file additive fields** (`.learning-status.json`): `skippedReason: str|null`, `lastEntries: [str] (≤3)`. The legacy 7 fields (status/startedAt/finishedAt/sessionId/agentType/entriesAppended/error) keep name+semantics — AionUI banner depends on `status=learning` + 90s stale; never rename.
- **Extraction validation matrix** (worker, both thinking + heuristic paths): entry must be `(target ∈ {workflow, profile}, text 6–120 chars, evidence)`; `evidence` must locate in the incremental transcript window (substring either way, or `SequenceMatcher.ratio ≥ 0.6`) else reject; near-duplicate vs full normalized bullet list of the target file (`ratio ≥ 0.85`) reject; business veto tiers: `BUSINESS_STRONG` (折扣/打折/含税/利润率/`\d折`…) vetoes alone, weak terms (客户/供应商/知识库/口径) need ≥2 distinct hits — so「我习惯先查供应商库存再报价」is captured while「折扣按9折」is blocked. Profile target is live end-to-end (was dead code pre-redesign).
- **Hygiene:** worker deletes its job manifest in `finally`; hook prunes jobs older than 7 days.
- **Wrong vs correct:** wrong = gate on `transcript_has_user_content` (fires the LLM + banner on every session end); correct = heuristic signal pre-gate in the hook, LLM only after a candidate exists in the **new** lines. Wrong = trusting model-reported confidence; correct = evidence grounding checked against the transcript.
- **Tests:** `python -m pytest ccb-installer/config/skills/ccb-personal-memory/tests/ -q` → 30 passed (asserts: no-signal→no job/status, incremental watermark, cooldown, evidence rejects, supplier-habit regression, discount veto, near-dup reject, profile e2e, job cleanup).

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

# Live ACP single case. The runner passes case.agent as CCB_TEST_PROFILE (alias CCB_TEST_AGENT_ID).
node eval/run-agent-eval.mjs --run --case quote-direct50-b

# Live ACP suite (smoke / core / full)
node eval/run-agent-eval.mjs --run --suite smoke
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding

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
| **Stop hook stdin hang / Windows timeout fail-open** | MCP tool finishes but orchestrator waits **~120s**, or gate silently receives `{}` and allows an incomplete reply | `cat` can wait on an inherited IPC pipe; bundled Git Bash resolves Windows `timeout.exe` (not GNU coreutils), and does not ship `dd` | `read-hook-input.mjs` incrementally parses the first complete JSON payload, emits NUL-delimited fields once, and keeps an 8s malformed/incomplete-input fallback; no GNU `timeout` dependency. Redeploy via `deploy-subagent-gate-skill.ps1` |
| **Quotation MCP cold start** | First `match_quotation` slow (~90s); warm calls ~4–5s | Direct MCP test: `test-quotation-mcp-timing.mjs` | **App open:** `warm-wanding-mcp.mjs` + `ccbStartupReadiness.ts` (task `06-28-app-startup-readiness-gate`). **Session:** `scheduleWanDMcpWarmup()` on session/new — `wanDMcpWarmup.ts` (still runs; app warm reduces first-send pain) |
| **First Guid send Failed to fetch** | `AIONUI_INTERNAL_ERROR` / `127.0.0.1:port` on first message | Send raced MCP warmup before app gate | Startup readiness gate: Guid send disabled until L2 ready; `useAcpInitialMessage` awaits `ensureStartupReadiness`. See [`mcp-health.md`](./mcp-health.md) § App startup readiness gate |
| **query.next timeout < MCP cold start** | Tool card `[Tool use interrupted]` at **~60s** while MCP still loading; warm path OK | `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` was 60000 in `patches/aionui-acp/acp-agent.js` | Default **120000** ms; env override `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` (30s–300s). Hot path unchanged — only raises abort ceiling. Sync via `sync-aionui-ccb-patch.ps1` |
| **query.next timeout drain-stuck orphan (2026-06-29)** | After timeout → `query.interrupt()` drain does not observe idle within MAX_DRAIN iterations → silent retry runs on busy subprocess → duplicate prompt execution → 错乱 | CCB CLI process ignores interrupt or is slow to respond; `done \|\| !m` was not tracked as clean-drain signal | `drainObservedClean` flag in `patches/aionui-acp/acp-agent.js` drain loop; silent retry gated on `drainObservedClean === true`; drain-stuck path logs `drain-stuck: no retry` and throws immediately — no duplicate execution |
| **ACP permission prompt** | Stuck at permission UI | Native ACP smoke logs `[permission] mcp__quotation__match_quotation` | Auto-allow `mcp__quotation__*` / `mcp__accurate__*` / `mcp__excel__*` in `permissions.ts` (#18); UI overlap fix in `MessageAcpPermission` (#17, NSIS) |
| **「全自动」假生效 (2026-07-01)** | UI shows 全自动 but `Read` on `%Temp%\aionui\` still prompts | `MessageAcpPermission` + green「响应已成功发送」; backend session still `default` | AionUI `ccbSessionPreferredModeStore` + `ensureCcbSessionPreferredMode` + `assertCcbSessionPreferredModeApplied` before send (`useAcpInitialMessage`, `AcpSendBox`); mount `getMode` must not overwrite store. **No** CCB Temp Read bypass. See [`chat-acp-flow.md`](../frontend/chat-acp-flow.md) §3.5 · task `07-01-aionui-full-auto-permission-sync` |
| **Wrong Python path when env missing** | MCP error in logs | `can't open ... claude-temp-*\python\main.py` | `config.js` fallback (#20); `ensure-wanding-settings.ps1` |
| **Inventory AOL false-negative (closed 2026-06-28)** | Guid 库存「AOL 未配置 / 暂不可查」但 health PASS | `inventory_unavailable` while `quotation.env.AOL_*` set | **Not missing credentials** — (1) `.env.accurate` UTF-8 BOM → `\ufeffAOL_ACCESS_TOKEN`; (2) `python-spawner.js` passed empty `AOL_*` overriding dotenv. Fix: `ensure-wanding-settings.ps1` + sync spawner/main/client; health now checks BOM+parse; **new Guid session**. Canonical: [`mcp-health.md`](./mcp-health.md) § AOL inventory — closed root cause |
| **settings.json UTF-8 BOM** | Agents disappear / parse fails | `JSON.parse` fails without BOM strip | Strip BOM on read; UTF-8 no-BOM writes |

**Orchestrator delegation hang (re-hardened 2026-07-16):** subagent `Stop` hook -> `subagent-gate.sh` now uses a Node incremental JSON reader. It exits as soon as the hook payload is parseable even if an inherited IPC writer stays open; malformed/incomplete input falls back after 8s. Do not reintroduce `cat`, Windows `timeout.exe`, or unavailable `dd` as the reader.

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

Handbook section title in L1: **业务知识库（查价硬约束 — 本会话 Read 一次）** for quotation; accurate has no separate handbook Read.

### Paired L1 source ↔ install seed must stay byte-equal (`WANd.AGENT.SEED.SYNC.001`)

Every `ccb-installer/staging/seed/agents/<name>.md` must be byte-equal to its source under
`ccb-installer/packages/vertical/com.wanding.trade/agents/<name>.md`. The repo has **no
automated source→staging sync step** — staging is hand-maintained and `deploy-seed-agents.ps1
-ForceMd` ships the staging byte stream to live installs. A L1 source edit (e.g. 2026-07-19
selection-API refactor) without a corresponding staging `cp` is a silent regression: live
installs run stale L1, sub-agent produces forbidden BAD shapes (e.g. 「A 选项」菜单,
「C 1」fill shortcut mixed into a 查价 reply).

**Guard:** `ccb-installer/config/skills/ccb-subagent-gate/tests/test_seed_sync.py` runs in
CI; scans **all 5 paired agents** (quotation / accurate / price-library / wande-orchestrator /
work-tasks), fails on ANY drift. Hard-pins `quotation-agent` specifically. Run locally:

```powershell
python -m pytest ccb-installer/config/skills/ccb-subagent-gate/tests/test_seed_sync.py -v
```

**Fix when drift detected:** the failure message lists the file + sha + delta; the script
prints the exact `cp -f` command. Don't add a build step that auto-syncs source→staging
inside this contract — it would mask the real bug (someone editing source without intent
to ship). Keep the gate loud.

### Validation & error matrix

| Condition | Log / symptom | Fix |
|-----------|---------------|-----|
| Profile bound | `[ACP] agent session profile applied: accurate-agent` | OK |
| Wrong profile | `... applied: wande-orchestrator` on specialist card chat | Deploy 2026-06-29 resume fix; reopen after idle — check warmup staging + rehydrate meta; else new conversation |
| Resume after idle | `wande-orchestrator 不得直接调用业务 MCP` on `mcp__quotation__*` | Profile drift on reopen — see § Specialist session resume (2026-06-29) |
| Profile id set, files missing | `[ACP] session profile 'accurate-agent' not found` + placeholder userContext | Run `deploy-seed-agents.ps1`; patch live `.md` |
| Global bleed | Model quotes L0 orchestrator routing | Deploy P1b CCB; verify L1 body has specialist identity (not sidecar `claude_md`) |
| Delegation debate | Model considers `Agent(accurate-agent)` while already in accurate session | Deploy CCB with `isSpecialistDirectSession` → `agents: []` |

### Good / base / bad cases

- **Good:** New Guid chat → **万鼎账务专家** →「查询 1-5 月销售数据」→ direct `accurate_summarize_records`; no delegation thinking
- **Base:** Default Guid send (no card) → orchestrator → `Agent(accurate-agent)` for accounting questions
- **Bad:** Specialist card session → model reads L0 index → debates orchestrator rules while accurate MCP is in tool list

### Specialist session resume (2026-06-29)

When a **specialist Guid card** conversation is reopened after idle (aioncore `IdleTimeout` kills CLI), the new ACP session must re-bind the same specialist profile — not default `wande-orchestrator`.

| Mechanism | Owner | Behavior |
|-----------|-------|----------|
| Extra resolve | AionUI `resolveCcbProfileIdFromConversationExtra` | Reads `ccb_assistant_profile_id`, `preset_assistant_id`, `ccb_agent_id`, and `acp_meta` aliases on `conversation.extra` |
| History inference | AionUI `inferCcbSpecialistProfileFromConversation` | When extra empty (legacy sessions): scan recent `acp_tool_call` — `mcp__quotation__*` → `quotation-agent`, `mcp__accurate__*` → `accurate-agent` |
| Pre-warmup stage | `stageCcbAssistantProfileFromConversation` in `warmupConversation.ts` | Resolve + stage to `.aionui-next-assistant-profile.json` before `/warmup` |
| Rehydrate guard | CCB `tryRehydrateStaleSession` | Do **not** pass stale `appliedProfileId` as `_meta.ccbAgentId` — lets fresh handoff win at `session/new` |
| Handoff TTL | AionUI + CCB | **300s** (`MAX_PENDING_PROFILE_AGE_MS`) |

**Symptom when broken:** User resumes 万鼎报价专家 → `get_inventory_by_code_batch` → `wande-orchestrator 不得直接调用业务 MCP` (`evaluateOrchestratorToolGuard` in `agentSessionProfile.ts`).

**Workaround until deployed:** Start a **new** conversation from the Guid preset card; do not continue a session that already drifted.

Task: `06-29-specialist-session-resume-profile-drift`.

### Tests

| File | Assertion |
|------|-----------|
| `agentSessionProfile.test.ts` | `isSpecialistDirectSession`, `resolveSessionUserContextOverride` (sidecar + missing profile) |
| `ccbPresetConversationExtra.test.ts` | Extra alias resolve + history inference for specialist resume |
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
| Guid direct | Agent `.md` frontmatter `hooks.Stop` → Claude hook engine + `ccb-subagent-gate` skill | Main-thread Stop keyed by profile id in transcript; **no** `registerSessionGateHooks()` in repo overlay (2026-07-02 audit) |
| Cleanup | Session end / subagent `runAgent` finally | Hook state cleared by upstream Claude Code hook runtime |

### Validation modes (`config/modes.json`)

| Agent class | v1 mode | On failure |
|-------------|---------|------------|
| `word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator` | `block` | `exit 2` → query continues with blocking error (`word-creator` uses `word-creator-mcp.sh` — office-word MCP evidence, not officecli PAGE gate) |
| `quotation-agent` | `off` | MCP evidence validator disabled (2026-06-18 false REJECT) |
| `quotation-agent:knowledge` | `off` (2026-07-19) | API-first `select_quotation_candidates`; no forced session Read before match. PreToolUse pre-match gate removed from L1. |
| `quotation-agent:roe` | `off` (2026-06-29) | Merged into universal `:roe-judge` — see § Universal ROE below |
| `{agent}:roe-judge` (all Stop-hook agents) | `block` (2026-06-28; slim 2026-06-29) | Universal end_turn gate — write-anchor + L2; `exit 2` + REJECT → auto-continue |
| `research-agent:roe-judge` | `block` (2026-07-02) | Same universal ROE; `modes.json` aligned with `research-agent.md` Stop hook |
| `accurate-agent` | `warn` | log to `.claude/logs/subagent-gate-warn.log`, `exit 0` |
| `wande-orchestrator` | `off` (base) | agent-specific MCP validators no-op |
| `wande-orchestrator:outcome-relay` | **`block`** (2026-07-16) | Parent Stop: Agent artifact (`output_path`/`.xlsx`/`filled_count`) must appear in parent bubble; strategy A nudge×1 → force-forward REJECT (`WANd.ORCH.OUTCOME_RELAY.001`) |
| `cowork` | `off` / no-op | — |
| `price-library-agent` | *(no Stop hook by design)* | Admin write path uses MCP `confirmed=true` two-phase + org API; ROE via business rules not `:roe-judge` (2026-07-02) |

**Selection + knowledge (2026-07-19 API-first):**

| Hook | Script | When | Effect |
|------|--------|------|--------|
| ~~PreToolUse~~ | ~~`pre-match-knowledge-gate.py`~~ | — | **Removed** from L1 (script may remain on disk unused) |
| PostToolUse | `post-match-knowledge-nudge.py` | `candidate_count > 1` | Nudge **`select_quotation_candidates`** (not Read-first); session dedupe ~45s |
| PostToolUse | `post-knowledge-read-mark.py` | Agent `Read` knowledge | Marks session if fallback Read happens |
| PostToolUse | `post-price-tiers-nudge.py` | `get_product_price_tiers` + `tier_count > 0` | Read `data.Md` + markdown tier table |
| PostToolUse | `post-quotation-relay-nudge.py` (2026-07-20; L1-wired; `:relay-guard` **off** = not a Stop gate) | `select_quotation_candidates` → `status:ok` | Nudge assistant text to include locked code + L1 GOOD pattern; 45s session dedupe; **nudge-only** (hook does not read `modes.json`; `off` means no Stop gate). Must appear in `quotation-agent.md` frontmatter or it never runs. |
| Stop | `quotation-knowledge-read.sh` (`:knowledge` **off**) | End of turn | No-op — do not block match without agent Read |

**Session rule:** happy-path selection is **`select_quotation_candidates`** (tool loads knowledge). Agent `Read` only on `unable_to_select` / selector unavailable. Do **not** force Read before first `match_quotation`.

**Orchestrator relay strict (2026-07-20, `WANd.QUOTE.ORCH.RELAY.STRICT.001`):**

For query-type sub-agent results (no artifact, e.g. 查价 / 选型 / 名录查询), `wande-orchestrator`
final user reply must **原样转述** at least one of the following from sub-agent's tool trace:

- locked material code (e.g. `8020020755`) and unit price (e.g. `¥1,219`)
- supplier section (≥1 `name_zh` from `suppliers_hybrid_match.items[]`)
- select `reason` (e.g. 「按§4.1.2…」)

Do **not** paraphrase sub-agent results as 「待继续确认」 / 「报价专家未返回价格表」 / 「关键词太短」 etc. when
the sub-agent's tool trace already produced a locked code + price + supplier section. Original
`WANd.ORCH.OUTCOME_RELAY.001` covers artifact-bearing results (fill_quotation_sheet output);
this contract extends to **query-only** results. The `wande-orchestrator:outcome-relay` Stop
gate stays `block` — it now also triggers on query-only relay failures (nudge×1, then force-forward
REJECT, same as before).

Deploy:

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

Verify:

```powershell
Select-String -Path "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md" -Pattern "PreToolUse|pre-match-knowledge"
# expect: no PreToolUse / pre-match hits in frontmatter
(Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\skills\ccb-subagent-gate\config\modes.json" -Raw | ConvertFrom-Json).'quotation-agent:knowledge'
# expect: off
```

Do **not** re-enable legacy force-Read-before-match without an explicit Trellis decision.

### Quotation multi-candidate reply (2026-06-29; select API 2026-07-19)

**Problem:** `candidate_count > 1` 时 agent 把 `candidates` 整表倒灌 + 「请回复 1A/2B/3C/4D」，与用户要求的 **agent 选定 1 条 + 简要列其他** 冲突。

**Normative flow @ 查价（只读，2026-07-19）：**

```
查价（本会话）
  → match_quotation / match_quotation_batch
  → select_quotation_candidates（主流；工具内加载知识）
  → status=ok → 锁码 → 1 条推荐价 + ≤4 bullet「其他可能」
  → unable_to_select → Read 知识库 fallback 自选 → 同上
  → 禁止默认大表 + 请选序号/A/B/C/D
```

| Layer | Artifact | Role |
|-------|----------|------|
| Maint SOP | `data/ccb-wanding-quotation.md` §报价匹配规则 | match → select API；多候选 1 推荐 + bullet |
| L1 seed | `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` | API-first + Read fallback；`deploy-seed-agents.ps1 -ForceMd` |
| PostToolUse | `post-match-knowledge-nudge.py` | 多候选 → nudge select（不要先 Read） |
| PostToolUse | `post-price-tiers-nudge.py` | `get_product_price_tiers` 成功 → Read data.Md + markdown 全档表 |
| Stop `:knowledge` | `quotation-knowledge-read.sh` | **off** — 不再因无 agent Read 阻断 |
| Selection rules | `wanding_business_knowledge.md` | 由 select MCP 加载；§9 才必须向用户澄清 |
| Memory | `memory/business/products.md` | 过往纠偏优先于默认选型 |

### Quotation sheet fill defaults (2026-06-28)

**Problem:** After `match_quotation` in the same session, agent asks a 4-question checklist (customer level, template, line items, currency) before `fill_quotation_sheet` — redundant and blocks ROE.

**Contract:** Once prices are matched and shown in the reply table, user says「生成/填写报价单」→ **immediate** `fill_quotation_sheet` with session-inherited `fill_items` (`require_exact_codes=true`). **Do not re-ask:**

| Field | Default |
|-------|---------|
| `customer_level` / `unit_price` | From prior match in session |
| Template | Built-in **VANTSING** blank (`default_blank_template()` — no `template_path`) |
| Line items | All rows already matched in session unless user adds more |
| `qty` | User value, else `1` |
| Date / currency | Tool default today; **IDR** (WanD standard sheet) |

**Still clarify only when:** no prior match + no item list; unresolved multi-candidate; user explicitly requests custom template path or non-default tier.

| Layer | Artifact |
|-------|----------|
| L1 seed | `quotation-agent.md` §生成报价单 — 默认值 |
| Maint | `data/ccb-wanding-quotation.md` §生成报价单 — 默认值 |
| Tool | `fill_quotation_sheet` — `quotation_date` optional; VANTSING layout in `python/quotation/layout.py` |

Deploy: `deploy-seed-agents.ps1 -ForceMd` + `deploy-subagent-gate-skill.ps1` + `sync-dev-wanding-vendor.ps1` → **new Guid session**.

### `fill_quotation_sheet` MCP schema parity (2026-06-30)

**Problem:** L1 §Path 路由 documented Path C (`fill_items` only), but MCP `ListTools` still required `file_path` and omitted `fill_items` → agent invented `blank` or output filenames → `FILE_NOT_FOUND` / ROE `file_path is required` loop.

**Fix contract:** MCP `index.js`, `tool_schema.py`, `fill_path_guard.py`, ROE `quotation-agent.json` aligned — see [`../backend/mcp-business.md`](../backend/mcp-business.md) § `fill_quotation_sheet` Path routing & MCP schema.

| Symptom | Root cause | Fix layer |
|---------|------------|-----------|
| `file_path is required` with only `fill_items` | MCP schema `required: ["file_path"]` | `index.js` schema |
| `FILE_NOT_FOUND` on `blank` | Path A with placeholder path | `fill_path_guard` + agent Path C |
| ROE retry says "with file_path" | Stale `execute_tools_hint` | `roe-judge-profiles/quotation-agent.json` |

### VANTSING sheet capacity & Excel formulas (2026-06-30)

**Problem:** Blank VANTSING template has only **10 data rows** (Excel 8–17). Beyond that, naive `insert_rows` left footer merges on new rows → quote columns became read-only `MergedCell`. `fill_quotation` also overwrote template footer formulas with Python static sums.

**Contract** (`python/quotation/quote_tools.py`):

| Topic | Behavior |
|-------|----------|
| >10 items | Insert rows before Total; unmerge/restore footer merges; copy row styles |
| Row total (VANTSING) | N `=M{row}*K{row}`; 无货 → `0` |
| Footer (VANTSING) | Dynamic `SUM` / PPN `*0.11` / freight static / grand `SUM` |
| Agent | Forbidden: excel MCP insert rows or overwrite N/footer formulas after fill |

Detail: [`../backend/mcp-business.md`](../backend/mcp-business.md) § VANTSING fill insert-rows & Excel formulas. Task: `.trellis/tasks/06-30-quotation-template-insert-rows-merge-fix`

### learn-by-data skill (2026-06-30; select-first 2026-07-20)

**Goal:** From a human-filled **VANTSING** Excel, re-run `match_quotation_batch` per inquiry line, compare **agent_pick_code** (same **select-API-first** path as quotation-agent §选型 / `WANd.QUOTE.SELECT_WIRE.001`) vs human `product_no` (col F), output knowledge snippets or severe flags.

| Item | Path / contract |
|------|-----------------|
| Skill source | `ccb-installer/packages/vertical/com.wanding.trade/skills/quotation-learn-by-data/SKILL.md` |
| Agent wiring | `quotation-agent.md` on-demand `Skill(quotation-learn-by-data)` + §工具决策表 `/learn-by-data` row |
| Live deploy | `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\` via `deploy-quotation-learn-by-data-skill.ps1` / `deploy-ccb-skills.ps1` |
| MVP scope | VANTSING only — fixed cols B/C keywords, F actual code, rows 8..Total-1 |
| Match + select | `match_quotation_batch` (`show_candidates=true`, ≤10/batch) → **一次** `select_quotation_candidates`（完整 `results`）→ 对比表；`unable_to_select` 才 Read 知识库（`WANd.LEARN.SELECT_FIRST.001`） |
| KB path | Canonical shadow `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` or `selection_context.knowledge_source`；**禁止** `.claude\vendor` 拼接与 Bash/find（`WANd.LEARN.KB_PATH.001`） |
| Outputs | Section A: in-candidates mismatch → `append_business_rule` preview; Section B: not-in-candidates / 0-candidate |
| Smoke fixture | `data/smoke/learn-by-data-vantsing-filled.xlsx` — regen: `python python/scripts/generate_learn_by_data_smoke_fixture.py` |
| Task (select-first) | `.trellis/tasks/07-20-learn-by-data-select-first` |

Task (original): `.trellis/tasks/06-30-quotation-learn-by-data-skill`

**Phase 2 — price library enrich (2026-07-06):** Task `07-06-learn-by-data-price-library-enrich`

| Change | Detail |
|--------|--------|
| Section B oracle | `get_product_price_tiers(actual_code)` — in PL → `人工核查`; not in PL → `实际料号无效` |
| Section C | Agent `top_code` missing from PL → `upsert_price_library_item` (`confirmed=false` first); **no tier prices** on learn-by-data path |
| Agent MCP | `quotation-agent` allowlist + `price-library` (org API still gates `price_admin`) |
| MCP schema | `upsert` exposes `source_file`, `source_sheet`, `source_row`, `superseded_by_source` |
| Helper | `python/quotation/learn_by_data_price_library.py` |

**UI observability (2026-07-01):** Tasks `07-01-quotation-skills-ui-quick`, `07-01-ccb-agent-skills-ui-unified`, `07-01-quotation-slash-discovery`, `07-01-agent-attention-notifications`.

| Surface | Expected |
|---------|----------|
| Guid `+` → 本会话技能 | `quotation-learn-by-data` under **Agent 专属技能** when `quotation-agent.aionui.json` `skills.enabled` + deploy |
| Guid 推荐 prompt | `recommended_prompts` on sidecar — chip「按数据学习…」 |
| 会话 `+` → 已加载技能 | Agent-bound ∪ platform (`mergeConversationLoadedSkills` in aionui-src) |
| Slash `/learn-by-data` | `ccb-installer/resources/commands/learn-by-data.md` → `%LOCALAPPDATA%\CCB-Wanding\.claude\commands\` (start-dev-full deploy) |
| 后台注意力（Cursor 式） | 不在该会话时：`confirmation.add` / agent turn 结束 → OS Toast + 侧边栏蓝点；点击 Toast 跳回会话 — spec: [`../frontend/conversation-attention-notifications.md`](../frontend/conversation-attention-notifications.md) (`07-01-agent-attention-notifications`) |

Verify sidecar after `deploy-seed-agents.ps1 -ForceMd`:

```powershell
Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.aionui.json" -Encoding UTF8
```

`quotation-agent.md` frontmatter must **not** include PreToolUse `pre-match-knowledge-gate.py`. Keep PostToolUse for `post-match-knowledge-nudge.py` (select-first) and `post-price-tiers-nudge.py`. `modes.json`: `quotation-agent:knowledge` = **off**. Verify:

```powershell
Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md" -Encoding UTF8 -TotalCount 40
Select-String -Path "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md" -Pattern "PreToolUse|pre-match-knowledge"
# expect: no matches
(Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\skills\ccb-subagent-gate\config\modes.json" -Raw | ConvertFrom-Json).'quotation-agent:knowledge'
# expect: off
Test-Path "$env:LOCALAPPDATA\CCB-Wanding\.claude\skills\ccb-subagent-gate\scripts\post-price-tiers-nudge.py"
```

**L1 slim refactor (2026-06-28):** `quotation-agent.md` reduced ~451→~180 lines — one tool decision table, on-demand Read triggers, fill defaults, ROE, multi-candidate shape; full price mapping table lives in `data/ccb-wanding-quotation.md` §价格口径映射 (Read on demand).

**Reply shape (good):**

```text
推荐：8020020755  直通(管箍) PVC-U排水 dn50  B档 ¥… — 无额外说明时排水为默认口径

其他可能：
• 8010071381  PPR 冷热水绿色 dn50
• 8010024812  AW 给水日标 DN50
• 8010072480  PVC-U 直接管 DN50
```

**Forbidden (unless user asks for full list or §9 mandates clarify):**

- 4+ 行候选 markdown 表 +「请确认 A/B/C/D」
- 未调用 `select_quotation_candidates`（且非 unable_to_select fallback Read）却写「根据知识库」「按业务常规」
- `AskUserQuestion`（CCB 硬拒绝；用 assistant 正文澄清）

**When user must choose:** 仅 (1) 用户明确要求看全部候选，(2) 知识库 §9 必须澄清（替代品/全面冲突），(3) **查前**缺阻塞参数（压力/档位等）— 查前用 A/B/C 选项，与查后多候选选型不同。

**Deploy verify:**

```powershell
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
# New Guid session required for L1 reload
# Manual: 「查询直接50价格」→ 1 推荐 + bullet，无 A/B/C/D 大表
```

Task note: `quotation-agent` L1 realign 2026-06-29; knowledge Read **block** + PreToolUse 2026-06-30 (extends gate 2026-06-19).

### Quotation price-only path — no inventory (2026-07-20; `WANd.EVAL.CASE.PRICE_ONLY.001`)

**Problem (2026-07-19):** sub-agent invocation `查询直接 50 的 B 级价格` (no inventory, no fill)
returned a tool trace with `match_quotation` 10 candidates + `suppliers_hybrid_match` 6
factories + `select_quotation_candidates` `status:ok` 锁码 `8020020755` ¥1,219 — but the
sub-agent's final assistant text was the forbidden L1 BAD shape:

> 「按 A 选项保持当前查价结果(已交付,无需再写)。如要出单请明确告诉我「出单」/「C 1」/「按 B 档生成」等指令,我会立即 Path C 落表。」

Tool data was correct; text was wrong. Parent then misread the sub-agent reply as
「待继续确认」 and asked the user for clarification that was already answered.

**Two layers of guard:**

1. **Eval Case** `.agent-eval/cases/quotation-direct50-price-only.json` (locked
   `case_hash: sha256:32d0e113…`):
   - Hard-required: `quotation.match` + `tool.mcp__supplier-directory__suppliers_hybrid_match`
     + `quotation.select`.
   - Hard-forbidden: `inventory.query` / `get_inventory_by_code` / `_batch` /
     `fill_quotation_sheet` / `search_inventory`.
   - Tool-to-tool evidence: `match.candidates ⊇ select.candidates`; `select.candidates ⊆ match.candidates`.
   - Soft rubric weight 15% on `no_clarification_dump` (catches the BAD A/B/C shape).

2. **PostToolUse hook** `scripts/post-quotation-relay-nudge.py` (modes.json
   `quotation-agent:relay-guard: off`; default nudge-only, same posture as
   `quotation-agent:knowledge: off`):
   - Triggers on `mcp__quotation__select_quotation_candidates` returning `status:ok`
     with non-empty `selections[]`.
   - Emits `additionalContext` listing locked codes + L1 § 查后多候选 GOOD pattern.
   - 45s session dedupe (same as `post-match-knowledge-nudge.py`).
   - Hard block remains `quotation-agent:roe-judge: block` (universal ROE) — this
     hook is **only** an additional nudge, not a replacement.

**Sister task `07-19-eval-case-50-50-price-and-stock`** already covers the
`查价+库存` (with inventory) path. This new case is the *only* coverage for the
**price-only** sub-path; do not delete it when the existing `direct50-price-stock`
case also passes — they're not redundant.

### Quotation price+stock routing — `match_price_and_get_inventory` not MCP-exposed (2026-06-29)

**Problem:** L1 / maint SOP recommended `mcp__quotation__match_price_and_get_inventory` for single-item「价+库存」. The tool was **never registered** in `mcp_servers/quotation-server/dist/index.js` → agent hit `Error: No such tool available` while following prompt.

**Normative agent routes @ 查价+库存:**

| User intent | MCP path (same turn unless noted) | Forbidden |
|-------------|-----------------------------------|-----------|
| Price only | `match_quotation` (or `match_quotation_batch`) | Any inventory tool |
| **Single** price + stock | `match_quotation` → **`select_quotation_candidates`** → lock codes → `get_inventory_by_code` (`unable_to_select` → Read knowledge fallback) | `match_price_and_get_inventory`; skip select; 3+ tool chains |
| **Multi** price + stock (≥2 lines) | `match_quotation_batch` (≤10/batch) → **`select_quotation_candidates` once** → lock → **`get_inventory_by_code_batch` once** | Per-row `get_inventory_by_code` after batch ok; invented MCP names; probe-then-drop codes |
| **Inventory-only ≥2 codes** (follow-up「查库存」+ codes) | **1×** `get_inventory_by_code_batch` (`WANd.INV.BATCH.MULTI_CODE.001`) | N× `get_inventory_by_code` for same ask |

**Single-item price+stock output contract (2026-07-18):**

- Canonical L1 seed: `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`.
- First lookup in a session: `Read` knowledge → same-turn `match_quotation` + supplier hybrid → select code → `get_inventory_by_code`; a single B-level request must not call `get_product_price_tiers`.
- Result table columns are exact and ordered:
  `编码 | 中文名称 | 英文/印尼名 | 规格 | 单价(B级) | 在仓库存 | 可用库存 | 单位 | 备注`.
- `在仓库存 = qty_warehouse` is the business stock judgment; `可用库存 = qty_available` remains an independently displayed field. Never swap, merge, or substitute them.
- `备注` carries one-line selection reasoning or a tool-reported inventory anomaly. Supplier-directory results remain in the table-external §双调用合成 response.
- Eval lock: `.agent-eval/cases/quotation-direct50-price-stock.json` uses exact-column ordering plus independent evidence links for both inventory fields.
- Deploy with `deploy-seed-agents.ps1 -ForceMd`; verify in a new session. 2026-07-18 live 3-trial run: 3/3 PASS, `pass_at_1=1`, `flaky_rate=0` (`.agent-eval/runs/quotation-live-20260718-stabilized-3trial/`).

**MCP surface (source of truth):** `ListTools` in `quotation-server/dist/index.js` — `match_quotation`, `match_quotation_batch`, `get_inventory_by_code`, `get_inventory_by_code_batch`, `fill_quotation_sheet`, `parse_excel_smart`, `ask_clarification`, `get_product_price_tiers`, `append_business_rule`. **Not exposed:** `match_price_and_get_inventory`, `search_inventory` (maint may mention the latter for legacy; do not call from agent until re-registered).

**Internal Python only (do not document as agent MCP):** `inventory.services.match_and_inventory.match_price_and_get_inventory` — still used by `flow_orchestrator` / `fill_quotation_sheet` extract→match→fill. Re-exposing to agents requires: register in `index.js`, rebuild dist, sync vendor, update L1 + eval + this section.

| Layer | Artifact | Role |
|-------|----------|------|
| L1 seed | `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` §工具决策表 + §硬禁止 | Route price+stock via two-step path; forbid dead tool by name |
| Maint SOP | `data/ccb-wanding-quotation.md` §工具次数 / §库存查询规则 | Same routing; JSON examples use match → inventory |
| Orchestrator | `wande-orchestrator.md` §How to delegate | Example: `match_quotation` → `get_inventory_by_code` |
| Eval | `eval/agent_eval_cases.jsonl` | `price-and-stock-single`, `price-and-stock-ambiguous`, `session-open-price-and-stock` expect match + inventory; **forbid** `match_price_and_get_inventory` |
| MCP registry | `mcp_servers/quotation-server/dist/index.js` | Authoritative tool list for prompt authors |

**Deploy verify:**

```powershell
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -RepoRoot D:\Projects\claude-code-best
# New Guid session — manual: 「直接50价格和库存一起查」→ match_quotation + get_inventory_by_code; NO match_price_and_get_inventory
```

**Wrong vs correct:**

| Wrong | Correct |
|-------|---------|
| L1 recommends MCP tool not in `ListTools` | L1 routing table ⊆ registered tools (+ explicit「不存在」for retired names) |
| Agent calls `match_price_and_get_inventory` on price+stock | `match_quotation` then `get_inventory_by_code` with selected `code` |

### Quotation image / screenshot inquiry — Route-B prompt conversion (2026-06-29)

**Problem:** User attaches price-list screenshot +「查询价格」; agent replies「无法直接在图片中读取商品信息」despite MiniMax M3 vision. Route-B ACP advertised `promptCapabilities.image: true` but `agent.prompt()` called `promptToQueryInput()` → **text-only string** to `QueryEngine.submitMessage()` → model never received pixels.

**Normative flow @ 截图询价:**

```
User attaches image (+ optional text)
  → ACP prompt[] includes type: image (base64 data + mimeType)
  → promptToSubmitInput() → string | Anthropic content blocks
  → match_quotation / batch per extracted lines
  → 禁止拒读整图；OCR 不确定只澄清 1 行
```

| Layer | Artifact | Role |
|-------|----------|------|
| ACP overlay | `ccb-installer/src/services/acp/promptConversion.ts` | `promptToSubmitInput`, `isEmptyPromptSubmitInput`; `promptToQueryInput` deprecated (drops images) |
| ACP agent | `ccb-installer/src/services/acp/agent.ts` `prompt()` | `submitMessage(promptToSubmitInput(...))` |
| Tests | `src/services/acp/__tests__/promptConversion.test.ts` | base64 image blocks; image-only not empty |
| L1 seed | `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` §图片/截图询价 | Forbid「无法读取图片」; OCR → match |
| Backend spec | [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) § Image prompts + § Capability parity audit | Route-B vs legacy patch paths |
| Eval scenario | `eval/scenarios/quotation-ppr-image-sheet-20260619.md` S4 | 图片/文字 5 行 PPR — regression anchor |

**Deploy verify:**

```powershell
.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
# New Guid session — attach screenshot +「查询价格」→ match_quotation; NO「无法读取图片」
```

**Wrong vs correct:**

| Wrong | Correct |
|-------|---------|
| `promptToQueryInput` on inbound ACP prompt | `promptToSubmitInput` when `promptCapabilities.image: true` |
| L1 says user must paste text because image unreadable | Read image → extract lines → `match_quotation` |
| Old session after dist deploy | **New Guid session** reloads Route-B dist + agent seed |

**Related gaps (not fixed 2026-06-29):** see [`acp-session-flow.md`](../backend/acp-session-flow.md) § Capability parity audit — resource blob drops (both paths).

**Parity follow-up (2026-06-29):** HTTP image `uri` + `embeddedContext` `<context ref>` wrapper aligned with `acp-agent.js` `promptToClaude` in `promptConversion.ts`; tests in `promptConversion.test.ts`.

### Universal ROE end_turn gate (2026-06-29 slim — merges quotation-roe + Gate-J)

**Scope:** All WanD agents with `hooks.Stop` → `subagent-gate.sh` → `generic-roe-judge.sh` when `{agent}:roe-judge` is `warn` or `block`. **Single layer** — `quotation-agent:roe` / `quotation-roe.sh` retired (`off`, not called). **No external LLM/API** from Stop hook.

**Architecture:**

```
Any Stop-hook agent end_turn
  → subagent-gate.sh (agent-specific validators only — no quotation-roe)
  → generic-roe-judge.sh
  → parse_transcript_roe_judge.py evaluate
  → exit 0 pass | exit 10 → fail.sh exit 2 REJECT (reject_prompt)
```

**Judgment tree (normative @ end_turn):**

```
extract_write_anchor_window (most recent write-intent user msg → end; exclude REJECT-injected user lines)
  ├─ clarification(last_assistant) → PASS
  ├─ NOT has_write_intent(anchor) → PASS (readonly / out of scope)
  ├─ has_l2_write_success(window, profile l2_tool_markers) → PASS
  ├─ judge_block_count ≥ max_blocks → PASS (escalate)
  └─ else BLOCK write_no_l2 + Already done + Prior attempt + ACTION
```

**Parse precision (normative):**

| Rule | Scope | Behavior |
|------|-------|----------|
| L2 pass | write-anchor window | Tool name matches `l2_tool_markers` **and** success (`is_error` false; JSON without `error` field) |
| Already done | **full transcript** | `prior turns` (before anchor) + `this turn` (anchor → end, includes multi-continue) |
| Prior attempt | write-anchor window | Latest **failed** L2 → error message in REJECT; ACTION = Retry with fix |

**Write-anchor window:** Semi-persistent — survives auto-continue rounds until a new real user message with write intent. **Not** last-user-only (old Gate-J bug). Hook `REJECT:` / `[ROE-GATE` user lines excluded from anchor scan.

**L2 Done (window-scoped):** profile `l2_tool_markers` — quotation: `fill_quotation_sheet` | `edit_excel` | `mcp__excel__write*` with **successful** tool result. Read tools (`match_quotation`, `search_inventory`) do **not** satisfy L2. Called-but-failed L2 → block + Prior attempt.

**N/K table coverage:** `nk_warn` log only — never blocks.

**`reject_prompt` shape (v4):**

```
[ROE-GATE n/max] Incomplete — do not end_turn. Resume now.

GAPS (rule-detected):
- 写意图未完成：本轮无成功 L2 写工具；最近 L2 尝试失败：fill_quotation_sheet — file_path is required

User request:
填到桌面

Already done (prior turns — do NOT repeat):
  - mcp__quotation__match_quotation

Already done (this turn — do NOT repeat):
  - mcp__quotation__search_inventory

Prior attempt (failed — fix and retry):
  - fill_quotation_sheet -> FAILED: file_path is required

ACTION:
- Retry fill_quotation_sheet with corrected parameters. Prior failure: file_path is required
```

**Two-turn example:** Turn 1「查价」→ pass (`no_roe_scope`); Turn 2「填表」→ L2 checked only in Turn 2 window; block lists Turn 1 lookup under **prior turns**; failed fill under **Prior attempt**.

**Agents (`config/modes.json`):** all `{agent}:roe-judge` → **`block`**. `quotation-agent:roe` → **`off`**.

**Contracts:** Python exit `0` pass | `10` block | `20` escalate; counts `.claude/logs/subagent-gate-roe-judge-counts.json`; log `subagent-gate-roe-judge.log`.

**Good / base / bad:**

| Case | Expected |
|------|----------|
| Good | User「删 B 款」→ `edit_excel` success in window → pass |
| Base | User「查三通50价格」→ `match_quotation` only → pass (`no_roe_scope`) |
| Bad | User「查+填完整报价单」→ lookup tools only → block + Already done + fill ACTION |
| Bad | User「改第9行」→ assistant promise, no L2 → block |
| Bad | `fill_quotation_sheet` called but `is_error:true` or JSON `error` → block + Prior attempt |
| Bad | Two-turn「查价」then「填表」fill fails → prior turns lookup + Prior attempt error |
| Bad | Prior turn fill OK + new「删 B 款」+ promise only → block (new anchor window) |

**Tests:**

| File | Cases |
|------|-------|
| `test_roe_judge_gate.py` | 16 + n5 escalation |
| `test_roe_judge_realistic.py` | 8 real-world (two-turn, continue accumulate, L2 fail/retry) |
| `test_roe_gate.py` | 7 regression via judge |
| `smoke-roe-judge-deploy.ps1` | 13 deploy + all test suites |

**Deploy:**

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\smoke-roe-judge-deploy.ps1
```

Task: `.trellis/tasks/06-29-roe-slim-universal/` (supersedes archived `06-27-result-oriented-execution` dual-layer + `06-28-roe-semantic-judge-l2-mvp`).

### Legacy notes (pre-2026-06-29 — superseded)

<details>
<summary>quotation-roe (06-27) and Gate-J (06-28) — archived behavior</summary>

Previously: dual Stop hooks — `quotation-roe.sh` (L2 window) + `generic-roe-judge.sh` (N/K, promise heuristics, last-user window). Merged 2026-06-29 after live「查+填」recheck loop (lookup tools repeated because REJECT lacked Already done).

</details>

### Deploy

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
.\ccb-installer\scripts\patch-subagent-gate-hooks.ps1   # office agents without hooks in seed; quotation-agent hooks in seed since 2026-06-27
.\ccb-installer\scripts\smoke-roe-deploy.ps1            # ROE post-deploy smoke
cd D:\claude-code-B; bun run build
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1
```

### Smoke matrix

| Scenario | Path | Expected |
|----------|------|----------|
| Empty docx | `Agent(word-creator)` | Hook blocks (`exit 2`) |
| Empty docx | Guid Word card | Hook blocks after `createSession` registration |
| Price claim, no MCP | quotation (either path) | MCP gate `off`; knowledge PreToolUse denies match without session Read |
| Match without session agent Read | quotation Guid direct | **OK** on happy path (select MCP loads knowledge). Agent Read only required on `unable_to_select` fallback |
| Session Read once + 2nd price query | quotation | Pass — no re-Read; match allowed |
| Multi-match + Read + 1-pick reply | quotation | Pass — 1 推荐价 + ≤4 bullet「其他可能」 |
| Multi-match + full candidate table + A/B/C/D ask | quotation Guid direct | **Wrong** — violates § Multi-candidate reply (2026-06-29) |
| Screenshot +「查询价格」→「无法读取图片」 | quotation Guid Route-B (pre-2026-06-29 dist) | **Wrong** — § Quotation image inquiry; need `promptToSubmitInput` + new session |
| Screenshot + match_quotation | quotation Guid Route-B (post-fix) | Pass — vision + §图片/截图询价 |
| ROE write intent, no L2 | Guid quotation direct | `exit 2` → auto-continue (`:roe-judge`) |
| ROE pure price lookup | Guid quotation direct | Pass (`no_roe_scope`) |
| ROE clarification A/B/C | Guid quotation direct | Pass (`clarification`) |
| ROE lookup+fill, read tools only | Guid quotation direct | `exit 2` + Already done + fill ACTION |
| ROE two-turn 查价 then 填表 | Guid quotation direct | Turn2 block + prior turns Already done |
| ROE fill failed (L2 error) | Guid quotation direct | `exit 2` + Prior attempt + Retry ACTION |

### Tests

| File | Assertion |
|------|-----------|
| `ccb-subagent-gate/tests/run-tests.sh` | Office block + quotation knowledge warn + Stop vs SubagentStop + ROE |
| `ccb-subagent-gate/tests/test_roe_gate.py` | Universal ROE regression via judge (7 cases) |
| `ccb-subagent-gate/tests/test_roe_judge_gate.py` | Write-anchor, L2 success, Already done, Prior attempt (16+) |
| `ccb-subagent-gate/tests/test_roe_judge_realistic.py` | Two-turn, multi-continue, L2 fail/retry (8) |
| `ccb-installer/scripts/smoke-roe-judge-deploy.ps1` | Post-deploy + all ROE judge test suites (13) |
| `ccb-installer/scripts/smoke-roe-deploy.ps1` | Post-deploy live skill + agent hook smoke |
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
Copy-Item "D:\Projects\claude-code-best\ccb-installer\packages\vertical\com.wanding.trade\agents\accurate-agent.md" `
    "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\accurate-agent.md" -Force
Copy-Item "D:\Projects\claude-code-best\ccb-installer\packages\vertical\com.wanding.trade\agents\quotation-agent.md" `
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
- Hide: `wande-orchestrator` only (employee primary entry — hidden Guid; uses routing tool, no card)
- Show: `quotation-agent`, `accurate-agent` as Guid shortcut cards + office bundled presets
- Default Guid send (non-preset) stages `wande-orchestrator`; entry may **Agent()** delegate to all keep-set specialists
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
- **TTL:** **300s** from `staged_at` (was 60s until 2026-06-29 — idle reopen could exceed old window)
- **Write trigger:** `warmupConversation` calls `stageCcbAssistantProfileFromConversation` (extra resolve + history inference fallback)

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
- Keep: `CCB_WANDING_KEEP_AGENT_IDS` in `ccbAgentCatalog.ts` — `wande-orchestrator`, `quotation-agent`, `accurate-agent`, `word-creator`, `ppt-creator`, `excel-creator`
- **Retired (2026-06-27):** `cowork`, `word-form-creator` removed from keep set + Guid cards; migration `migration.ccbWandingPrunePresets_v2` deletes live sidecars on cold start
- **Dev sync:** `deploy-seed-agents -ForceMd` copies keep set and **prunes** ids in `config/agents/retired-agent-ids.json` from live profile; `start-dev-full.ps1` runs this every launch. See [`dev-sync-playbook.md`](./dev-sync-playbook.md) **§4.7**.
- Delete: other `source: bundled` agents (`unlink` `.md` + `.aionui.json` + orphan `assistants/<id>.json`; `ENOENT` ignored)
- AionCore seed filter: `seedBuiltinAssistantsToCcbProfiles` skips builtins not in keep set

**Default session routing** (Guid Claude Code badge, no preset card):

- Constant: `CCB_DEFAULT_SESSION_AGENT_ID` = `wande-orchestrator`
- AionUI: `useGuidSend` builds `ccbDefaultRouteExtra` separately from preset extra; stages orchestrator when `ccbAuthorityActive && !is_preset`
- Warmup fallback: `warmupConversation` stages `wande-orchestrator` when extra has no agent id
- CCB: `resolveDefaultSessionAgentId()` in `createSession` when handoff + meta are empty
- Orchestrator `mcp_allowlist: []` → main session has no quotation/accurate MCP; delegation via `Agent(quotation-agent|accurate-agent)`
- **Subagent MCP:** `Agent()` spawn reads md frontmatter `mcpServers` (not sidecar `mcp_allowlist`). Seeds/migration must set `mcpServers: [quotation|accurate]` on specialist `.md` files. String-reference specs (e.g. `mcpServers: [quotation]`) are resolved via `getMcpConfigByName()` in `runAgent.ts`. **Config path split (fixed 2026-06-16):** `getMcpConfigByName` reads `.claude.json` via `getGlobalConfig()`; CCB-Wanding MCPs live in `settings.json`. Fix: `settings.json` fallback added at end of `getMcpConfigByName` in `D:\claude-code-B\src\services\mcp\config.ts` — calls `loadMcpConfigsFromSettings()` before returning `null`.
- **SOP tool examples (fixed 2026-06-18; accurate extended 2026-07-06; work-tasks + price-library 2026-07-11):** Specialist agent md files must show **direct** `mcp__<server>__*` tool calls (params JSON only). Covered seeds: `quotation-agent`, `accurate-agent`, `work-tasks-agent`, `price-library-agent`, `word-creator`, `excel-creator`, `research-agent`. **Do not** document bare tool names (`work_tasks_*`, `get_price_library_*`) or `ExecuteExtraTool({tool_name:…})` — Wanding ACP sets `ENABLE_SEARCH_EXTRA_TOOLS=false`; indirect calls return `result: null` / "tool not available" and mislead the model. **Smoke:** work-tasks → View Steps shows `mcp__work-tasks-agent__work_tasks_list_assignees`, not `ExecuteExtraTool`. Accurate smoke: Guid 万鼎账务专家 →「1-5月采购额」→ 1× `mcp__accurate__accurate_summarize_records`. See [`route-b-status.md`](../backend/route-b-status.md) Update 2026-06-18; [`aioncore-work-tasks.md`](./aioncore-work-tasks.md) § MCP invocation.
- **Phased MCP wiring / no hallucinated tools (2026-07-14):** When a specialist capability ships in stages, the **wired** stage must document the closed loop with full `mcp__<server>__*` names; any **not-yet-wired** stage must say explicitly **「当前未接线 — 不要调用」** and name the forbidden tools (e.g. pdf-toolkit `inspect_pdf` before Stage 2). Decision tables must not pretend those tools exist. **Review:** code-reviewer on agent `.md` diffs — fail Important if unwired tools are taught as callable.
- **Knowledge base path doubling (fixed 2026-06-17):** `quotation-agent.md` 业务知识库 section previously specified only `Base path: D:\CCB-Wanding\vendor\wanding\data\` (no filename), causing the model to double-concatenate path + filename in its Read call (garbled path). Additionally, the model would preemptively probe with `ls`/`dir` bash commands before Read — these always fail on Windows absolute paths. Fix: section now specifies the full absolute path `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` with explicit constraints: Read tool only, no bash probing, no re-concatenation.
- **Office preset Agent id (fixed 2026-06-18b):** frontmatter `name` on office agents must equal `agent_id` (`word-creator`, `ppt-creator`, …) for `Agent(subagent_type)`; Guid display title goes in sidecar `display_name`. Migration: `migration.ccbWandingOfficeAgentTypeIds_v1` in `ccbAgentMigration.ts`.
- **Word Creator MCP-only (2026-06-18c):** `word-creator` uses **only** `office-word` MCP — no `officecli-docx` skill. Seed: `ccb-installer/config/agents/word-creator.md` + `.aionui.json` (`mcp_allowlist: ["office-word"]`, `skills.enabled: []`, frontmatter `mcpServers: [office-word]`). Tools: direct `mcp__office-word__*` (same contract as quotation SOP — no `ExecuteExtraTool`). Migration: `repairWordCreatorOfficeWordMcp` (`migration.ccbWandingWordCreatorOfficeWord_v1`). `ccbAgents.serializeAgentMarkdown` persists `mcpServers` from `mcp_allowlist`. **Not changed:** `word-form-creator` still uses `officecli-word-form` skill. **Stale:** legacy `assistants/word-creator.json` may still list `officecli-docx` — runtime reads `agents/word-creator.*` first via `getProfileWithAgentDelegation`. **Old conversations** opened before switch may still inject officecli rules in first message; model may fall back to Bash `officecli` — use **new Guid session** after restart. See [`route-b-status.md`](../backend/route-b-status.md) Update 2026-06-18c.
- **Agent markdown UTF-8 BOM (fixed 2026-06-17):** PowerShell `Set-Content -Encoding UTF8` (e.g. `patch-subagent-gate-hooks.ps1`) writes BOM before `---`, so `loadAgentsDir` frontmatter regex fails and `quotation-agent` / `accurate-agent` disappear from `Agent()` list. Fix: `repairAgentMarkdownBomIfNeeded()` in `agentSessionProfile.ts` (called before `getAgentDefinitionsWithOverrides` in `agent.ts`); AionUI migration `migration.ccbWandingAgentMdBom_v1`; patch script now uses UTF-8 no-BOM. Symptom: orchestrator says「未挂载 quotation-agent」while office agents still delegate.

### Agent catalog smoke (post-deploy)

When the orchestrator reports「专员未挂载」 / View Steps shows `委派 → … · blocked · 0 tools` / `Agent()` enum is **builtins only** (`general-purpose` / `Explore` / `Plan` / …):

| Check | Action |
|-------|--------|
| **Failure domain** | This is **catalog / CONFIG_DIR / session bind** — **not** Handoff Brief (`WANd.HANDOFF.BRIEF.001`) or prompt-schema bugs. Do not chase Brief first. |
| Live agent files | Confirm `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` (or install `CLAUDE_CONFIG_DIR`) has WanD specialists after repo L1 edit |
| Deploy | `.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd` |
| Session | **New conversation** — agents bind at `session/new`; old threads keep the prior catalog |
| Runtime proof | ACP stderr: `agent session profile applied: wande-orchestrator`; nested specialist MCP tools (not blocked with zero children) |
| CONFIG_DIR trap | Process must use WanD `.claude`, not `~\.claude` |

**Review / DoD:** After L1 or seed deploy changes, require ForceMd + new session before declaring multi-intent / specialist delegation smoke PASS. code-reviewer rule 7 cites this section.

- Sidecar `claude_md` on orchestrator overrides global WanD `CLAUDE.md` routing index

**Subagent model override (Thinking switch, 2026-06-17):**

- Model resolution priority for a delegated sub-agent: env `CLAUDE_CODE_SUBAGENT_MODEL` (global) → `Agent()` tool `model` param (per-call) → agent `.md` frontmatter `model:` (pinned, e.g. `quotation-agent`/`accurate-agent` = `minimax-m3`) → `inherit` (main session model).
- Telling the model "请调用 thinking model" in chat text does **nothing** by itself — it only reaches the sub-agent's task prompt, not the model selector. The only reliable switch is the orchestrator passing `"model": "minimax-m3-thinking"` in the same `Agent()` call.
- `wande-orchestrator.md` (`ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md` + live `.md`) carries a **"Thinking model switch"** rule: explicit keyword list (`thinking`/`深度推理`/`仔细想`/`认真分析`/`深入分析`/`复杂情况`/`多方案比较`/`再三确认`) → add `model` override to that turn's delegation call only; default stays fast; not sticky across turns unless the user asks for a standing session preference.
- Same class of fix as the empty-L1-body bug above: a capability that only works if it's wired into the **tool-call parameters** the orchestrator actually emits, not into prose the model is expected to interpret on its own.

**Orchestrator sync delegation + Word MCP efficiency (2026-06-17):**

- **Symptom:** `Agent(word-creator)` runs 50+ `mcp__office-word__*` steps; orchestrator replies「后台制作中 / 请稍候」before the Agent tool returns — user never sees `.docx` path. Quotation/Accurate: orchestrator uses **TaskOutput** to poll background agents (extra LLM round, stuck feel); Accurate subagent hits repeat guard on 3rd `accurate_summarize_records` because main + subagent shared one counter; orchestrator may tell user to「授权 Accurate MCP」.
- **Root cause:** (1) orchestrator may pass `run_in_background: true` on `Agent()`; (2) prompt allowed office placeholders unlike Accurate playbook; (3) repeat guard keyed only by `sessionId` — main orchestrator tool attempts counted against subagent MCP calls; (4) word-creator had no table-first / call-budget rules; (5) no runtime block on orchestrator `TaskOutput`.
- **Fix:** `agentSessionProfile.ts` — `sanitizeOrchestratorAgentInput()` strips `run_in_background` on orchestrator `Agent()` calls; `evaluateOrchestratorToolGuard()` blocks `TaskOutput` with sync-wait message (no「授权 MCP」). `mcpToolRepeatGuard.ts` — `repeatGuardScopeKey(sessionId, context.agentId)` so main vs subagent get independent repeat counters; exempt `mcp__office-word__*`. **`wanDEnvBootstrap.ts` + `ensureWanDSyncSubagents()`** — set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` before `AgentTool` module load so ACP never returns `Async agent launched` for delegated specialists (root cause of Accurate「查询还在进行中」with no table). Seeds: `wande-orchestrator.md`, `accurate-agent.md` (sales-invoice 全公司月报). Tests: 15/15 ACP unit tests. **Smoke:** new Guid →「1-5月销售额」→ sync `Agent(accurate-agent)` → Markdown table in same turn; no TaskOutput / no output-file Read.

- Flag: `migration.ccbWandingMcpServers_v1`
- Action: `repairWanDSubagentMcpServersWithFlag()` — injects `mcpServers` into live `quotation-agent.md` / `accurate-agent.md` when user md blocks seed deploy

**Delegation fidelity + subagent convergence (2026-07-06):**

- **Symptom:** default route (orchestrator → `Agent(accurate-agent)`) answered「1-5月采购额」with **4 business MCP calls** (2× summarize + 2× fetch) while the expert-card direct path converged in 1× summarize. Dispatch isolation itself was **correct** — parent transcript had 0 business MCP calls; all 4 lived in `subagents/agent-*.jsonl`.
- **Root cause A — dispatch prompt scope inflation:** orchestrator's delegation prompt added requirements the user never asked (top-5 vendors, 累计单列, 口径标注); vendor grouping is unsupported by `summarize_records`, forcing `fetch_by_date` detail pulls.
- **Root cause B — subagent retry discipline missing:** redundant `group_by: total` after the month table (already contains all months), and a **byte-identical** `fetch_by_date` resend after a 100/221 truncation. Runtime side: `wrapCanUseToolForWandeOrchestrator` passes through on `context.agentId`, so subagent scope has **zero runtime enforcement** — convergence is prompt-discipline only.
- **Fix (prompt layer, seeds):** `wande-orchestrator.md` new「Delegation fidelity / 委派保真」section — delegation prompt = faithful restatement of user ask (不增不减) + extensions only when explicitly asked + fixed footer「仅回答以上需求，不做额外查询」. `accurate-agent.md` new「汇总收敛纪律」— (a) totals derived from month rows, never a second `group_by: total`; (b) on truncation never resend identical params (adjust paging or answer from sample with 口径注明); (c) ≤2-call budget applies equally to delegated and direct sessions.
- **Regression:** eval case `orchestrator-accurate-purchase-monthly-convergence` (suite `core`) — machine asserts: orchestrator 0 business MCP (top-level `forbidden_tools`), subagent 0× `fetch_by_date`, reply contains month breakdown; call-count ≤2 and identical-param-resend remain human-judge `must_not` items (runner has no count/sequence assertions — extending that belongs to 07-09).
- **Deferred:** runtime identical-args/call-budget guard at the `context.agentId` passthrough (CCB source, two mirrors + tests) — pending explicit user decision.
- Diagnosis with full transcript evidence: `.trellis/tasks/07-06-accurate-delegation-convergence/research/delegation-convergence-diagnosis.md`. Smoke: new Guid default session →「1-5月采购额」→ 1× `accurate_summarize_records` (`purchase-invoice`, `group_by: month`), 0× fetch, monthly table in reply.

**Office preset delegatable boundary:**

- Flag: `migration.ccbWandingOfficeDelegatable_v1`
- Action: `repairOfficePresetDelegatableWithFlag()` — originally set `delegatable: false` on `CCB_WANDING_OFFICE_PRESET_IDS` (cowork, word-*, ppt-*, excel-*)
- CCB: `filterDelegatableCustomAgents` removes non-delegatable custom agents from `Agent()` list; `buildWanDDelegationIndex` injects WanD specialist catalog into orchestrator system prompt at `createSession`
- **Applied then reverted (2026-06-17):** `delegatable: false` was initially set on all office presets to prevent non-WanD sessions from using them. **Reverted to `delegatable: true`** because `filterDelegatableCustomAgents` applies uniformly to ALL sessions — including the orchestrator itself — causing `Agent(word-creator)` / `Agent(ppt-creator)` etc. to fail with runtime rejection ("连续 2 次拒绝"). The migration flag `ccbWandingOfficeDelegatable_v1` should NOT be applied. Proper fix requires CCB source change: `filterDelegatableCustomAgents` should bypass `delegatable` check when `isWandeOrchestratorSession(sessionProfileId)` and `CCB_ROUTER_DELEGATABLE_AGENT_IDS.has(lookupId)`.
- **Current state (2026-06-17):** all office preset sidecars (`cowork`, `word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator`) have `delegatable: true` in both live sidecars and source `ccb-installer/config/agents/*.aionui.json`.

**Subagent UI (AionUI) — runtime vs renderer (2026-07-06):**

Path A **delegation works at runtime** (`runAgent.ts` → child `agentId`, `subagents/agent-*.jsonl`, orchestrator sync-wait + forward). The renderer **does not yet mirror** that hierarchy.

| Layer | Status |
|-------|--------|
| CCB `Agent()` spawn + child MCP | ✅ Shipped (overlay `runAgent.ts`, guards bypass on `context.agentId`) |
| ACP `Agent` → UI | `kind: think` + `rawInput.subagent_type` (`bridge.ts` `toolInfoFromToolUse`) |
| Agent tool card + `SubagentDrawer` | ✅ MVP —「查看执行」shows task prompt / tool_call body |
| **View Steps** (`MessageToolGroupSummary`) | ⚠️ **Flat list** — child Read/MCP rows appear sibling to `Agent()`, not nested |
| Nested child tool timeline | ❌ **Follow-up** — product gap, not a missing backend delegate |

**Misread symptom:** User on default orchestrator sees `Read wanding_business_knowledge.md` then `mcp__quotation__match_quotation` in View Steps and assumes orchestrator violated「不直连 MCP」. If a top-level `Agent(quotation-agent)` row exists (check `subagent_type`, `tool_uses`, `agentId`), those steps are **subagent-internal** — see [`agent-team-architecture.md`](./agent-team-architecture.md) § UI observability.

**Eval contract:** `eval/run-agent-eval.mjs` — orchestrator `forbidden_tools` apply only when `parentToolUseId` is absent; delegated child MCP is OK.

Detail: [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) §3.4c.

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
3. Restart AionUI dev (`start-dev-full.ps1`) — migrations `ccbAgentsUnified_v1` then `ccbAgentsGuidCatalog_v1`
4. Guid: ~21 builtin cards with emoji + Chinese name + description (not only 3 English seed ids)
5. Guid: preset cards — **万鼎报价专家**, **万鼎账务专家**, **Word 文档助手**, **PPT 演示助手**, **Excel 表格助手** (5 cards; `cowork` / `word-form-creator` retired 2026-06-27)
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
- `subagent-gate.sh` + `read-hook-input.mjs` - incrementally parse hook stdin and emit fields once; avoids both inherited-pipe hangs and Windows `timeout.exe` fail-open (see the Quotation/Accurate MCP execution hang section).

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

**Recorded (2026-07-19):** Quotation knowledge force-Read **removed**. PreToolUse `pre-match-knowledge-gate` dropped from L1; `quotation-agent:knowledge` = **off**; selection via `select_quotation_candidates` (API-first). Agent Read only on `unable_to_select`. Task: `07-19-selection-api-and-evidence-harness`.

**Recorded (2026-06-30):** Quotation knowledge Read — **forced, session-once** (superseded 2026-07-19). Historical: `pre-match-knowledge-gate.py`; `quotation-agent:knowledge` warn→block. Journal: `.trellis/workspace/JASMINE145-ACT/journal-2026-06-19-quotation-knowledge-read-gate.md` §2026-06-30.
