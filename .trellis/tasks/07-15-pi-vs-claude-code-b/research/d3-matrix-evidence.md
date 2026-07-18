# D3 matrix evidence — R1–R3 Path A (2026-07-15)

**Env:** `D:\CCB-Wanding` · `minimax-m3` · Route-B · outer 180s · harness `test-native-acp-agent.mjs` (timing thirds)

## Success rows

| Row | Prompt | Agent | Business tool | Oracle | t_dispatch | t_agent_first | t_business | t_end | Log |
|-----|--------|-------|---------------|--------|------------|---------------|------------|-------|-----|
| **R1** | 帮我查直接50价格 | `quotation-agent` | `mcp__quotation__match_quotation` | 推荐 `8020020755` **¥1,219** + 候选表 | 8645 | 28047 | 28047 | 136345 | `d3-r1-quote.log` |
| **R2** | 帮我查1到5月销售汇总 | `accurate-agent` | `mcp__accurate__accurate_summarize_records` | 1–5 月分组金额 + 合计 **11,683,417,259** IDR / 366 单 | 10281 | 27066 | 27066 | 59560 | `d3-r2-accurate.log` |
| **R3** | 列出我当前的工作任务 | `work-tasks-agent` | `mcp__work-tasks-agent__work_tasks_brief` | 明确空列表 `total=0`（合法空 oracle） | 8955 | 21824 | 21824 | 34742 | `d3-r3-work-tasks.log` |

Timing unit: **ms** from prompt start. PASS = tool + oracle（非仅 `end_turn`）。

## Clarify / Fail

| Class | Status | Note |
|-------|--------|------|
| R1 clarify (`50的价格`) | **N/A this run** | 关门条仅要求 success 三行；澄清/失败留给 eval 回归或后续手工 |
| R1 fail (XYZ999) | **N/A this run** | 同上 |
| R4 Word | **DEFER** | 矩阵已钉；不挡「可默认零卡」 |

## Gate

| Gate | Result |
|------|--------|
| R1+R2+R3 Path A oracle | **PASS** |
| code-reviewer (harness) | **PASS** — [D3 harness review](3a46a948-1245-4417-9013-f47354f3d7ad) |
| `node --check` harness | **PASS** |

## Unlock

D3 关门 → **G1 Guid 零卡 flag** 可批；默认 G2 仍需用户签「可默认单入口」。
