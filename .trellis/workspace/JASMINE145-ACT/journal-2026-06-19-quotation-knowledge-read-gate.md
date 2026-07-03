# Journal — 2026-06-19 — Quotation knowledge Read gate (Plan C)

## 背景

用户反馈：「三通50」多候选时 agent 口头说「根据知识库」但 transcript 无 `Read(wanding_business_knowledge.md)`。L1 prompt  alone 无法保证执行。

## 决策

**Plan C：PostToolUse nudge + Stop warn（分 mode，不恢复 2026-06-18 整段 quotation MCP gate off 的误杀路径）**

| 层 | 机制 | 默认 |
|----|------|------|
| A | `PostToolUse` → `post-match-knowledge-nudge.py` | `candidate_count > 1` 时注入 `additionalContext` |
| B | Stop → `quotation-knowledge-read.sh` | `quotation-agent:knowledge` = **warn** |
| MCP 证据 gate | `quotation-mcp.sh` | 仍 **off** |

**Read 频率：** 同一 user turn 内并行 match N 次 → **Read 知识库 1 次**（PostToolUse 45s/session dedupe）。

**与并行 match：** 不冲突。顺序 = 并行 match 全部返回 → Read 一次 → 每 keyword 1 推荐 + bullet。

## 实现

### 新增

- `ccb-subagent-gate/scripts/post-match-knowledge-nudge.py`
- `ccb-subagent-gate/scripts/lib/match_selection_payload.py`
- `ccb-subagent-gate/scripts/lib/parse_transcript_knowledge_gate.py`
- `ccb-subagent-gate/scripts/validators/quotation-knowledge-read.sh`
- `tests/test_knowledge_read_gate.py` + fixtures `quotation-multi-no-read.jsonl` / `-with-read.jsonl`

### 修改

- `quotation-agent.md`：frontmatter `PostToolUse` + `Stop`；L1 精简（流程 enforcement 交 Hook，保留模板/填表/并行规则）
- `modes.json`：`quotation-agent:knowledge: warn`
- `eval/agent_eval_cases.jsonl`：多候选 routine case 统一 expect `Read`；消除 `knowledge-no-read-routine` 禁止 Read 冲突
- `mcp-business.md` / `ccb-wanding-quotation.md` / `agents-unified-model.md` / `ccb-subagent-gate/SKILL.md`

### 同期（同会话）

- `DEFAULT_SELECTION_CANDIDATE_LIMIT` 7→10（repo + live vendor）

## 部署

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1 -SourceDir "...\ccb-installer\config\skills\ccb-subagent-gate"
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

Live：`%LOCALAPPDATA%\CCB-Wanding\.claude\skills\ccb-subagent-gate\` + `agents\quotation-agent.md`

## 验证

| 检查 | 结果 |
|------|------|
| `python tests/test_knowledge_read_gate.py` | 7/7 PASS |
| `node eval/run-agent-eval.mjs` | 61/61 schema ok |
| trellis-check | PASS |
| AppData hooks frontmatter | PostToolUse + Stop 已写入 |

## 验收（用户侧）

1. **新开**万鼎报价专家会话
2. 「查询三通50价格」→ 期望 `match_quotation` → `Read` KB → 1 推荐 + bullet
3. 若仍 skip Read：查 `subagent-gate-warn.log`

## 后续

- ~~warn 误杀率稳定后：`quotation-agent:knowledge` → **block**~~ **Done (2026-06-30)** — see §2026-06-30 below
- dedupe 从 45s 改为 user-turn 边界（可选）

## 2026-06-30 — 强制 Read + 会话一次

**需求：** 只要查报价就必须 Read 业务知识库；同会话多次查价只 Read 一次。

| 层 | 变更 |
|----|------|
| PreToolUse | 新增 `pre-match-knowledge-gate.py` — 未 Read 时 **deny** `match_quotation` / `batch` |
| Stop | `quotation-agent:knowledge`: **warn → block** |
| Parser | `parse_transcript_knowledge_gate.py` — 全 transcript 扫描；任意查价（含单候选）均需 session Read |
| L1 | `quotation-agent.md` PreToolUse frontmatter + §业务知识库 Read |
| Maint | `data/ccb-wanding-quotation.md` §报价匹配规则 |
| PostToolUse | `post-match-knowledge-nudge.py` — 仅多候选回复形态，不再要求 Read |

**部署：**

```powershell
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

**验收：** 新会话 →「查询三通价格」→ 第一次 match 被 deny → Read KB → match 成功 → 同会话再问「直接50」→ 不再 Read。

**Spec：** `.trellis/spec/integration/agents-unified-model.md` § Knowledge Read enforcement (2026-06-30).

## Spec 指针

- `.trellis/spec/backend/mcp-business.md` § Knowledge Read Gate
- `.trellis/spec/integration/agents-unified-model.md` § Subagent delivery gate
