# Mixing 1.1.2 UI Parity Matrix (Oracle Checklist)

> **Task:** `06-26-aionui-source-level-recovery`  
> **Oracle:** `D:\CCB-Wanding\AionUi\resources\app.asar` (Mixing 1.1.2 packaged)  
> **Dev target:** `D:\Projects\aionui-src` @ branch `ccb-wanding-1.1.2-recovered`  
> **Last updated:** 2026-06-27  
> **Status:** Wave 1–2 **implemented** in `aionui-src` (2026-06-27) — runtime smoke pending

This document is the long-term oracle checklist. Use it for systematic dev-vs-packaged comparison **without relying on ad-hoc screenshots**. Each UI surface is checked across four layers: visible copy, component branch, data source, runtime/migrations.

### Implementation log (2026-06-27)

| Wave | Items | Status |
|------|-------|--------|
| Wave 1 | L2-03/04/05/06, G-01, G-03 | **Wired** — `CcbLocalAgents`, `filterPillBarAgents`, `GuidModelSelector` CCB merge |
| Wave 2 | G-04/05/06/07 | **Wired** — `GuidActionRow` session menu, `useGuidAgentSelection` + `resolveCcbPresetAgentType` |
| G-02 / D-02 | Preset cards empty | **Open** — needs cold start + `fetchAssistantsCatalog()` probe |
| Wave 3 | L1-04, spec corrections | **Open** |

---

## Oracle truth chain

```
D:\CCB-Wanding\AionUi\resources\app.asar
        │
        ├─ out/main/index.js          → i18n, migrations, IPC providers
        └─ out/renderer/assets/*.js   → minified UI (component truth)

D:\Projects\aionui-src               → must rebuild to match asar
        │
        └─ git 109aa15+ CCB commits  ≠ full 1.1.2 UI without asar-guided wiring

Reference extracts (this task folder):
  asar-1.1.2-extract/               → prior full-chunk copies
  oracle-extract/                   → single-file modules (agentSelectionUtils, GuidModelSelector)
```

### How to verify one row

| Layer | What to check |
|-------|----------------|
| **1. Copy** | i18n key in asar `out__main__index.js` vs `aionui-src/.../locales/zh-CN/*.json` |
| **2. Component** | CCB branch in asar chunk vs dev `.tsx` |
| **3. Data** | IPC / catalog (`fetchAssistantsCatalog`, `ccbAgentsService`, SWR keys) |
| **4. Runtime** | Full app restart after `CCB_MIGRATION_STEPS`; do **not** Ctrl+R for migration |

### Dev launcher (required for parity smoke)

```powershell
Get-Process -Name electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\start-dev-full.ps1
# Login: org SSO (yjc) — NOT start-aionui-dev.ps1 (bypass auth)
```

---

## Information architecture (mental model)

```
┌─────────────────────────────────────────────────────────────┐
│  WanD / Mixing 1.1.2                                        │
├─────────────────────────────────────────────────────────────┤
│  Guid 首页                    Settings → AI 核心             │
│  ┌──────────────────┐        ┌─────────────────────────┐  │
│  │ AgentPillBar     │        │ 模型 → CCB MiniMax 只读   │  │
│  │ (执行引擎条)      │        │ 助手 → CCB agent 目录只读 │  │
│  │ AssistantCards   │        │ Agents → 仅 Claude Code ✓ │  │
│  │ (万鼎报价专家…)   │        │ 能力扩展 → Skills/MCP     │  │
│  └──────────────────┘        └─────────────────────────┘  │
│                                                             │
│  WanD preset agents belong on Guid cards, NOT Settings Agents│
└─────────────────────────────────────────────────────────────┘
```

---

## Oracle component map

| UI surface | asar chunk / module | Key symbols / behavior |
|------------|---------------------|-------------------------|
| Settings → Agents | `index-DA53d_yj.js` | Single `AgentCard`, `localAgentsDescription`, `max-w-240px` |
| Guid page | `index-CXaEjZr_.js` | `GuidActionRow` with `capabilitiesSource`, `sessionCcbAgentId`, `skillsReadOnly`, `sessionSkillNames`, `sessionMcpServerIds` |
| Guid model selector | `GuidModelSelector-BhU9PrSg.js` | `useCcbModelInfo` + `ccbAcpModelInfo` merge → **MiniMax M3 (Thinking)** |
| Agent pill filter | `agentSelectionUtils-vHwk7-og.js` | `filterPillBarAgents`: `agents.filter(a => !a.is_preset && (a.backend\|\|a.agent_type)==='claude')`; `findCcbClaudeAgent` |
| CCB preset routing | `index-DYdhgCgS.js` | `UJt` = `resolveCcbPresetAgentType`; `WJt` = `isCcbWandingAgent` |
| CCB catalog | `index-DYdhgCgS.js` | `filterGuidCatalogAgents`, `CCB_GUID_HIDDEN_AGENT_IDS` (orchestrator hidden from cards) |

---

## Parity matrix

Legend: **PASS** = matches oracle at last check · **FAIL** = dev diverges · **P0/P1/P2** = fix priority

### Layer 1 — Shell / navigation

| ID | Element | Oracle 1.1.2 | Dev (`aionui-src`) | Status | Priority | Fix notes |
|----|---------|--------------|-------------------|--------|----------|-----------|
| L1-01 | App brand | Mixing | Mixing | PASS | — | `APP_BRAND_NAME` |
| L1-02 | Org SSO login | org-idp via launcher | `start-dev-full.ps1` | PASS | — | Not `AIONUI_BYPASS_AUTH` |
| L1-03 | Sidebar 任务 | Present | Present | PASS | — | `SiderWorkTasksEntry` |
| L1-04 | Sidebar 知识库 label | **组织知识库** (`orgKnowledge.title` in asar main) | **知识库** (`orgKnowledge.json`) | FAIL | P2 | Align i18n to oracle main bundle |
| L1-05 | User chip + logout | Desktop org user | Wired | PASS | — | Runtime smoke pending |
| L1-06 | `/tasks` routes | Present | Present | PASS | — | |

### Layer 2 — Settings → AI 核心

| ID | Element | Oracle 1.1.2 | Dev | Status | Priority | Fix notes |
|----|---------|--------------|-----|--------|----------|-----------|
| L2-01 | 模型 — CCB read-only MiniMax | `CcbModelSettingsPanel` pattern | Wired in `ModelModalContent` | PASS | — | |
| L2-02 | 助手 — CCB catalog | `fetchAssistantsCatalog` CCB branch | Wired | PASS | — | Read-only list |
| L2-03 | **Agents — layout** | **1 card** Claude Code | **8-card** `CcbWandingAgentsPanel` grid | **FAIL** → **FIXED** | **P0** | `CcbLocalAgents` + `findCcbClaudeAgent` (oracle `index-DA53d_yj.js`) |
| L2-04 | Agents — description | `localAgentsDescription` (WanD) | `ccbWandingAgentsDescription` | **FAIL** → **FIXED** | **P0** | `wandingLocalAgentsDescription` key (CCB-only) |
| L2-05 | Agents — empty state | `localAgentsEmpty` CCB-specific | Generic upstream | **FAIL** → **FIXED** | P1 | `wandingLocalAgentsEmpty` |
| L2-06 | Agents — avatars | Claude orange star | 8 broken images on grid | **FAIL** → **FIXED** | P0** | Removed 8-card grid |
| L2-07 | 能力扩展 — Skills | CCB `.claude/skills` catalog | `SkillsHubSettings` CCB branch | PASS | — | Layer 3 delivered |
| L2-08 | 能力扩展 — Tools/MCP | `CcbMcpHealthPanel` | Wired | PASS | — | |

### Layer 3 — Guid 首页

| ID | Element | Oracle 1.1.2 | Dev | Status | Priority | Fix notes |
|----|---------|--------------|-----|--------|----------|-----------|
| G-01 | AgentPillBar — multi-icon bar | Mixing + Claude + engines + `+` | Often only Claude Code pill | **FAIL** → **PARTIAL** | **P0** | `filterPillBarAgents` when CCB; multi-engine bar may still differ if only one claude row detected |
| G-02 | Assistant preset cards | 万鼎报价专家, … below input | Missing when `assistants.length===0` | **FAIL** | **P0** | Unchanged — verify catalog + migrations |
| G-03 | Model label | **MiniMax M3 (Thinking)** | **MiniMax M3** | **FAIL** → **FIXED** | **P0** | `GuidModelSelector` + `useCcbModelInfo` |
| G-04 | GuidActionRow session props | oracle session menu | Not passed | **FAIL** → **FIXED** | P1 | `capabilitiesSource`, `sessionSkillNames`, `sessionMcpServerIds`, `sessionCcbAgentId` |
| G-05 | `useGuidAgentSelection` | Exports `ccbAuthorityActive` | Only outer hook | **FAIL** → **FIXED** | P1 | Hook exports `ccbAuthorityActive` |
| G-06 | `resolveCcbPresetAgentType` | Used in preset resolver | Not called | **FAIL** → **FIXED** | P1 | `usePresetAssistantResolver` |
| G-07 | Default session agent | `wande-orchestrator` hidden; default claude pill | Logic in `ccbAgentCatalog` | **FAIL** → **FIXED** | P1 | `findCcbClaudeAgent` default/reset |
| G-08 | Workspace footer | 「在项目中工作」 | `GuidInputCard` workspace | UNKNOWN | P2 | Visual smoke |
| G-09 | Profile handoff on send | CCB preset extra staged | Layer 4 wired | PASS | — | `buildCcbPresetConversationExtra` |
| G-10 | Capabilities catalog load | CCB branch in send path | `loadGuidCapabilitiesCatalog` | PARTIAL | P1 | UI menus need G-04 |

### Layer 4 — Data / migrations (enablers)

| ID | Check | Oracle expectation | Dev | Status | Priority |
|----|-------|-------------------|-----|--------|----------|
| D-01 | `ccbModelService.isAuthorityActive` | true when CCB install present | IPC wired | PASS | — |
| D-02 | `ccbAgentsService.listAgents` | 8 agents on disk; 7 visible in Guid (`filterGuidCatalogAgents` hides orchestrator) | Depends on `.claude/agents` + prune migration | UNKNOWN | P0 | DevTools: `fetchAssistantsCatalog()` |
| D-03 | `CCB_MIGRATION_STEPS` (11 steps) | Runs on cold start | `runBackendMigrations.ts` | PASS | — | Requires full restart |
| D-04 | Prune migration | Removes non-WanD bundled agents | `migration.ccbWandingPrunePresets_v1` | UNKNOWN | P0 | Once per profile |
| D-05 | Route-b ACP | CCB-Wanding CLI detected | `sync-aionui-ccb-route-b.ps1` | PASS | — | Dev launcher |

---

## Gap taxonomy (how to fix)

```
Type A — Wrong surface (logic exists, wrong page)
         └─ CcbWandingAgentsPanel → delete CCB branch; restore oracle LocalAgents

Type B — Source exists, not wired (most Guid gaps)
         ├─ resolveCcbPresetAgentType → usePresetAssistantResolver
         ├─ useCcbModelInfo → GuidModelSelector
         ├─ filterPillBarAgents / findCcbClaudeAgent → AgentPillBar / useGuidAgentSelection
         └─ GuidActionRow session props → GuidPage

Type C — Data / migration (UI correct but empty)
         └─ assistants[] empty → cold restart, prune, ccbAgentsService, env paths
```

---

## Recommended fix waves (not started)

### Wave 1 — P0 (largest visual delta, smallest scope)

1. **L2-03 / L2-04 / L2-06:** Remove `LocalAgents` → `CcbWandingAgentsPanel` when CCB active; restore single Claude Code card + oracle `localAgentsDescription` i18n.
2. **G-03:** Wire `GuidModelSelector` to `useCcbModelInfo` + `ccbAcpModelInfo` (copy behavior from `oracle-extract/GuidModelSelector-BhU9PrSg.js`).
3. **G-02 / D-02:** Confirm `fetchAssistantsCatalog` returns 7 Guid-visible agents after cold start; fix migration/env if empty.

### Wave 2 — P1 (Guid interaction parity)

4. **G-06:** `usePresetAssistantResolver.resolvePresetAgentType` → call `resolveCcbPresetAgentType` when `ccbAuthorityActive`.
5. **G-01:** Port oracle `agentSelectionUtils` pill helpers (`filterPillBarAgents`, `findCcbClaudeAgent`).
6. **G-04 / G-05:** Port oracle `GuidActionRow` session-scoped props from `index-CXaEjZr_.js`.

### Wave 3 — P2 (polish + docs)

7. **L1-04:** Decide and align `orgKnowledge.title` (asar: 组织知识库).
8. Update `.trellis/spec/frontend/file-map.md` and `ccb-model-settings-ui.md` — **do not** document 8-agent Settings grid as oracle behavior.
9. Runtime smoke checklist (below).

---

## Runtime smoke checklist (post-fix)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Cold start via `start-dev-full.ps1` | Mixing login, org SSO |
| 2 | Settings → Agents | 1× Claude Code, oracle description |
| 3 | Settings → 模型 | MiniMax variants read-only |
| 4 | Settings → 助手 | WanD agents list (read-only) |
| 5 | Settings → 能力扩展 | Skills + MCP health |
| 6 | Guid home | Multi-icon pill bar + preset cards + **MiniMax M3 (Thinking)** |
| 7 | Select 万鼎报价专家 → send | Conversation uses CCB handoff / correct persona |
| 8 | Sidebar | 任务 + 知识库 label per decided i18n |

---

## DevTools probes

```javascript
// In Electron renderer DevTools after login:

// CCB authority
await window.electronAPI?.invokeIpc?.('ccbModelService.isAuthorityActive')

// Assistant catalog (should be 7 Guid-visible when CCB active)
const { fetchAssistantsCatalog } = await import('@/common/assistants/fetchAssistantsCatalog')
await fetchAssistantsCatalog()
```

---

## Spec corrections required

| Document | Current (wrong) | Should say |
|----------|-----------------|------------|
| `.trellis/spec/frontend/file-map.md` | May imply Settings Agents shows WanD grid | Settings Agents = single Claude Code engine; presets on Guid |
| `.trellis/spec/frontend/ccb-model-settings-ui.md` | May reference `CcbWandingAgentsPanel` as target | Oracle uses simplified `LocalAgents` only |

---

## Commit / delivery status (2026-06-27)

| Repo | Branch | UI parity |
|------|--------|-----------|
| `aionui-src` | `ccb-wanding-1.1.2-recovered` | Layers 1–4 **committed** (`c5b9797`) but **matrix above still FAIL** on P0 items |
| `claude-code-best` | `main` | Trellis docs only (`ee51ddc3`); this matrix is **new artifact** |

**Answer to「进行修复了么」:** Wave 1–2 **已按 oracle 接线**（`aionui-src` 工作区，未提交）。G-02 预设卡片仍依赖 catalog/迁移，需冷启动 smoke。Code-review 2 项 Important 已修；`vitest` 24/24；`tsc` 0 errors。

---

## Related task files

- `dev-parity-wiring-2026-06-26.md` — implementation log (pre-matrix)
- `source-gap-analysis.md` — source vs staging gap
- `asar-1.1.2-extract/` — bundled chunk references
- `oracle-extract/agentSelectionUtils-vHwk7-og.js` — pill bar filter truth
- `oracle-extract/GuidModelSelector-BhU9PrSg.js` — model label merge truth
