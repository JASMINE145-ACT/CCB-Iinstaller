# 2026-06-19 — Agent Writes Shared Org Knowledge + Automatic Shadow Sync

## User Need

The user wants to say in a quotation-agent chat: "add this business rule to the shared knowledge base", then have the agent save it to center org knowledge and have every employee update automatically.

## Design

- Center org knowledge remains the authority.
- Agent Read continues to use local shadow `wanding_business_knowledge.md`; do not make Agent Read hit org HTTP URLs directly.
- Writes go through a controlled quotation MCP tool and require explicit user confirmation.
- Sync is handled by AionUI shadow sync: org WS immediate trigger plus 60s fallback polling.

## Implemented

| Layer | File | Change |
|------|------|--------|
| MCP schema | `mcp_servers/quotation-server/dist/index.js` | Added `append_business_rule` |
| Python dispatch | `python/main.py` | Added `append_business_rule`; unconfirmed calls return `requires_confirmation` |
| Org client | `python/admin/org_knowledge_client.py` | Added JSON PUT helper, `update_doc`, `append_business_rule` |
| Agent L1 | `ccb-installer/config/agents/quotation-agent.md` | Added shared business rule write workflow |
| AionUI sync | `packages/desktop/src/common/auth/orgKnowledgeShadowSync.ts` | Added reusable shadow sync helpers |
| AionUI UI | `OrgKnowledgePage/index.tsx` | Save/revert writes local shadow immediately for `wanding_business_knowledge` |
| AionUI auth | `OrgAuthContext.tsx` | Org-authenticated clients listen to `/ws`, sync on `org-knowledge.updated`, foreground, and every 60s |

## Deployment

- `sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke`: PASS; Python + MCP dist copied to `D:\CCB-Wanding`.
- `deploy-seed-agents.ps1 -ForceMd`: first run EPERM, escalated rerun PASS; live `quotation-agent.md` updated.

## Verification

- `python -m py_compile python\admin\org_knowledge_client.py python\main.py`: PASS
- `node --check mcp_servers\quotation-server\dist\index.js`: PASS
- Live vendor dry-run: `append_business_rule` without `confirmed=true` returns `requires_confirmation: true`; no center write.
- AionUI unit tests: `bun test tests/unit/common-auth/orgAuthLogin.test.ts tests/unit/common-adapter/orgHttpBridge.test.ts`: 7/7 PASS
- Electron Vite build: main + preload PASS; renderer bundle failed with Node heap OOM. Re-run with larger heap before packaging.

## Trellis Updates

- Task: `.trellis/tasks/06-19-agent-org-knowledge-write-sync/`
- Spec: `.trellis/spec/integration/org-knowledge.md`
- Rollout: `.trellis/spec/integration/org-knowledge-phase0-rollout.md`

## Remaining

1. Package/publish AionUI frontend sync changes to employee installations.
2. Re-run production build with larger heap, e.g. `NODE_OPTIONS=--max-old-space-size=4096`.
3. Optional hardening: server-side manager-only org knowledge PUT/revert enforcement.
