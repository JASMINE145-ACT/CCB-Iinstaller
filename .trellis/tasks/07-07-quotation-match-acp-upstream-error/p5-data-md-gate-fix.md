# P5 Fix — Price-library data.Md Read gate parity (2026-07-05)

## Symptom (latent)

Same class as quotation knowledge gate: PreToolUse deny on upsert/apply without detecting Read in subagent transcript or before flush.

## Fix

| File | Change |
|------|--------|
| `hook_transcript.py` | Shared derive path + session flag |
| `parse_transcript_data_md_gate.py` | `hook_input_has_data_md_read`, session flag |
| `post-data-md-read-mark.py` | PostToolUse on Read(data.Md) |
| `pre-price-library-data-md-gate.py` | Uses hook_input helper |
| `price-library-agent.md` | PostToolUse Read hook |

## Evidence

- unittest: **24/24 PASS** (17 knowledge + 5 data.Md gate tests in discover)
- code-review: **PASS** (0317d642)
- deploy: live + staging seed synced

## Manual smoke

1. **新开** price-library-agent 会话（price_admin）
2. upsert 被 deny → Read `data.Md` → upsert 通过
