# Idle Session Precipitation — 会话空闲 1 分钟沉淀机制

**Status:** done (P2 unified mainline, 2026-07-09)  
**Created:** 2026-07-09  
**Parent:** `07-09-work-routing-execution-contracts` (Learning 域 follow-up)  
**Origin:** 用户方案 + Rudder `LEARNING.PROMOTION.001` + 现有 `ccb-personal-memory`

## Goal

当一次对话 **结束且 60 秒内无二次用户消息** 时，触发 **沉淀 Agent** 阅读完整 transcript，按五条车道提取可持久化内容，经 **晋升门** 写入对应层——业务知识库、个人习惯、正确实现路径、云端 eval——**不重复、不偷偷改 skill**。

## 一句话评价（设计裁定）

**可行，且比 Stop 即时 personal-memory 更适合 WanD chat-first 场景。**  
Stop 链保留 ROE / 轻量信号；**重沉淀统一到 idle debounce**，避免每轮 Stop 全量 LLM + 与用户在 30 秒内追问冲突。

## 触发条件

| 条件 | 行为 |
|------|------|
| 助手最后一轮回复完成 | 启动 **60s debounce** 计时 |
| 60s 内用户新发消息 | **取消** 本次沉淀计时 |
| 60s 无新消息 | 调度 `precipitation-worker` |
| 会话仅问候 / 空 transcript / &lt;2 有效轮次 | **skip**（记 skip 原因） |
| 同一 session 已沉淀且 transcript 无新增 | **skip**（水位线，同 personal-memory R2） |
| 用户显式「不要记录/别学习」 | **skip** + 本会话 suppress |

**触发 Owner：** AionUI main（知悉 UI 空闲与用户输入）→ IPC 通知 CCB/aioncore 或本地 worker。  
**Non-goal：** CCB Stop hook 内做 60s sleep（会阻塞 agent）。

## 沉淀 Agent 五车道（用户 1–5 条）

### Lane 0 — 读全量 transcript（前置，非输出）

- 主会话 `{session}.jsonl`
- 委派子会话 `{session}/subagents/agent-*.jsonl`（有则合并）
- 含 tool calls、ROE block、用户纠偏原文

### Lane 1 — 业务知识库（去重后 **提案**，默认不直写）

1. **先 Read** 业务知识库：`wanding_business_knowledge`（org API 优先，shadow 只读兜底）
2. 提取：**新品类语义、选型纠偏、口径澄清、用户确认的业务事实**
3. **禁止**：价格数字、一次性订单、未确认猜测、已存在于 KB 的复述
4. **输出**：`precipitation_proposals.jsonl` → `target: org_business_rule`  
5. **落地**：走现有 `append_business_rule` **preview**；人确认后才进 org KB  
6. **Invariant（Rudder PROMOTION）：** 永不自动 merge 进 L4 正文

### Lane 2 — 个人工作习惯

1. 提取：「我习惯…」「以后默认…」「记住…」类 **稳定偏好**
2. **去重**：读 `memory/personal/workflow.md` + profile；近重复拒收（复用 personal-memory R4）
3. **输出**：带 `evidence`（transcript 原话）的 bullet
4. **落地**：`memory/personal/workflow.md`（**可自动**，已有门控）
5. **与 Lane 1 边界**：个人偏好不进 org KB；全员规则走 Lane 1 + append

### Lane 3 — 被认可的正确实现路径

定义：**用户明确认可**（「对了」「就按这个」「可以」）或 **ROE PASS 且用户无纠偏** 的 tool/委派序列。

提取：

- agent 路由（orchestrator → quotation-agent vs 直连）
- 工具序（Read KB → match_quotation → 推荐 1+ bullet）
- 多轮澄清 → 成功 match 的路径

**输出**：`golden_path_proposals.jsonl`  
**落地（分级）：**

| 置信 | 动作 |
|------|------|
| 高 + read_only | 提议写入 eval case（Lane 4） |
| 中 | 仅 `precipitation_proposals`，Trellis 人工 |
| 低 / 有纠偏 | no-op |

**不自动改** `quotation-agent.md` / hook 规则。

### Lane 4 — Eval 案例提纯 → 云端

从 Lane 3 + 整会话抽象 **可回归** 的 case：

```json
{
  "id": "precip-{session}-{seq}",
  "category": "routing|quotation|quotation_behavior|...",
  "agent": "quotation-agent",
  "input": "用户原话或规范化问法",
  "expected_tools": ["Read", "mcp__quotation__match_quotation"],
  "must_not": ["..."],
  "evidence_session": "{sessionId}",
  "status": "pending_review"
}
```

**落地路径（分阶段）：**

- **P1：** `%LOCALAPPDATA%/CCB-Wanding/.claude/eval/precipitation_pending.jsonl`
- **P2：** 同步 org eval 库 / git `eval/agent_eval_cases.jsonl`（**需审批**，非 silent push）
- **P2 云端：** 对接 `07-09-agent-eval-regression-suite` 或 org API（若已有）

**Invariant：** 不自动覆盖已有 eval id；重复 input 合并为 comment + link。

## 与现有组件关系

```text
                    ┌─────────────────────────┐
  User idle 60s     │  precipitation-worker   │
  (AionUI debounce) │  (新 skill / worker)    │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  Lane 1 org KB            Lane 2 personal        Lane 3–4 eval
  append_business_rule     workflow.md            precipitation_pending
  (preview only)           (auto+dedup)           → cloud/git (approve)

  Stop hook (保留)           learn-by-data (独立)
  roe-judge only             表格式 /learn-by-data
  personal-memory →          不替代
  降级为信号或合并进 idle
```

| 现有 | 本 task |
|------|---------|
| `ccb-personal-memory` Stop | **合并或降级**：idle 为主；Stop 仅写 skip/learn 水位 |
| `quotation-learn-by-data` | 互补：learn-by-data = 批量表格式；idle = 对话片段 |
| `append_business_rule` | Lane 1 唯一写 org 入口 |
| `eval/agent_eval_cases.jsonl` | Lane 4 目标库（审批后 merge） |
| roe-judge | Lane 3 的「被认可」信号源之一 |

## 架构（P1 MVP）

```text
AionUI renderer
  onAssistantTurnComplete(sessionId)
    schedulePrecipitation(sessionId, debounceMs=60_000)
  onUserMessage(sessionId)
    cancelPrecipitation(sessionId)

IPC → main → precipitation.schedule
  → spawn: precipitation-worker.py
      1. load transcripts (+ subagents)
      2. Read business KB (HTTP org or shadow file)
      3. Read memory/personal/workflow.md
      4. LLM extract → PrecipitationBundle JSON
      5. validate + dedupe gates
      6. apply: personal auto; org/eval → pending only
      7. write .claude/learning/precipitation_runs/{sessionId}.json
      8. learning-status.json → done | skipped | partial

AionUI Memory / Settings（P2）
  展示 pending proposals + 一键 approve/reject
```

## Acceptance criteria

### P0 — 设计（本 task 交付）

- [x] AC0 PRD + research 设计落盘
- [x] AC0b 父 task / registry 链 `WANd.LEARNING.IDLE.001`（`agent-runtime-registry.yml`）
- [ ] AC0c `task.py validate` PASS

### P1 — MVP 实现

- [x] AC1 AionUI 60s debounce schedule/cancel IPC（aionui-src）
- [x] AC2 worker 读 parent + subagent transcript
- [x] AC3 Lane 1 先 Read KB，proposal 无 duplicate（fixture 测试）
- [x] AC4 Lane 2 personal 写入 + dedup（Inbox 批准后写 workflow/profile）
- [x] AC5 Lane 3–4 pending → 批准后晋升 golden/eval jsonl（非 silent auto-merge）
- [ ] AC6 纯查询会话 skip；60s 内追问 cancel（e2e 未跑）
- [x] AC7 Stop personal-memory 合并：Stop hook no-op，idle 单主线

### P2 — LLM 沉淀 Agent + 五车道晋升

- [x] AC8 LLM 提取（`precipitation_thinking_client.py`，独立 Python 进程 + MiniMax HTTP）
- [x] AC9 五车道 gates + 启发式 fallback
- [x] AC10 批准后晋升：shadow KB / personal / golden_path / eval/agent_eval_cases.jsonl
- [x] AC11 org `append_business_rule` on approve (`promote_business_rule.py`)
- [ ] AC12 eval 云端：git 即共享（见 `research/eval-cloud-sync.md`）；org API P3

## Non-goals（P1）

- 自动改 agent `.md` / hook / SKILL
- 替代 learn-by-data 批量复盘
- Rudder 式 Issue + reviewer wake
- 无审批直接写 org KB 或云端 eval

## Phasing

| Phase | 内容 |
|-------|------|
| **P0** | 本文档 + contract registry + 与 personal-memory 合并策略 |
| **P1** | worker + AionUI debounce + pending 文件 |
| **P2** | Memory UI 审批 + org eval 云端 sync |
| **P3** | 与 Trellis task 自动开单（Keeper 流程） |

## Risks

| 风险 | 缓解 |
|------|------|
| 与 Stop memory 双跑 LLM | idle 为主；Stop 改 skip-only 或共享水位 |
| 业务 KB 幻觉写入 | 先 Read KB + preview + 禁止 auto-merge |
| eval 污染 | pending + 人工 merge；must_not 必填 |
| 60s 内用户切会话 | debounce 按 sessionId；切走仍可在后台跑 |
| 成本 | 短会话 skip；无信号 skip；同 session 增量水位 |

## References

- `docs/asda` §5 Review → Learning
- `docs/reference/rudder/doc/product/domains/review-feedback-learning/`
- `.trellis/spec/integration/work-routing-execution-contracts.md`
- `07-06-ccb-memory-auto-accumulation` / `07-06-memory-trigger-extraction-quality`
- `eval/agent_eval_cases.jsonl`
