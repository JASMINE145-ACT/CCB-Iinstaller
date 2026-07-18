# P0 Smoke — agent-run 2026-07-14 (user waived Guid hand-test)

## Command

```powershell
cd d:\Projects\claude-code-best\ccb-installer
node scripts/smoke-word-creator-p0.mjs
node scripts/smoke-word-creator-cdp.mjs
# + ROE gate
python config/skills/ccb-subagent-gate/tests/test_roe_judge_gate.py
```

## Results

| Suite | Verdict | Evidence |
|-------|---------|----------|
| Lanes / intent | **PASS** | excel/ppt lanes; 发客户→PDF; no black-box PDF→Word |
| Contract md | **PASS** | seed + live `%LOCALAPPDATA%\...\word-creator.md` |
| MCP probe office-word | **PASS** | 54 tools |
| Outbound closed loop | **PASS** | DOCX 36938 B + PDF 148455 B |
| Install script clauses | **PASS** | docx2pdf + stub-bak + addsitedir |
| CDP Guid surface | **PASS** | `#/guid` shows Word 文档助手 card (`hasWordCard: true`) |
| ROE judge | **PASS** | 16/16 |

## Guid hand-chat

User waived. Substituted by MCP outbound (same `convert_to_pdf` tool path the agent would call) + CDP card visibility.

## Stage 1 P0

**CLOSED** for automated acceptance.
