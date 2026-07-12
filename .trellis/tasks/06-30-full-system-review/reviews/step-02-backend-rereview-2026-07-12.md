# Step 2 Backend Rereview - 2026-07-12

> Task: `06-30-full-system-review`  
> Scope: Follow-up review of Step 2 Backend after `delivery-step-02-backend-fixes.md`.  
> Mode: read-only evidence check; no runtime code changes.

## Overall Judgment

**Current maturity: 8/10.** The original Step 2 audit score remains historically correct at **7/10** for 2026-07-02, but its P0/P1 findings have since been closed by documentation, config, and focused test updates. Backend ACP is now a solid internal-tool layer for Route B: MCP merge, lazy profile prefetch, AskUserQuestion disabled contract, research-agent ROE, route-b status, and sync coverage all have evidence. It is not rated higher because live `overlay -> upstream -> dist -> release` proof and CI/release coverage are still owned by Step 5 Ship/Ops.

Classification: **Internal tool / pre-productization**.

## Evidence Checked

| Area | Evidence | Result |
| --- | --- | --- |
| Step 2 initial audit | `reviews/step-02-backend.md` | 7/10 initial score and P0/P1 list preserved as historical evidence |
| Fix delivery | `delivery-step-02-backend-fixes.md` | Lists closed BE-P0/BE-P1 items and verification command |
| Route-B live snapshot | `.trellis/spec/backend/route-b-status.md` | Snapshot refreshed to 2026-07-02; AUQ disabled and `registerSessionGateHooks` N/A documented |
| AUQ contract | `.trellis/spec/backend/acp-session-flow.md`; `.trellis/spec/frontend/chat-acp-flow.md` | Backend and Frontend specs both state AUQ is disabled and clarification uses normal chat |
| Research agent ROE | `ccb-installer/config/skills/ccb-subagent-gate/config/modes.json` | `research-agent:roe-judge` is `block` |
| MCP merge test | `ccb-installer/claude-code-b-src/src/services/acp/sessionMcpConfig.ts` + `__tests__/sessionMcpConfigMerge.test.ts` | Merge/param parsing helper is extracted from `agent.ts`; tests import the production helper |
| Sync coverage | `ccb-installer/scripts/sync-claude-code-b-mcp-prefetch.ps1` | Includes `askUserQuestionPermissionResolve.ts` and overlay test copy steps |
| MCP health docs | `.trellis/spec/integration/mcp-health.md` | Session layer says manifest currently includes 8 profiles, including `research-agent` and `price-library-agent` |

## Closed Findings From Initial Review

| Initial Finding | Current Status | Evidence |
| --- | --- | --- |
| `route-b-status.md` stale | Closed | Snapshot is now `2026-07-02` |
| AskUserQuestion spec/code conflict | Closed by Option A | AUQ disabled is documented in backend and frontend specs |
| `research-agent:roe-judge` missing | Closed | `modes.json` has `research-agent:roe-judge: block` |
| Phantom `registerSessionGateHooks` | Closed by spec correction | `route-b-status.md` marks it N/A; `agents-unified-model.md` documents frontmatter Stop + subagent-gate |
| Missing MCP merge regression | Closed at contract level | `sessionMcpConfigMerge.test.ts` added |
| Sync list missing AUQ helper/tests | Closed | sync script copies `askUserQuestionPermissionResolve.ts` and test files |
| `mcp-health.md` session profile list stale | Closed | integration mcp-health documents manifest-driven profile list |
| price-library Stop hook ambiguity | Closed by design note | documented as no Stop hook by design; write path relies on two-phase confirmation/admin boundary |

## Remaining Risks

| Priority | Risk | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- |
| P1 | Backend rating was inconsistent across task/spec docs | `status.md` said 7/10; `spec/index.md` still said Backend 9/10 | Agents and maintainers may overtrust Backend maturity | Update task and spec maturity to 8/10 with this rereview |
| P1 | Overlay changes are not proof of live dist behavior | `route-b-status.md` still says run sync/build/deploy after overlay edits | Correct source may not be the shipped behavior | Step 5 Ship/Ops must own release gate and CI coverage |
| P2 | ACP integration test depth remains limited | MCP merge helper now has direct helper tests; full `agent.ts` remains hard to import because overlay depends on upstream-only modules | Full session wiring regressions can still escape helper tests | Keep native ACP smoke for merge-path changes; leave upstream agent/bridge tests under `BE-P2-1` |
| P2 | Upstream-only ACP modules remain a boundary hazard | `route-b-status.md` lists `assistantProfiles.ts`, `bridge.ts`, `capabilities.ts`, `mcpManifest.ts`, `entry.ts` as upstream-only | New fixes may land in repo overlay but miss upstream-only behavior | Keep file-map/source boundary current; do not treat overlay as complete source |
| P2 | AUQ disabled is stable but product experience is unverified | Specs state normal chat clarification; no dedicated multi-candidate quotation E2E evidence in this rereview | Clarification UX may regress silently | Cover real multi-candidate quote clarification in Frontend/Business E2E |

## Score Rationale

| Score Band | Reason |
| --- | --- |
| Not 7/10 anymore | The original P0/P1 blockers are now closed or explicitly transferred to the correct layer |
| 8/10 | Backend ACP contracts are coherent and documented; MCP merge helper now has production-helper tests; remaining issues are mostly release proof, CI, and full session wiring test depth |
| Not 9/10 | Ship/Ops release gate, live dist proof, and upstream-only module coverage are not fully automated |

## Backlog Delta

No new Backend P0/P1 item is required. Existing open risks should remain where they already belong:

- `SHIP-P0-1` - cold build/release proof
- `SHIP-P1-1` / `INT-P2-2` - CI/build-wanding v2 coverage
- `BE-P2-1` - partial: MCP merge helper hardened; upstream agent/bridge test sync still optional/open

## Next Step

Proceed with **Step 4 Business** unless preparing a release, in which case run **Step 5 Ship/Ops** first to close live dist and CI proof.
## 2026-07-12 Code Hardening

The MCP merge test blind spot was reduced without importing the heavy ACP agent runtime:

- Added `sessionMcpConfig.ts` in both ACP mirrors for ACP param parsing and settings/params overlay.
- Updated `agent.ts` in both mirrors to call `mergeSessionMcpConfigs(...)`.
- Updated `sessionMcpConfigMerge.test.ts` in both mirrors to import the production helper instead of reimplementing merge logic.
- Added `sessionMcpConfig.ts` to `sync-claude-code-b-mcp-prefetch.ps1` so upstream sync includes the extracted helper.

Verification:

```powershell
bun test ccb-installer/claude-code-b-src/src/services/acp/__tests__/sessionMcpConfigMerge.test.ts ccb-installer/claude-code-b-src/src/services/acp/__tests__/mcpSessionPrefetch.test.ts
bun test ccb-installer/src/services/acp/__tests__/sessionMcpConfigMerge.test.ts
```

Result: 10 tests passed, 0 failed across the two commands.
