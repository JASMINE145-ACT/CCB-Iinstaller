# 旧对话连续性 — 长会话续用 + 升级可感知

## North star（2026-07-06 定稿）

> **员工已在某条对话里聊了很久；App 升级后，仍在这条对话里正常干活，并自动用到当前版本的运行时能力**——不要求新开对话，也不要求员工「验证某个新功能」。

### 产品决策（用户确认）

| # | 决策 | 含义 |
|---|------|------|
| D1 | **范围：所有对话** | Guid 报价/账务、默认总调度、Office 预设、历史普通 CCB 会话——凡 CCB-Wanding 会话均适用，不单测报价一条线 |
| D2 | **升级不频繁** | 升级后**首次**打开该对话时做一次软刷新（约 10s）可接受；同版本重复打开**不**反复 refresh |
| D3 | **能用好即可** | 不绑定某一版「必须展示的新 slash」；验收标准是**员工要用时能发、工具能跑、权限/身份对**，而非功能营销清单 |
| D4 | **失败：明确报错** | refresh / ensure 失败 → **阻断发送** + 可理解错误 + 可重试；**禁止**静默降级成「像旧版还能凑合用」或 UI 假全自动 |

### 用户原话脉络

1. 升级后全自动失效  
2. 不想为「体验更新」被迫新开对话  
3. 很多员工**长会话**——更新后还想用**同一条**  
4. 细化：所有对话 · 升级少 · 好用就行 · 坏了要说清楚  

技术契约：[`research/conversation-continuity-contract.md`](./research/conversation-continuity-contract.md)

---

## Goal（两层，同时满足）

```text
  A. 正常使用（Continuity）          B. 升级可感知（Freshness）
  「别比升级前更难用」                 「运行时已是当前安装版」
  · 历史完整                          · 软刷新加载最新 L1/MCP/slash
  · 能发、工具能跑                    · 不追求员工「感觉到新功能名」
  · 全自动 / 身份 / 模型对            · 升级后首次打开该对话触发一次即可
```

| 优先级 | 目标 |
|--------|------|
| **P0** | **所有** CCB 旧对话：打开 → 发送 → 核心业务不劣于升级前 |
| **P0** | 全自动（若用户曾选）：真·`bypassPermissions`；失败则报错（D4） |
| **P0** | 升级后首次打开：软刷新绑定当前 `config_generation` / app version（D2） |
| **P1** | idle / 重开 App：同对话续聊，无历史倒灌 |
| **P2** | 可选诊断 UI（八维 PASS/FAIL） |

---

## 八维连续性（所有对话）

| 维 | 所有对话最低要求 |
|----|------------------|
| ① 身份 | preset/历史推断正确；不误绑 orchestrator（specialist 路径） |
| ② 权限 | 全自动真生效或明确报错 |
| ③ 模型 | 所选 model 与发送一致 |
| ④ 能力 | 升级后首次 open 软刷新 → 当前磁盘 L1/MCP/slash（不验收特定命令名） |
| ⑤ 环境 | post-upgrade bootstrap；MCP 可用 |
| ⑥ 传输 | 无 Route not found；route-b 过 |
| ⑦ 渲染 | 新回复不拼接旧块 |
| ⑧ 就绪 | 首条可发或 banner 说明等待原因 |

**对话类型 smoke 抽样（AC 要求各至少 1 条旧会话）：** 报价 Guid · 账务 Guid · 默认总调度 · Office 预设（word/excel/ppt 择一）。

---

## 根因摘要

| 员工痛点 | 技术根因 |
|----------|----------|
| 升级后全自动没了 | mode store 生命周期；warmup 后未 ensure；07-01 未闭环进包 |
| 旧对话像「没升级」 | `session/new` 绑定快照；`config_generation` 不触发重绑 |
| 被告知只能新开 | 缺软刷新产品路径；dev 文档误传 |

---

## Scope

### In

- Continuity pipeline（**仅 CCB-Wanding 会话**）编入 `warmupConversation`
- **惰性刷新**：`needsRefresh` 为真时（app/config 变）或 send 前；**非**每次 mount force
- 闭环 07-01；并入 06-29 / 06-19；post-upgrade route-b
- **失败策略 D4**：`assert*` 失败 throw，UI 展示重试，不 silent fallback
- **Knowledge gate**：长会话升级后优先**继承**已 Read 状态（SP2，P0 约束）
- Spec + 旧会话 smoke（多类型抽样）

### Out

- 非 CCB 平台会话（Gemini/legacy）— guard 跳过
- 跨设备同步
- 为验收硬编码某一 slash 名称
- 失败时降级为旧版运行时
- Temp Read 绕过（掩盖 mode bug）

### 正当例外（文档说明，非默认）

换 specialist **类型**（报价↔账务↔Word）仍**建议**新 Guid 卡；主场景长聊**同 preset** 不走此例外。

---

## Acceptance criteria

### P0 — 所有对话 · 长会话续用（必达）

- [ ] **AC-ALL-1** 抽样 ≥4 类旧对话（见上表，创建 ≥3 天前）：打开 → 发一条该类型典型 prompt → **成功**（无错误 guard / 404）
- [ ] **AC-ALL-2** 其中全自动会话：截图或区外 Read → **无**权限卡，或 **AC-FAIL** 明确报错
- [ ] **AC-ALL-3** 1.1.x → 1.1.y 升级，**保留** AppData：对上述旧对话重复 AC-ALL-1/2
- [ ] **AC-ALL-4** 关 App 再开（不升级）：AC-ALL-2 仍过
- [ ] **AC-FAIL（D4）** 人为断 config-options：发送被**阻断**，文案可理解，**无**假全自动继续发

### P0 — 升级刷新（D2）

- [ ] **AC-REF-1** 升级后**首次**打开旧对话：log 有 `conversationContinuity` refresh；写入 `extra.last_bound_*`
- [ ] **AC-REF-2** 同版本第二次打开：**无**第二次 refresh（不重复等 10s）
- [ ] **AC-REF-3** refresh 过程：历史消息仍在 UI；新回复无倒灌（06-19）

### P1 — 环境与传输

- [ ] **AC-DIM-6** 升级后 `ccb-check-install.cmd` route-b PASS + 旧对话可发
- [ ] **AC-DIM-8** idle ≥6min reopen 旧对话 → 跟进消息正常

### 文档

- [ ] **AC-DOC-1** `agents-unified-model.md` § Conversation continuity（含 D1–D4）
- [ ] **AC-DOC-2** `dev-sync-playbook.md`：「新会话」= dev smoke only
- [ ] **AC-DOC-3** `chat-acp-flow.md` § pipeline + 失败阻断策略

### 子 task

- [ ] **07-01** 闭环并验证进 release 包
- [ ] **06-29** 旧会话（非新建）复验

---

## 非目标（明确不写进 AC）

- 员工能说出「新版本加了某某 slash」
- 每次打开旧对话 <1s（升级后首次 refresh 可慢）
- 非 CCB 对话的行为变更

---

## 关联 task

| Task | 关系 |
|------|------|
| `07-01-aionui-full-auto-permission-sync` | ②③ — P0 阻塞 |
| `06-29-specialist-session-resume-profile-drift` | ① |
| `06-19-quotation-behavior-backflow` | ⑦ |
| `06-28-app-startup-readiness-gate` | ⑧ |
| `07-06-employee-profile-settings-prompt` | refresh 时 re-handoff |
