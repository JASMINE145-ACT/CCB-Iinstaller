# Fix quotation replay backflow after idle kill

## Problem

WanD quotation sessions still show replay backflow after long idle / agent kill:

When the user leaves the app idle long enough for the ACP agent process/session to be killed, the next user message can cause completed assistant content from previous turns to be inserted into the new reply. The user-visible symptom is old quotation/assistant blocks appearing again around the new answer.

This is the UI/runtime replay form of "数据倒灌", not the quotation prompt verbosity problem.

## Scope

In scope:

- Inspect AionUI/AionCore/ACP resume handling for stale assistant event replay after idle-killed agents.
- Fix the smallest layer that prevents completed prior-turn assistant content from being reinserted into the next turn.
- Preserve the separate quotation-agent prompt improvements already made, but do not treat them as the primary fix.

Out of scope:

- MCP matcher/data changes.
- New run/step persistence.

## Acceptance

- After idle kill / forced warmup, sending a new message in the same conversation must not replay completed assistant blocks from previous turns.
- Stale events without current `turn_id` must not be rendered as part of the new turn.
- Existing message history remains visible from DB/history, but old assistant text is not appended into the new assistant bubble.
- Add or run a targeted regression where available.
