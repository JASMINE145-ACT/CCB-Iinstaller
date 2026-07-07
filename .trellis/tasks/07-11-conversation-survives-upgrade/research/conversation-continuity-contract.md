# Conversation Continuity Contract

> **定稿 2026-07-06** — 与 [`../prd.md`](../prd.md) 产品决策 D1–D4 对齐。

## North star

员工在**任意已有 CCB 对话**（长会话、跨天、跨升级）中，需要用时能**正常发送并完成该对话类型下的核心业务**；升级后自动加载**当前安装版**运行时，**不要求新开对话**，**不要求验证某个新功能名称**。

---

## 产品决策

| ID | 决策 | 工程约束 |
|----|------|----------|
| **D1** | 所有 CCB 对话 | pipeline 入口 `isCcbWandingConversation`；smoke 覆盖报价/账务/总调度/Office |
| **D2** | 升级不频繁 | `needsRefresh` 仅 app version 或 `config_generation` 变化；每对话每版本 refresh **一次** |
| **D3** | 能用好即可 | AC 不绑定具体 slash；只验「能发 + 工具链通」 |
| **D4** | 失败明确报错 | 禁止 silent fallback / 假全自动；`assert*` fail → block send + retry UX |

---

## 两层诉求

```text
A. Continuity（正常使用）     B. Freshness（升级可感知）
历史保留 · 能发 · 身份/权限对    软刷新 → 当前 L1/MCP/slash
         └────────── 长会话 goal = A ∧ B ──────────┘
```

---

## 两层会话模型

（不变 — 见前版）

产品续 **Conversation**；升级后通过 **同 conversation_id 软重建 ACP** 满足 B，DB 消息不删。

---

## Pipeline（实现约束）

```text
open / 即将 send
    → resolveIdentity
    → detectStaleness (D2: 仅 version/generation 变)
    → [若 stale] softRefresh（turn 进行中则推迟）
    → rebindPreferences (ensure mode/model, D4)
    → readiness
    → send 或 阻断+报错
```

### P0 实现约束（防 bad code）

| 约束 | 原因 |
|------|------|
| **禁止**每次 mount force refresh | D2；性能 |
| refresh 必须联动 06-19 backflow | 长会话倒灌 |
| SP2：knowledge **effectiveness** 继承（`kb_hash` 未变）；变则 invalidate + re-Read + 轻 toast | 长报价会话；ADR `knowledge-effectiveness-policy.md` |
| turn / permission 进行中推迟 refresh | 不打断委派 |
| seed mode **仅 store 空** | 不覆盖用户手动改回 default |
| 非 CCB 会话跳过 pipeline | D1 边界 |

---

## 失败策略（D4）

| 情况 | 行为 | 禁止 |
|------|------|------|
| ensure mode 失败 | 阻断发送；toast/inline 错误；可重试 | 继续发 + 弹权限 |
| refresh 失败 | 同上 | 假装没升级继续用旧 binding |
| route-b 404 | 明确提示 sync/重启 App | 无限重试无反馈 |

---

## 「必须新开会话」例外（窄）

| 场景 | 说明 |
|------|------|
| 换 preset **类型** | 报价 ↔ 账务 ↔ Word — 建议新 Guid |
| DB migration 灾难 | 基础设施，非本契约范围 |

**长聊同 preset 升级：不走例外。**

---

## UX（D2 + D3）

- 升级后首次打开旧对话：默认**静默** soft refresh；可选轻 toast「已应用当前版本，可继续本对话」
- 不强调新功能名；员工无感完成绑定即可
- 失败：说清楚 + 重试，不糊弄

---

## Spike 待办

| ID | 问题 | 优先级 |
|----|------|--------|
| SP2 | knowledge gate 继承实现 | **P0**（长会话） |
| SP1 | refresh 后 transcript 连续性 | P1 |
| SP3 | 委派中途推迟 refresh | P0 |
