# Execution Plan — `07-20-accurate-agent-readonly-convergence`

| Field | Value |
|-------|--------|
| **Status** | **completed** — closeout 2026-07-20；Guid smoke「5月销售额」1× summarize + 转发 PASS |
| **Scenario** | **C**（已知症状层：过度交付 + ROE 误伤 + 父乱解释） |
| **Plan depth** | Standard |
| **Verification profile** | Standard（+ Guid Orchestrator smoke 1 次「查询 5 月销售额」） |
| **Sibling** | `07-19-quotation-agent-prompt`（报价稳态；本任务不改 quotation L1） |
| **Prior art** | `07-06-accurate-delegation-convergence`（委派收敛；本任务补只读过度交付 + ROE） |
| **Risk tags** | `ui` · `migration`(deploy L1/modes) · `long-running`(pytest + smoke) |

## Do not implement until

用户明确说：**批准，执行** / **implement**。

## Contract map

### Contract: WANd.ACC.READONLY.CONVERGE.001

**Behavior protected:** 只读销售额/采购额查询 → 1× summarize → 表；无 DIY 落盘  
**Primary code:** `accurate-agent.md`（packages + staging）  
**Tests:** fixture transcript + optional eval case（若有 accurate monthly）  
**Smoke:** Orchestrator「查询 5 月销售额」≤2 MCP，父泡含金额  
**Risk if broken:** 10-tool 长链 + 假 ROE 失败体验

### Contract: WANd.ACC.ROE.READONLY.001

**Behavior protected:** Accurate 只读路径 ROE 不 block  
**Primary code:** `roe-judge-profiles/accurate-agent.json`（或 modes）；必要时 `parse_transcript_roe_judge.py` skip 规则  
**Tests:** `test_roe_judge_gate.py` + 新 fixture「查询5月份销售额」→ pass  
**Risk if broken:** 写路径 Office/报价 ROE 被误放宽（须回归）

### Contract: WANd.ORCH.NO_FABRICATE_GATE.001

**Behavior protected:** 有数字就转发；禁止编造 MCP 写权限 / ROE 终审话术  
**Primary code:** `wande-orchestrator.md`  
**Tests:** prompt contract / Guid smoke  
**Risk if broken:** 用户被 A/B/C 打断，以为系统坏了

## Phased plan

### Phase 0 — Confirm autopsy（research only）

- [x] 用户轨迹已落盘 `research/symptom-2026-07-20-sales-roe-false-positive.md`
- [ ] 可选：从 live `subagent-gate-roe-judge.log` 抽同会话 window_key（若可得）

### Phase 1 — TDD ROE readonly（H2）

1. RED：fixture「查询 5月份销售额」+ assistant 含金额表（无 L2）→ 期望 `verdict=pass`
2. 若当前因 write-intent 误判失败 → 修 profile / `has_write_intent` / accurate skip
3. GREEN + 既有 quotation/office ROE fixtures 不破

### Phase 2 — accurate L1 converge（H1）

- 强化「标准销售/采购月报」：禁止 Write/xlsx/python；禁止未要求的 batch_get_detail
- packages → staging 同步（R4）

### Phase 3 — orch no-fabricate（H3）

- Accurate / 查询类：子结果已含金额 → 立即转发；禁止「ROE / 写权限」叙事与 A/B/C 替代

### Phase 4 — Deploy + smoke

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

新会话：Orchestrator →「查询 5月份销售额」→ 验收 AC2。

### Phase 5 — Spec / Trellis

- `agents-unified-model.md` 记 Accurate readonly + ROE skip 决策
- closeout；`task.py set-status completed`（仅验收后）

## Explicit non-goals this plan

- 不改 quotation-agent L1（07-19）
- 不恢复 Guid 专家卡片 catalog（另任务）
- 不把 `accurate-agent:roe-judge` 全局改 `off` 而不保留写意图防护（优先 readonly skip）

## Approval gate

| Ask | Answer needed |
|-----|----------------|
| 批准本计划？ | 「批准，执行」后才改代码 |
| ROE 策略偏好 | A) accurate 专用 profile skip 只读；B) modes=`warn`；C) 仅扩 `skip_readonly_patterns` |
| 默认建议 | **A**（最小误伤、写路径仍可 block） |
