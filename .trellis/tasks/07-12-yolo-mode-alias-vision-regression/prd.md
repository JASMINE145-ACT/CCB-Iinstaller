# PRD — `yolo` mode + 识图 + 企微历史倒灌

> **Task:** `07-12-yolo-mode-alias-vision-regression`  
> **Status:** **CLOSED** — P0 + P1 PASS（企微 live 2026-07-12）  
> **Date:** 2026-07-12  
> **Related:** `06-19-quotation-behavior-backflow`（桌面已修）；`07-05` WeCom Mode A

## One-line

**P0：mode alias + 桌面识图已好。P1：企微回复不得把历史轮次旧答缝进同一条气泡。**

## Problem

### Closed (P0)

1. `yolo` 不可选 → normalize → `bypassPermissions`
2. 桌面 Guid 截图识图 → `prompt_attachments` + MiniMax

### Closed (P1) — 2026-07-12

企微多轮回复不再拼接历史旧答。Live：库存查（8020020755）+「很好」确认，各泡仅本轮内容。

## Root cause (P1)

**Primary (live fix):** CCB ACP stale-session rehydrate 在 prompt-time 向 client replay 历史 transcript → 企微 relay 拼接旧答。  
Fix: `agent.ts` `tryRehydrateStaleSession` → `replayToClient: false`（历史仅 `initialMessages`）。

**Defense-in-depth:** AionCore `stream_relay` Start-arm（TURN.001）；`stream_relay_test` 10/10。

Research: `research/wecom-history-bleed-2026-07-12.md`

## Acceptance

- [x] AC-A* / AC-B1 / AC-T — P0  
- [x] **AC-H1** 企微多轮：新回复气泡 **不含** 更早轮完整旧答 — live PASS 16:25  
- [x] **AC-H2** relay/unit：Start 前门控丢 replay Text（`wecom_drops_pre_start_replay_text`）  
- [ ] **AC-H3**（若需要）cumulative / `[e~[` — deferred  
- [ ] AC-B2 MEDIA.IN — **可选 / 可并回 07-05**

## Out of scope (P1)

- 重写 inbound-media  
- 仅改 quotation-agent prompt 治拼接  
- Mode A 大重做（无并发证据时）
