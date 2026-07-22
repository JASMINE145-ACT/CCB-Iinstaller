# Execution Plan — `07-21-quotation-relay-stale-fix`

| Field | Value |
|-------|--------|
| **Status** | draft |
| **Scenario** | A (with C-flavored verification) |
| **Plan depth** | Standard |
| **Verification profile** | Standard |
| **Active phase** | P0 |
| **Repos** | claude-code-best |
| **Spec entry** | `.trellis/spec/integration/agents-unified-model.md` · `.trellis/spec/backend/quotation-matching-engine.md` · `.trellis/spec/agent-eval/index.md` |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec injection | `trellis-before-dev` (Read SKILL → get_context) | available | inline spec read |
| TDD scaffold | `superpowers:test-driven-development` | available | pytest-first inline |
| Eval case | `Agent: trellis-implement` + eval harness | available | inline JSON edit + `agent-eval.mjs confirm` |
| Hook scaffold | `Agent: trellis-implement` (shell script) | available | inline copy-paste of `post-match-knowledge-nudge.py` template |
| Review | `Agent: code-reviewer` | available | inline diff review |
| Verify | `trellis-check` | available | inline pytest + `agent-eval.mjs run` |
| Update spec | `trellis-update-spec` | available | inline edit + `git diff` |

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Activate task | `python ./.trellis/scripts/task.py start .trellis/tasks/07-21-quotation-relay-stale-fix` | in_progress |
| Read spec indexes | `trellis-before-dev` (Read SKILL.md → `get_context.py --mode packages`) | spec paths: `agents-unified-model.md` § Quotation, `quotation-matching-engine.md` § 9, `agent-eval/index.md` § 3 |
| Read sibling templates | `Read: .agent-eval/cases/quotation-direct50-price-stock.json` + `Read: ccb-installer/config/skills/ccb-subagent-gate/scripts/post-match-knowledge-nudge.py` | reference structure |

## Contract map (Standard depth)

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk if broken |
|----------|-------------------|--------------|----------------------|----------------|
| `WANd.QUOTE.SEED.SYNC.001` | `staging/seed/agents/quotation-agent.md` ≡ `packages/vertical/.../quotation-agent.md` (byte + sha256) | `ccb-installer/staging/seed/agents/quotation-agent.md` + `ccb-installer/scripts/deploy-seed-agents.ps1` + `.mjs` | PowerShell `Get-FileHash` diff; new pytest `test_seed_sync.py` | user install 拿到旧 L1,sub-agent 仍产出 BAD 形态 |
| `WANd.EVAL.CASE.PRICE_ONLY.001` | 新 eval case 锁定 price-only 路径,禁止 `inventory.query` 工具,强制 assistant.text 含锁码 | `.agent-eval/cases/quotation-direct50-price-only.json` | `node agent-eval-plugin/scripts/agent-eval.mjs confirm` + 1-trial mock run | 价格-only 路径无回归保护,下次 BAD 形态逃过 |
| `WANd.QUOTE.RELAY.GUARD.001` | select-ok 后 sub-agent 必须引用锁码;nudge-only,off by default | `ccb-installer/config/skills/ccb-subagent-gate/scripts/post-quotation-relay-nudge.py` + `modes.json` `quotation-agent:relay-guard: off` | pytest `test_post_quotation_relay_nudge.py`(mock select-ok payload) | sub-agent 再写 BAD 形态时无 nudge 提醒,rely on LLM 自觉 |
| `WANd.QUOTE.ORCH.RELAY.STRICT.001` | 父代理对查询类结果必须原样转述至少一个锁码 | `.trellis/spec/integration/agents-unified-model.md` § `WANd.ORCH.OUTCOME_RELAY.001` 加严 | manual review of `wande-orchestrator.md` L1 段 + 现有 Stop hook 行为(已是 `block`) | 父代理再次误读子代理的 BAD 文本为「待继续确认」 |

## Phase 1 — Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|-------|
| 1 | P0 | **A — sync install seed** | `WANd.QUOTE.SEED.SYNC.001` | migration | inline PowerShell `Copy-Item -Force` + `Get-FileHash` | `ccb-installer/staging/seed/agents/quotation-agent.md` | 字节 + SHA256 一致;新 pytest `test_seed_sync.py` PASS | Standard | 防止 deploy seed 漂移;后续可加 pre-commit / pre-deploy check |
| 2 | P1 | **B — eval case `price-only`** | `WANd.EVAL.CASE.PRICE_ONLY.001` | — | inline JSON edit + `agent-eval.mjs confirm` | `.agent-eval/cases/quotation-direct50-price-only.json` | case locked,1-trial mock run PASS | Standard | 模板: `.agent-eval/cases/quotation-direct50-price-stock.json` |
| 3 | P1 | **C — PostToolUse relay nudge** | `WANd.QUOTE.RELAY.GUARD.001` | ui | `Agent: trellis-implement`(TDD first)→ python copy | `ccb-installer/config/skills/ccb-subagent-gate/scripts/post-quotation-relay-nudge.py` + `__tests__/test_post_quotation_relay_nudge.py` + `modes.json` | RED 失败测试 → GREEN 实现 → pytest 全绿;`modes.json` `quotation-agent:relay-guard: off` | Standard | dedupe 45s session key,沿用 `post-match-knowledge-nudge.py` 模板 |
| 4 | P1 | **D — spec update** | `WANd.QUOTE.ORCH.RELAY.STRICT.001` | ui | `Skill: trellis-update-spec` (Read SKILL → 落 spec) | `.trellis/spec/integration/agents-unified-model.md` § Quotation multi-candidate + `agent-runtime-registry.yml` 注册 4 个新 contract | spec 行内引用 + registry 4 行 | Standard | 留 promote 钩:provisional `WANd.X.Y.001` 走完 eval 后升 perm |
| 5 | P0 | **E — re-eval regression** | (verification only) | — | `node agent-eval-plugin/scripts/agent-eval.mjs run` × 2 cases | `.agent-eval/runs/07-21-verify-*/` | 现有 `direct50-price-stock` 0/3 不下降(本 task 不修 LLM 选型);新 `price-only` case 1 trial PASS | Standard | 不能绿 P0/AC7:回滚 workstream B 候选阈值;不能绿 P0/AC3/4:回滚 workstream B 拼写 |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| A — sync seed | `WANd.QUOTE.SEED.SYNC.001` | `pytest test_seed_sync.py::test_staging_matches_source` → 期望两个文件 SHA256 相等;新加前 `staging` 7/18 旧版会 FAIL | `python -m pytest ccb-installer/config/skills/ccb-subagent-gate/scripts/__tests__/test_seed_sync.py -q` | 同 GREEN 命令通过 |
| B — eval case | `WANd.EVAL.CASE.PRICE_ONLY.001` | `agent-eval.mjs run --case-file ... --trials 1 --runner-path mock` → mock 候选无 `8020020755` 时 `tool_forbidden: inventory.query` PASS 但 `tool_args: select.candidates ⊇ 8020020755` FAIL | `node agent-eval-plugin/scripts/agent-eval.mjs confirm --case-file .agent-eval/cases/quotation-direct50-price-only.json --confirmed` + `node agent-eval-plugin/scripts/agent-eval.mjs run --case-file ... --trials 1` | `quotation-direct50-price-stock` 同步 run 不下降 |
| C — relay nudge | `WANd.QUOTE.RELAY.GUARD.001` | `pytest test_post_quotation_relay_nudge.py::test_emits_nudge_when_select_ok_no_code_in_text` → 期望 stdout 出现 nudge 文本;无实现时无输出 FAIL | `python -m pytest ccb-installer/config/skills/ccb-subagent-gate/scripts/__tests__/test_post_quotation_relay_nudge.py -q` | 同 GREEN |
| D — spec | `WANd.QUOTE.ORCH.RELAY.STRICT.001` | `git diff --stat .trellis/spec/integration/agents-unified-model.md` → 期望非空;无 diff 时检查脚本 FAIL | `git diff --stat .trellis/spec/integration/agents-unified-model.md` | `pytest` 跑过 `test_eval_golden_text_match`(若有)/ `agent-eval` re-eval 不退化 |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.QUOTE.SEED.SYNC.001` | `pytest test_seed_sync.py` + `Get-FileHash` 两文件比对 | pytest 全绿 + 双哈希相等(贴在 Progress snapshot) | pending |
| `WANd.EVAL.CASE.PRICE_ONLY.001` | `agent-eval.mjs confirm` + `--trials 1` | `report.md` `Verdict: PASS` 或 `NEEDS_REVIEW` 0 hard fail;`case_hash` 锁定 | pending |
| `WANd.QUOTE.RELAY.GUARD.001` | `pytest test_post_quotation_relay_nudge.py` | 全绿,包含至少 1 个 select-ok + 缺码文本的 mock case | pending |
| `WANd.QUOTE.ORCH.RELAY.STRICT.001` | `git diff --stat .trellis/spec/integration/agents-unified-model.md` + `agent-runtime-registry.yml` 4 行新增 | diff 非空;registry 4 行存在;`yq`/jq 解析合法 | pending |

## Verification profile and gate

**Selected:** Standard

1. **Contract Verification** — 4 个 contract 各跑对应命令;evidence 行贴 Progress snapshot。
2. `code-reviewer` agent — 复核 hook / case JSON / spec 改动。
3. `trellis-update-spec` — `.trellis/spec/integration/agents-unified-model.md` + `agent-runtime-registry.yml`。
4. `implement.jsonl` + `check.jsonl` + prd AC `[x]` 7 条。
5. `git commit` — **仅当用户明确要求**。
6. `/trellis:finish-work` — Phase 5 跑完后再走。

## Manual steps (human)

- [ ] 不需要(本 task 不动 AionUI/ Guid 客户端 UI;Guid 手测不在 scope)

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| staging ↔ source 仍 drift(可能 build 流程覆盖 staging) | Phase 1 / Workstream A | 调查 ccb-installer scripts 的 build flow 是否反向同步 source → staging;若需,改 build script | 若行为变化 → yes;若只增 sync check → no |
| 新 eval case 1-trial mock run FAIL 持续 | Phase 2 / Workstream B | 检查 grader `tool_args` / `tool_forbidden` 路径;`resolveEvidenceExpression` 是否覆盖 `select_quotation_candidates` 的 candidates 字段 | 若改 contract → yes |
| Hook nudge 触发频次过多(session spam) | Phase 3 / Workstream C | 验证 dedupe 45s 是否生效;若仍 spam,改 session key(并入 assistant.text hash) | 若改行为 → yes |
| Orchestrator 仍误读子代理 BAD 输出 | Phase 4 / Workstream D | 这属于 LLM 行为,不在 L1 文本能完全修的范围;退而求其次:加 explicit "禁止" 段(已在 PRD 里),手动跑 1 轮验证 | 若改 contract → yes |
| 现有 `direct50-price-stock` 回归退化 | Phase 5 / Workstream E | 已知该 case 在 eval 上 flaky(7 月 19 日多次 0/3),本 task **不承诺**修复;若退化明确,先回滚 workstream B case(它是新增不应影响旧) | 若旧 case verdict 从 NEEDS_REVIEW 变 FAIL 持续 3 次 → yes |

## Defer / out of scope

- 改 `select_quotation_candidates` 内部 LLM 选型(选型 API 已有 closeout,`07-19-selection-api-and-evidence-harness`)。
- 改 `wande-orchestrator` L1 实质内容(spec 引用 + L1 段强化 + Stop hook 已有)。
- 修 `direct50-price-stock` 旧 case 的 flaky 行为(非本 task 范围)。
- AionUI 端 UI 验证(Guid 手测 waive)。
- 父代理 Stop hook `wande-orchestrator:outcome-relay` 行为改动(已 `block`,work as is)。

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 — activate & read | done | task.json status=draft→in_progress; prd.md + execution-plan.md + implement.jsonl + check.jsonl on disk; linked as child of `07-19-quotation-agent-prompt` |
| P1 — sync seed | done | `cp -f packages/.../quotation-agent.md staging/seed/.../quotation-agent.md`; SHA `bdaeaabf086a` both sides; new `tests/test_seed_sync.py` 5/5 PASS (scans all 5 paired agents); RED→GREEN cycle verified |
| P2 — eval case price-only | done | `.agent-eval/cases/quotation-direct50-price-only.json` locked (`case_hash: sha256:32d0e11320cd4ff5154656b7e89da49cf47ecb4c61424ed804fb2618763b3794`); 6 hard graders + soft rubric; new `test/quotation-direct50-price-only.test.mjs` 3/3 PASS; full eval suite 71/71 PASS no regression |
| P3 — relay nudge hook | done | `scripts/post-quotation-relay-nudge.py` (UTF-8 stdout, ACP $text/content/rawOutput envelope unwrap, 45s session dedupe, locked-code + L1 GOOD/BAD context); `tests/test_post_quotation_relay_nudge.py` 11/11 PASS standalone + repeated; `modes.json` `quotation-agent:relay-guard: off`; full ccb-subagent-gate test suite 71/71 PASS no regression |
| P4 — spec update | done | `agents-unified-model.md` +148/-39 lines: § Paired L1 source↔install seed must stay byte-equal (WANd.AGENT.SEED.SYNC.001); § Quotation price-only path (WANd.EVAL.CASE.PRICE_ONLY.001); § Orchestrator relay strict (WANd.QUOTE.ORCH.RELAY.STRICT.001); post-quotation-relay-nudge hook added to Selection+knowledge hook table. `agent-runtime-registry.yml` +4 new contract rows (40 total). `git diff --stat` non-empty. |
| P5 — re-eval regression | done | 71/71 agent-eval test suite PASS (no regression vs baseline 71); 71/71 ccb-subagent-gate pytest PASS (no regression); 5/5 seed_sync PASS. No case verdict changed. AC7 satisfied. |
| P6 — closeout review gaps | done | **L1 wiring gap fixed:** `post-quotation-relay-nudge.py` added to packages + staging `quotation-agent.md` PostToolUse; `test_quotation_agent_wires_relay_nudge_hook` added; SKILL + spec clarify `:relay-guard: off` ≠ disable PostToolUse. Deploy + pytest still need human terminal (Agent Shell hung). |
