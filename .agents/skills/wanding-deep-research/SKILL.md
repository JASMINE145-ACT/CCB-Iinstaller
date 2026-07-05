---
name: wanding-deep-research
description: Dual-source (Exa + Tavily) deep research procedure for research-agent. Phase 0–5 plan/search/read/synthesize/deliver; single MiniMax session; evidence to research/*.md + .sources.jsonl. Use for all external web research tasks on research-agent.
---

# Wanding Deep Research (Exa + Tavily)

Procedure skill for **research-agent** only. The agent L1 owns role boundaries, MCP allowlist, and evidence gate; this skill owns **how** to run quick vs deep research.

## Hard constraints (never override)

1. **Single brain:** One MiniMax session end-to-end. **Forbidden:** `Agent`, `Task`, `run_in_background`, WebSearch, WebFetch, Bash curl, Firecrawl.
2. **Primary MCP only:** `mcp__exa__*` and `mcp__tavily__*` (+ optional `mcp__scrapling__*` only when Extended profile and extract/livecrawl failed).
3. **Evidence before claim:** Write `research/<YYYY-MM-DD>-<topic-slug>.sources.jsonl` and `.md` before saying research is complete.
4. **One URL, one reader:** Do not parallel-fetch the same URL with Exa and Tavily; try Tavily extract first, then Exa livecrawl on failure.

## Tool routing

| Step | Tavily (first) | Exa (second / fallback) |
|------|----------------|-------------------------|
| Discover news / policy / dated | `mcp__tavily__tavily-search` | `mcp__exa__web_search_exa` |
| Semantic / niche / code docs | (if weak) | `mcp__exa__web_search_exa`, `mcp__exa__get_code_context_exa` |
| Read URLs | `mcp__tavily__tavily-extract` | `mcp__exa__web_search_exa` with URL + livecrawl |
| Site map / crawl | `tavily-map` / `tavily-crawl` only when depth≥2 and gap requires | — |

If Tavily MCP is unavailable (probe WARN), run **exa-only** and note degraded mode in MD header.

### sources.jsonl `tool` field

`exa` | `tavily` | `scrapling` | `manual`

---

## Mode selection

| Mode | Trigger | MCP budget |
|------|---------|------------|
| **Quick** (default) | Single fact, one standard, 1–3 sources enough | ≤12 total (≤6 each source) |
| **Deep** | User says 深度/全面/竞品/政策全景; or multi-agency multi-year topic | ≤24 total (≤12 Tavily + ≤12 Exa) |

Defaults for deep (write in MD): **breadth=4**, **depth=2**.

---

## Phase 0 — Intent

Clarify or infer: topic, geography, time range, output language. Write MD header stub + basename slug. **Write once** before heavy MCP use.

---

## Phase 1 — Plan (LLM only, no MCP)

Produce **3–5 sub-questions** in MD:

```markdown
## Research Plan
1. …
2. …
```

---

## Phase 2 — Discover (MCP)

For each sub-question (or each depth round):

1. `tavily-search` with focused query (use `search_depth: advanced` when supported).
2. `web_search_exa` with different angle (semantic / English / technical terms).
3. Dedupe URLs; prefer official domains (.go.id, gov.cn, iso.org, etc.).
4. Append candidate URLs to working list; **do not** treat snippets as verified facts.

**Depth round loop** (d = 1 .. depth):

- Generate `breadth` queries (round 1 from plan; later from learnings + gaps).
- At least **2 distinct domains** with ok extracts before writing round facts.

---

## Phase 3 — Read (MCP)

1. Batch top URLs via `tavily-extract` (≤5 URLs per call when possible).
2. Failed / empty → Exa livecrawl on that URL only.
3. Record each source in JSONL with `source_id`, `url`, `tool`, `status`, `supports_claims`.

---

## Phase 4 — Synthesize (LLM + Write)

After **each** depth round (incremental, not at end only):

- Update JSONL (append lines, never overwrite S#).
- Update MD sections: 来源, 迭代记录, 分析.
- Facts use `[S#]`; label 推断 / 未验证 / 冲突.

---

## Phase 5 — Deliver (chat)

Reply must include:

- Relative path to MD
- Mode + breadth/depth if deep
- Top 3–5 findings with `[S#]` and URLs
- Gaps or budget stop note

Do **not** dump full candidate URL lists unless user asked.

---

## Deep MD template (additions)

```markdown
## 调研参数
- **模式：** 深度调研 | 快速调研
- **引擎：** exa + tavily | exa-only (degraded)
- **breadth / depth：** …

## 迭代记录
### 轮次 1
- **查询：** …
- **learnings：** …
- **gaps：** …

## 综合结论
```

---

## Budget stop

When approaching MCP budget, stop deepening, mark in MD:

```markdown
## 预算停止
- 原因：已达 MCP 上限
- 未解 gaps：…
```
