# Context

## User Intent

The user wants this workflow:

```text
User tells quotation agent: add rule X to shared business knowledge.
Agent confirms exact rule.
User confirms.
Agent writes center org knowledge.
All staff local shadow files update quickly.
Future quotation candidate selection reads the new rule.
```

## Design Decision

Keep center org knowledge as authority and keep Agent Read on local shadow file.

Do not make quotation-agent read HTTP URLs directly. Token handling, offline fallback, and ACP Read path are already solved by local shadow sync.

## Files Changed

Repo `D:\Projects\claude-code-best`:

- `python/admin/org_knowledge_client.py`
  - added JSON PUT helper, `update_doc`, `append_business_rule`.
- `python/main.py`
  - added dispatch case for `append_business_rule`.
- `mcp_servers/quotation-server/dist/index.js`
  - exposed MCP tool schema.
- `ccb-installer/config/agents/quotation-agent.md`
  - added shared business rule write workflow.

Repo `D:\Projects\aionui-src`:

- `packages/desktop/src/common/auth/orgKnowledgeShadowSync.ts`
  - extracted reusable `writeWandingBusinessKnowledgeShadowFromDoc`;
  - added `syncWandingBusinessKnowledgeShadow`.
- `packages/desktop/src/renderer/pages/orgKnowledge/OrgKnowledgePage/index.tsx`
  - save/revert immediately sync local shadow for `wanding_business_knowledge`.
- `packages/desktop/src/renderer/hooks/context/OrgAuthContext.tsx`
  - authenticated org sessions connect to `/ws`, react to `org-knowledge.updated`, sync every 60s, and sync on foreground.

## Validation Notes

The MCP write tool was tested only in dry-run/no-confirm mode to avoid writing a fake shared rule:

```json
{"requires_confirmation": true}
```

Production Electron Vite build failed only at renderer OOM after main/preload passed. Treat AionUI frontend as source-ready but not packaged until build is rerun with more heap.
