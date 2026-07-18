# Near-duplicate append gate

**Date:** 2026-07-14 (system-review absorb)

## Rule

Before `confirmed=true` append (and preferably on preview):

1. `normalize(text)` = NFKC → lower (for Latin) → collapse whitespace → strip bullet markers.
2. `h = sha256(normalize(rule_text))`.
3. If `h` already in doc → existing `skipped: duplicate` path.
4. Else compute Jaccard / SequenceMatcher ratio of `normalize(rule_text)` against each recent `- ` rule block in same section (and optional 「业务规则补充」).
5. If `ratio >= 0.88` (tunable constant `NEAR_DUP_THRESHOLD`) → **do not write**; return preview envelope:

```json
{
  "action": "append",
  "domain": "knowledge",
  "requires_confirmation": true,
  "applied": false,
  "error_code": "NEAR_DUPLICATE",
  "changes": [{ "existing_hash": "...", "similarity": 0.91, "snippet": "..." }],
  "message": "可能是同一规则被拆分；请合并为一次 append 或 delete 旧块后重试"
}
```

6. Caller may pass `force_near_duplicate=true` **only after** user explicitly confirms in chat (L1 gate).

## Not allowed

- LLM-only “looks similar” judgment as the sole gate.
- Silent skip without telling user.
