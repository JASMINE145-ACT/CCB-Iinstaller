# Task A — Platform Agent Registry (ACP) + Forbidden-Coupling Lint

**Status:** draft（待执行计划批准）  
**Created:** 2026-07-05  
**Parent:** `07-05-platform-business-architecture-separation` (SB-01, SB-13)

## Goal

Remove the highest-priority WanD agent ID hardcoding from **platform ACP runtime** by loading default router, keep-set, delegatable set, and office presets from the **read-only package registry** (07-03 P1). Add **CI lint** so new forbidden coupling cannot re-enter platform paths during follow-on migrations (SB-04/06).

## User story

- As a platform engineer adding a second vertical package, I want the default session agent and fleet keep-list to come from `package-registry.snapshot.json`, not string literals in `agentSessionProfile.ts`.
- As a reviewer, I want CI to fail when a PR adds new `wande-orchestrator` / `quotation-agent` literals in `ccb-installer/src/`.

## Scope (this task)

| ID | In scope | Out of scope (separate task) |
|----|----------|------------------------------|
| **SB-01** | `ccb-installer/src/services/acp/agentSessionProfile.ts` + new registry loader + tests; mirror `claude-code-b-src/` | aionui `ccbAgentCatalog.ts` → **Task B** |
| **SB-13** | `scripts/lint-platform-forbidden-coupling.mjs` + `.github/workflows/` job | Moving orchestrator guardrails (SB-06), MCP warmup (SB-03) |

## Non-goals

- No aionui-src changes (Task B)
- No route-b / `patches/aionui-acp/` changes (Task C / SB-04)
- No removal of `WANDE_ORCHESTRATOR_ROUTER_CLAUDE_MD` prompt text (SB-05 / transition-ok)
- No manifest schema version bump unless required for router/office metadata
- No dist deploy / route-b sync in this task (user runs when validating)

## Design (SB-01)

### Registry-derived sets

Load `config/generated/package-registry.snapshot.json` (path resolved from install / repo root):

| Constant (today) | Registry rule |
|------------------|---------------|
| `CCB_DEFAULT_SESSION_AGENT_ID` | First agent with `requiredCapabilities` containing `platform.agent.route`; if multiple packages, use `platform.defaults.json` primary package or first match |
| `CCB_WANDING_KEEP_AGENT_IDS` | All `agents[].id` in snapshot (installed fleet) |
| `CCB_GUID_ONLY_AGENT_IDS` | Agents with manifest flag `guidOnly: true` **or** transition list in `platform.defaults.json` until schema extended |
| `CCB_WANDING_OFFICE_PRESET_IDS` | Agents with `packageId: null` and id matching `*-creator` / `cowork` **or** `providesCapabilities` office namespace — prefer explicit list in `platform.defaults.json` for v1 |

### Legacy fallback

If snapshot missing or empty: use current hardcoded sets (log once). Behavior must not regress WanD dev install.

### Public API

- Keep existing export names for compatibility (`CCB_DEFAULT_SESSION_AGENT_ID`, etc.) but implement as getters or lazy init from registry loader.
- Tests mock registry fixture JSON.

## Design (SB-13)

- Script scans **platform paths** from `platform-forbidden-coupling.md` §1.
- Forbidden **new** literals: WanD product names, fixed business agent IDs, fixed MCP names as branch keys (see spec table).
- **Allowlist:** existing files/lines from audit baseline (`research/platform-forbidden-coupling-baseline.txt` generated at implement time); test fixtures; `*.test.ts`.
- CI: run on PR + push main; exit 1 on new violations only (baseline diff mode) **or** full scan with allowlist file.

## Acceptance criteria

- [x] **AC1** New module loads registry snapshot and derives default router id = `wande-orchestrator` for current WanD install (parity)
- [x] **AC2** `agentSessionProfile.test.ts` covers registry-driven sets + missing-snapshot fallback
- [x] **AC3** No new hardcoded business agent ID strings added in `agentSessionProfile.ts` body (router prompt text excepted as transition)
- [x] **AC4** `claude-code-b-src/` mirror updated in sync with `src/`
- [x] **AC5** `lint-platform-forbidden-coupling.mjs` PASS on main; fails on synthetic violation in test
- [x] **AC6** GitHub Actions job runs lint on PR
- [x] **AC7** `node ccb-installer/scripts/build-package-registry.mjs` → 0 errors; existing unit tests for agent session profile PASS
- [x] **AC8** Spec update: `platform-forbidden-coupling.md` §8 changelog + boundary-map backlog SB-01/SB-13 status

## Manual verification (post-deploy)

- [ ] Dev: `start-dev-full.ps1` → Guid default session still binds orchestrator; quotation specialist session unchanged
- [ ] Optional: native ACP smoke one turn with orchestrator + quotation delegation

## Dependencies

- 07-03 P1 registry snapshot (done)
- 07-05 audit + separation backlog (done)

## Follow-on tasks

| Task | Backlog |
|------|---------|
| Task B | SB-02 — aionui `ccbAgentCatalog.ts` |
| Task C | SB-04 — route-b manifest MCP inject |
