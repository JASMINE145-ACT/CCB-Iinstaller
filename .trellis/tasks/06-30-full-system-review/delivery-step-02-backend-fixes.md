# Step 2 Backend Fixes — Delivery (2026-07-02)

> Task: `06-30-full-system-review` · closes Step 2 audit P0/P1 doc+config items (conservative)

---

## Closed backlog items

| ID | Fix |
|----|-----|
| BE-P0-1 / INT-P1-4 | `route-b-status.md` refreshed → Snapshot 2026-07-02 |
| BE-P0-2 | `acp-session-flow.md` — AUQ **disabled** documented (Option A); greeting = Frontend |
| BE-P1-1 | `modes.json` — `research-agent:roe-judge: block` |
| BE-P1-2 | `agents-unified-model.md` — removed phantom `registerSessionGateHooks` |
| BE-P1-3 | `sessionMcpConfigMerge.test.ts` — merge contract (2 tests) |
| BE-P1-4 | `sync-claude-code-b-mcp-prefetch.ps1` — +`askUserQuestionPermissionResolve.ts`, +tests |
| BE-P1-5 | `mcp-health.md` — 8 agent_profiles documented |
| BE-P2-2 | Greeting ownership in `acp-session-flow.md` |
| BE-P2-3 | `price-library-agent` — intentional no Stop hook documented |

## Still open (by design)

| ID | Reason |
|----|--------|
| BE-P0-2 (Frontend) | `chat-acp-flow.md` AUQ section — Step 3 |
| BE-P2-1 | Upstream `agent.test.ts` sync — optional |
| AUQ restore | Risky; not requested |

---

## Verification

```text
bun test sessionMcpConfigMerge.test.ts askUserQuestionPermissions.test.ts mcpSessionPrefetch.test.ts
→ 11 pass, 0 fail
code-review agent → PASS
```

## Deploy note

After pulling `modes.json`, run dev launcher (deploys subagent-gate skill) or:

```powershell
.\ccb-installer\scripts\deploy-ccb-skills.ps1 -SkillsDir "$env:LOCALAPPDATA\CCB-Wanding\.claude\skills"
```
