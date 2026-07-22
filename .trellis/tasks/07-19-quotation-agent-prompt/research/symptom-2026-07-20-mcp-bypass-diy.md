# Symptom — MCP bypass / filesystem DIY 查价（2026-07-20）

## What the user saw

Session claimed to query 「直接 50」/ DN50 直接价格, then ran a long **explore/DIY** chain instead of `mcp__quotation__*` / `Agent(quotation-agent)`:

| Observed tool / action | Expected for 查价 |
|------------------------|-------------------|
| `ls` / `find` under `D:\CCB-Wanding`, `AionUi-Dev` | ❌ |
| Read `quotation-agent.md` / `.aionui.json` / `ccb-mcp.json` | ❌ |
| Read `quotation-server/dist/index.js` | ❌ |
| `openpyxl` scan `price_library_cleaned_*.xlsx` | ❌ |
| Probe Accurate token / `accurate-mcp/server.py` | ❌ |
| `mcp__quotation__match_quotation` (+ supplier / select) | ✅ missing |
| `Agent(quotation-agent)` with Handoff Brief | ✅ if orch session |

Environment markers: **AionUi-Dev** paths + live `D:\CCB-Wanding` install tree.

## Layer label

**H4 — MCP bypass / identity or tool-availability failure**（新假设）

Not the same as:

- H1 父转述缺斤少两（子已用 MCP，父不转发）
- H2 L1 过载（子用了 MCP 但正文 BAD）
- H3 ROE/hooks（查价被 gate 打断）

Here the **business path never started**.

## Likely causes（ordered）

| Rank | Cause | Why it fits |
|------|-------|-------------|
| 1 | **Session is orchestrator (or generic) and ignored L1** | Orch L1 already says: 查价第一步 `Agent(quotation-agent)`；**禁止**先 Read/Grep/Bash。Trace is exactly that forbidden path. |
| 2 | **quotation MCP not in tool list** for the session | Model falls back to “read install + scrape xlsx”. Check View Steps for whether any `mcp__quotation__*` appears in available tools. |
| 3 | **Wrong agent profile** (dev shell / coding agent) | DiscoverSkills + reading agent source is coder behavior, not WanD specialist. |
| 4 | **Dev vs install authority mix** | Exploring both `AionUi-Dev` and `D:\CCB-Wanding\packages` suggests confused runtime identity. |

## Security note

Trace included **Accurate/org token material in shell**. Treat as leaked for that session; rotate if this was a shared log. Do not paste tokens into tasks/specs.

## Product impact on lightweight + full relay

- Lightweight L1 **does not fix** H4 if the session never binds quotation MCP / never delegates.
- Full relay (R3/R4) **requires** a real subagent result first — H4 must be closed or smoke will keep failing.

## Immediate triage questions（next Guid smoke）

1. 会话顶栏 / 助手身份是「工作助手」还是「报价专家」？
2. View Steps 里有没有出现过任何 `mcp__quotation__*`？
3. 若是主入口：有没有出现 `Agent(quotation-agent)`？
4. `ccb-check-install` / MCP health：quotation server ready？

## Suggested contract add（when implementing）

`WANd.QUOTE.NO_DIY.001`（provisional）:

- 查价路径禁止 Bash/`find`/直接读价库 xlsx/读 MCP server 源码代替 `match_quotation`。
- Orch：查价禁止探索 install 树；必须第一步 `Agent(quotation-agent)`。

## Relation to plan

Record under `07-19-quotation-agent-prompt` Phase 1 matrix as **H4**. Prefer fix order when executing:

1. Confirm identity + MCP availability (dev smoke)
2. H1/R3 转发不缺斤少两（only after MCP path works）
3. Lightweight hooks/L1
