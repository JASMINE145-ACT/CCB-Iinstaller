# Status — `07-04-acp-view-steps-empty-tool-title`

| Field | Value |
|-------|--------|
| **State** | completed |
| **Closed** | 2026-07-04 |
| **User sign-off** | 「好了！」— View Steps 首步工具名正常显示 |

## Delivered

- `aionui-src`: `resolveAcpToolDisplayName`, merge title preserve, `MessageToolGroupSummary` stepLabel
- Tests: `normalizeToolCall.test.ts` 5/5
- Spec: `chat-acp-flow.md` §3.4b

## Follow-up (optional, out of scope)

- Reuse resolver in `MessageAcpToolCall.tsx` for inline cards
- Ship via next AionUI release / dev sync to packaged exe
