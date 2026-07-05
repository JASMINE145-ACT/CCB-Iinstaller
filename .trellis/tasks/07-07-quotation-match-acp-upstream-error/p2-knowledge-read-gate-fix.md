# P2 Fix — Knowledge Read gate infinite loop (2026-07-05)

## Symptom

`match_quotation` repeatedly returns PreToolUse deny:

> 查价前必须先 Read 一次业务知识库…

Even after `Read wanding_business_knowledge.md`.

## Root cause

1. **PreToolUse** only scanned parent `transcript_path`; subagent `Read` lives in `{session}/subagents/agent-{id}.jsonl`.
2. **Race**: second `match_quotation` may run before Read line is flushed to transcript.

## Fix

| File | Change |
|------|--------|
| `parse_transcript_knowledge_gate.py` | `derive_agent_transcript_path`, session flag, improved Read detection |
| `pre-match-knowledge-gate.py` | `hook_input_has_knowledge_read()` |
| `post-knowledge-read-mark.py` | PostToolUse on Read → session flag (skip on `is_error`) |
| `quotation-agent.md` | PostToolUse hook for Read |

## Evidence

- unittest: **17/17 PASS** (incl. Stop gate session flag)
- code-review: **PASS** (213874ee initial, b2f61999 follow-up)
- deploy: `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd`
- staging/seed synced for 1.1.6 packaging parity

## Manual smoke

1. **新开**报价专家会话
2. `查询直接50价格`
3. 若 gate 要求 Read → Read 一次 → 再次 match 应 **通过** 并返回候选/价格
