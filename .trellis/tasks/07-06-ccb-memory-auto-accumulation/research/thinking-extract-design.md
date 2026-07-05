# Thinking-primary personal memory extract (rev 1)

**Task:** `07-06-ccb-memory-auto-accumulation`  
**Date:** 2026-07-06  
**User decisions (locked):**

1. **纯自动** — 无确认弹窗；提炼后直接 append（仍走 Python 校验）
2. **后台并行** — 不阻塞后续对话展开（Stop 链立即返回）
3. **前端轻提示** — 「Agent 正在学习记录您的习惯」

---

## Problem with P4 heuristic-only

Keyword markers (`我习惯` / `以后都` / …) miss implicit preferences and feel “dumb.” User wants **minimax-m3-thinking** at session/task end to **extract** personal workflow knowledge.

P4 deliverables (seed, `/记住`, lock/dedup, packaging) **remain**; extract engine upgrades.

---

## Target architecture

```text
Stop / SubagentStop
  │
  ├─ post-personal-memory-stop.py  (sync, <200ms)
  │     1. Write job manifest + status=learning
  │     2. Spawn detached worker (no wait)
  │     3. exit 0  ← never blocks subagent-gate / next chat
  │
  └─ worker (background)
        1. Build transcript excerpt (user turns + last N assistant)
        2. Call minimax-m3-thinking with fixed system prompt
        3. Parse JSON entries → validate (personal only, confidence, dedup, employee-profile)
        4. Append workflow.md (file lock, same as P4)
        5. status=done | idle | error  (+ log)
```

**UI (aionui-src):**

- Watch/poll `%LOCALAPPDATA%\CCB-Wanding\.claude\memory\.learning-status.json`
- When `status=learning` → show non-blocking banner/toast: **「Agent 正在学习记录您的习惯」**
- When `done` / `error` / timeout → hide (optional brief “已记录” is **out of scope** unless user asks)

---

## Status file contract

Path: `.claude/memory/.learning-status.json`

```json
{
  "status": "idle" | "learning" | "done" | "error",
  "startedAt": "ISO-8601",
  "finishedAt": "ISO-8601|null",
  "sessionId": "…",
  "agentType": "wande-orchestrator|quotation-agent|accurate-agent",
  "entriesAppended": 0,
  "error": null
}
```

- Hook sets `learning` **before** spawn.
- Worker sets `done` / `error` when finished.
- UI treats `learning` older than **90s** as stale → hide (fail-open).

---

## Thinking call contract

| Field | Value |
|-------|--------|
| Model | `minimax-m3-thinking` (same stack as WanD agents) |
| Mode | One-shot, no tools, no chat bubble |
| Timeout | 45s hard kill in worker |
| Input | Transcript excerpt (user messages + optional last assistant text), existing `workflow.md` bullets (for dedup hint), employee-profile summary |
| Output | Strict JSON only |

```json
{
  "entries": [
    { "target": "workflow", "text": "先查库存再报价", "confidence": 0.9 }
  ]
}
```

Rules in system prompt:

- Personal **workflow habits only**
- Never customer discounts / org rules / quotation corrections
- Skip identity fields present in employee-profile
- Max 3 entries; `confidence < 0.7` → drop
- Empty `entries` if nothing worth remembering

**Write path:** worker → existing `memory_store.append_*` (lock + atomic). Model never Write-tools to disk.

---

## Non-blocking guarantee

| Layer | Rule |
|-------|------|
| Stop hook | Must return **0 within ~200ms**; no `subprocess.wait` on thinking |
| Spawn | Detached: Windows `CREATE_NEW_PROCESS_GROUP` / `start /B` / `pythonw` or `Popen(..., start_new_session=True)` |
| Next chat | New session must not wait on worker; status file is advisory only |
| Gate chain | Memory hook still **before** `subagent-gate.sh` but only enqueues job |

**Heuristic fallback (optional, recommended):** if spawn fails or no API key, worker may fall back to P4 keyword extract **inside worker only** (still async). Sync path never runs thinking.

---

## Channel for minimax-m3-thinking (spike in P5a)

Preferred order (pick one in research spike, persist choice):

1. **Direct API** from worker using existing settings `ANTHROPIC_*` / MiniMax env in `settings.json` — simplest for headless
2. **CLI one-shot** if a non-interactive `claude -p` / CCB entry exists with model override
3. **Avoid** opening a full ACP session (would fight “no UI bubble” and cost)

Spike output: `research/thinking-channel-spike.md` with chosen path + sample latency.

---

## UI placement (minimal)

- Chat chrome: thin banner above input or session header chip
- Copy (zh): `Agent 正在学习记录您的习惯`
- Copy (en): `Agent is learning your preferences`
- No settings page, no memory editor in this phase

---

## Test records (required)

All automated + manual runs append to:

```
.trellis/tasks/07-06-ccb-memory-auto-accumulation/test-records/
  README.md
  unit-YYYYMMDD.md
  integration-YYYYMMDD.md
  ui-smoke-YYYYMMDD.md
```

And mirror one-line gates in `check.jsonl`.

See `test-records/README.md`.
