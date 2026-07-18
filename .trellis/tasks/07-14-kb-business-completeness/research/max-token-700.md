# Pin ~700 split source (Phase 0b)

**Date:** 2026-07-14

## Finding

No hard-coded `700` in:

- `python/admin/org_knowledge_*`
- `mcp_servers/quotation-server/dist/index.js` (`append_business_rule` schema)
- quotation L1 agent md

Likely split drivers (ordered):

1. **Model / agent habit** — long §4 rule preview broken into multiple chat turns or multiple `append_business_rule` calls (~700 token comfort zone).
2. **UI collapse** — AionUI `MessageText` uses `CollapsibleContent maxHeight={200}` (px, not tokens); can feel like “查看更多” chunking when users expand previews.
3. **Not** a quotation MCP `maxLength` on `rule_text`.

## Mitigation (this task)

| Layer | Action |
|-------|--------|
| MCP | Hard cap **16000 chars** → `LIMIT_EXCEEDED` (no silent truncate) |
| Soft guidance | Prefer single append ≤ **8000 chars** |
| L1 | Explicit: 禁止拆成多次 append |
| Near-dup | Catch split-retries as `NEAR_DUPLICATE` |
| UI | Out of C1; document only unless product asks |

## Verdict

Raise budget = **policy + hard cap + L1**, not bump a missing `max_tokens=700` knob. If a future session max_tokens=700 is found on a specific model route, update this file with file:line.
