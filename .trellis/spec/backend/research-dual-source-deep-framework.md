# Research Dual-Source Deep Framework (Exa + Tavily)

> **Authority:** `research-agent` + skill `wanding-deep-research`.  
> **Task:** [`.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/`](../../tasks/07-04-07-05-research-dual-source-deep-framework/)

---

## Summary

| Item | Value |
|------|-------|
| Base MCP | **exa** + **tavily** (HTTP remote) |
| Procedure | Skill **`wanding-deep-research`** — deep-research Phase 0–5 |
| LLM | **Single MiniMax session** — no Task/sub-agent |
| Evidence | `research/*.md` + `research/*.sources.jsonl` |
| Extended | + scrapling (JS fallback only) |

**Not used:** ECC global `deep-research` skill (Firecrawl + Task parallel agents).

---

## Architecture

```
Guid research-agent (MiniMax)
  → skill wanding-deep-research (procedure)
  → mcp__tavily__*  (discover + extract)
  → mcp__exa__*     (semantic + livecrawl fallback)
  → Write research/*
  → chat summary [S#]
```

### Tool split

| Job | Tavily | Exa |
|-----|--------|-----|
| News / policy / date filter | `tavily-search` | backup search |
| Semantic / code | — | `web_search_exa`, `get_code_context_exa` |
| Read body | `tavily-extract` | livecrawl on URL |

Same URL: Tavily first, Exa only on failure.

---

## Configuration

| Surface | Path |
|---------|------|
| Agent L1 | `ccb-installer/config/agents/research-agent.md` |
| Sidecar | `research-agent.aionui.json` — `mcp_allowlist`, `skills.enabled` |
| Skill | `packages/vertical/com.wanding.trade/skills/wanding-deep-research/` |
| Platform MCP | `config/runtime/platform.defaults.json` |
| Live settings | `ensure-wanding-settings.ps1` reads keys from env / `resources/research.env` / `vendor/wanding/.env.research` |
| Capability manifest | `config/research-capability-manifest.json` |
| Health | `config/mcp-health-manifest.json` → `research-agent` |
| Gate | `ccb-subagent-gate/.../research-agent-mcp.sh` |
| Probe | `scripts/probe-research-capabilities.ps1` |
| Install | `scripts/install-research-toolstack.ps1` Base → exa+tavily |
| Deploy skill | `scripts/deploy-wanding-deep-research-skill.ps1` |

### API keys (never commit)

Template: `ccb-installer/resources/research.env.example`  
Gitignored: `ccb-installer/resources/research.env`, `vendor/wanding/.env.research`

| Key | Exa MCP |
|-----|---------|
| `EXA_API_KEY` | `headers.x-api-key` on `https://mcp.exa.ai/mcp` |
| `TAVILY_API_KEY` | Query param on `https://mcp.tavily.com/mcp/?tavilyApiKey=...` |

Platform compile secrets (optional): `secret://platform/research/exa-api-key`, `secret://platform/research/tavily-mcp-url`

---

## Modes & budget

| Mode | Trigger | MCP budget |
|------|---------|------------|
| Quick | Default | ≤12 total |
| Deep | 深度/全面/政策全景 | ≤24 (≤12 each) |

Deep defaults: breadth=4, depth=2. Incremental Write each phase.

---

## Degraded startup

If Tavily key missing: probe **WARN**, agent runs **exa-only**; MD must note `exa-only (degraded)`.

---

## Verification

```powershell
.\ccb-installer\scripts\deploy-ccb-skills.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
.\ccb-installer\scripts\probe-research-capabilities.ps1
```

Manual: Guid 资料搜索助手 → depth prompt → MD+JSONL; transcript must not contain `Task`/`Agent(`.

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-04 | Initial ship — Approach A, Exa+Tavily Base, wanding-deep-research skill |
