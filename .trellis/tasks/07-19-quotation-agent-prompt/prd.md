# 报价 Agent 系统性稳态：轻量化 + 委派全量转发

## Goal

1. **轻量化** quotation：少 hook + L1 只留决策表/硬禁令/GOOD·BAD；细则按需 Read（对照 accurate，但不强行单 MCP）。
2. **委派全量转发**：`quotation-agent` 必须把可交付结果写进返回给 orchestrator 的正文；`wande-orchestrator` **只转发、不缺斤少两**（锁码、单价、推荐理由、货源要点、库存若已查——有则必转）。

结束「工具跑完了、用户只看到『交给专家』」的救火循环。不以「再加一段禁止句」当默认解法。

## Product lock（2026-07-20 用户确认）

```text
用户 → orchestrator → Agent(quotation-agent)
                            │
                            ▼  子代理：工具链 + **完整结果正文**
                            │
orchestrator ←──────────────┘
     │
     ▼  父代理：**原样转发**（可排版，不可省略关键字段）
   用户气泡
```

| 角色 | 必须做 | 禁止 |
|------|--------|------|
| `quotation-agent` | 最终 assistant 文本含：锁码、单价、推荐一句、货源（若调了名录）、库存（若调了 inventory） | 「按 A 选项已交付」「待继续确认」代替数字；只写工具成功不写表 |
| `wande-orchestrator` | 父气泡转述子结果关键字段；查询类与出单类同等严格 | 只说「已交给报价专家」；用寒暄/待命代替数字；自行改价或编造 |

## User-visible symptoms（近期）

1. **父代理空壳转述 / 缺斤少两**：子代理已跑完 `match → supplier → select → inventory`，父气泡只写「交给报价专家处理」，无锁码/单价（2026-07-20 现场；`WANd.QUOTE.ORCH.RELAY.STRICT.001`）。
2. **子代理 BAD 文本**：工具链齐但 assistant 写「按 A 选项已交付」类空壳（07-21 seed sync + select-ok nudge；接线曾漏，已补）。
3. **ROE 与查价互相干扰**：`:roe-judge` 曾把查询会话打成写意图循环；相对 `accurate-agent`，报价侧 hooks 更密。
4. **MCP bypass / DIY（2026-07-20）**：口称查「直接 50」，实际扫 `D:\CCB-Wanding`、读 `quotation-agent.md` / MCP dist、用 openpyxl 翻价库表、甚至摸 Accurate token——**未调用** `match_quotation` / 未 `Agent(quotation-agent)`。

## Hypothesis（待 Phase 0/1 证伪）

| # | 假设 | 初步证据 |
|---|------|----------|
| H1 | **父转述缺斤少两** 主导「工具 done 但用户看不到价」 | orch L1 有 OUTCOME/WAKEUP；Stop 偏 artifact；query-only 易漏 |
| H2 | **quotation L1 过载**（~390 行 + 5×PostToolUse）导致子结果正文不完整 | 同模型；accurate 短 L1、无 PostToolUse |
| H3 | **设定不对称**（roe-judge warn、多 mode）副作用 | `modes.json`；07-19-roe-judge-lightweight-loop-fix |
| H4 | **MCP bypass / DIY 扫盘**（新）：会话声称查价却 `ls`/`find`/读 agent 源码/`openpyxl` 扫价库 xlsx，**零** `mcp__quotation__*` | 2026-07-20 现场；见 `research/symptom-2026-07-20-mcp-bypass-diy.md` |

## 轻量化方向（已记录，实现须批准）

| 刀 | 做什么 | 不做 |
|----|--------|------|
| **1 减 hook** | 默认保留 `post-match-knowledge-nudge` + `post-quotation-relay-nudge`；评估去掉/合并 tiers、knowledge-mark、mutate-invalidate | 为瘦而拆掉 select-ok 锁码 nudge |
| **2 L1 分层** | L1 常驻：决策表+硬禁令+GOOD/BAD；填单/learn-by-data/Org mutate → 按需 Read；长表留 maint `ccb-wanding-quotation.md` | 盲删「硬约束」锚点（须 07-11 inventory） |
| **3 设定对称** | 查价路径 fail-open；写路径再严；文档写清 `off ≠ 关 PostToolUse` | 强行改成 accurate 的单 MCP |

目标体感：L1 **~120–180 行**（06-28 曾到 ~180，后又胀回）。

## Requirements（契约）

| # | Contract | Behavior |
|---|----------|----------|
| R1 | `WANd.QUOTE.L1.SLIM.001`（provisional） | L1 保留决策表 + 硬禁令 + 结果正文义务；细则迁 maint/skill；可度量变短 |
| R2 | `WANd.QUOTE.SETTINGS.PARITY.001`（provisional） | quotation vs accurate hooks/modes 差异可解释；每项 keep/change |
| R3 | `WANd.QUOTE.ORCH.RELAY.STRICT.001`（已有，**强化「不缺斤少两」**） | 父泡必须转发子结果关键字段（锁码+单价+…）；禁止仅「已交给专家」 |
| R4 | `WANd.QUOTE.RETURN.FULL.001`（provisional） | 子代理返回 orchestrator 的正文必须自含可转发的最小交付集（见 Product lock 表） |
| R5 | `WANd.AGENT.SEED.SYNC.001`（已有） | packages ↔ staging 一致；PostToolUse 接线不得漏 |
| R6 | `WANd.QUOTE.NO_DIY.001`（provisional） | 查价禁止 Bash/find/读价库 xlsx/读 MCP 源码代替 MCP；orch 查价第一步必须 `Agent(quotation-agent)` |

## Out of Scope

- 改 `select_quotation_candidates` LLM 选型内核
- 重写 quotation MCP / 价库算法
- 一次性大删未映射 inventory 的 L1 句
- Accurate / Office 行为改动（仅对照）— **Accurate 只读收敛见 sibling** `07-20-accurate-agent-readonly-convergence`

## Acceptance Criteria

- [ ] AC1: `research/symptom-layer-matrix.md` 近 5 次症状 → H1/H2/H3
- [ ] AC2: `research/settings-parity-vs-accurate.md` + `research/lightweight-approach.md`（本会话已定方向落盘）
- [ ] AC3: H1/R3 — orch 转发不缺斤少两（pytest query relay + Guid smoke：父泡含锁码+价）
- [ ] AC4: R4 — 子结果正文含最小交付集（price-only eval / output-contract）
- [ ] AC5: 轻量化后 `quotation-agent-output-contract` + seed wiring 仍绿
- [ ] AC6: 无批准前不改 L1/orch 实质

## Canonical files

- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/accurate-agent.md`（对照）
- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md`
- `ccb-installer/config/skills/ccb-subagent-gate/config/modes.json`
- `ccb-installer/config/skills/ccb-subagent-gate/scripts/lib/parse_transcript_outcome_relay.py`
- `.trellis/spec/integration/agents-unified-model.md`
- `.trellis/tasks/07-11-safe-quotation-agent-prompt-refactor/research/quotation-agent-logic-inventory.md`
- `.trellis/tasks/07-21-quotation-relay-stale-fix/closeout.md`
