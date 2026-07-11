# UI/UX — Precipitation Inbox（沉淀审批台）

**Date:** 2026-07-09  
**Task:** `07-09-idle-session-precipitation`  
**Design tool:** ui-ux-pro-max（Enterprise productivity · density 7 · motion 3/subtle）  
**Repo:** `aionui-src` renderer + IPC；数据 `%LOCALAPPDATA%/CCB-Wanding/.claude/learning/`

---

## 1. 设计原则（硬约束）

| 约束 | 做法 |
|------|------|
| **不影响对话** | 沉淀 UI **零 modal**；聊天区不出现审批卡片流；最多 1 条可 dismiss 的轻提示 |
| **持久 + 冷启动提醒** | pending 落盘 jsonl；App 启动 / 登录后 badge + 可选 toast |
| **可对话审批** | 审批台内嵌 **按条目的澄清线程**（非把审批塞回主聊天） |
| **复用已有设施** | Memory 页、attention badge、learning-status、SubagentDrawer 模式 |

**Anti-patterns（ui-ux-pro-max）：** 不在 chat stream 插卡片；不用 emoji 当图标；不用 blocking 全屏；动画 >500ms。

---

## 2. 信息架构 — 「Memory 第三 Tab」为主入口

**推荐：扩展 `#/memory`，不新开顶级 Nav。**

已有（`07-06-memory-page-ui-redesign`）：

```text
#/memory
  ScopeTabs: [ 个人 | 业务 | 待沉淀 Inbox ]   ← 新增第三 Tab
  ├─ 个人 / 业务：现有 FileSidebar + EditorPanel（不变）
  └─ 待沉淀 Inbox：ProposalQueue + DetailDrawer（新）
```

**为何不放对话页：**

- 对话是 **ephemeral 执行面**；沉淀是 **durable 治理面**（对齐 Rudder PROMOTION）
- Memory 页用户心智已是「持久知识」；Inbox 是 Memory 的 **待审队列**

**Sidebar：** `SiderMemoryEntry` 加 **pending count badge**（复用 attention 蓝点样式，或 amber 区分「待办」vs「未读消息」）。

---

## 3. 布局线框（Desktop Electron）

```text
┌──────────────────────────────────────────────────────────────────┐
│ App chrome · 对话区不受影响（用户继续在 /conversation/:id 聊天）      │
└──────────────────────────────────────────────────────────────────┘

#/memory?tab=inbox
┌─────────────┬────────────────────────────┬───────────────────────┐
│ ScopeTabs   │  Proposal List (scroll)    │  Detail Panel         │
│ 个人|业务|待沉淀│                          │  (或窄屏时 → Drawer)   │
│             │  ┌─ 业务规则 ───────────┐  │  标题 + lane chip      │
│ 筛选:       │  │ 直接50排水默认A系列白  │  │  ─────────────────    │
│ 全部        │  │ 证据: "用户说…"       │  │  [可编辑 textarea]    │
│ 业务规则    │  │ 来源会话 · 2h前       │  │  证据 accordion       │
│ 个人习惯    │  │ [查看会话]            │  │  ─────────────────    │
│ 路径/Eval   │  └──────────────────────┘  │  [批准][拒绝][编辑后批准]│
│             │  ┌─ Eval 候选 ──────────┐  │  ─────────────────    │
│             │  │ orchestrator-quote…  │  │  💬 澄清线程 (见 §5)   │
│             │  └──────────────────────┘  │                       │
└─────────────┴────────────────────────────┴───────────────────────┘
```

**密度：** `--density 7` — 列表行高紧凑、卡片 padding 12–16px、筛选 chip 单行。

**色彩（ui-ux-pro-max 建议，需 token 化）：**

- Primary `#2563EB` — 批准 / 链接
- Secondary `#F59E0B` — pending badge / lane「业务规则」
- Destructive `#DC2626` — 拒绝
- Muted surface — 证据引用块

与现有 AionUI theme token 对齐，**不硬编码 per-screen hex**。

---

## 4. 对话区 — 唯一允许的轻量侵入

**禁止：** 在 message list 插入 proposal 卡片。

**允许（二选一，推荐 A）：**

### A. 会话级 dismissible chip（推荐）

位置：聊天输入框 **上方** 或 header **下方**，高 ≤32px，非 sticky 挡消息。

```text
┌─────────────────────────────────────────────┐
│ ✓ 本轮对话已沉淀 · 2 条待确认  [查看] [忽略]  │
└─────────────────────────────────────────────┘
```

- 仅当 **当前 session** 有未读 pending 且用户仍在该会话时显示
- 点击「查看」→ `#/memory?tab=inbox&session={id}&highlight={proposalId}`
- 「忽略」仅隐藏 chip，**不** delete pending
- worker `learning` 态：**不**在 chat 显示 spinner（改 Memory sidebar badge）

### B. 完全不侵入 chat

仅 sidebar Memory 入口 + 冷启动 toast。更干净，但发现性弱。

**裁定：P1 用 A；Settings 可关「会话沉淀提示」。**

---

## 5. 「可对话审批」— Clarification Thread（非主聊天）

每条 proposal 在 Detail Panel 底部有 **折叠式澄清区**：

```text
┌─ 与沉淀助手澄清 ─────────────────────────┐
│ Agent: 这条规则是否适用于全部客户？        │
│ You:  仅青山客户                          │
│ [输入框]                          [发送]  │
└──────────────────────────────────────────┘
```

**实现选项（P1 → P2）：**

| 阶段 | 行为 |
|------|------|
| P1 | 澄清 = **本地备注** 写入 proposal `review_notes[]`；批准时 merge 进最终文本 |
| P2 | 澄清 = 调 lightweight **`precipitation-review-agent`**（只读 transcript + 单条 proposal，不写业务 MCP） |

**不要：** 把澄清发回 `wande-orchestrator` 主会话（会污染报价上下文）。

**「查看来源会话」：** 链接 `#/conversation/:id?scrollTo=turn` — 只读跳转，不带审批 UI。

---

## 6. 持久化与冷启动提醒（复用 attention 栈）

### 数据文件（CCB 侧，AionUI 只读+写 decision）

```text
.claude/learning/
  precipitation_pending.jsonl      # 待审条目（worker 追加）
  precipitation_runs/{session}.json  # 单次运行摘要
  precipitation_decisions.jsonl    # 用户 approve/deny/edit 审计
  .precipitation-summary.json      # { pendingCount, lastRunAt, byLane }
```

### 提醒矩阵

| 场景 | 机制 | 已有设施 |
|------|------|----------|
| 沉淀 worker 运行中 | Memory 侧栏 amber dot pulse | 扩展 `.learning-status.json` → 加 `precipitation: running` |
| 有待审条目 | Memory nav badge `pendingCount` | 类似 `conversationAttention` count |
| 用户不在 Memory 页 | 可选 OS toast | `notificationBridge` + `useConversationAttentionNotifications` 模式 |
| **冷启动 / 关机后再开** | 启动 scan pending → toast + taskbar badge | `useTaskbarAttentionBadge` **或** 新 `usePrecipitationAttentionBadge` |
| 用户打开 App 未点 Inbox | 首次进 Memory 默认 tab=inbox 若 count>0 且 `lastVisitedInboxAt` 旧 | localStorage 偏好 |

**Toast 文案（zh-CN）：**

> 「有 {n} 条对话沉淀待确认」— 点击 → `#/memory?tab=inbox`

**与消息 attention 区分：**

- 对话蓝点 = **agent 等你回话 / permission**
- Memory amber = **沉淀待你批**
- Taskbar：可合并为 `conversationUnread + precipitationPending` 或分开展示（Settings）

---

## 7. 组件映射（aionui-src）

| 新组件 | 复用/参考 |
|--------|-----------|
| `MemoryPage/InboxTab/` | `MemoryPage/Shell`, `ScopeTabs` |
| `ProposalCard` | Memory `FileSidebar` 卡片密度 |
| `ProposalDetailPanel` | `EditorPanel` + 只读 evidence |
| `ClarificationThread` | 简化 chat bubble（无 tool steps） |
| `PrecipitationSessionChip` | 会话页 dismissible banner |
| IPC `precipitationService.*` | 镜像 `ccbPersonalMemoryService.*` |

**Drawer 变体（窄窗）：** 列表点击 → `SubagentDrawer` 同款右侧 Drawer 出 Detail（与委派「查看执行」一致）。

---

## 8. 交互状态机

```text
pending → (approve) → applied + archived
        → (deny)    → rejected + archived
        → (edit)    → edited_pending → approve → applied
        → (clarify) → notes appended → still pending

applied:
  business → append_business_rule (preview flow 已有)
  personal → memory file write (已有 IPC)
  eval     → precipitation_pending → fleet/git PR (P2)
  golden   → Trellis task 链接 (P2)
```

每条 decision **append-only** 写 `precipitation_decisions.jsonl`（审计）。

---

## 9. 分期

| Phase | UI |
|-------|-----|
| **P1** | Memory 第三 Tab + 列表/详情 + approve/deny/edit + 持久 jsonl + nav badge |
| **P1b** | 会话 dismissible chip + 冷启动 toast |
| **P2** | Clarification agent thread + eval 批准写云端 |
| **P3** | Work Tasks 集成（经理可见团队沉淀队列）— 可选 |

---

## 10. Smoke 清单

- [ ] 对话中无 modal / 无 proposal 卡片插入
- [ ] 关机前未审批 → 重启后 Memory badge + toast 仍在
- [ ] Approve 业务规则 → 走 org preview，不 silent 写 KB
- [ ] Deny 后条目 archived，不再出现在 pending
- [ ] 窄窗 Drawer 不挡对话（Inbox 在独立路由）
- [ ] `prefers-reduced-motion` 下 badge 不 pulse

---

## 11. 与 ui-ux-pro-max Pre-Delivery 对齐

- [ ] Phosphor/Heroicons 向量图标（lane：BookOpen / User / Path / Flask）
- [ ] 按钮 hover 150ms；批准/拒绝 ≥44px 点击高
- [ ] 深浅色 token；证据块 secondary text ≥3:1
- [ ] 编辑区 focus ring 可见
