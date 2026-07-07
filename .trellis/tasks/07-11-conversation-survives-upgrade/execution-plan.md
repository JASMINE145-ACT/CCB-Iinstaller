# Execution Plan — `07-11-conversation-survives-upgrade`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | C + A（长会话续用 · 所有 CCB 对话） |
| **Plan depth** | **Full** |
| **Verification profile** | **UI** + Release |
| **Active phase** | P0 — Continuity pipeline + 07-01 |
| **North star** | 员工长会话升级后同对话能用好；失败明确报错 |

### 产品决策（2026-07-06 定稿）

| ID | 决策 |
|----|------|
| **D1** | **所有** CCB 对话（报价/账务/总调度/Office…），非仅报价 |
| **D2** | 升级不频繁 → 每版本每对话 **首次 open** refresh 一次即可 |
| **D3** | 能用好即可 — 不验收特定新 slash 名称 |
| **D4** | 失败 **阻断 + 明确报错** — 禁止静默降级 / 假全自动 |

**PRD:** [`prd.md`](./prd.md) · **契约:** [`research/conversation-continuity-contract.md`](./research/conversation-continuity-contract.md)

---

## Task: 07-11 — 长会话续用（所有对话）

**Repos:** `aionui-src` · `D:\claude-code-B` · `ccb-installer` · spec

### P0 实现约束（写代码时不可违反）

| # | 约束 | 对应 |
|---|------|------|
| C1 | 仅 `isCcbWandingConversation` 走 pipeline | D1 边界 |
| C2 | `needsRefresh` 仅 version / `config_generation` 变化；同版本不重复 refresh | D2 |
| C3 | **禁止**每次 mount 无差别 `force refresh` | 性能 / 倒灌 |
| C4 | ensure / refresh 失败 → `throw` + UI 重试；**不**继续 send | D4 |
| C5 | SP2 knowledge **effectiveness inherit**（`kb_hash` 未变则继承；变则 invalidate + re-Read + 轻 toast）— P0 spike | 长报价会话；见 `research/knowledge-effectiveness-policy.md` |
| C6 | turn 进行中 / 未决 permission → **推迟** refresh | 委派 |
| C7 | `seedCcbSessionPreferredMode` 仅 store 空时写入 | 不覆盖用户改 default |

---

### Phase -1 — Capability matrix

| Capability | Status | Fallback |
|------------|--------|----------|
| `conversationContinuity.ts` | unavailable | 扩 `warmupConversation.ts` |
| 07-01 mode/model ensure | in_progress | 内联 |
| 06-29 profile | shipped | 验证进包 |
| 06-19 backflow | shipped | refresh 联动 |
| Failure UX (D4) | unavailable | inline error + block send |

---

### Phase 0 — 基线审计

| Step | Output |
|------|--------|
| 0a | 1.1.7 包含 07-01 / 06-29 证据 |
| 0b | **每类对话**各 1 条旧会话尸检（≥3 天） | `research/old-conversation-autopsy.md` |
| 0c | SP2 knowledge effectiveness（hash-bound inherit） | `research/knowledge-effectiveness-policy.md` |

**对话类型（D1）：** 报价 Guid · 账务 Guid · 默认总调度 · Office（word/excel/ppt 择一）

---

### Phase 1 — Continuity pipeline（P0）

**入口：** `warmupConversation`（单编排点）

| Step | Workstream | Output |
|------|------------|--------|
| 1a | `resolveConversationContinuityContext` | staleness + bound versions |
| 1b | profile stage + infer（06-29） | 所有 specialist 旧会话身份 |
| 1c | **闭环 07-01** | ensure + assert；失败 C4 |
| 1d | model 对称 | 同 07-01 |
| 1e | `needsConversationRefresh`（C2） | generation / app version |
| 1f | `refreshCcbConversationSession` | 仅 stale 或 send 前；写 `last_bound_*` |
| 1g | SP2 effectiveness inherit + invalidation hooks | hash 未变不 Read；变则 re-Read + toast |
| 1h | backflow 联动（C3） | 06-19 |
| 1i | turn 推迟（C6） | 委派/permission |
| 1j | post-upgrade route-b | bootstrap |

**Gate：** vitest + D4 失败路径单测（assert throw）

---

### Phase 2 — 打包与升级（P0）

| Step | Output |
|------|--------|
| 2a | post-install route-b 自动 | Chain ④ |
| 2b | `config_generation` bump → 全局 stale 标记 | 触发 C2 |
| 2c | checklist：`AC-ALL-*` 旧会话行 | packaging-backlog |

---

### Phase 3 — 子 task 收口

07-01 闭环 · 06-29 旧会话复验 · 06-19 refresh 后无倒灌

---

### Phase 4 — 文档（P1）

`agents-unified-model.md` · `chat-acp-flow.md` · `dev-sync-playbook.md` — 含 D1–D4

---

### Phase 5 — 诊断 UI（P2，defer）

---

### TDD contract

| Workstream | RED | GREEN |
|------------|-----|-------|
| needsRefresh 同 gen false | gen 未变 → false | unit |
| needsRefresh 升级 true | version bump → true | unit |
| refresh 幂等 | 二次 open 不 refresh | unit |
| ensure 失败 | mock 404 | assert throws，send 不调 |
| mode seed | 重启 store 空 | 07-01 tests |
| infer 误判 | orchestrator 历史 | 不误绑 specialist |

---

### Smoke matrix — 所有对话 · 长会话（D1 + D3）

每类至少 1 条 **≥3 天前** 旧会话。典型 prompt = 该类型员工常用一句（不绑定新 slash 名）。

| ID | 对话类型 | 操作 | 期望 |
|----|----------|------|------|
| **S-Q** | 报价 Guid | 打开 → 查价 | match OK；无 orchestrator guard |
| **S-A** | 账务 Guid | 打开 → 典型账务查询 | accurate MCP OK |
| **S-O** | 默认总调度 | 打开 → 委派类或路由 prompt | 不崩；委派或回复合理 |
| **S-W** | Office 预设（择一） | 打开 → 典型创建/编辑 prompt | 工具链通 |
| **S-FA** | 任一带全自动旧会话 | 区外 Read / 截图 | 无 permission 卡 **或** D4 明确报错 |
| **S-UP** | 任一类 | 升级后不删 AppData | 上表对应行仍过 |
| **S-RE** | 任一类 | 关 App 再开 | S-FA 仍过或 N/A（非全自动） |
| **S-REF** | 任一类 | 升级后**首次** open | log refresh 一次 |
| **S-REF2** | 同上 | 同版本第二次 open | **无**第二次 refresh |
| **S-FAIL** | 任一类 | 断 config-options | 发送阻断 + 错误文案 |
| **S-RB** | — | 升级后 check-install | route-b PASS |

**Release gate（D3 能用好）：** S-Q + S-A + S-O + S-W + S-FA + S-UP + S-REF + S-REF2 + S-FAIL **必过**；S-RE P1。

---

### Verification profile

1. code-reviewer PASS  
2. vitest（含 D4 throw 路径）  
3. `test-records/old-conversation-smoke.md` 填 S-Q…S-FAIL  
4. `trellis-update-spec`  
5. 用户 **执行 task** → `in_progress`

---

### Recovery

| Trigger | Action |
|---------|--------|
| SP2 无法证明 hash-bound inherit | 阻塞发版；见 `knowledge-effectiveness-policy.md` K4–K6 |
| 07-01 未进包 | 重打 AionUI |
| 某类 S-* 失败 | 该类 conversation 尸检 + 修 pipeline |

---

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| P0 基线（含 SP2） | partial | knowledge-effectiveness-policy.md; K4/K5 pytest |
| P1 Pipeline + D4 | done (core) | vitest 26; C1–C4 + C5/C6 code |
| P2 打包 | partial | bootstrap already runs route-b + config reset |
| P3 子 task | pending | 07-01 in package audit |
| P4 文档 | pending | — |
| Smoke S-Q…S-FAIL | pending | 需手工 |
