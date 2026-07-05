# Research 双源深度调研框架 (Exa + Tavily)

## Goal

Ship **Approach A** for `research-agent`:

1. **Base MCP stack** = **Exa + Tavily** (dual-source discovery + extract).
2. **Procedure** = adapted **deep-research phase framework** (plan → multi-source search → deep-read → synthesize → deliver).
3. **Single brain** = **one MiniMax session** — no `Task` / sub-agent / second LLM in the research loop.
4. **Evidence contract** unchanged — `research/*.md` + `research/*.sources.jsonl` before claiming done.

Target release track: **1.1.6 packaging backlog** (config + agent + skill + health); **no NSIS/exe** in this task unless user expands scope.

## Background (2026-07-04 explore)

| Current | Gap |
|---------|-----|
| Base profile = **Exa only** | No Tavily in repo |
| `research-agent.md` has custom breadth/depth deep mode | Not aligned with deep-research **phase** model |
| Global ECC `deep-research` skill | Uses Firecrawl + **Task parallel subagents** — conflicts with constraints |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` | Already supports single-process; L1 must forbid `Agent`/`Task` explicitly |

**Explore verdict:** Implement **project skill `wanding-deep-research`** + slim **research-agent L1** (role, MCP allowlist, evidence gate). Do **not** bind global `deep-research` skill.

Parent context: [`06-28-research-agent-toolstack`](../06-28-research-agent-toolstack/) (Scrapling/Lightpanda Extended — **optional fallback**, not Base dual-source).

Source: chat explore 2026-07-04; [`research/explore-2026-07-04-dual-source-deep-framework.md`](./research/explore-2026-07-04-dual-source-deep-framework.md).

## Problem statement

| # | Symptom | Layer |
|---|---------|-------|
| P1 | Research depth inconsistent — quick vs deep rules in one long agent md | L1 / skill split |
| P2 | Tavily not registered — cannot use news/domain/batch extract path | platform MCP + manifest |
| P3 | ECC deep-research unusable as-is (Firecrawl, Task) | skill choice |
| P4 | Gate only accepts `mcp__exa__*` / scrapling | subagent-gate validator |
| P5 | No spec for dual-source tool routing | `.trellis/spec/backend/` |

## Scope

### In scope

| WS | Deliverable |
|----|-------------|
| **A** | Skill `.agents/skills/wanding-deep-research/SKILL.md` (+ mirror `.cursor/skills/` if project convention) — Phase 0–5, Exa/Tavily routing, MCP budget |
| **B** | `research-agent.md` refactor — hard rules only; enable skill in frontmatter/sidecar |
| **C** | Tavily HTTP MCP in `platform.defaults.json` + secret path; update capability manifest, health manifest, install-research-toolstack Base profile |
| **D** | Gate + probe: `research-agent-mcp.sh`, `probe-research-capabilities.ps1`, `mcp-health-manifest.json` research-agent profile |
| **E** | Spec `.trellis/spec/backend/research-dual-source-deep-framework.md` + cross-links |
| **F** | Tests/smoke plan + manual matrix doc; pytest/bash fixtures where applicable |

### Out of scope

- NSIS / `build-wanding.ps1` / 1.1.6 exe ship (record in packaging backlog only)
- Replacing Exa with Tavily-only
- Firecrawl / WebSearch / curl fallbacks
- Task-tool parallel research subagents
- Making Scrapling Base-required (stays Extended optional JS fallback)

## Acceptance criteria

- [ ] **AC1** Base profile registers **both** `exa` and `tavily` in platform defaults + research-agent `mcpServers` / sidecar allowlist.
- [ ] **AC2** Skill `wanding-deep-research` documents Phase 0–5, tool split (Tavily search/extract vs Exa semantic/livecrawl), budget ≤24 MCP calls deep mode.
- [ ] **AC3** `research-agent.md` explicitly **forbids** `Agent`/`Task`/WebSearch; requires evidence Write before completion claim.
- [ ] **AC4** Stop gate accepts successful `mcp__tavily__*` + existing exa pattern.
- [ ] **AC5** `probe-research-capabilities.ps1` reports Tavily probe (PASS/WARN if key missing).
- [ ] **AC6** Manual smoke: Guid 资料搜索助手 — depth prompt → MD + JSONL with ≥2 domains, `[S#]` in chat (logged in `delivery-smoke-dual-source.md`).
- [ ] **AC7** Spec published + packaging-backlog Issue 4 checkboxes updated with task link.

## Dependencies

| Item | Notes |
|------|-------|
| Tavily API key | `secret://platform/tavily/api-key` or env; degrade to exa-only WARN if unset |
| Exa MCP | Already in platform defaults |
| MiniMax single process | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` (existing) |
| AionUI keepForProfile | Sidecar `mcp_allowlist` must include both for lazy prefetch |

## Risks

| Tag | Mitigation |
|-----|------------|
| `external-api` | Document Tavily URL + key rotation in spec |
| `packaging` | Backlog only until 1.1.6; no exe in task |
| `security` | SSRF rules unchanged; no localhost URLs |
| `ui` | Manual Guid smoke required |
