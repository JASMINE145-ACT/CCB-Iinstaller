# Execution Plan — `07-14-precipitation-effectiveness`

| Field | Value |
|-------|--------|
| **Status** | **in_progress** — Phase 5+ sequential residual fix (2026-07-15 user: 都记录进去 然后顺序修复) |
| **Approved** | Phase 5–8 backlog approved via「顺序修复」 |
| **Scenario** | **C→A** |
| **Plan depth** | **Standard** |
| **Verification profile** | **Security** + **UI** |
| **Active phase** | **Phase 7** (metrics) — 5–6 code DONE；Mixing smoke pending |
| **Repos** | AionCore hydrate + aionui-src resolve；worker transcript roots |
| **OpenSpec** | `fix-precipitation-missing-session-id` |
| **Risk backlog** | `research/residual-risks-backlog.md` |

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verify；增补 Phase 5 |
| skill-selection | Read: | Scenario C → systematic-debugging ✔；OpenSpec propose ✔；code-reviewer + security |
| trellis-before-dev | Read: | `get_context --mode packages` → frontend + integration layers；`frontend/index.md` Rule 0；`guides/index.md`；`integration/index.md` → `acp-session-flow.md` idle session notes |
| trellis-debug-route | Read: | Scenario C process → research persist |
| systematic-debugging | Read: | `research/missing-session-id-bind.md` — H3 locked（no writer） |
| openspec-propose (prior) | Read:+CLI | change `fix-precipitation-missing-session-id` validate PASS；`openspec list --json` shows change in-progress |
| openspec list | CLI: | companion change + unrelated `fix-price-library-load-hang` noted |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | 原 H1 静默 skip；现 **H3 no-writer** 锁定 |
| Phase 0–4a | **done** | events/chip/30s/PROMOTION；见 `p1-effectiveness-done.md` |
| Phase 4b | **blocked** | 真实 smoke 卡在 `missing_session_id` |
| Phase 5 | **DONE** | hydrate + resolve — `p5-p6-session-bind-transcript-done.md` |
| Phase 6 | **partial** | transcript config roots DONE；R2 stale-empty clear open |
| Phase 7 | pending | cancel vs schedule funnel metrics (R4) |
| Phase 8 | deferred | Inbox UX / LLM loosen **metrics-gated** (R5,R6) |
| plan lint | PASS (re-run after edit) | |

## Verdict (2026-07-15)

**Refined root cause:** ACP UUID 存在 **`acp_session.session_id`**（SessionAssigned 已写），沉淀只读死字段 **`conversation.extra.acp_session_id`（无同步）**。  
Fix order locked in `research/residual-risks-backlog.md`.

---

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| Debug | systematic-debugging | available | research/*.md |
| Design artifacts | openspec-propose | **done** | tasks.md |
| TDD | superpowers:test-driven-development | available | bun test |
| Implement | trellis-implement / openspec-apply | available | inline |
| code-reviewer | Agent: code-reviewer | available | Layer A/B |
| Security | Agent: security-reviewer | available | after bind（session id 脱敏） |
| Verify | trellis-contract-verify | available | Mixing smoke |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.LEARNING.IDLE.001` | debounce→schedule→worker with **real ACP UUID** | schedule + worker | worker tests + Mixing smoke | cross-repo |
| `WANd.LEARNING.FUNNEL.001` | 可观测 skip/schedule；非静默 | events + chip | unit funnel | ui |
| `WANd.LEARNING.SESSION_BIND.001` *(provisional)* | ACP UUID **持久化**到 `extra.acp_session_id`；schedule 多源 resolve | warmup/ACP bridge + `useSessionPrecipitationSchedule` | unit persist + resolve；Mixing chip ≠ stuck missing | ui |
| `WANd.LEARNING.REDACTION.001` | funnel 无 transcript/正文 | events writer | existing unit | security |
| `WANd.LEARNING.PROMOTION.001` | 无 approve 不 promote | decidePrecipitation | 既有负向测 **不得回归** | security |

### Contract card — SESSION_BIND.001

**Behavior protected:** Idle precipitation receives a live ACP agent session UUID when ACP runtime has one.  
**Primary code:** ACP session lifecycle persist into `conversation.extra`; resolve helper before `schedulePrecipitation`.  
**Tests:** bind writer test + resolve fallback test (`bun test` precipitation*).  
**Eval / smoke:** Mixing ACP turn → 30s → chip not solely `missing_session_id`.  
**Risk if broken:** Inbox empty forever；AC5 never greens.

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 5.0 | P0 | 批准本增补；顺序修复 R0→R8 | docs-only | — | user | plan + residual-risks | Status in_progress | Fast |
| 5.1 | P0 | AionCore：GET/list hydrate `acp_session.session_id`→`extra.acp_session_id` | `SESSION_BIND` | cross-repo | TDD | `aionui-conversation` `backfill_extra_inplace` | hydrate GREEN | UI |
| 5.2 | P0 | SessionAssigned 可选落盘 mirror（与 hydrate 一致） | `SESSION_BIND` | — | implement | sync or persist helper | bind durable | UI |
| 5.3 | P0 | Renderer resolve：`acp_session_id` → `sessionKey` → missing | `SESSION_BIND` + `FUNNEL` | ui | implement | `useSessionPrecipitationSchedule.ts` | resolve GREEN | UI |
| 5.4 | P0 | code-reviewer → security-reviewer → bun/cargo regression | 全部 | security | agents | — | PASS | Security |
| 6.1 | P0 | Worker `find_transcript` 尊重 `CLAUDE_CONFIG_DIR` / `--config-dir` | `IDLE` | cross-repo | TDD | `parse_transcript_precipitation.py` | transcript GREEN | UI |
| 6.2 | P0 | Stale UUID：force-warmup 后 hydrate 覆盖；跳过 schedule 旧 id | `SESSION_BIND`+`IDLE` | ui | implement | hydrate + schedule | no stale | UI |
| 6.3 | P1 | 验证 ccb_config/worker_not_found funnel 在真实机仍可辨 | `FUNNEL` | — | smoke | — | notes | UI |
| 7.1 | P1 | Funnel summary：cancel vs scheduled rate（脱敏计数） | `FUNNEL` | ui | implement | summary/chip | rates | UI |
| 8.x | P2 | Inbox 可见性 / LLM 放宽 — **仅当** 7 的 ratios 证明需要 | IDLE efficacy | — | deferred | — | re-approval | UI |
| — | — | OpenSpec apply 对齐 5.x | same | — | openspec-apply | change tasks | checkboxes | — |

**Explicit non-workstreams:** LLM 放宽；personal auto-write；仅加长 late-bind 等待；用 conversationId 冒充 `--session-id`。

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 5.1–5.2 Persist | SESSION_BIND | session/new mock 后 extra 无 id | `bun test` bind/persist 路径（钉死后填） | same |
| 5.3 Resolve | SESSION_BIND/FUNNEL | empty extra + runtime map stub 仍 missing | expect schedule ok；both empty → `missing_session_id` | same |
| Regression | FUNNEL/PROMOTION/REDACTION | — | `bun test tests/unit/ccbPrecipitation*.ts`；`python …/test_precipitation_worker.py` | same |

---

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| FUNNEL | unit + chip after fix | events not stuck on missing-only after bind | pending Phase 5 |
| IDLE | Mixing smoke real ACP UUID | worker log / `scheduled` | pending Phase 5 |
| SESSION_BIND | persist + resolve unit + smoke | research + test + Mixing | pending |
| REDACTION | existing unit | no regress | PASS (hold) |
| PROMOTION |现有负向测 | no regress | PASS (hold) |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-14-precipitation-effectiveness/execution-plan.md` | PASS | pending |

---

## Verification profile and gate

**Selected:** Security + UI

1. RED→GREEN bind/resolve  
2. **code-reviewer PASS** → **security-reviewer PASS**（session id 截断/脱敏）  
3. Regression precipitation + PROMOTION suites  
4. Mixing manual：ACP 回合 → ≥30s idle → chip ≠ solely `missing_session_id`  
5. Update `p1-effectiveness-done.md` / new `p5-session-bind-done.md`  
6. Optional：OpenSpec archive after Trellis evidence  

---

## Parallelization

串行：5.1 → 5.2 → 5.3 → 5.4 → 5.5。OpenSpec tasks.md 勾选项与 Phase 5 同步，**禁止**并行改 LLM。

---

## Manual steps (human)

- [ ] Mixing Org SSO + ACP Guid/chat 一轮有实质内容  
- [ ] 静置 ≥30s  
- [ ] Chip：已调度 / worker skip reason（非永久 `missing_session_id`）  
- [ ] `precipitation_events.jsonl`：`scheduled` 或后续 worker_*；**无**正文  
- [ ] 新建会话 fork 不继承旧 `acp_session_id`

---

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| Write hook 找不到（aioncore 路径） | 5.2 research | document alternate IPC | no if same contract |
| Runtime map 不可用（WebUI） | 5.3 Electron-first；WebUI defer | note scope | yes if claim WebUI |
| 仍 transcript_not_found | Phase 5.5+ new H4 | research | **yes**（新根因） |
| 要求 auto-write / 放宽 LLM | stop | PRD non-goal | **yes** |

---

## Historical phases (done — do not re-open)

见原 Phase 0–4a：`p1-effectiveness-done.md`。Phase 2「修静默」= **可观测**，**不等于** bind 已实现。

## Defer / out of scope

- personal habit auto-write  
- LLM prompt 宽松  
- Stop personal-memory 双轨  
- WebUI-only bind（除非 Electron 先绿）
