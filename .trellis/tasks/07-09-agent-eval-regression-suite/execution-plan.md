# Execution Plan — `07-09-agent-eval-regression-suite`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Approved** | 2026-07-06 — user「来吧」；Phase 2 报价 smoke 6 流程 |
| **Scenario** | A（标准功能，单仓 + 打包脚本触点） |
| **Plan depth** | Full |
| **Verification profile** | Release |
| **Active phase** | P8 quotation-smoke（live pending） |
| **Repos** | claude-code-best only |
| **Spec entry** | `.trellis/spec/integration/agents-unified-model.md` · `wanding-release-standard.md` · `agent-team-architecture.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 激活 + 审计 | done | 本 plan |
| P1 Harness 修复 | done | CCB_TEST_PROFILE + install/config env |
| P2 分层 suite + 入口 | done | eval/suites + --suite |
| P3 打包/发版接入 | done | checklist §0b + backlog Issue 8 + release §6.5 |
| P4 新 case（1.1.6） | done | orchestrator-no-price-library-mcp |
| P5 Schema CI | done | agent-eval-schema.yml |
| P6 门禁 + spec | done | schema 67/67; code-reviewer PASS |
| **P8 Quotation workflow smoke** | done (schema) | 6 cases + multi-turn + LingWei fixture; live pending |

---

## 现状摘要（探索结论）

**好消息：你要的「agent test 大全」骨架已经存在。**

| 资产 | 状态 |
|------|------|
| `eval/agent_eval_cases.jsonl` | **66 cases**（quotation 13 + session 11 + e2e 10 + routing 6 + …） |
| `eval/run-agent-eval.mjs` | schema + live ACP + `pass_if_any` + orchestrator 顶层 forbidden 逻辑 |
| `ccb-installer/test-native-acp-agent.mjs` | 原生 ACP smoke（截图同款：`CCB_TEST_PROFILE` handoff） |
| `eval/scenarios/` | 多步人工 judge 剧本（orchestrator vs direct） |
| spec 引用 | `agents-unified-model.md` § Agent eval regression contract |

**关键缺口（不修则「大全」跑不准）：**

| ID | 问题 | 影响 |
|----|------|------|
| **H1** | Runner 设 `CCB_TEST_AGENT_ID`，smoke 读 `CCB_TEST_PROFILE` | live eval **可能未切换 agent**，routing case 假阳/假阴 |
| **H2** | `test-native-acp-agent.mjs` 硬编码 `D:\CCB-Wanding` | dev/CI 机器路径不一致即失败 |
| **H3** | 无分层 suite；66 条 live ≈ **数小时** | 无法作为打包前常规门禁 |
| **H4** | 未进 `wanding-release-standard` / packaging-backlog | 发版仍靠人工截图 smoke |
| **H5** | 无统一 PS 入口 / JSON 报告 | 与 `test-mcp-health.ps1` 体验不一致 |
| **H6** | `must_not` 仅文档语义，runner 不判 | 设计如此；golden case 靠 tool + `pass_if_any` |

截图对应用例（已存在）：

```text
CCB_TEST_PROFILE=wande-orchestrator
input: 帮我查直接50价格
expected: Agent → quotation-agent；orchestrator 顶层禁止 mcp__quotation__*
case id: orchestrator-quote-delegates
```

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | `trellis-before-dev` (integration) | available | Read `agents-unified-model.md` |
| Harness fix | TDD → inline edit | available | Main session |
| Suite design | trellis-brainstorm (light) | available | This plan |
| Review | `code-reviewer` agent | available | `trellis-check` |
| Live smoke | `test-native-acp-agent.mjs` | available | Manual AionUI |
| Packaging hook | `trellis-implement` | available | Inline PS script |
| Spec update | `trellis-update-spec` | available | Direct edit |
| CI schema | `.github/workflows/` | available | Local only first |

## Scenario classification

**Scenario A** — 单仓功能 + 打包脚本集成；非 Scenario D（不涉及 aionui-src 并行）。

**Risk tags:** `packaging` · `long-running`（live suite）· `external-api`（live 需 LLM + MCP）

---

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| User approves plan | — | `Status: approved` |
| `task.py start 07-09-agent-eval-regression-suite` | task.py | `in_progress` |
| `trellis-before-dev` | integration index | checklist |
| Baseline schema | `node eval/run-agent-eval.mjs` | 66/66 schema ok |
| Baseline live（单 case） | `--run --case orchestrator-quote-delegates` | 记录 H1 是否复现 |

---

## Phase 1…N — Workstreams

| Phase | Priority | Workstream | Risk | Tool | Files | Required output | Profile | Notes |
|-------|----------|------------|------|------|-------|-----------------|---------|-------|
| **P1** | P0 | **Harness 对齐** | external-api | TDD | `test-native-acp-agent.mjs`, `run-agent-eval.mjs` | `CCB_TEST_PROFILE` ← `case.agent`；`CCB_TEST_INSTALL_DIR` / `CCB_TEST_CONFIG_DIR`；runner 同步文档 | Release | 保留 `CCB_TEST_AGENT_ID` 作 alias 防回归 |
| **P2** | P0 | **分层 suite** | long-running | design + impl | `eval/suites/smoke.json`, `core.json`, `full.json`, `run-agent-eval.mjs` | `--suite smoke\|core\|full`；`--list-suites` | Release | 见下表 |
| **P3** | P1 | **统一入口 + 报告** | packaging | trellis-implement | `ccb-installer/scripts/run-agent-eval-suite.ps1` | 类似 `test-mcp-health.ps1` 参数风格；输出 `eval-results-<ts>.json` | Release | `-Suite smoke -InstallDir` |
| **P4** | P1 | **发版/打包接入** | packaging | docs + checklist | `dev-test-checklist-1.1.6.md`, `packaging-backlog-1.1.6.md`, `wanding-release-standard.md` | Issue 8 或 §验证：打包后跑 smoke | Release | Full NSIS 后人工 10 min |
| **P5** | P2 | **1.1.6 增量 case** | — | edit jsonl | `agent_eval_cases.jsonl` | price-library deny orchestrator；research stack；config gen 4 路由 | Standard | 与 Issue 3/7 对齐 |
| **P6** | P2 | **Schema CI** | packaging | workflow | `.github/workflows/agent-eval-schema.yml` | PR: `node eval/run-agent-eval.mjs` exit 0 | Fast | live 不进 PR |
| **P7** | — | **门禁 + spec** | — | code-reviewer → smoke | spec + jsonl | AC 全勾 | Release | 见 Verification |

### Suite 分层（建议初版）

| Suite | Cases | 目标时长 | 何时跑 | 覆盖 |
|-------|-------|----------|--------|------|
| **smoke** | 9 | ~10 min | 打包 / 路由改动 | orchestrator 委派 + 防幻觉 |
| **quotation-smoke** | 6 | ~25-35 min | 报价功能 / 发版前 | 用户 6 条：查价→库存→填单→三通→learn-by-data→LingWei批量 |
| **core** | 24 | ~45-60 min | 大版本前 | smoke + quotation 子集 + accurate/permission |
| **full** | 72 | 2-4 h | 周更 / major | 全部 |

剧本：[`eval/scenarios/quotation-workflow-smoke-20260706.md`](../../../eval/scenarios/quotation-workflow-smoke-20260706.md)

---

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| P1 profile wiring | integration | `orchestrator-quote-delegates` live FAIL 或 log 无 `[profile]` | `node eval/run-agent-eval.mjs --run --case orchestrator-quote-delegates` | case.agent 生效 |
| P2 suite loader | unit | `--suite smoke` 选错 case 数 | `node eval/run-agent-eval.mjs --suite smoke` (validate mode) | smoke ⊆ full |
| P3 PS wrapper | script | 缺 InstallDir 报错清晰 | `.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -SchemaOnly` | exit 0 |
| P6 CI | workflow | N/A | `node eval/run-agent-eval.mjs` on PR | 66 schema |

---

## Verification profile and gate

**Selected:** Release

1. **code-reviewer** agent（harness + suite + PS 入口）
2. **Evidence（按序）：**
   - `node eval/run-agent-eval.mjs` → `schema ok` (66/66)
   - `node eval/run-agent-eval.mjs --run --case orchestrator-quote-delegates` → PASS（需本机 `D:\CCB-Wanding` + API）
   - `.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -SchemaOnly` → exit 0
   - （可选）`-Suite smoke -Run` 全绿摘要 JSON
3. **trellis-update-spec** → `agents-unified-model.md` + `wanding-release-standard.md`
4. `implement.jsonl` + `check.jsonl` + prd AC `[x]`
5. `git commit` — 仅用户要求时
6. `/trellis:finish-work`

### Manual steps (human)

- [ ] 1.1.6 exe 打包后：`-Suite smoke -Run -InstallDir $INSTALL` 全绿
- [ ] AionUI 默认会话：截图式委派行为与 eval PASS 一致
- [ ] `must_not` / golden 回复质量：抽检 `quote-direct50-post-hook-golden`（judge 仍人工）

---

## Parallelization

**不并行** — 串行 P1 → P2 → P3 → P4；P5/P6 可在 P3 后与 P4 交错。

---

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| Live smoke 因 MCP 冷启动 FAIL | 重跑 + `retry`；不放宽 case | log + fix_note | no |
| smoke 仍 >15 min | 缩减 smoke 列表 | 更新 `smoke.json` | no |
| 需 LLM judge 自动化 `must_not` | 新开 task | research/ | **yes** |
| 改 case 语义（pass_if_any 分支） | 更新 README fix log + prd | eval/README.md | no |
| 接入 GitHub live eval | 拒绝（密钥/成本） | — | **yes** |

---

## Defer / out of scope

- 全量 semantic judge（`must_not` 自动判）
- run/step DB、eval dashboard
- aionui-src UI 自动化（仍 manual smoke）
- 替换现有 `test-mcp-health.ps1`
- nightly 66 case 调度（文档建议即可，本 task 不强制）

---

## 与 packaging-backlog 1.1.6 关系

| Backlog | Eval 补强 |
|---------|-----------|
| Issue 3 orchestrator dispatch | `orchestrator-quote-delegates` 入 **smoke**；可加 price-library deny case |
| Issue 7 config gen 4 / commands | schema + optional routing case |
| Issue 1 skills | 不直接 eval；smoke 前确保 bootstrap 已跑 |

建议 backlog 新增 **Issue 8 — Agent eval smoke 门禁**（本 task 交付后勾选）。
