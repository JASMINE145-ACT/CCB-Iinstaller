# 方案：Hermes 真源触发 + 多提案 Inbox（合同修订 **v3**）

**Status:** **C0 CLOSED** 2026-07-16（PO「执行」= 接受出站 D7）  
**Product lock:** 多提案 + Inbox 批准 + verify applied；出站 D7 allow + fail-closed  
**Method:** Hermes **拆层**移植；SHA 见 `research/hermes-source-lock.md`（官方 `1600008ab00e…`）

Companion: `fix-precipitation-missing-session-id` / `07-14`  
Implement: **`precipitation-hermes-trigger`（I1 进行中）**

---

## 0. 复审关闭表

| 项 | 状态 |
|----|------|
| sync ≠ review | ✅ |
| TurnHarvest 唯一主线（文档） | ✅；runtime 待 I1 |
| applied 晋升规格 | ✅；代码待 I1 |
| Watermark snapshot（`reviewThroughTurnId`） | ✅ 本合同 §4 |
| 逐 run outcome（非 exit 0 / 全局 summary） | ✅ §5 |
| Lease 防双 worker | ✅ §4.3 |
| 出站默认与企业边界 | ✅ §7（产品默认已锁；可 PO 覆盖） |
| Hermes 官方 SHA | ✅ `hermes-source-lock.md` |
| Agent 写 `memory/business/*` | ✅ §1.2 合法路径 B |
| proposal_kind × knowledge_object | ✅ §1.3 + specs |
| E2E 与 N=5 | ✅ §8 |
| Registry 四类（非五车道） | ✅ 本轮改 `agent-runtime-registry.yml` |

---

## 1. 产品合同

| 项 | 决定 |
|----|------|
| 进 org KB | Inbox approve + **`applied=true` 或显式 duplicate** |
| 自动直写 KB | 不做 |
| Stop LLM | 不做 |
| MemoryProvider | 不引进 |

### 1.1 知识对象（自动沉淀 vs 其它）

| `knowledge_object` | 含义 | 自动 FullReview | 其它合法写入 |
|--------------------|------|-----------------|--------------|
| `personal_habit` | 个人习惯 | Inbox → `memory/personal/*` | `/记住`、UI |
| `org_business_rule` | 租户 SOP | Inbox → Org KB | — |
| `local_business_context` | 本机客户/价格草稿 | **不自动提案** | **路径 B：Agent 显式 Append**（见下）+ UI |

### 1.2 `local_business_context` 双写路径（锁冲突）

**路径 A — 自动 precipitation：** MUST NOT 产出以 `memory/business/*` 为 sink 的提案。

**路径 B — Agent 显式写入（保留）：**  
如 `accurate-agent.md`：客户/供应商口径 → `customers.md`；价格规则 → `pricing.md`。  
合同：

- 仅 `local_business_context`，**不得**当作已进 Org KB  
- 写入前 Read；追加 `- [YYYY-MM-DD] …`  
- 审计：实现后 events 应能区分 `writer=agent_tool` vs `writer=inbox_promote`  
- 不要求 Inbox；与 org promotion 分离

### 1.3 两维分类（勿混）

```text
proposal_kind:     knowledge | golden_path | eval_case
knowledge_object:  personal_habit | org_business_rule | local_business_context | null
```

| proposal_kind | knowledge_object |
|---------------|------------------|
| `knowledge` | 三者之一（自动路径下不为 `local_business_context`） |
| `golden_path` / `eval_case` | **`null`** |

自动 gates：**四种** `proposal_kind` 落地形态 = knowledge(business_rule|personal_habit) + golden_path + eval_case（legacy JSON 字段名可保留，语义映射到上表）。

---

## 2. Hermes 拆层（同 v2；SHA 已校正）

| 层 | 万鼎 | LLM |
|----|------|-----|
| Checkpoint | 每轮 obligation + watermark | 否 |
| Nudge N（默认 **5**） | 请求 FullReview | — |
| FullReview | worker → Inbox | 是 |
| Idle / session-end | 仅补未完成区间 | 可 |

门闩：`interrupted` → 全 skip；FullReview 还需 `completed && hasFinalResponse && !failed`。

---

## 3. 主线

```text
turnCompleted → Checkpoint（无 LLM）→ turns_since_full_review++
             → FullReview if nudge|force|idle/session-end fallback
             → per-run outcome file → Scheduler 状态机
             → Inbox → approve → verify applied
```

Idle 30s cancel = **legacy only**。义务在 **main-process**。

Registry：`WANd.LEARNING.IDLE.001` 本轮改为 **legacy idle / four proposal kinds**；TurnHarvest 主线叙述待 I1 合约 ID（可新增 `WANd.LEARNING.TURN_HARVEST.001` provisional）。

---

## 4. 状态机（含 watermark 快照 + lease）

### 4.1 Obligation fields

```text
state ∈ { queued | running | done | error }
latestTurnId
lastProcessedTurnId          # 已成功审完的上界（含）
reviewThroughTurnId          # 本次 running 冻结快照上界（acquire 时固定）
attempt, nextRetryAt, turnsSinceFullReview, lastError
leaseId, leaseOwner, leaseExpiresAt, childPid?
```

### 4.2 Watermark（**禁止**成功时 `lastProcessed=latest`）

```text
on acquire:
  reviewThroughTurnId := latestTurnId   # 冻结
  state := running
  mint leaseId; leaseExpiresAt := now+TTL

on worker outcome accepted (lease valid):
  lastProcessedTurnId := reviewThroughTurnId
  if latestTurnId > reviewThroughTurnId:
      state := queued                   # turn 6+ 未审，必须再跑
  else:
      state := done
  clear lease; nudge reset only on proposals|no_proposals
```

Worker 输入快照 MUST 以 `reviewThroughTurnId` 为上界（transcript 截断合同在 I1 定）。

### 4.3 Lease（防 detached 双 worker）

- Spawn FullReview 时写入 `leaseId`（UUID）+ `leaseOwner`（app instance）+ `leaseExpiresAt` + 可选 `childPid`
- Worker 结果文件 MUST 回带同一 `leaseId`
- Scheduler **仅**在 `leaseId` 匹配且未过期时接受 outcome
- App restart：`running` → `queued` **且**旧 lease 作废（bump generation / expire）；新 worker 新 lease  
- 过期/lease 不匹配的 outcome：**丢弃**（记 funnel `stale_lease`）

### 4.4 Nudge 重置

| outcome | nudge |
|---------|-------|
| `proposals` / `no_proposals` | 清零 |
| `retryable_error` / `permanent_skip` / stale lease | **不清零**（permanent_skip 可单独策略） |
| missing session schedule skip | 不清零 |

---

## 5. 逐 run Outcome 合同（Scheduler 唯一真相）

**禁止**以：进程 exit code、全局 `.precipitation-summary.json`、仅「有无 pending 追加」作为状态迁移依据。

原子写（建议路径）：  
`learning/precipitation_runs/<runId>.outcome.json`（write temp + rename）

```json
{
  "runId": "...",
  "sessionId": "...",
  "conversationId": "...",
  "leaseId": "...",
  "reviewThroughTurnId": "...",
  "outcome": "proposals|no_proposals|retryable_error|permanent_skip",
  "proposalCount": 0,
  "retryable": false,
  "errorCode": null,
  "finishedAt": "ISO-8601"
}
```

| outcome | 含义 | Scheduler |
|---------|------|-----------|
| `proposals` | 已写入 pending≥1 | advance watermark；nudge=0 |
| `no_proposals` | 成功判定无学 | 同上 |
| `retryable_error` | LLM/IO 瞬态 | error + backoff；nudge 保留 |
| `permanent_skip` | 策略拒绝/缺 transcript 等 | done 或 error 不重试；可观测 |

Worker 今日常将 LLM fail / skip 皆 `return 0` —— **I1 MUST 改写**为写 outcome 文件；exit code 仅辅助。

---

## 6. 多提案 + 验收

Prompt：org business 偏召回；max org 5 / personal 3；org conf≥0.45 进 Inbox。  
指标：标注 ≥50（目标 100）；**precision + recall**、错误车道率、审批率。

### E2E 与 N=5

默认 nudge **N=5**。验收三选一（测试须写明）：

1. **5 个** completed turns；或  
2. 测试配置 **`N=3`**；或  
3. 三轮后 **explicit force** / session-end fallback  

禁止写「3 turns → nudge」却保持 N=5 静默期望。

---

## 7. 出站隐私（产品默认已锁）

**Default（企业内部工具，2026-07-16 C0）：**

| 项 | 默认 |
|----|------|
| 租户 outbound | **allow**（沿用现 MiniMax precipitation；可按租户改为 deny） |
| 会话 / 用户 suppress | **deny 覆盖** 租户 allow |
| 脱敏失败 | **fail-closed** → `permanent_skip` / `outbound_redaction_failed`，**不得**裸送 |
| Funnel redaction | **≠** outbound redaction |

**Outbound 必须处理（不仅密钥/电话）：**

- 客户名 / 供应商名 → 占位符  
- 项目号 / 合同号 → 占位符  
- 价格 / 金额 → 量级或 REDACTED  
- 合同/报价正文大段 → 截断或摘要策略  

审计：`outbound_model`、粗粒度 `chars_sent`、policy decision；**无**正文。  
模型留存：以供应商协议为准；设置中须可展示「将送外部模型」。

PO 可覆盖为 **deny-until-opt-in**；未覆盖则以上默认生效。

---

## 8. 阶段

| | 内容 |
|--|------|
| **C0** | 本合同 v3 + specs + registry 四类 + Hermes SHA |
| **0** | bind smoke |
| **I1** | Scheduler + outcome + lease + watermark；**禁止**在 C0 未认可以前开工 |

---

## 9. 一句话

> Checkpoint 冻结 `reviewThroughTurnId`；FullReview 靠 **lease + per-run outcome**；Inbox 批库须 **applied**；出站 **fail-closed**；`memory/business` 仅 Agent/UI，不自动沉淀。
