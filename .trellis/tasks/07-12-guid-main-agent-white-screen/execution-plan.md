# Execution Plan — `07-12-guid-main-agent-white-screen`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | C (Bug 修复) |
| **Plan depth** | Standard |
| **Verification profile** | UI |
| **Active phase** | P1 — import fix + verify |
| **Repos** | `aionui-src` (primary) · `claude-code-best` (spec/journal only unless ACP) |
| **Root cause** | 07-11 `conversationContinuity.ts` 错误 import `ipcBridge` → [`research/root-cause-20260707.md`](./research/root-cause-20260707.md) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` — Scenario C playbook |
| skill-selection.md §6 Debug | Read: | systematic-debugging before fix |
| trellis-before-dev | Read: | `get_context.py --mode packages` → layers: frontend, integration |
| Dev log forensics | inline | terminal `28298`: conv 201 @23:51:14; **no sendMessage**; Vite reload @23:51:34 |
| aionui git status | inline | uncommitted: `useGuidSend`, `SiderWorkTasksEntry`, `useTaskbarAttentionBadge`, `GuidPage` |

## Task — Guid 主 agent 白屏 / 首条丢失

**User hypothesis:** 与近期 task 修改有关 → **确认**：**07-11** `conversationContinuity.ts` 错误 `ipcBridge` import（CDP SyntaxError）；07-12 handoff fix 必要但不充分。

---

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Root-cause debug | superpowers:systematic-debugging | Read (discipline) | Inline repro + elimination log |
| Renderer trace | CDP @9230 / DevTools console | available | `debugSessionLog` grep in AcpSendBox |
| ACP send trace | main + aioncore logs | available | `chat-acp-flow.md` checklist |
| Fix implement | trellis-implement (aionui) | available | Inline after plan approved |
| Review | code-reviewer | available | trellis-check |
| UI smoke | Human manual | required | Guid → orchestrator 首条 |

---

### Hypothesis ranking (elimination order)

| ID | Hypothesis | Evidence for | Evidence against | Next test |
|----|------------|--------------|------------------|-----------|
| **H1** | **Vite full page reload**（07-03 `SiderWorkTasksEntry` 编辑触发 HMR）抹掉 sessionStorage / 中断 navigate | Log 23:51:34 reload 与 conv 创建间隔 20s；无 sendMessage | 用户未改文件时亦可能复现 | 冻结 aionui-src 编辑 → 干净重启 → 复现 |
| **H2** | **Guid 首条 race**：`sessionStorage` 在 remount/HMR 前被 clear 或未消费 | 历史 journal + `useAcpInitialMessage` 设计 | conv 已 201 | CDP: `sessionStorage` key + `[useAcpInitialMessage]` logs |
| **H3** | **Renderer crash**（07-05 badge / 07-06 banner / esbuild） | 曾 fix `subscribeConversationListSync` | 当前 export 存在；无 esbuild 报错 | DevTools Uncaught + vite overlay |
| **H4** | **07-08 useGuidSend `ccbProfileId`** staging 异常 | 未提交 diff 改 default session profile | conv log 显示 `preset_assistant_id=wande-orchestrator` OK | 对比 stash/apply diff A-B test |
| **H5** | ACP/backend send 失败 | — | 无 POST messages | 排除直至 H1–H4 cleared |

---

### Phase 0 — Reproduce & capture (P0, no code)

| Step | Tool | Output |
|------|------|--------|
| 0.1 | Kill electron → `start-dev-full.ps1 -SkipBootstrap -BuildAioncore:$false` | Clean dev, no concurrent aionui edits |
| 0.2 | **禁止** parallel 保存 `aionui-src`（尤其 Sider / guid） | 排除 H1 |
| 0.3 | CDP `http://127.0.0.1:9230` → Console + Network | Uncaught stack / failed chunk |
| 0.4 | Guid 默认发「你好」→ 观察 | 白屏? send 一次够? |
| 0.5 | Grep main log: `sendMessage`, `useAcpInitialMessage`, `AcpSendBox:executeCommand` | AC2 evidence |
| 0.6 | Record in `{task}/research/repro-YYYYMMDD.md` | Timestamp correlation |

**Immediate workaround (user):** 完全退出 Electron（勿 Ctrl+R）→ 重启 dev → **暂停 aionui 文件保存** → 再测。

---

### Phase 1 — Workstreams

| Phase | Priority | Workstream | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|------|------|-------|-----------------|---------|
| 1 | P0 | **H1 验证** — HMR vs 白屏 | ui | systematic-debugging | — | repro doc: with/without HMR | UI |
| 2 | P0 | **H2 修复** — Guid 首条 durable handoff | ui, concurrency | TDD → implement | `useGuidSend.ts`, `useAcpInitialMessage.ts`, optional `chat-acp-flow.md` | 首条不依赖单次 sessionStorage survive HMR | UI |
| 3 | P1 | **H3 回归** — global hooks | ui | code-review | `useTaskbarAttentionBadge.ts`, `Layout.tsx` | no crash on `/conversation/:id` | UI |
| 4 | P1 | **H4 审查** — 07-08 ccbProfileId diff | cross-repo | trellis-implement | `useGuidSend.ts`, `ccbAgentCatalog.ts` | default session staging parity test | Standard |
| 5 | P2 | **Dev ergonomics** — 07-03 Sider 改完再重启 | ui | docs only | `start-dev-full` comment or task 07-03 note | 「改 Sider 需重启 dev」 | Fast |
| 6 | P3 | **排除** 07-11 / learn-by-data | — | — | — | N/A unless send reaches backend + hook deny | — |

#### P2 fix directions (pick after P0)

| If root cause | Fix sketch |
|---------------|------------|
| H1 only | Process: no HMR during Guid test; optional vite `server.hmr.overlay` — **not** product fix |
| H2 | Persist initial message in **conversation row meta** or **URL state** until `send_accepted`; retry on mount if pending |
| H3 | Fix specific crash (missing export, hook throw) |
| H4 | Guard `stageCcbAssistantProfileForSession` errors; ensure default card-less send sets profile before navigate |

---

### TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression |
|------------|------------|--------------|---------------|------------|
| H2 handoff | unit / component | test: remount after sessionStorage set still sends once | `bun test` (target file TBD) | no double send |
| H4 ccbProfileId | unit | default Guid infers `wande-orchestrator` profile | existing guid send tests if any | specialist cards unchanged |
| H3 hooks | unit | `useTaskbarAttentionBadge` mount smoke | `bun test useTaskbarAttentionBadge` | — |

---

### Verification profile and gate

**Selected:** UI

1. **code-reviewer** (primary) after fix
2. `bun test` targeted packages/desktop
3. Manual: Guid 默认 ×3 首条无白屏； specialist 卡片 ×1 回归
4. `trellis-update-spec` → `frontend/chat-acp-flow.md` § Guid initial message
5. `implement.jsonl` + `check.jsonl`
6. `/trellis:finish-work` — user asks

---

### Manual steps (human)

- [ ] 干净 dev，**不保存 aionui-src**，Guid 发首条
- [ ] 若 PASS：故意保存 `SiderWorkTasksEntry.tsx` → 观察是否 HMR 白屏（确认 H1）
- [ ] 若 FAIL：DevTools 截图 Console 错误贴 `research/repro-*.md`

---

### Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| H1 confirmed, no code bug | Phase 5 docs only | no |
| Need URL/meta persistence | Phase 2 — update PRD AC | yes if scope expands |
| Root cause in aioncore/ACP | New workstream + integration spec | yes |

---

### Defer / out of scope

- 07-11 soft refresh toast / `CCB_CONFIG_GENERATION`（独立 SP）
- quotation MCP 性能 / vendor sync
- packaged 1.1.7 release（07-10）除非 fix 需进包

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| P0 Repro | done | CDP: SyntaxError @ conversationContinuity.ts:9 |
| P1 handoff fix | done | `acpPendingInitialMessage.ts` |
| P1 import fix | done | `conversationContinuity.ts` + `warmupConversation.ts`; tests 24/24 |
| Gate | pending | UI smoke after dev restart |
