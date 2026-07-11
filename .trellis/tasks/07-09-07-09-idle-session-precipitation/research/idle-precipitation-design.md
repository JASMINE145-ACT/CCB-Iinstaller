# Research — Idle Session Precipitation 设计细节

**Date:** 2026-07-09  
**Task:** `07-09-idle-session-precipitation`  
**Author note:** 用户原始五点后端 + 实现路径展开

---

## 1. 为什么 60s idle 比 Stop 更合适

| | Stop 即时 (personal-memory) | Idle 60s |
|--|----------------------------|----------|
| Transcript 完整性 | 可能还有 SubagentStop / 用户追问 | 一轮对话「告一段落」 |
| 与 ROE 链 | 同一 hook 链，易叠加延迟 | 异步 worker，不阻塞 Stop |
| 业务 KB 去重 | Stop 时未读 KB | **可先 Read KB 再提取** |
| Eval 提纯 | 难判断「路径已被认可」 | 用户 60s 不回复 ≈ 默认接受上一轮结果 |
| 成本 | 每 Stop 可能调 LLM | 每 **会话段** 最多 1 次 |

**裁定：** Stop 保留 roe-judge；**沉淀 Worker 绑 idle debounce**。personal-memory 的 LLM 提取 **迁入** precipitation-worker，Stop hook 改为写水位 / 取消 idle 冲突。

---

## 2. 沉淀 Agent Prompt 结构（逻辑合约）

```text
Input:
  - full_transcript (merged)
  - business_knowledge_excerpt (from Read, capped)
  - personal_workflow_excerpt (capped)
  - session_meta: agentId, guidCard?, delegationRuns[]

Output JSON schema: PrecipitationBundle
{
  "session_id": "...",
  "skipped": false,
  "skip_reason": null,
  "lanes": {
    "business_rules": [
      {
        "summary": "直接50 排水语境默认 A 系列白色",
        "evidence": ["用户原话...", "assistant 确认..."],
        "kb_overlap": "none|partial|duplicate",
        "proposed_rule_slug": "...",
        "confidence": 0.0-1.0
      }
    ],
    "personal_habits": [
      {
        "bullet": "报价前先查供应商库存",
        "evidence": ["..."],
        "target": "workflow|profile"
      }
    ],
    "golden_paths": [
      {
        "description": "编排器委派 quotation-agent 查价",
        "tool_sequence": ["Agent(quotation-agent)", "Read", "match_quotation"],
        "user_ack": "explicit|implicit_idle|roe_pass",
        "confidence": 0.0-1.0
      }
    ],
    "eval_cases": [
      {
        "proposed_id": "precip-...",
        "category": "routing",
        "agent": "wande-orchestrator",
        "input": "...",
        "expected_tools": ["Agent"],
        "forbidden_tools": ["mcp__quotation__match_quotation"],
        "must_not": ["orchestrator_direct_business_mcp"],
        "source_golden_path_index": 0
      }
    ]
  }
}
```

**Post-LLM 硬门（代码，非 prompt）：**

- `kb_overlap=duplicate` → 丢弃 business_rules 条目
- `confidence < 0.6` → business / eval 只进 pending，personal 可放宽到 0.5
- `user_ack=implicit_idle` 且 eval → **必须** `status=pending_review`
- 无 `evidence` 非空 → 拒收

---

## 3. 五车道落地表

| # | 用户描述 | 落地文件/API | 自动? | 去重依据 |
|---|----------|--------------|-------|----------|
| 1 | 读全 transcript | worker 输入 | — | session 水位线 |
| 2 | 业务知识库 | `append_business_rule` preview | **否** | 先 Read org KB |
| 3 | 个人习惯 | `memory/personal/workflow.md` | 是* | workflow 全文 + ratio≥0.85 |
| 4 | 正确实现路径 | `golden_path_proposals.jsonl` | 否 | 工具序 hash |
| 5 | eval 云端 | `eval/precipitation_pending.jsonl` → org/git | 否 | input normalize + id 冲突 |

\*个人习惯沿用 memory-trigger R1/R3/R4 门控。

---

## 4. AionUI 嵌入点（P1 实现指引）

```text
packages/desktop/src/.../chat session store
  lastAssistantMessageAt
  precipitationTimer: Map<sessionId, TimeoutHandle>

onEvent: assistant message finalized (ACP turn complete)
  clearPrecipitationTimer(sessionId)
  precipitationTimer.set(sessionId, setTimeout(60_000, () => {
    ipc.invoke('precipitation.schedule', { sessionId, conversationId })
  }))

onEvent: user message sent
  clearPrecipitationTimer(sessionId)

main process precipitation.schedule
  resolve transcript paths from CCB session dir
  spawn precipitation-worker (non-blocking)
```

**与 DelegationRun 协同：** worker 读 subagent jsonl 时，Lane 3 应识别 `Agent(quotation-agent)` 委派路径 vs Guid 直连——对齐 `WANd.OBSERVE.DELEGATION.001`。

---

## 5. 与 learn-by-data 边界

| | learn-by-data | idle precipitation |
|--|---------------|-------------------|
| 触发 | 用户 `/learn-by-data` + xlsx | 对话自然结束 60s |
| 输入 | 结构化表格行 | 自由对话 transcript |
| 主输出 | mapping / price metadata | KB 规则 / personal / eval |
| 重叠 | Section A 业务规则 | Lane 1 — **避免同会话双写** |

**规则：** 同 session 若已跑 learn-by-data，idle worker skip Lane 1–2 或全 skip（config flag）。

---

## 6. 云端 eval（Lane 5 细化）

**P1 本地 pending 即可。** P2 对齐：

- Repo: `eval/agent_eval_cases.jsonl`（PR 合并）
- Org: 若 `07-09-agent-eval-regression-suite` 有 fleet API → `POST /eval/cases` with `status=pending`
- 字段对齐现有 jsonl schema（`id`, `category`, `agent`, `input`, `expected_tools`, `forbidden_tools`, `must_not`, `risk_level`）

**提纯规则：**

- 只沉淀 **可重复** 问法（去掉客户名/日期一次性的 → 泛化或 skip）
- 必须有 observable tool 期望（不能只有「回复包含某词」 unless pass_if_any）
- routing / delegation 类优先（fleet 价值高）

---

## 7. 开放问题（P0 不阻塞文档）

1. 60s 是否可配置（Settings default 60）？
2. orchestrator 会话是否沉淀 Lane 1（通常应 skip，仅 Lane 3–4 routing eval）？
3. Memory 页 vs 独立「沉淀审批」Tab？

---

## 8. 建议实现顺序

1. `precipitation-worker.py` + fixture transcript 单测（无 AionUI）
2. AionUI debounce IPC
3. Lane 2 personal（最快见效）
4. Lane 1 + 4 pending 文件
5. UI 审批
6. 云端 eval sync
