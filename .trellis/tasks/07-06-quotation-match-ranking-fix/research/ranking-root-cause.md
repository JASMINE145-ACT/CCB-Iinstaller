# Research — ranking root cause (2026-07-06)

## Hypothesis table

| ID | Hypothesis | Verdict |
|----|------------|---------|
| H1 | learn-by-data uses LLM `chosen` | **REJECTED** — MCP `show_candidates=true`; compares `candidates[0]` |
| H2 | Python `llm_select_best` overrides | **REJECTED** on MCP path — `selection_owner: claude_code` |
| H3 | `_rank_compatible_candidates` semantic-before-source | **CONFIRMED** — `_compat_sort_key`: penalty, -bonus, source_rank |
| H4 | `50卷` breaks 波纹管 token | **CONFIRMED** — `_split_tokens` → `卷波纹管` |
| H5 | 共同 not boosted enough | **CONFIRMED** — only +9 in unused MCP pre_filter; union rank ignores source primary |
| H6 | Normal query works via Agent knowledge only | **PARTIAL** — Agent reads §5.2/§6; engine [0] still wrong for batch |

## User golden behavior (screenshot)

Row 10 reasoning: 50M roll + corrugated → `8030020808`; reject HDPE black coil (semantic + price family).

Engine must encode this in **hard filter / rank**, not rely on session Agent.
