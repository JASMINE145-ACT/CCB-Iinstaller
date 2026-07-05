# Explore — Dual-Source Deep Research (Exa + Tavily, Single MiniMax)

**Date:** 2026-07-04  
**Status:** explore complete → execution plan draft  
**Approach:** **A** — project skill `wanding-deep-research` + slim `research-agent` L1

---

## User constraints

1. **Primary MCP:** Exa + Tavily (not Firecrawl / WebSearch / curl).
2. **Framework:** deep-research **phase logic** (plan → search → read → synthesize → deliver).
3. **Single LLM process:** MiniMax only — no mid-flight second agent / Task / sub-LLM selector.
4. **Ship track:** record for **1.1.6 packaging**; do not build exe in explore/plan phase.

---

## Current state (repo)

| Artifact | Today |
|----------|-------|
| `research-agent.md` | Exa Base; custom breadth/depth; forbids business MCP |
| `research-agent.aionui.json` | `mcp_allowlist: ["exa"]`, `skills.enabled: []` |
| `research-capability-manifest.json` | Base = exa only |
| `platform.defaults.json` | exa HTTP MCP; `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` |
| Global `deep-research` skill | Firecrawl + Exa + **Task parallel subagents** — **do not bind** |
| Tavily | **Not in repo** |

---

## Recommended architecture

```
MiniMax (single QueryEngine session)
  │
  ├─ Phase 0 Intent → write MD header (mode, breadth, depth)
  ├─ Phase 1 Plan → 3–5 sub-questions (LLM only)
  ├─ Phase 2 Discover ──┬─ Tavily tavily-search (news, domains)
  │                     └─ Exa web_search_exa (semantic)
  ├─ Phase 3 Read ──────┬─ Tavily tavily-extract (batch)
  │                     └─ Exa livecrawl (fallback)
  ├─ Phase 4 Synthesize → append sources.jsonl + update MD
  └─ Phase 5 Deliver → chat summary + [S#] + path

Each phase end: Write (incremental evidence)
Forbidden: Agent(), Task, WebSearch, Firecrawl
```

### Exa vs Tavily split

| Job | First | Fallback |
|-----|-------|----------|
| News / policy / date range | Tavily | Exa |
| Semantic / obscure / code docs | Exa | Tavily |
| Batch URL → markdown | Tavily extract | Exa livecrawl |
| Same URL | **one tool only** | other on failure |

### Why not bind ECC `deep-research` skill

| ECC skill | Conflict |
|-----------|----------|
| Firecrawl tools | User wants Exa+Tavily only |
| Task ×3 parallel agents | Violates single MiniMax process |
| Chat-first report | Missing mandatory JSONL evidence |

---

## Approach A deliverables (implement later)

| # | Item |
|---|------|
| 1 | `.agents/skills/wanding-deep-research/SKILL.md` |
| 2 | Refactor `research-agent.md` + enable skill in sidecar |
| 3 | Tavily HTTP MCP in platform defaults (`https://mcp.tavily.com/mcp/…`) |
| 4 | Update manifest, install-research-toolstack, mcp-health, gate validator |
| 5 | Spec `backend/research-dual-source-deep-framework.md` |
| 6 | Smoke doc + probe evidence |

### Degrade path

If `TAVILY_API_KEY` / secret missing → **WARN** profile, exa-only still functional; probe documents state.

---

## Relation to parent task `06-28-research-agent-toolstack`

| 06-28 focus | This task |
|-------------|-----------|
| Scrapling / Lightpanda Extended | Unchanged — optional JS fallback |
| Agent-Reach install/doctor | Unchanged |
| Base profile | **Evolve** from exa-only → exa+tavily |

---

## Open questions (for approval)

1. Tavily auth: API key in URL vs OAuth remote MCP — **recommend API key + secret store** for employee bundle parity with MiniMax.
2. Base require Tavily key vs optional WARN — **recommend optional WARN** until keys provisioned fleet-wide.
3. Skill mirror paths: `.agents/skills/` + `.cursor/skills/` per project convention.

---

## References

- Prior chat explore 2026-07-04 (research-agent vs deep-research skill)
- Tavily docs: `https://docs.tavily.com/documentation/mcp`
- Existing depth mode: `ccb-installer/config/agents/research-agent.md` §深度调研模式
