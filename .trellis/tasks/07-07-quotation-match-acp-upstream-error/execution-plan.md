# Execution Plan — `07-07-quotation-match-acp-upstream-error`

| Field | Value |
|-------|--------|
| **Status** | `in_progress` (Track B P5 **done** — manual smoke pending) |
| **Scenario** | **C** (Bug 修复) + **D-lite** (P5 shared lib serial) |
| **Plan depth** | **Full** |
| **Verification profile** | **Standard** (hook parity) + **UI** (manual smoke) |
| **Repos** | `claude-code-best` only (`ccb-installer/config/skills/ccb-subagent-gate`) |
| **Active phase** | **P7 spec** — manual smoke pending |

**PRD:** [`prd.md`](./prd.md)  
**Prior work:** [`p2-knowledge-read-gate-fix.md`](./p2-knowledge-read-gate-fix.md) (quotation — deployed, manual smoke pending)  
**Audit:** [`research/hook-transcript-parity-audit.md`](./research/hook-transcript-parity-audit.md)

---

## Scope split (this plan revision)

| Track | Phases | Status |
|-------|--------|--------|
| **A** — ACP -32603 upstream | P0–P3 | P2 upstream **blocked** (no repro log) |
| **B** — Hook transcript parity | **P4–P7** | **this plan** — explore → fix → test records |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | `trellis-before-dev` → `integration/agents-unified-model.md` | available | § Knowledge Read + price-library hooks |
| Explore / audit | main session + `research/*.md` | available | done → `hook-transcript-parity-audit.md` |
| TDD | Python unittest in `ccb-subagent-gate/tests/` | available | inline RED→GREEN |
| Implement | `trellis-implement` or inline | available | minimal diff mirror knowledge gate |
| Review | `code-reviewer` | available | `trellis-check` |
| Deploy dev | `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents -ForceMd` | available | manual robocopy staging |
| UI smoke | manual Guid / 价格库 | available | user |

---

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| Activate | `python ./.trellis/scripts/task.py start 07-07-quotation-match-acp-upstream-error` | `in_progress` |
| Read spec | `agents-unified-model.md` § Subagent delivery gate, Knowledge Read, price-library | paths noted |
| Read audit | `research/hook-transcript-parity-audit.md` | P0 target confirmed |

---

## Phase 1…N — Workstreams (Track B — hook parity)

| Phase | P | Workstream | Risk | Tool | Files | Required output | Profile |
|-------|---|------------|------|------|-------|-----------------|---------|
| **P4** | P0 | **Explore + test record scaffold** | concurrency | audit (done) + doc | `research/hook-transcript-parity-audit.md`, `test-records/hook-parity-matrix.md` | Matrix: hook × subagent × deny/nudge; gap list signed off | Standard |
| **P5A** | P0 | **Shared lib `hook_transcript.py`** | concurrency | TDD first | `scripts/lib/hook_transcript.py`; refactor `parse_transcript_knowledge_gate.py` imports | `derive_agent_transcript_path`, `resolve_hook_transcript_paths`, generic session flag helpers | Standard |
| **P5B** | P0 | **data.Md gate parity** | concurrency, packaging | mirror P2 knowledge | `parse_transcript_data_md_gate.py`, `pre-price-library-data-md-gate.py`, **NEW** `post-data-md-read-mark.py`, `price-library-agent.md` | PreToolUse passes after Read in subagent + flag race | Standard |
| **P5C** | P0 | **Tests + fixtures** | — | TDD | `test_price_library_data_md_gate.py` (+3 tests: subagent derive, session flag, pre-gate subprocess) | **≥20** total gate tests PASS | Standard |
| **P6** | P1 | **Optional: tiers PreToolUse** | ui | policy decision | `pre-get-price-tiers-data-md-gate.py` OR defer | Spec note if deferred | UI |
| **P7** | P2 | **Spec + backlog + deploy** | packaging | `trellis-update-spec` | `agents-unified-model.md`, `ccb-subagent-gate/SKILL.md`, `packaging-backlog-1.1.6.md`, staging seed sync | deploy scripts run; check.jsonl row | Release |

### P5B detail — mirror knowledge gate exactly

```
Read(data.Md) success
  → PostToolUse post-data-md-read-mark.py → session flag
  → PreToolUse pre-price-library-data-md-gate.py
       → flag OR parent+derived subagent jsonl
  → upsert / apply allowed
```

**Agent wiring:** `price-library-agent.md` frontmatter PostToolUse matcher `Read|read_file` (same as quotation).

---

## TDD contract

| Workstream | Level | RED evidence | GREEN command | Regression |
|------------|-------|--------------|---------------|------------|
| P5A shared lib | unit | import cycle / derive path test fails before lib | `python -m unittest discover -s ccb-installer/config/skills/ccb-subagent-gate/tests -p "test_*gate*.py" -q` | knowledge gate 17/17 still PASS |
| P5B data.Md subagent | unit | `test_derives_agent_transcript_for_data_md` fails pre-fix | same discover | upsert deny after Read in agent jsonl |
| P5B session flag | unit | `test_allows_upsert_after_session_flag` fails pre-fix | same | flush race covered |
| P5B subprocess | integration | pre-gate deny then mark then allow | subprocess like `test_allows_match_after_session_flag` | end-to-end hook stdin |
| P5C knowledge refactor | unit | no regression | 17/17 knowledge + new data.Md tests | quotation manual smoke still valid |

**Test record artifact:** [`test-records/hook-parity-matrix.md`](./test-records/hook-parity-matrix.md) — fill after GREEN with command output + counts.

---

## Verification profile and gate

**Selected:** **Standard** (primary) + **UI** manual for price-library path

1. **code-reviewer** — after P5 complete (before test-agent if user rule applies)
2. Evidence:
   - `python -m unittest discover -s ccb-installer/config/skills/ccb-subagent-gate/tests -q` → all PASS (record count in `hook-parity-matrix.md`)
   - `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd`
   - staging seed robocopy parity (packaging 1.1.6)
3. `trellis-update-spec` → `agents-unified-model.md` data.Md gate row + `dev-sync-playbook.md` hook deploy note
4. `implement.jsonl` + `check.jsonl` + test-records updated
5. **`/trellis:finish-work`** — only when Track A AC met OR explicitly split task; Track B can close as milestone

### Manual steps (human)

- [ ] **Quotation** (Track A/B): 新会话 → `查询直接50价格` → Read once → match OK (knowledge gate)
- [ ] **Price library** (Track B): price_admin → Read `data.Md` → upsert → no deny loop
- [ ] **Delegation** (optional): orchestrator → `Agent(price-library-agent)` → same Read→upsert path

---

## Parallelization

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A | P5A shared lib | **first** — others import |
| B | P5B data.Md hooks | after A lands |
| C | P5C tests | with B, same files — **single agent recommended** |

**Do not** parallel-edit `parse_transcript_knowledge_gate.py` and `hook_transcript.py` extraction.

---

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| Knowledge gate regression after refactor | P5A | failing test name + log | No |
| price-library deny still loops after fix | P4 re-audit hook stdin | transcript paths from live session | No |
| Product wants tiers PreToolUse deny | P6 | PRD AC add | **Yes** |
| Shared lib too large for 1.1.6 | defer P5A to minimal duplicate | note in backlog | **Yes** if ship date pressure |

---

## Defer / out of scope

- Track A -32603 until user provides failing upstream log
- ROE / office Stop validators (already SubagentStop-safe)
- `get_product_price_tiers` PreToolUse — **P6 optional**, default defer unless user requires hard deny

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| Plan rev.1 | approved | ACP debug P0–P1 |
| P2 knowledge gate | **done** | 17/17; [`p2-knowledge-read-gate-fix.md`](./p2-knowledge-read-gate-fix.md); manual smoke pending |
| P4 explore | **done** | [`research/hook-transcript-parity-audit.md`](./research/hook-transcript-parity-audit.md) |
| P5 fix P0 data.Md | **done** | 24/24; [`p5-data-md-gate-fix.md`](./p5-data-md-gate-fix.md) |
| P5C test records | **done** | [`test-records/hook-parity-matrix.md`](./test-records/hook-parity-matrix.md) |
| Track A P2 upstream | blocked | awaits log |
