# Delete locator — legacy block compatibility

**Date:** 2026-07-14 (system-review absorb)

## Problem

Existing `append_business_rule` writes Markdown without `block_id`:

```text
## {section}
- {rule}
  - 来源：…
  - 说明：…
```

MVP delete requires stable locate: `block_id` **or** `content_hash + doc_version + snippet`. Pure `contains` → mis-delete risk.

## Compat rules (Phase 1 must implement)

1. **New appends (post-ship):** embed meta in HTML comment or bullet trailer, e.g.  
   `<!-- org_mutate_block id=… hash=… -->`  
   (choose one schema; document in org-mutate-ux / org-knowledge).
2. **Legacy blocks:** on preview, scan candidate `- ` rule blocks under target section(s); for each compute `content_hash = sha256(normalize(block_text))`.
3. **Caller supplies:** `content_hash` + `doc_version` + `snippet` (≥ N chars exact substring of the unique block) **or** explicit `block_id` if present.
4. **0 match** → fail (`error_code` TBD empty-match; treat as soft of AMBIGUOUS or dedicated).
5. **>1 match** → `AMBIGUOUS_MATCH` + `changes[]` candidates (`hash`, `snippet` preview) — **fail-closed**, never pick first.
6. **Section headers (§1–§10)** → reject unless `allow_section_edit=true` (still requires admin RBAC).

## Out

Do not rewrite entire center doc on first deploy to stamp IDs (destructive). Opt-in: next confirmed append stamps new blocks only.
