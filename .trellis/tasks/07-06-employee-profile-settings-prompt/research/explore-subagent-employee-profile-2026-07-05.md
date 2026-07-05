# Explore — Employee profile into all subagents

| Field | Value |
|-------|--------|
| **Date** | 2026-07-05 |
| **Trigger** | User: profile must reach **main agent + all subagents** |
| **Parent task** | `07-06-employee-profile-settings-prompt` |

---

## Current behavior (verified)

```text
session/new
  → resolveSessionUserContextOverride(...)
  → appendEmployeeProfileToUserContext(...)
  → QueryEngine.config.userContextOverride.claudeMd
  → MAIN agent only

Agent tool spawn (quotation-agent / accurate-agent / …)
  → runAgent()
  → override?.userContext ?? getUserContext()   // disk CLAUDE.md, NOT session override
  → omitClaudeMd may strip claudeMd (Explore/Plan only)
  → NO employee-profile.json merge
```

Evidence:

| Layer | Finding |
|-------|---------|
| ACP | `agent.ts` sets `userContextOverride` only on `QueryEngine` at `createSession` |
| AgentTool | `runAgentParams.override` only carries `systemPrompt` / `agentId` — **never** `userContext` |
| Dist | `chunk-4c0brzrz.js` L180698–180704: `override?.userContext ?? getUserContext()` |
| Backlog | `packaging-backlog-1.1.6.md`: 「子 agent spawn 上下文不对称」 |

### Coverage matrix (today)

| Path | Employee profile? |
|------|-------------------|
| Default session main (`wande-orchestrator`) | Yes |
| Guid specialist direct session (main) | Yes |
| Orchestrator → Agent(`quotation-agent`) etc. | **No** |
| Built-in Explore / Plan | **No** (and `omitClaudeMd` strips disk CLAUDE.md) |

---

## Design options

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A (recommended)** | After `resolvedUserContext` in `runAgent.ts`, call idempotent `appendEmployeeProfileToUserContext` | Covers all Agent-tool subagents; survives `omitClaudeMd`; minimal surface | Touches `packages/builtin-tools` (outside current ACP-only overlay list) |
| B | Pass parent `userContext` as `override.userContext` from AgentTool | Reuses session block | Parent context not on `toolUseContext`; plumbing heavy; fork paths diverge |
| C | Patch `getUserContext()` globally | One place | Specialist sessions intentionally **replace** getUserContext; Explore omit still drops claudeMd; couples identity to L0 CLAUDE.md |

**Choose A.** Keep session/new path for main agent (unchanged). Subagent path independently reads `%CLAUDE_CONFIG_DIR%/employee-profile.json` (same file AionUI already stages).

### Idempotency

Marker: `# 当前用户 / Current user` already in `formatEmployeeProfileClaudeMd`.

If `base.claudeMd` contains marker → skip append (avoids double-inject if a future caller passes parent override).

### Overlay / deploy

| File | Action |
|------|--------|
| `ccb-installer/claude-code-b-src/src/services/acp/employeeProfile.ts` | Add `mergeEmployeeProfileIntoResolvedUserContext` (idempotent) + unit tests |
| `D:\claude-code-B\packages\builtin-tools\src\tools\AgentTool\runAgent.ts` | One call after `resolvedUserContext` |
| Overlay | Add `runAgent.ts` to sync script **or** maintain minimal patch under `claude-code-b-src/packages/builtin-tools/...` |
| Deploy | `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` must copy runAgent |

**No aionui-src change** — handoff file already exists.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Explore/Plan get PII they don't need | Accept for WanD (identity is small); or skip when `omitClaudeMd && agentType in Explore|Plan` — **default: still inject** (user asked for all subagents) |
| Token cost | Profile block is small (~200–400 chars) |
| Double append on main | Main does not use `runAgent`; only subagents |
| Sync script forgets runAgent | Extend script + test that dist contains marker after deploy |
| Specialist direct has no Agent targets | N/A; already has profile as main |

---

## Out of scope

- Injecting full assistant/orchestrator `claudeMd` into subagents (would reintroduce L0 bleed)
- Changing L1 agent bodies
- Packaging into 1.1.6 NSIS (still dev/route-b unless user asks)
