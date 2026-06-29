# ROE Slim Universal — Merge & Simplify (Direction B)

## Goal

Collapse **quotation-roe (#19)** and **Gate-J (#22)** into **one universal Stop gate**
that fires **only on `end_turn`** (model believes work is done). Clarification and
in-flight tool work are normal stops — do not block.

Parent: `.trellis/tasks/06-27-result-oriented-execution/`  
Supersedes complexity from: `archive/2026-06/06-28-roe-semantic-judge-l2-mvp`

## Problem (2026-06-29)

1. **Dual gates** — `quotation-roe.sh` + `generic-roe-judge.sh` overlap; quotation
   runs both on every Stop.
2. **Recheck loop** — User「查价+填报价单」→ model calls `match_quotation` /
   `search_inventory` → `end_turn` → ROE block → auto-continue → model **re-runs
   lookup** instead of `fill_quotation_sheet` → UI looks frozen.
3. **Over-rules** — N/K table, thin_executable, promise heuristics block/warn too
   often; not aligned with「只在自认为做完时检查」.
4. **REJECT shape** — Missing **Already done** summary → model repeats completed steps.

## Design decisions (locked)

| Item | Decision | Rationale |
|------|----------|-----------|
| Architecture | **B** — one `generic-roe-judge` + agent profiles | Remove duplicate quotation-roe path |
| Trigger | **end_turn only** | Tools mid-turn and ask-user are normal |
| Core block rule | **Write intent + no L2 write success** | Covers「只查不填」; read MCP ≠ L2 |
| N/K row check | **warn-only or remove** | Too many false blocks |
| `assistant_text` in REJECT | **Remove** | Maker re-reads own output |
| Checklist rubric | **Remove** | Single ACTION instruction |
| **Already done** | **Add** — L2 gate stays window-scoped; **Already done scans full transcript** | Prior-turn lookup survives two-turn「查价→填表」isolation |
| Judge API | **None** | In-process continue + structured REJECT |
| `quotation-agent:roe` | **off** | Logic merged into `:roe-judge` + profile |
| `:roe-judge` mode | **block** (keep) | After REJECT fix ships |

## Write intent — write-anchor window (locked 2026-06-29)

**Not** a sidecar store. **Transcript-derived semi-persistent anchor:**

```
User₁「查价+填表」 ──► Assistant/tools ──► auto-continue (no new user)
         │                                      │
         └──────── write anchor ────────────────┘
              (still User₁ until User₂ with new write intent)
```

| Method | Decision |
|--------|----------|
| Write intent detection | **User original text keywords** (`has_write_intent` regex + profile); NOT assistant promise as primary |
| Window | **`extract_write_anchor_window`** — scan transcript for **most recent write-intent user message** → end; NOT last-user-only (Gate-J old bug) |
| Hook REJECT lines | **Exclude** from user scan (`REJECT:` / `[ROE-GATE` prefix) so continue rounds do not lose write anchor |
| Auto-continue | Anchor stable → `has_write_intent` stays true → L2 checked across full window |

**Normative pass/block tree @ end_turn:**

```
extract_write_anchor_window
  ├─ clarification(last_assistant) → PASS
  ├─ NOT has_write_intent(anchor) → PASS (readonly / out of scope)
  ├─ has_l2_write_success(window, profile markers) → PASS
  ├─ block_count ≥ max_blocks → PASS (escalate)
  └─ else → BLOCK (write_no_l2) + Already done + ACTION
```

N/K coverage: **warn log only** — never block.

## Transcript parse precision (locked 2026-06-29)

| # | Rule | Implementation |
|---|------|----------------|
| 1 | L2 pass = **tool success**, not called | `has_l2_write_success_in_window` + JSON `error` field / `is_error` |
| 2 | REJECT: **Already done** vs **Prior attempt (failed)** | `build_already_done_partitioned` + `find_latest_l2_failure_in_window` |
| 3 | Already done **accumulates** full transcript | prior turns + this turn (includes multi-continue in same anchor) |

**REJECT v4 shape:**

```
Already done (prior turns — do NOT repeat):
  - mcp__quotation__match_quotation
Already done (this turn — do NOT repeat):
  - mcp__quotation__search_inventory
Prior attempt (failed — fix and retry):
  - fill_quotation_sheet -> FAILED: file_path is required
ACTION:
- Retry fill_quotation_sheet with corrected parameters. Prior failure: ...
```

## Two-turn isolation + cross-turn Already done (locked 2026-06-29)

```
Turn 1: User「帮我查价」
  → write-anchor = 查价, no write intent → PASS

Turn 2: User「填表」
  → write-anchor = 填表 (new anchor)
  → write intent → L2 checked **only in Turn 2 window**
  → no fill_quotation_sheet → BLOCK
```

| Scope | Rule |
|-------|------|
| L2 pass/block | **Write-anchor window only** (turns isolated) |
| Already done | **Full transcript** — partition into `prior turns` vs `this turn` |
| REJECT on Turn 2 block | Must list Turn 1 `match_quotation` under **prior turns** so model does not re-lookup |

## Architecture (target)

```
end_turn → subagent-gate.sh
              → generic-roe-judge.sh
              → parse_transcript_roe_judge.py + profile
                    │
         PASS ←─────┼─────→ BLOCK
    · clarification      · write intent, no L2
    · readonly           · (optional N/K → warn log only)
    · L2 write OK
              │
              ▼
    REJECT: [ROE-GATE n/max]
            GAPS
            User request (1 line)
            Already done (successful tools — do not repeat)
            ACTION (profile execute hint, e.g. fill_quotation_sheet)
              → exit 2 → CCB auto-continue
```

## L2 write tools (quotation profile)

`fill_quotation_sheet`, `edit_excel`, `mcp__excel__write*` with non-error result in
intent window. **Not L2:** `match_quotation`, `search_inventory`, Read, etc.

## Deliverables

| # | Item |
|---|------|
| D1 | `subagent-gate.sh` — remove `quotation-roe.sh` call for quotation-agent |
| D2 | `modes.json` — `quotation-agent:roe: off`; keep `{agent}:roe-judge: block` |
| D3 | Merge write-intent / L2 / clarification from `parse_transcript_roe.py` into `parse_transcript_roe_judge.py` |
| D4 | `build_already_done_partitioned()` — full transcript; prior turns vs this window |
| D5 | REJECT template: GAPS → User → Already done → ACTION |
| D6 | `roe-judge-profiles/quotation-agent.json` — L2 markers + execute hint |
| D7 | Fixture + test: 「查+填」with read tools only → block, ACTION names fill, Already done lists read tools |
| D8 | `test_roe_gate.py` — migrate or retire if quotation-roe removed |
| D9 | Deploy + `smoke-roe-judge-deploy.ps1` / combined smoke |
| D10 | Spec: `agents-unified-model.md` — single § ROE; `internal-update.md` §12.9 #19/#22 |
| D11 | `test_roe_judge_realistic.py` — 8 real-world scenarios (two-turn, continue, L2 fail/retry) |
| D12 | REJECT v4: Prior attempt (failed L2) + Retry ACTION; L2 success JSON heuristic |

## Out of scope

- External LLM judge in Stop hook
- AionUI / `claude-code-B` changes
- Office-agent-specific semantic rules beyond default execute hint
- Re-enabling N/K as block without eval

## Acceptance

- [x] Two-turn「查价」then「填表」: Turn 2 block lists Turn 1 lookup under **prior turns** Already done
- [x] Pure price lookup → pass (readonly)
- [x] Clarification A/B/C → pass
- [x] `quotation-roe.sh` not invoked from `subagent-gate.sh`
- [x] All Stop-hook agents still use single `:roe-judge` path
- [x] L2 pass requires tool **success** (not called); failed fill → block + Prior attempt
- [x] Multi-continue Already done accumulates in **this turn** section
- [x] `test_roe_judge_gate.py` + `test_roe_judge_realistic.py` + smoke PASS
- [x] Spec updated; 1.1.3 checklist #19 merged into #22 slim

## Risks

| Risk | Mitigation |
|------|------------|
| Write-intent regex false positive on「报价单」in read-only ask | Keep readonly patterns; quotation profile tuning |
| Removing quotation-roe regresses edit-order promise cases | Port step 6 promise rule into universal engine if needed |
| block + bad ACTION still loops | Already done + escalate at 5 blocks |

## Test plan

```powershell
python ccb-installer/config/skills/ccb-subagent-gate/tests/test_roe_judge_gate.py
python ccb-installer/config/skills/ccb-subagent-gate/tests/test_roe_judge_realistic.py
python ccb-installer/config/skills/ccb-subagent-gate/tests/test_roe_gate.py
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\smoke-roe-judge-deploy.ps1
# Manual: Guid 万鼎报价专家 — two-turn 查价 then 填表; single-message 查+填
```
