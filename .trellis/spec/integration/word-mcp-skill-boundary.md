# Word MCP ↔ DocumentSpec boundary

> Spec: `.trellis/spec/integration/word-mcp-skill-boundary.md`  
> Contract: `WANd.OFFICE.WORD.BOUNDARY.001`  
> Related: `agents-unified-model.md` § Word Creator MCP-only · task `07-16-word-skill-mcp-granularity`

## Locked lane

`word-creator` uses **office-word MCP only** — no officecli, no skill dependency.

## Routing table

| Intent | Path | Tools |
|--------|------|-------|
| ≥3 sections / report / outline provided | **DocumentSpec** | `validate_document_spec_tool` → `render_document_spec_tool` → `validate_rendered_document_tool` → optional `patch_block_by_id_tool` |
| ≤2 blocks / typo / local replace | **Micro MCP** | `search_and_replace`, `replace_paragraph_block_below_header`, `patch_block_by_id_tool` |
| Escape hatch (debug only) | Atomic | `add_heading` / `add_paragraph` / `add_table` — **forbidden** for full-report compose |
| Outbound PDF | After Gate R | `convert_to_pdf` |

## Macro vs micro (DocumentSpec era)

| Class | Examples | When |
|-------|----------|------|
| **Macro** | `render_document_spec_tool`, `validate_*` | New multi-section docs |
| **Micro** | `patch_block_by_id_tool`, `search_and_replace`, block replace tools | Precise edits by id/text |
| **Atomic escape** | `add_paragraph`, `add_heading` | ≤2 blocks or repair after Gate R FAIL |

## Call budget

Typical report: **≤15–20 MCP calls** including Gate S/R; +1 if `convert_to_pdf`.

## Orchestrator brief (required for Agent(word-creator))

Pass structured DocumentSpec JSON (or outline that word-creator can convert), not “write a long report yourself paragraph by paragraph”.

## Non-goals

- officecli-docx for word-creator
- Opaque bulk without section_id/block_id/manifest
