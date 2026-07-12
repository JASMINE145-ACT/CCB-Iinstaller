# Research — WeCom 回复「历史倒灌 / 拼接旧答」（2026-07-12）

> **Task:** `07-12-yolo-mode-alias-vision-regression`（P1 焦点纠正）  
> **Related:** `06-19-quotation-behavior-backflow`（桌面 Guid 已有 `staleTurnStreamFilter`）  
> **Date:** 2026-07-12  
> **Status:** diagnose — **live PASS 2026-07-12**；根因已确认为 CCB ACP rehydrate replay

## User correction

主诉 **不是**「为什么不能识图」，而是：

> **为什么回答会把之前历史回答也拼进去？**

## RED evidence（企微 嘉诚 / 报价 07:03）

单条助手回复内混有：

1. 多次开场白（「您好嘉诚！我是万鼎报价专家…」）
2. 旧「直接50」查价表
3. PT.Jinse Excel 填单确认三问
4. 「三通50」查价
5. 末尾「没有读取图片的能力」
6. 中间出现 `[e~[`（疑似流式截断/编码噪声）

→ 典型 **多轮旧 assistant 文本被缝进同一 outbound bubble**，不是模型「想起」历史。

## Root cause (confirmed 2026-07-12)

**Primary:** CCB ACP `tryRehydrateStaleSession` 在 `session/prompt` 已发 `Start` 之后，仍向 client replay transcript chunks → 企微 `ChannelStreamRelay` 把旧 assistant Text 缝进当前泡。

**Fix:** `getOrCreateSession({ replayToClient: false })` 于 stale rehydrate 路径；历史仅作 QueryEngine `initialMessages`，不向 ACP client 回放。

```319:324:ccb-installer/claude-code-b-src/src/services/acp/agent.ts
      // This restore happens inside session/prompt after AionCore has already
      // emitted Start for the live turn. Replaying transcript chunks to the ACP
      // client here makes channel relays stitch old assistant text into the
      // current WeCom reply bubble. Keep the history only as QueryEngine
      // initialMessages.
      replayToClient: false,
```

**Defense-in-depth:** AionCore `stream_relay` Start-arm（`WANd.CHANNEL.STREAM.TURN.001`）— unit PASS；非 live 决定性修复。

**Not involved:** VPS / 企微服务端（dev 机长连本机 CCB+AionCore）。

## Root-cause hypothesis (initial — superseded)

```text
Channel ChannelStreamRelay 订阅 ACP broadcast 时无 turn_id / idle-replay 过滤，
把 warmup/resume 回放的历史 agent_message_chunk Text 与本轮 Text 一并 push 进
WeCom replyStream；桌面 Guid 已有 staleTurnStreamFilter，企微通道未做对等防护。
```

识图否认 = 本轮真实尾巴（或附带症状），**修识图 alone 不消拼接**。

## Ranked hypotheses

| # | Hypothesis | Confidence |
|---|------------|------------|
| H1 | `stream_relay` 无 turn 过滤，回放 Text 进同一 buffer | **High** |
| H2 | WeCom `replyStream` cumulative 语义 vs 中途 clear buffer | Med-High（放大器） |
| H3 | Mode A streamId / 并发双 relay | Med |
| H4 | `AlreadyProcessing` 未真正挡住并发 | Med |
| H5 | 模型复述 | Low |

## Primary code

| Layer | Path |
|-------|------|
| Channel relay | `AionCore/crates/aionui-channel/src/stream_relay.rs` — `run_weixin`, text accumulate |
| Desktop parity | `aionui-src/.../staleTurnStreamFilter.ts`, `useAcpMessage.ts` |
| Spec | `chat-acp-flow.md` §Post-idle replay；`06-19` PRD |
| WeCom | `replyContextByStream`（Mode A，必要非充分） |

## Verify-first (before any fix)

1. 抓一坏轮：outbound 各 Text chunk 是否 **字面量** 等于 DB 里更早 assistant 气泡  
2. 若 ACP/relay 侧已脏 → H1；若 ACP 干净仅企微脏 → H2/H3  
3. 对照 Guid 同会话 idle 后发消息是否仍干净（预期干净）

## Code verify (2026-07-12 exec)

| Check | Result |
|-------|--------|
| `send_to_agent` order | warmup → **subscribe** → send_message |
| Resume/history after subscribe | can emit `agent_message_chunk` Text **before** this turn's `Start` |
| `TextEventData` | **no `turn_id`** — cannot copy desktop turn_id filter literally |
| `process_stream_event(Start)` | returns `None` — relay never arms on Start |
| `run_weixin` | **every** `AppendText` → `push_str` with no gate |

**3a verdict:** H1 confirmed in source. Fix = arm relay on `Start`, drop Text until then (parity intent of `staleTurnStreamFilter` without turn_id).

## Contracts (provisional)

- `WANd.CHANNEL.STREAM.TURN.001` — 仅转发本轮 turn Text  
- `WANd.CHANNEL.STREAM.CUMULATIVE.001` — WeCom replyStream 全文 cumulative  
- `WANd.CHANNEL.CONCURRENCY.001` — 每会话一活跃 turn  

MEDIA.IN / vision 降为次要；P0 桌面识图保持 PASS。
