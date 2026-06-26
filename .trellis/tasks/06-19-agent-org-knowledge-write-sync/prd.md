# Agent Org Knowledge Write + Auto Shadow Sync

Date: 2026-06-19

## Problem

Users want to tell the quotation agent in chat, for example:

> Add this business rule to the shared knowledge base so everyone can use it.

Before this task, the shared org knowledge system existed, but chat-driven rule updates were not a closed loop:

- Agent could read local shadow `wanding_business_knowledge.md`.
- Python MCP could read org API first for internal selectors.
- `/org-knowledge` UI could edit center docs.
- There was no controlled MCP tool for the agent to write center org knowledge.
- Other employees still needed re-login/manual sync to refresh the local shadow file used by Agent Read.

## Goals

1. Add a controlled quotation MCP tool for appending confirmed business rules to center org knowledge.
2. Make `wanding_business_knowledge` updates propagate to local shadow files automatically for online employees.
3. Preserve optimistic concurrency and confirmation safety.
4. Keep Agent Read path local-shadow based; do not make the agent read HTTP org URLs directly.

## Implemented

### MCP write tool

Tool: `append_business_rule`

Files:

- `mcp_servers/quotation-server/dist/index.js`
- `python/main.py`
- `python/admin/org_knowledge_client.py`
- `ccb-installer/config/agents/quotation-agent.md`

Behavior:

- First call without `confirmed=true` returns `requires_confirmation: true` and does not write.
- Second call with `confirmed=true`:
  - GETs center `wanding_business_knowledge`.
  - Appends a dated rule block.
  - PUTs `/api/org-knowledge/{slug}` with `expected_version`.
  - Returns `previous_version`, `version`, `section`, `rule_text`.
- 409/permission/login failures are surfaced to the agent instead of silently overwriting.

### Auto shadow sync

Files:

- `D:\Projects\aionui-src\packages\desktop\src\common\auth\orgKnowledgeShadowSync.ts`
- `D:\Projects\aionui-src\packages\desktop\src\renderer\pages\orgKnowledge\OrgKnowledgePage\index.tsx`
- `D:\Projects\aionui-src\packages\desktop\src\renderer\hooks\context\OrgAuthContext.tsx`

Behavior:

- After `/org-knowledge` save/revert of slug `wanding_business_knowledge`, the editor's machine immediately writes the local shadow file through existing `org-knowledge-sync-shadow` IPC.
- When org auth is authenticated, clients:
  - connect to org server `/ws`;
  - listen for `org-knowledge.updated`;
  - immediately sync if `slug == wanding_business_knowledge`;
  - also sync every 60 seconds as fallback;
  - sync once when the window returns to visible.

## Deployment

Completed on local dev machine:

- `.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke`
  - copied Python + MCP dist to `D:\CCB-Wanding`;
  - smoke passed.
- `.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd`
  - required escalation after EPERM;
  - live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md` updated.

## Verification

Passed:

- `python -m py_compile python\admin\org_knowledge_client.py python\main.py`
- `node --check mcp_servers\quotation-server\dist\index.js`
- live vendor dry-run:
  - `append_business_rule` without confirmation returns `requires_confirmation: true`;
  - no center write is performed.
- AionUI tests:
  - `bun test tests/unit/common-auth/orgAuthLogin.test.ts tests/unit/common-adapter/orgHttpBridge.test.ts`
  - 7 passed.

Partial:

- `electron-vite build --config packages/desktop/electron.vite.config.ts`
  - main + preload built;
  - renderer build reached bundle phase and failed with Node heap OOM.
  - This does not prove a TS syntax failure, but full production build still needs rerun with larger heap before shipping.

## Acceptance

- User can ask agent to add a business rule.
- Agent must ask for confirmation before writing shared org knowledge.
- After confirmation, agent writes center `wanding_business_knowledge` via org API and reports version change.
- Editor's local shadow updates immediately after save/revert.
- Other authenticated online employees receive org WS update and sync immediately; 60s polling is fallback.
- New agent sessions use updated `quotation-agent.md` rules.

## Remaining

- Package/publish AionUI frontend changes to employee installations.
- Re-run production renderer build with larger Node heap if packaging:
  - e.g. set `NODE_OPTIONS=--max-old-space-size=4096` before Electron Vite build.
- Optional next hardening:
  - manager-only org knowledge PUT/revert enforced server-side.
  - unit test for `append_business_rule` HTTP conflict handling.
