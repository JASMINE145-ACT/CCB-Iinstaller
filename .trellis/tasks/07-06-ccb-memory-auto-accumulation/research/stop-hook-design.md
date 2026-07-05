# Stop hook design — personal memory auto-inject (1.1.7)

**Task:** `07-06-ccb-memory-auto-accumulation`  
**Date:** 2026-07-06  
**User decisions:** personal only · Stop/SubagentStop inject · 1.1.7 · hook if more stable

---

## Why Stop hook (vs prompt-only)

| Approach | Stability | Notes |
|----------|-----------|-------|
| L1 prompt「记得写入 memory」 | Low | Model skips under time pressure |
| PreToolUse gate | Wrong event | Blocks tools mid-turn, not end-of-task |
| **Stop / SubagentStop hook** | **High** | Runs every conversation/task end; can **deterministically append** or block until written |

Existing pattern: `ccb-subagent-gate` → `subagent-gate.sh` on Stop/SubagentStop (`quotation-agent`, office creators, etc.). **Reuse same hook_event plumbing.**

---

## Recommended architecture (stable path)

### Two-layer (MVP)

1. **Deterministic hook append (primary)** — Python reads transcript JSONL:
   - Extract **user** turns matching personal-preference heuristics
   - Skip if no new signal vs existing `memory/personal/workflow.md` / `profile.md` (line dedup)
   - Append `- [YYYY-MM-DD] …` directly to file (UTF-8, no BOM)
   - Log to `.claude/logs/personal-memory-stop.log`

2. **Optional block (orchestrator only, phase 1b)** — If high-confidence signal but write failed (IO error): `exit 2` + short reason (same pattern as `:roe-judge`)

**Do not** rely on model Write at Stop for MVP — hook owns the file append.

### Heuristic signals (personal only)

| Signal | Target file |
|--------|-------------|
| 工作流/习惯/惯例/我习惯/以后都/默认先 | `personal/workflow.md` |
| 我是…/我的角色/叫我/部门 | `personal/profile.md` |
| 用户明确「记住这个偏好」（非业务报价规则） | `workflow.md` or `/记住` overlap |

**Exclude (out of scope personal MVP):**

- 报价纠偏、客户口径、折扣 → **not written by this hook** (future business phase or manual `/记住`)
- `append_business_rule` / org KB paths

---

## Hook placement

| Agent | Events | Rationale |
|-------|--------|-----------|
| `wande-orchestrator` | **Stop** | Main Guid entry; captures routing + personal prefs |
| `quotation-agent` | **SubagentStop** | User may state prefs during quote session |
| `accurate-agent` | **SubagentStop** | Same |
| Office creators | **defer** | Low personal-memory value in 1.1.7 |

Implementation: add second Stop hook entry **or** chain inside `subagent-gate.sh` tail:

```yaml
hooks:
  Stop:
    - hooks:
        - type: command
          command: python ".../post-personal-memory-stop.py"
          timeout: 30
        - type: command
          command: bash ".../subagent-gate.sh"   # existing agents only
          timeout: 120
```

`wande-orchestrator`: **memory hook only** (no subagent-gate today).

New script: `ccb-installer/config/skills/ccb-personal-memory/scripts/post-personal-memory-stop.py`

---

## Install / seed (1.1.7)

```
%LOCALAPPDATA%\CCB-Wanding\.claude\memory\
├── MEMORY.md
└── personal/
    ├── profile.md      ← template + 引导
    └── workflow.md
```

- **No** `business/` seed in 1.1.7 MVP (personal only)
- `ensure-wanding-settings.ps1` + `resources/memory/personal/*`
- CLAUDE.md: slim `CCB-MEMORY-RULES` — personal read triggers + pointer to Stop auto-inject
- `/记住` command → **personal paths only** in 1.1.7

---

## Idempotency & dedup

1. Normalize text (strip, lower case for compare)
2. Reject if same bullet text already in target file
3. Reject if transcript already contains successful `Write` to same path with same content (avoid double append hook + model)
4. Max 3 appends per Stop (anti-spam)

---

## TDD contract

| Test | Input | Expect |
|------|-------|--------|
| No signal | transcript without prefs | exit 0, no file change |
| Workflow signal | user「我习惯先查库存」 | append to workflow.md |
| Dedup | same line exists | exit 0, no duplicate |
| Already Write | transcript has Write to workflow | hook skip append |
| SubagentStop | agent_transcript_path set | same logic on sub transcript |

Fixtures: `ccb-personal-memory/tests/fixtures/transcripts/*.jsonl`

---

## Packaging

- **Target release:** `1.1.7` (not 1.1.6)
- Ship via: `deploy-ccb-skills` new skill + `patch-personal-memory-hooks.ps1` (or extend `patch-subagent-gate-hooks.ps1`)
- `config_generation` bump on upgrade
- `dev-test-checklist-1.1.7.md` item: personal memory Stop smoke

---

## Risks

| Risk | Mitigation |
|------|------------|
| False-positive append | Conservative heuristics; log every append |
| Hook timeout (120s gate already heavy) | Memory hook **30s**, runs first, lightweight |
| GBK paths on Windows | UTF-8 no BOM; use `%LOCALAPPDATA%` paths |
| Multi-hook ordering | Memory append before subagent-gate block validators |

---

## References

- `ccb-subagent-gate/scripts/subagent-gate.sh` — Stop event parsing
- `pre-match-knowledge-gate.py` — transcript parse pattern
- `docs/memory系统改造.md` — original design (business deferred)
