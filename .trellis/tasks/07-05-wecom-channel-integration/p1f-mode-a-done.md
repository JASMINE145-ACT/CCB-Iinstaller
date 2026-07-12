# P1f Mode A — done (code)

**Date:** 2026-07-12  
**Task:** `07-05-wecom-channel-integration` rev 8

## Delivered

- Spec/PRD Mode A contracts locked
- JS: `replyContextByStream` keyed by inbound `streamId` (dual-tree)
- AionCore: `reply_stream_id` + `stream_finish` → extension `options.streamId` / `finish`
- Finish empty-buffer still sends `finish=true` to clear SDK context after tool flush
- code-reviewer: **PASS** (Layer A PASS, Layer B N/A) after Critical finish fix

## Evidence

| Check | Result |
|-------|--------|
| `pnpm exec vitest run tests/unit/wecom/ext-wecom-aibot-reply-context.test.ts` | 4 passed |
| `cargo test -p aionui-channel --lib send_options` / `extract_reply` | passed |
| `cargo test -p aionui-channel --test stream_relay_test` | 8 passed |
| lint execution-plan | PASS |

## Remaining (user)

- **M-G1** dual overlapping @ (blocker)
- **M-G2** A `/new` leaves B intact (blocker)
- M-G3 optional
