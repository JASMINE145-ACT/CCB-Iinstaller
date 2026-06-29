# Status — 2026-06-29 (implementation)

**Task:** [`prd.md`](./prd.md)  
**Matrix:** [`research/root-cause-matrix-2026-06-29.md`](./research/root-cause-matrix-2026-06-29.md)

## Implemented (this session)

### AionUI (`D:\Projects\aionui-src`)

| File | Change |
|------|--------|
| `runtime/staleTurnStreamFilter.ts` | **New** — `shouldDropStaleTurnStreamMessage`, `shouldDropIdleReplayWithoutTurnId` |
| `runtime/postIdleWakeWindow.ts` | `scheduleWarmupReplayGuardEnd` for mount warmup replay window |
| `platforms/acp/useAcpMessage.ts` | Wire stale filter; clear wake on finish/error; begin guard on auto-warmup |
| `common/chat/chatLib.ts` | `attachStreamTurnId` on stream message types |
| `Messages/hooks.ts` | Refuse text merge when `turn_id` differs |
| Tests | `staleTurnStreamFilter.test.ts`, `postIdleWakeWindow.test.ts`, `useAcpMessage.dom.test.ts` |

### CCB patch

| File | Change |
|------|--------|
| `ccb-installer/patches/aionui-acp/acp-agent.js` | `loadSession` skip `replaySessionHistory` when `suppressSessionReplay` meta |

### Already in repo (prior)

| File | Change |
|------|--------|
| `ccb-installer/src/services/acp/sessionTranscript.ts` | `trimMessagesToCompleteTurnBoundary` |
| `ccb-installer/patches/aionui-acp/acp-agent.js` | drain-stuck → `teardownSession` |

## Deploy (2026-06-29, local)

| Step | Result |
|------|--------|
| `bun run build` @ `D:\claude-code-B` | OK |
| `deploy-claude-code-b-to-wanding.ps1` | `D:\CCB-Wanding\dist\` mtime 2026-06-30 00:35 |
| Force `acp-agent.js` → 3 targets + `sync-aionui-ccb-route-b.ps1` | markers `loadSession replay suppressed`, `tearing down dirty`; hash `A0F72FAF87061BEE` |
| Kill `aioncore` / `aionui-web` | done |
| Renderer (`aionui-src`) | HMR — **user must** `start-dev-full.ps1 -SkipBootstrap` if dev was down |

Spec: [`.trellis/spec/integration/dev-sync-playbook.md`](../../../spec/integration/dev-sync-playbook.md) §4.1.1 + Recorded 2026-06-29; [`chat-acp-flow.md`](../../../spec/frontend/chat-acp-flow.md) § Deploy record.

## Operator verify (2026-06-30)

- [x] User smoke after `start-dev-full.ps1 -SkipBootstrap`: **likely fixed** — user report「我觉得这次可能真的修好了」
- [ ] Formal sign-off on idle-kill + follow-up (`很好`) no concat — recommend one more idle-5min regression before fleet ship

## Ship (pending)

本次 fix 跨 **三层**，**不能只打 hot zip**：

| 层 | 变更 | 打包路径 |
|----|------|----------|
| `aionui-src` renderer | `staleTurnStreamFilter` / `postIdleWakeWindow` / `turn_id` merge | **必须** `build-wanding.ps1` 全量重编 AionUI（无 `-SkipAionUiBuild`） |
| `claude-code-B` dist | `trimMessagesToCompleteTurnBoundary` | `build-wanding.ps1` Step 1 `bun run build`（默认） |
| `acp-agent.js` patch | replay suppress + drain teardown | staging 时 **强制**从 repo copy（`build-wanding.ps1` L424–428） |

推荐版本号：**`1.1.4`**（若旧 `1.1.3` exe 已发同事则 bump；若仅本机试打包可覆用 `1.1.3` 重打）。

全量命令见 [`.trellis/spec/integration/wanding-first-ship.md`](../../../spec/integration/wanding-first-ship.md) §5.2 + [`.trellis/spec/guides/wanding-build-path-decision.md`](../../../spec/guides/wanding-build-path-decision.md)。

## Not done

## Verify

```text
cd D:\Projects\aionui-src
bunx vitest run tests/unit/conversation/runtime/staleTurnStreamFilter.test.ts
bunx vitest run tests/unit/conversation/runtime/postIdleWakeWindow.test.ts
bunx vitest run tests/unit/renderer/useAcpMessage.dom.test.ts --pool=threads
→ 14/14 pass (2026-06-29)
```

Code-review: **PASS** after idle/wake-window interaction fix.
