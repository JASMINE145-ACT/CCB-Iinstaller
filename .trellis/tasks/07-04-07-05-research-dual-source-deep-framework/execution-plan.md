# Execution Plan — `07-04-07-05-research-dual-source-deep-framework`

| Field | Value |
|-------|--------|
| **Status** | `in_progress` |
| **Scenario** | **A** (standard phased; serial workstreams) |
| **Plan depth** | **Standard** |
| **Verification profile** | **Release** (MCP/probe/scripts) + **UI** (Guid research smoke) |
| **Repos** | `claude-code-best` only |
| **Active phase** | — (await user approval — **no implement until 执行 task**) |

**PRD:** [`prd.md`](./prd.md) · **Explore:** [`research/explore-2026-07-04-dual-source-deep-framework.md`](./research/explore-2026-07-04-dual-source-deep-framework.md) · **Packaging:** [`ccb-installer/packaging-backlog-1.1.6.md`](../../../ccb-installer/packaging-backlog-1.1.6.md) Issue 4

**Parent:** [`06-28-research-agent-toolstack`](../06-28-research-agent-toolstack/)

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| Explore | **done** | `research/explore-2026-07-04-dual-source-deep-framework.md` |
| Plan | **done** | this file + `prd.md` |
| P0 Read spec | **done** | `research-dual-source-deep-framework.md` |
| P1 A skill | **done** | `wanding-deep-research/SKILL.md` + deploy script + build seed |
| P1 B agent L1 | **done** | `research-agent.md` + sidecar + orchestrator |
| P2 C Tavily MCP | **done** | platform.defaults + ensure-wanding-settings + research.env |
| P2 D gate/probe | **done** | validator tavily + probe exa_api_key + ship scripts |
| P3 E spec | **done** | `research-dual-source-deep-framework.md` + mcp-business |
| P3 F tests/smoke | **partial** | probe PASS; Guid manual smoke pending |
| Gate | **partial** | code-review PASS (packaging); probe smoke PASS; Guid pending |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | `trellis-before-dev` | available | `backend/mcp-business.md` |
| Research capture | task `research/*.md` | available | done (explore doc) |
| Implement | `trellis-implement` | available | inline after approval |
| Review | `code-reviewer` | available | `trellis-check` |
| MCP health | `test-mcp-health.ps1 -Probe` | available | manual tools/list |
| UI smoke | Guid 资料搜索助手 | available | transcript + MD path |
| Tavily key | org secret / env | **unverified** | exa-only WARN profile |

---

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| Activate | `task.py start 07-04-07-05-research-dual-source-deep-framework` | `in_progress` |
| Read parent | `06-28-research-agent-toolstack` decisions | Scrapling stays Extended |
| Read spec | `trellis-before-dev` → backend + integration | file list |
| Baseline probe | `probe-research-capabilities.ps1` | capture exa-only baseline |

---

## Phase 1…N — Workstreams

| Phase | P | WS | Risk | Tool | Files | Required output | Profile |
|-------|---|-----|------|------|-------|-----------------|---------|
| 1 | P0 | A — `wanding-deep-research` skill | docs | trellis-implement | `.agents/skills/wanding-deep-research/SKILL.md`, mirror `.cursor/skills/` | Phase 0–5 + Exa/Tavily routing + forbid Task | Fast |
| 1 | P0 | B — research-agent L1 slim | ui | trellis-implement | `research-agent.md`, `research-agent.aionui.json`, `README.md` | skill enabled; MCP allowlist exa+tavily | UI |
| 2 | P1 | C — Tavily MCP registration | external-api, packaging | trellis-implement | `platform.defaults.json`, `research-capability-manifest.json`, `install-research-toolstack.ps1` | Base=`[exa,tavily]` | Release |
| 2 | P1 | D — gate + health + probe | packaging | TDD → implement | `research-agent-mcp.sh`, `mcp-health-manifest.json`, `probe-research-capabilities.ps1` | tavily in tool_pattern; probe line | Release |
| 3 | P2 | E — spec + backlog | docs | trellis-update-spec | `.trellis/spec/backend/research-dual-source-deep-framework.md`, `mcp-business.md`, backlog Issue 4 | spec + links | Fast |
| 3 | P2 | F — tests + smoke doc | ui | manual + script | `delivery-smoke-dual-source.md`, gate test fixture if added | AC6 log | UI |

### TDD contract

| WS | Test level | RED evidence | GREEN command | Regression |
|----|------------|--------------|---------------|------------|
| D gate | bash fixture | N/A (extend validator) | run `research-agent-mcp.sh` with tavily transcript fixture | exa-only still passes |
| C probe | ps1 smoke | N/A | `probe-research-capabilities.ps1` shows tavily row | exa probe unchanged |
| F manual | UI | N/A | Guid depth prompt → MD+JSONL | single-process (no Task in transcript) |
| A,B | docs | N/A | link check skill path in sidecar | — |

### Tool routing (normative — for implement)

| Phase | Tavily | Exa |
|-------|--------|-----|
| Discover (breadth) | `tavily-search` — news, domain filter | `web_search_exa` — semantic / niche |
| Read | `tavily-extract` batch URLs | livecrawl / `get_code_context_exa` fallback |
| Synthesize | — (MiniMax only) | — |

**Budget (deep):** ≤12 Tavily + ≤12 Exa tool calls; incremental Write each phase.

---

## Verification profile and gate

**Selected:** **Release** + **UI** (dual gate)

1. **code-reviewer** PASS (all WS)
2. **Release:** `probe-research-capabilities.ps1` → Tavily row; `test-mcp-health.ps1 -Probe` research-agent profile (if Tavily key present)
3. **UI:** Manual smoke matrix AC6 → `delivery-smoke-dual-source.md`
4. **trellis-update-spec** → new backend spec + `mcp-business.md` link
5. `implement.jsonl` + `check.jsonl` + prd AC `[x]`
6. `packaging-backlog-1.1.6.md` Issue 4 checkboxes
7. `/trellis:finish-work` — when user closes task

**Explicit:** No NSIS / exe build in this task.

---

## Parallelization

**Serial recommended** — B depends on A skill id; C before D probe; E after C/D land.

Optional parallel (only if two implementers):

| Agent | Scope | Merge rule |
|-------|-------|------------|
| 1 | A + B (agent/skill) | merge first |
| 2 | C + D (MCP/gate) | rebase on A/B MCP names |

---

## Manual smoke matrix (WS F)

| # | Prompt | Expect |
|---|--------|--------|
| 1 | 快速：GB/T 某标准现行版本 | exa and/or tavily; MD+JSONL; no Task tool |
| 2 | 深度：印尼 PVC 进口政策 breadth 4 depth 2 | Phase headers in MD; ≥2 domains; `[S#]` in chat |
| 3 | 无 Tavily key 环境 | WARN + exa-only still completes AC evidence |
| 4 | Transcript inspect | no `Agent(` / `Task` / `mcp__scrapling__` in Base run |

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Tavily key unavailable in prod | PRD degrade profile (exa-only WARN) | yes if AC1 relaxed |
| Gate false-positive on tavily tool names | WS D fixture fix | no |
| User rejects skill split ( wants all-in md ) | WS A/B redesign | yes |
| MiniMax calls Task despite L1 | strengthen L1 + ROE profile | no |

---

## Defer / out of scope

- 1.1.6 NSIS exe
- Firecrawl / global deep-research skill bind
- Scrapling promotion to Base
- Orchestrator routing changes (already delegates research-agent)
