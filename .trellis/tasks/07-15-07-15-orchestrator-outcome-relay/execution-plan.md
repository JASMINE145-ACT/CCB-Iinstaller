# Execution Plan — `07-15-07-15-orchestrator-outcome-relay`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | **C** (regression / 父级空壳回传) |
| **Plan depth** | Standard |
| **Verification profile** | **UI** |
| **Active phase** | Phase 3 — Guid manual smoke |
| **Repos** | ccb-installer only（orchestrator gate + L1 对照 + eval）；**禁止** aionui-src renderer；**禁止** quotation fill nudge |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verify；Scenario C |
| skill-selection | Read: | Debug → runtime gate；Review = code-reviewer |
| trellis-before-dev | Read: | integration EXECUTION/ROE；frontend Rule 0（本任务不改 UI） |
| user diagnosis absorb | Chat: | H1/H3 排除；P0=H2+H4；父 end_turn 门禁；非纯 Prompt |
| codebase probe | Read: | `wande-orchestrator` Stop = off；ROE 不覆盖父级回传 |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | 策略 A 锁定；用户「执行」 |
| Phase 0 | **done** | `research/root-cause-relay.md` |
| Phase 1 | **done** | Outcome Relay gate；sticky-window fix；**7/7** unit |
| Phase 2a/2b | **done** | L1 + eval case schema；registry |
| Phase 3 | **in_progress** | source + live runtime-chain PASS; Guid parent-bubble smoke + code-reviewer pending |
| Phase 1b (v2 扩 scope, 2026-07-16 用户批准) | **done** | `research/root-cause-empty-wakeup.md`（H5 空唤醒 / H6 L1 禁令反噬 / H7 gate artifact-only）；gate 扩查询类触发（`delivery_kind=query`，unit **10/10**）；L1 新增 `WAKEUP_RELAY.001` + `ADMISSION.001` 显式 `run_in_background:false`；eval 加 `orchestrator-query-outcome-relay`；seed `-ForceMd` + gate 重部署 done；**smoke 需加查价场景** |
| plan lint | **PASS** | lint_execution_plan.py |

## Verdict

子代理交付已完整（H1 排除）；UI 绑定没问题（H3 排除）。**缺口在父层**：Prompt 写了「原样转发」，但无 end_turn 门禁，且 eval 不验父泡交付字段。MVP = **父级 Outcome Relay runtime + 父泡回归**，不是再教训 quotation。

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Debug | systematic-debugging | available | 用户锁定 H2+H4 |
| TDD | fixture / unit for gate + eval case | available | — |
| Implement | trellis-implement / inline | available | Stop hook on orchestrator 或等效 parent gate |
| Review | Agent: code-reviewer | available | Layer A 若触及 routing identity |
| Verify | UI smoke + eval | available | — |

## Scenario + risk

- **Scenario C**
- **Risk:** `hook` · `agent-l1` · `eval` · `ui-smoke`
- **Hard exclude:** quotation nudge；AionUI renderer；「只改 Prompt」当完成标准

## Root-cause elimination (locked)

| Hyp | Status | Act |
|-----|--------|-----|
| H1 expert 未交付 | **排除** | 不改 quotation DELIVER / fill nudge |
| H2 parent 空壳 / 无门禁 | **P0** | 父 end_turn Outcome Relay |
| H3 UI bind | **排除** | 不改 renderer |
| H4 缺回归 | **P0** | eval 父泡 `.xlsx` + 成功项数 |

**分类：** 主=跨层合同缺口；次=测试覆盖 + Prompt-as-hard-constraint。

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ORCH.OUTCOME_RELAY.001` | Agent 返回含 path/success 时，父回复含最小交付；否则 nudge×1 或确定性转发 | orchestrator Stop gate（新）+ 可选 `runAgent` 辅助 | unit fixture + eval 父 `response_includes` | med |
| `WANd.RUN.EXECUTION.001` | 同轮转发语义由上项兑现 | L1 对照句 | 同 eval | low |
| `WANd.ROUTING.ASSIGNMENT.001` | 父不直连业务 MCP | 现有守卫 | `forbidden_tools` | low |
| plan structure | lint | this file | `lint_execution_plan.py` | — |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | 根因落盘（诊断已完成） | docs-only | — | write research | `research/root-cause-relay.md` | H1/H3 排除；H2+H4；分类 | Fast |
| 1 | **P0** | **父 Outcome Relay 门禁** | OUTCOME_RELAY.001 | hook | TDD→implement | `ccb-subagent-gate`（orch Stop）和/或 ACP 侧 parent check | 缺字段 → nudge×1 **或** 确定性转发；有单测 | Standard |
| 2a | P1 | L1 对照（非唯一修复） | OUTCOME_RELAY + EXECUTION | agent-l1 | implement | `wande-orchestrator.md` | 指向门禁行为；仍禁空壳 | Fast |
| 2b | **P0** | **Eval 父泡回归** | OUTCOME_RELAY + ASSIGNMENT | eval | TDD | `eval/agent_eval_cases.jsonl` | 断言 `.xlsx`/`output_path` **且** 成功项数；禁仅 Agent | Standard |
| 3 | P0 | Gates + smoke | all | ui | code-reviewer → test | seeds deploy | PASS + 父泡粘贴 | UI |

**显式取消（原计划）：** quotation L1 DELIVER；fill PostToolUse nudge；Phase0「猜 H1/H3」；任何 aionui-src 改动。

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Phase 1 gate | OUTCOME_RELAY.001 | fixture：Agent 返回含 path，父草稿无 path → reject/nudge | gate 单测 / `smoke-*-deploy` 相关 | ASSIGNMENT 仍禁 MCP |
| Phase 2b eval | OUTCOME_RELAY.001 | live 空壳应 FAIL | `node eval/run-agent-eval.mjs --run --case orchestrator-fill-outcome-relay` | 同 |
| Phase 2a L1 | docs | N/A | deploy-seed + smoke | 不当唯一 GREEN |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| OUTCOME_RELAY.001 | Python unit + full Stop-hook runtime chain + Guid main-entry smoke | hollow parent exits 2; exact path+count exits 0; parent bubble contains path+count | automated PASS; manual pending |
| ASSIGNMENT.001 | eval forbidden 顶层 MCP | PASS | case forbids top-level mcp__quotation__* |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-15-07-15-orchestrator-outcome-relay/execution-plan.md` | PASS | **PASS** |

## Parallel / merge

串行：0 → 1（门禁）→ 2a/2b → 3。门禁实现前不把「改了 Prompt」标完成。

## Conditional recovery

| Trigger | Action |
|---------|--------|
| orch 无 Stop 钩子基建 | 先挂 `hooks.Stop` + `:roe`-like outcome checker；或 ACP parent post-Agent 拦截（选一，写进 research） |
| nudge 循环 | 硬顶 1 次；第二次确定性转发 Agent 交付片段 |
| live eval 抖 | schema + manual 父泡作门禁；case `retry:1` |
| 有人提议改 renderer | **拒绝**（H3 排除）除非新证据 + re-approve |

## Manual steps

1. 部署 gate + seed 后**新开**默认会话。
2. 查价 → 出单。
3. **父气泡**须含 `.xlsx`/path + 成功项数。
4. 粘贴 `smoke-evidence.md`。

## Related deferrals

| Item | Where |
|------|--------|
| quotation DELIVER / fill nudge | 不做（H1 排除） |
| AionUI stream bind | 不做（H3 排除） |
| Roaming → workspace 落盘 | follow-up |
| Prompt-only「再写硬一点」 | **不算**完工 |

---

**实现锁定（批准时确认其一为主策略）：**

- **A** nudge×1 后仍缺 → 确定性转发 Agent 交付字段  
- **B** 直接确定性转发（少一次模型重试）  

默认建议：**A**（保留礼貌合成，失败才硬转发）。

**已锁 A（2026-07-16 执行）。** 实现中：实现后请新开默认会话做 smoke（见 `smoke-evidence.md`）。

## 2026-07-16 implementation audit

| Check | Evidence | Result |
|-------|----------|--------|
| Mode key | `wande-orchestrator:outcome-relay` maps to a valid env key and resolves `block` | PASS |
| Hook stdin | incremental JSON reader; no Windows `timeout.exe` / missing `dd` dependency | PASS |
| Python runtime | choose only a runnable `python`/`python3`; Windows Store alias is rejected | PASS |
| Runtime behavior | hollow parent ? exit 2; matching `.xlsx` + exact `filled_count` ? exit 0 | PASS |
| Eval behavior | `response_matches_all`; final assistant block only | PASS |
| Historical full gate suite | 13 passed / 9 failed, same pre-task Windows fixture baseline; failures recorded, not reported as GREEN | BASELINE DEBT |
| Live Guid smoke | new conversation, inspect parent bubble | PENDING |
