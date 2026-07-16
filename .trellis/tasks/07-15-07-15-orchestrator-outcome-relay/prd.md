# Orchestrator outcome relay — 委派后完整转述业务结果

| Field | Value |
|-------|--------|
| **Task** | `07-15-07-15-orchestrator-outcome-relay` |
| **Status** | planning（计划已按 2026-07-15 用户诊断修正） |
| **Parent** | `07-14-orchestrator-handoff-brief-decomp-plan`（Brief/Plan 已做；**回传**缺口独立） |
| **Related** | `07-04-orchestrator-dispatch-hardening` AC3；`WANd.ORCH.DISPATCH.001`；`WANd.RUN.EXECUTION.001` |
| **Priority** | P0 |

## Symptom（2026-07-15 live）

默认主入口（`wande-orchestrator`）委派 `quotation-agent` 出单：

1. 子 agent **已完整交付**：`fill_quotation_sheet` `success: true`，带 `output_path` / `filled_count`（「查看执行」可见）。
2. **父气泡空壳**：只剩「好的admin，这就……填一份报价单」，无路径、无成功项数。

旁证 Roaming `output_path` 落盘 ≠ 本任务主契约（另 follow-up）。

## Root-cause lock（用户诊断吸收，2026-07-15）

| Hyp | Verdict | 说明 |
|-----|---------|------|
| **H1** 报价子代理终稿未交付 | **排除** | 本次复现子代理已完整交付；**不要**优先给 quotation 加 nudge / DELIVER L1 |
| **H2** 父级空壳收尾 / 未强制转发 | **P0 主因** | `EXECUTION.001` 只在 Prompt；父 `end_turn` 无 Outcome Relay 门禁 |
| **H3** AionUI 气泡绑定 | **排除** | **不改** renderer / MessageList |
| **H4** 缺可执行回归 | **P0** | orch eval 只验「Agent done」，不验父泡 `.xlsx` / 成功项数 |

**根因分类：**

1. **主：跨层合同缺口** — 子工具成功 ≠ 父用户可见交付；合同停在 L1 文字，未落到父级运行时门禁。
2. **次：测试覆盖缺口** — 无「父气泡含 path + count」断言。
3. **次：隐含假设** — 把 Prompt 当成强约束（事实证明不够）。

证据细节：`research/root-cause-relay.md`。

## Goal

父级在 `end_turn` 前强制 Outcome Relay：

- 若本轮 `Agent()` 返回含 artifact / `output_path` / write-success 信号 → 父最终回复**必须**含最小交付字段（至少：`.xlsx` 或 path 片段 + 成功项数线索）。
- 缺省 → **nudge 重试一次**，或 **确定性转发** Agent 返回中的交付片段（二选一或组合，实现时锁定）。
- 回归验证的是**父气泡**，不是「查看执行」里的 tool JSON，也不是仅 `Agent` 出现。

## Contracts

| Contract | Role |
|----------|------|
| `WANd.ORCH.OUTCOME_RELAY.001` *(provisional → promote)* | **主**：父 `end_turn` 前检查 Agent 返回；缺最小交付 → nudge/确定性转发 |
| `WANd.RUN.EXECUTION.001` | 既存同轮转发语义；由 OUTCOME_RELAY 运行时兑现 |
| `WANd.ORCH.DISPATCH.001` | 上位：完整回传 ≈ 直连卡（本任务 = 报价出单切片） |
| `WANd.ROUTING.ASSIGNMENT.001` | 保持：父仍禁顶层业务 MCP |
| ~~`WANd.QUOTE.FILL.DELIVER.001`~~ | **本 MVP 不做**（H1 已排除） |

## In scope (MVP)

1. 落盘根因（H1/H3 排除；H2+H4 P0）— `research/root-cause-relay.md`。
2. **父级 Outcome Relay 门禁**（非仅 Prompt）：orchestrator Stop / 等价 hook，在有 Agent artifact 信号时校验父回复最小字段。
3. L1 对照更新 `wande-orchestrator.md`（说明门禁行为；**不是**唯一修复手段）。
4. Eval：父级 `response_includes` `.xlsx` / path + 成功项数；禁「只验 Agent」。
5. Manual smoke：父气泡含路径与项数。

## Out of scope

- 报价子代理 fill PostToolUse nudge / 再写 quotation DELIVER L1（H1 排除）。
- 任何 AionUI renderer / MessageList 修改（H3 排除）。
- Brief / Decomposition Plan；fill 默认 workspace 落盘；LLM Judge ROE。

## Acceptance criteria

- [x] 根因文档：H1/H3 排除，H2+H4 P0，分类=跨层合同为主。
- [x] 父级门禁：缺最小交付时 nudge×1 或确定性转发（有单测/fixture）。
- [x] Eval live（或等价）：**父**回复含 `.xlsx`/`output_path` 线索 **且** 成功项数线索；非仅 Agent done。
- [ ] Manual smoke 父气泡 PASS。
- [ ] code-reviewer PASS；`ASSIGNMENT.001` 仍持。

## Manual smoke

默认主入口：查价锁定 → 生成报价单 → **父气泡**含路径 + 成功项数（与「查看执行」一致）。

## 2026-07-16 implementation audit addendum

- Automated runtime chain is implemented: colon-scoped mode resolution, Stop-hook stdin parsing, runnable Python selection, hollow-parent block, and path+exact-count pass.
- Eval assertions now support `response_matches_all` and inspect only the final `[assistant_text]`, preventing tool-log false positives.
- Live deploy is hash-verified and the live gate returns hollow=2 / complete=0. Remaining acceptance gates: new-session Guid parent-bubble smoke and a fresh code-reviewer pass.
- Task stays `in_progress`; manual smoke is not inferred from unit tests.
