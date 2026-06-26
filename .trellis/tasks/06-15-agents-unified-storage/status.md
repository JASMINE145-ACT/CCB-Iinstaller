# Task: Agents Unified Storage

Status: **implemented — default orchestrator routing + preset prune; manual smoke pending**

Date: 2026-06-15 (updated: routing + prune slice)

## Goal

Single canonical store: `.claude/agents/{id}.md` + `{id}.aionui.json`. Role flags `guid_primary` / `delegatable`. AionUI as shell; CCB runtime authority.

**Follow-on (same task arc):** Guid default session routes through `wande-orchestrator` (no direct quotation/accurate MCP on main agent). Prune unrelated AionUI bundled presets; keep WanD triad + office five-pack.

## Done

### Unified storage (initial slice)

- [x] CCB `agentSessionProfile` + `createSession` dual-read + delegatable filter
- [x] AionUI `ccbAgentsService` + migration + bridge delegation
- [x] One-shot `migration.ccbAgentsUnified_v1` (21 profiles → agents on user machine)
- [x] Seed agents + `deploy-seed-agents.ps1` + `config/agents/README.md`
- [x] Spec: `.trellis/spec/integration/agents-unified-model.md`
- [x] **Guid catalog fix:** `filterGuidCatalogAgents`, `display_name`, multiline md parse, `migration.ccbAgentsGuidCatalog_v1`

### Default routing + preset prune (2026-06-15)

- [x] `CCB_DEFAULT_SESSION_AGENT_ID` = `wande-orchestrator`; `CCB_WANDING_KEEP_AGENT_IDS` (8 ids)
- [x] `useGuidSend`: `ccbDefaultRouteExtra` / `ccbPresetExtra` separate merge; stage orchestrator when `ccbAuthorityActive && !is_preset`
- [x] `warmupConversation`: fallback stage `wande-orchestrator` when extra has no agent id
- [x] CCB `resolveDefaultSessionAgentId()` + `createSession` default fallback (no handoff/meta)
- [x] `wande-orchestrator.aionui.json` routing `claude_md`; `deploy-seed-agents.ps1` refreshed live sidecar
- [x] `pruneBundledAgentsNotInKeepSet` + flag `migration.ccbWandingPrunePresets_v1` (after `repairGuidCatalogFlags`)
- [x] `seedBuiltinAssistantsToCcbProfiles` skips builtins outside keep set
- [x] `listCcbAgents(configDir?)` for prune/repair directory isolation
- [x] Automated tests PASS (AionUI 13: useGuidSend, warmup, prune, catalog; CCB 7: agentSessionProfile incl. default resolver)
- [x] code-review PASS
- [x] CCB built + deployed to `D:\CCB-Wanding\dist` (backup `dist.backup-20260615-142345`)

### Specialist session persona fix (2026-06-15)

- [x] CCB `isSpecialistDirectSession` + `resolveSessionUserContextOverride` — block global CLAUDE.md orchestrator bleed; specialist fallback context when sidecar missing
- [x] Specialist Guid sessions (`accurate-agent`, `quotation-agent`): `agents: []` — no Agent() delegation targets
- [x] Seed + live `accurate-agent.md` / `quotation-agent.md` + sidecar: explicit「你是专家，直接调 MCP，勿委派」
- [x] Tests: `agentSessionProfile.test.ts` 12/12; `agent.test.ts` profile cases updated
- [x] code-review PASS; CCB build + deploy to `D:\CCB-Wanding\dist`

- [x] Spec docs updated: `agents-unified-model.md`, `acp-session-flow.md`, `aionui-ccb-boundary.md`, `route-b-status.md`, `ccb-installer/config/agents/README.md`

### Subagent delivery gate (2026-06-18)

Runtime hard gate for WanD keep-set specialists — replaces「模型自觉跑 Delivery Gate」with `hooks.Stop` + `ccb-subagent-gate` scripts.

- [x] Skill `ccb-installer/config/skills/ccb-subagent-gate/` — router (`Stop` + `SubagentStop`), `modes.json`, validators (office + MCP warn)
- [x] `word-creator` → `word-creator-mcp.sh` (office-word MCP evidence; optional officecli on discovered `.docx`; no PAGE false-positive)
- [x] Office agents `block`; `quotation-agent` / `accurate-agent` **warn-only** (log `.claude/logs/subagent-gate-warn.log`)
- [x] CCB `sessionGateHooks.ts` + `agent.ts` — Guid direct `createSession` registers frontmatter hooks; `teardownSession` clears hooks + `setMainThreadAgentType(undefined)`
- [x] CCB `hooks.ts` — `Stop` hook stdin includes `agent_type` via `createBaseHookInput`
- [x] Agent seeds + hooks: `quotation-agent`, `accurate-agent`, `word-creator`, `ppt-creator`, `excel-creator`, `word-form-creator`
- [x] Deploy: `deploy-subagent-gate-skill.ps1`, `patch-subagent-gate-hooks.ps1`
- [x] officecli-* SKILL.md — Gate 文案改为自动钩子说明
- [x] Tests: `sessionGateHooks.test.ts` 3/3; `tests/verify-path-parse.mjs` PASS; `tests/run-tests.sh` (needs bash)
- [x] Spec: `agents-unified-model.md` § Subagent delivery gate; `route-b-status.md` § 2026-06-18e; `acp-session-flow.md` § session gate hooks
- [ ] CCB deploy to live `D:\CCB-Wanding\dist` on user machine (robocopy failed once — retry after build)
- [ ] Manual smoke: `Agent(word-creator)` with MCP → pass gate; empty delivery → block; quotation lie → warn log only

**Not in scope:** orchestrator「空消息 / 后台等待」委派 UX — separate from gate.

**Manual smoke:** New Guid chat → **万鼎账务专家** →「查询 1-5 月销售数据」→ expect direct `accurate_summarize_records`, CCB log `[ACP] agent session profile applied: accurate-agent`


- [x] Phase 1: `mcpServers` on seed + live specialist `.md`; migration `ccbWandingMcpServers_v1`
- [x] Phase 2: office `delegatable: false` + `ccbWandingOfficeDelegatable_v1`; CCB `buildWanDDelegationIndex` in `createSession`
- [x] Phase 3: `Agent` → `kind: think` (bridge); AionUI `SubagentDrawer` + Agent tool card
- [x] Tests + code-review PASS; CCB redeployed post delegation index

## Keep set (Guid + disk)

| Agent | Role |
|-------|------|
| `wande-orchestrator` | Default main router; **no** Guid card |
| `quotation-agent`, `accurate-agent` | Guid shortcut cards (**direct** MCP sessions) + router delegation targets |
| `cowork`, `word-creator`, `word-form-creator`, `ppt-creator`, `excel-creator` | Office preset cards (`delegatable: true` from router since global router slice) |

**Pruned:** 16 other `source: bundled` AionCore presets (e.g. `game-3d`, `morph-ppt`, `academic-paper`, …) — not in `ccb-installer/config/agents/`; won't respawn from deploy-seed.

### Agent config boundary + CLAUDE.md slimming (2026-06-15)

- [x] `data/ccb-wanding-claude-index.md` slimmed to L0 env-only (no persona / task routing)
- [x] `wande-orchestrator` seed + live md: Who-you-are + delegation prohibitions; sidecar `claude_md` refreshed
- [x] `quotation-agent` / `accurate-agent` data handbook mapping in md + sidecar `claude_md`
- [x] `ensure-wanding-settings.ps1` reference text + live `CLAUDE.md` refreshed
- [x] Spec: four-layer config table + data handbook matrix in `agents-unified-model.md`
- [x] CCB `WANDE_ORCHESTRATOR_ROUTER_CLAUDE_MD` fallback in `agent.ts` when sidecar `claude_md` empty
- [x] `deploy-seed-agents.ps1` (sidecars deployed; user md skip — live orchestrator md hand-patched)
- [x] CCB deployed `dist.backup-20260615-194410`
- [x] code-review PASS; trellis-check PASS (agentSessionProfile 9/9)

### Global router model (2026-06-15)

- Default Guid send (non-preset) stages `wande-orchestrator` — **no Guid card** for router
- `CCB_GUID_HIDDEN_AGENT_IDS`: `wande-orchestrator` only
- **万鼎报价专家** / **万鼎账务专家** visible as Guid cards (`migration.ccbWandingSpecialistGuidCards_v1`)
- Router may **Agent()** delegate to all keep-set specialists including office presets
- Migration `migration.ccbWandingGlobalRouter_v1`: office `delegatable=true` for router delegation

## Open

- [ ] Manual smoke after AionUI dev restart:
  - **New** Guid chat → ask「你是谁」→ orchestrator intro (not「报价、库存与业务数据助手」)
  - `查直接50` → `Agent(quotation-agent)` + `mcp__quotation__*`
  - SubagentDrawer「查看执行」
  - Guid ≈ **6** preset cards (not ~21)
  - Cowork / Word preset still use selected preset id
- [ ] Remove `ccbAssistantProfilesService` thin wrapper after smoke (`remove-thin-wrapper`)
- [ ] Git commit in `claude-code-B` + `aionui-src`

## Key files

### AionUI (`aionui-src`)

| File | Change |
|------|--------|
| `ccbAgentCatalog.ts` | `CCB_WANDING_DELEGATABLE_AGENT_IDS`, `CCB_WANDING_OFFICE_PRESET_IDS`, office `delegatable: false` |
| `ccbAgentMigration.ts` | `repairWanDSubagentMcpServers`, `repairOfficePresetDelegatable`, flags `ccbWandingMcpServers_v1` / `ccbWandingOfficeDelegatable_v1` |
| `MessageAcpToolCall.tsx`, `SubagentDrawer.tsx` | Agent delegation card + drawer MVP |
| `ccbAssistantProfileMigration.ts` | seed filter to keep set only |
| `useGuidSend.ts` | default route extra + staging |
| `warmupConversation.ts` | orchestrator fallback |
| `runBackendMigrations.ts` | chain: seed → unified → repair → **prune** |

### CCB (`claude-code-B`)

| File | Change |
|------|--------|
| `agentSessionProfile.ts` | `CCB_WANDING_DELEGATABLE_AGENT_IDS`, `buildWanDDelegationIndex`, `appendWanDDelegationIndex` |
| `agent.ts` | orchestrator delegation index injection + `claude_md` fallback when sidecar empty |
| `sessionGateHooks.ts` | Guid direct `registerSessionGateHooks` / `clearSessionGateHooks` |
| `hooks.ts` | `Stop` hook `agent_type` in `createBaseHookInput` |

### ccb-installer

| File | Change |
|------|--------|
| `config/skills/ccb-subagent-gate/**` | Router + validators + `modes.json` |
| `scripts/deploy-subagent-gate-skill.ps1` | Deploy skill to `.claude/skills/` |
| `scripts/patch-subagent-gate-hooks.ps1` | Merge `hooks.Stop` into live agent `.md` |
| `config/agents/quotation-agent.md`, `accurate-agent.md`, `word-creator.md`, `ppt-creator.md`, `excel-creator.md`, `word-form-creator.md` | `mcpServers` + `hooks.Stop` |
| `config/agents/wande-orchestrator.*` | Who-you-are + router sidecar |
| `data/ccb-wanding-claude-index.md` | L0 env-only index |
| `scripts/ensure-wanding-settings.ps1` | on-demand Read disclaimer |
| `scripts/deploy-seed-agents.ps1` | refresh sidecars (user `.md` wins) |

## Smoke commands

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\patch-subagent-gate-hooks.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1
cd D:\claude-code-B; bun run build
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
.\ccb-installer\scripts\start-aionui-dev.ps1
# Gate: [ACP] session gate hooks registered profile=quotation-agent events=Stop
# CCB session: [ACP] agent session profile applied: wande-orchestrator
```

## References

- Plan (unified): `.cursor/plans/agents_unified_storage_5a0a3897.plan.md`
- Plan (routing + prune): `.cursor/plans/主路由与助手精简_6a25599e.plan.md`
- Journal: `.trellis/workspace/JASMINE145-ACT/journal-1.md` § 2026-06-15 (unified + routing/prune)
- Spec: `.trellis/spec/integration/agents-unified-model.md`
