# Execution Plan — `07-12-yolo-mode-alias-vision-regression`

| Field | Value |
|-------|--------|
| **Status** | **CLOSED** — P0 + P1 PASS（企微 live 2026-07-12 16:25） |
| **Approved** | P0：2026-07-12；P1：2026-07-12 执行 |
| **Scenario** | **C**（企微 outbound 历史拼接） |
| **Plan depth** | **Standard** |
| **Verification profile** | **Cross-repo** |
| **Repos** | `AionCore` channel `stream_relay` |
| **Active phase** | —（closed） |
| **Related** | `06-19`；`07-05` Mode A |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | active `07-12`；integration/frontend |
| trellis-task-execution | Read: | Scenario C；Contract→TDD→Verify |
| systematic-debugging | Read: | no fix without RC；user 纠正主诉 |
| explore history bleed | Agent: | H1 `stream_relay` 无 turn 过滤；对标 `staleTurnStreamFilter` |
| Spec | Read: | `chat-acp-flow.md` post-idle replay；`06-19` PRD |
| Code | Read: | `stream_relay.rs` `run_weixin` `text_buffer.push_str` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0A Mode alias | **PASS** | normalize + Guid |
| P0B Desktop vision | **PASS** | Guid MiniMax 识图 |
| P0 close | **done** | — |
| P1 焦点 | **corrected** | 主诉 = 历史答拼接，非识图 |
| P1 3a Verify stitch | **PASS** | code：subscribe 后可收 replay；无 Start 门控 |
| P1 CCB rehydrate fix | **PASS** | `agent.ts` `replayToClient: false` on stale rehydrate（决定性） |
| P1 3b Channel Start-arm | **PASS** | `stream_relay` defense-in-depth；unit 10/10 |
| P1 3c Cumulative / concurrency | deferred | review follow-up；非本轮主修 |
| P1 deploy aioncore | **PASS** | `sync-dev-aioncore -Build` 07:40；bundled + release 含 TURN.001 |
| P1 live smoke | **PASS** | 企微多轮：11:30 库存查 + 16:25「很好」— 无旧答拼接（AC-H1） |
| MEDIA.IN / vision | demoted | — |

---

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| Desktop filter (parity) | `staleTurnStreamFilter` + tests | **available** | copy contract |
| Channel relay unit | `stream_relay_test.rs` | available | extend |
| Live WeCom capture | user + logs | required | DB assistant text compare |
| Guid control smoke | same session idle | available | prove WeCom-amplified |
| code-reviewer | Task | available | — |

**Risk tags:** `external-api` · `ui` · `concurrency`

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| **WANd.CHANNEL.STREAM.TURN.001** | Channel 只转发本轮 turn Text；丢 idle/warmup 无 turn 回放 | `stream_relay.rs`；parity `staleTurnStreamFilter.ts` | unit inject replay Text；WeCom 多轮 smoke | external-api |
| **WANd.CHANNEL.STREAM.CUMULATIVE.001** | WeCom `replyStream` 发 **全文 cumulative**；禁中途 clear 导致乱码/`[e~[` | `run_weixin` ToolCall flush | unit + live stream | external-api |
| **WANd.CHANNEL.CONCURRENCY.001** | 每 channel 会话一活跃 agent turn | `action.rs` AlreadyProcessing | overlapping @ smoke | concurrency |
| MODE / VISION.DESKTOP | （已 PASS） | — | — | — |
| MEDIA.IN.001 | （降级）入站图 → files | inbound-media | 另排期 | — |

### Contract: WANd.CHANNEL.STREAM.TURN.001

**Behavior protected:** 企微/通道 outbound 气泡不得拼接更早轮次的完整旧答（问候、查价表、填单确认等）。  
**Primary code:** `AionCore/.../stream_relay.rs`；参照 `aionui-src/.../staleTurnStreamFilter.ts`。  
**Tests:** relay unit：warmup replay Text 不得进入 `text_buffer`；live：`你好`→查价→再问一句，第三泡无旧表。  
**Eval / smoke:** 企微多轮；对照 Guid 同会话。  
**Risk if broken:** 用户以为模型疯了 / 无法作业。

### Contract: WANd.CHANNEL.STREAM.CUMULATIVE.001

**Behavior protected:** 流式 reply 内容语义符合 SDK cumulative，避免截断标记与段落错乱。  
**Primary code:** `run_weixin` buffer lifecycle。  
**Tests:** ToolCall 前后 buffer 行为单测。  
**Risk if broken:** `[e~[`、半截话。

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 3a | **P1** | **Verify stitch**：outbound chunk vs 历史 DB 字面量 | TURN.001 | external-api | debug | logs + DB | `wecom-history-bleed` 填 H1/H2 | Cross-repo |
| 3b | **P1** | Channel **turn-scoped filter**（对标桌面） | TURN.001 | external-api | TDD | `stream_relay.rs` + tests | unit GREEN；企微多轮干净 | Cross-repo |
| 3c | P1 | Cumulative buffer +/or concurrency gate | CUMULATIVE / CONCURRENCY | concurrency | TDD | `stream_relay` / `action` | 仅 3a 证明需要时 | Cross-repo |
| 3d | P2 | MEDIA.IN / vision（可选） | MEDIA.IN.001 | external-api | verify | inbound | 不挡 TURN close | Cross-repo |

**Close rule：** TURN.001 live PASS 即可 **先 close P1 主诉**；MEDIA.IN 可并回 `07-05`。若需大改 Mode A → 并回 `07-05` re-approve。

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 3a Verify | TURN.001 | 07:03 拼接泡 | research 锁定 H1 vs H2 | — |
| 3b Filter | TURN.001 | relay 收入无 turn 的 Text | `cargo test -p aionui-channel stream_relay` + WeCom smoke | 同 |
| 3c Cumul | CUMULATIVE.001 | `[e~[` / 半截 | unit + live | 同 |

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| MODE.ALIAS / VISION.DESKTOP | — | P0 | **PASS** |
| CHANNEL.STREAM.TURN.001 | unit + WeCom 多轮 | 无旧答拼接 | **PASS**（unit + live 16:25） |
| CHANNEL.STREAM.CUMULATIVE.001 | unit + live | 无乱码标记 | deferred |
| plan structure | `lint_execution_plan.py` | PASS | pending（改后重跑） |

---

## Verification profile and gate

**Selected:** Cross-repo

1. 3a evidence（**禁止先改代码**）  
2. 3b TDD → code-reviewer → cargo  
3. WeCom manual：多轮无拼接  
4. 可选 3c / 3d  

---

## Manual steps (human)

- [x] P0 Guid smoke  
- [ ] **WeCom A：** 部署含本修的 AionCore 后：新会话 `你好` → `查直接50` → `很好` — 第三泡不得含问候+价表  
- [ ] **WeCom B：** 长会话后再发图 — 观察是否仍整段旧答同泡  

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| 3a 证明仅 H2 cumulative | 3c only | no |
| 3a 证明 H1 | 3b turn filter | no |
| 需重做 WeCom Mode A 架构 | 并回 `07-05` | **yes** |
| 范围扩到 Guid 再改 filter | 开子 task | yes |

---

## Defer / out of scope

- 从零重写 inbound-media  
- 把识图当本 P1 主修点（除非 3a 后干净泡仍假否认）  
- 07-05 Mode A streamId 大重做（除非并发证据）  

---

## P0 close + P1 焦点纠正记录（2026-07-12）

| Item | Note |
|------|------|
| P0 | mode + Guid vision PASS |
| User | 主诉纠正为「历史回答拼进新答」 |
| Research | `research/wecom-history-bleed-2026-07-12.md` |
| Prior mis-frame | MEDIA.IN / vision 降级 |

---

## Patch note - CCB.PROMPT.REHYDRATE.NO_CLIENT_REPLAY - 2026-07-12

| Item | Evidence |
|------|----------|
| Root cause | CCB stale-session rehydrate during `session/prompt` replayed disk transcript to ACP client after AionCore had already emitted Start. WeCom relay therefore treated old assistant chunks as current-turn outbound text. |
| Fix | `tryRehydrateStaleSession()` now calls `getOrCreateSession(..., replayToClient: false)`. Transcript remains available to QueryEngine as `initialMessages`; ACP client replay is suppressed only for this prompt-time rehydrate path. |
| Source | `ccb-installer/src/services/acp/agent.ts`; `ccb-installer/claude-code-b-src/src/services/acp/agent.ts` |
| Test | `ccb-installer/src/services/acp/__tests__/agentReplaySuppression.test.ts`; targeted ACP tests 19 PASS |
| Deploy | `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy`; internal CCB tests 59 PASS; `D:\CCB-Wanding\dist` contains `replayToClient: false` |
| Runtime | Old aioncore/electron stopped; dev startup reached `electron-vite dev`; WeCom human smoke remains pending because `electron.exe` / `aioncore.exe` were not yet observed after launch. |
| Research | `research/wecom-prompt-rehydrate-history-bleed-2026-07-12.md` |

Runtime correction 2026-07-12: subsequent process check observed `electron.exe`, `electron-vite.exe`, and `aioncore.exe` running. The dev runtime is up; final WeCom new-session smoke remains human-pending.
