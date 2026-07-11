# Execution Plan — `07-11-work-task-open-agent-brief`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Scenario** | A（标准功能；需求已由 explore + 用户 5 点锁定）+ **D-lite**（UI 主仓 aionui-src，spec 辅仓 claude-code-best） |
| **Plan depth** | Standard |
| **Verification profile** | UI |
| **Active phase** | completed |
| **Approved** | 2026-07-11 |
| **Repos** | aionui-src (P0–P2) → claude-code-best spec (P3) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` + `skill-selection.md` §一–二 |
| trellis-before-dev | Read: | `get_context.py --mode packages` → layers backend/frontend/integration；读 `frontend/index.md`、`integration/index.md` |
| openspec-explore | Read: | 上轮 explore：task→agent 缺口、`stageAcpInitialMessage`、默认 `wande-orchestrator`；`openspec list --json` → `unified-org-sso` in-progress（无关） |
| trellis-brainstorm | Read: | 用户已答 5 点；本轮落盘 `prd.md`（命名/写回/先介绍），未再连环追问 |
| explore agent (codebase) | Agent: | work-tasks detail / Guid handoff / catalog map（会话内 explore 子代理） |

**Verdict matrix used:** Explore → openspec-explore；Plan → trellis-task-execution；Implement（批准后）→ 主 session TDD + trellis-implement 纪律；Review → code-reviewer（Layer A picker + Layer B renderer）；Verify → UI profile + §Step 5.

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Plan | approved | 2026-07-11 |
| P0 | done | `task.py start` |
| P1 | done | `workTaskOpenAgent.ts` + vitest **6/6** |
| P2–P3 | done | Detail CTA + handoff + description writeback |
| Spec | done | `aioncore-work-tasks.md` + `file-map.md` |
| Gate | done | code-reviewer Layer A/B **PASS**; Layer B smoke PASS |
| Manual | done | 用户确认 2026-07-11：了解任务 OK + 权限全自动 OK |

---

## Task: 07-11-work-task-open-agent-brief — 了解任务（Agent）

**Spec entry:** `.trellis/spec/frontend/index.md` + `.trellis/spec/integration/aioncore-work-tasks.md`  
**Risk tags:** `ui` · `cross-repo`（spec 同步）· Layer A（agent picker）

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm → prd.md | available | 本 session 已锁定 5 点 |
| Research | trellis-research | available | 主 session `research/*.md` |
| Implementation | 主 session + TDD（Cursor 无 trellis-implement 子代理注入时） | available | inline after before-dev |
| Review | code-reviewer（Layer A+B） | available | 内联对照 layer-a/b |
| TDD | vitest in aionui-src | available | — |
| Spec update | trellis-update-spec | available | 手写 `aioncore-work-tasks.md` |

### Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Activate | `python ./.trellis/scripts/task.py start 07-11-work-task-open-agent-brief` | in_progress（用户批准后） |
| Spec | frontend coding-rules + layer-b；integration aioncore-work-tasks UI map | checklist noted |
| PRD | `prd.md` | AC locked |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| **WANd.TASKS.OPEN_UNDERSTAND.001** | 详情页「了解任务」新建会话并注入「先介绍 / 不执行」首条消息；默认主入口；无附件 | `WorkTaskDetailPage.tsx`, prompt util, Guid/conversation create + `stageAcpInitialMessage` | unit: prompt builder；UI smoke | ui：误成「执行」 |
| **WANd.TASKS.BRIEF_PATH_WRITEBACK.001** | 会话创建+stage 成功后，向 `description` 追加简要路径；同 conversation_id dedupe；失败不回滚会话 | append util + `workTask.updateTask` | unit: append/dedupe；UI smoke 刷新详情 | 污染说明 / ACL 失败 |
| **WANd.TASKS.AGENT_PICKER.001**（Layer A） | Agent 下拉身份与 Guid/catalog 一致；默认 `wande-orchestrator` | catalog + selection key helpers | unit 或对照 catalog；code-review Layer A | 选错 agent / 身份漂移 |

### Contract cards

### Contract: WANd.TASKS.OPEN_UNDERSTAND.001

**Behavior protected:** 从任务详情以「了解」语义打开新对话，agent 先介绍理解，默认不改任务状态，不带附件。  
**Primary code:** `WorkTaskDetailPage.tsx`, `buildWorkTaskUnderstandPrompt`（新）, conversation create + `acpPendingInitialMessage.ts`  
**Tests:** `tests/unit/.../workTaskOpenAgent.test.ts`（prompt 含 id/title、含「介绍」、含「不要改状态」、无 files）  
**Eval / smoke:** 详情 → 了解任务 → 新会话首条自动发出 → agent 开始介绍  
**Risk if broken:** 用户以为在「执行」或会话空开无上下文

### Contract: WANd.TASKS.BRIEF_PATH_WRITEBACK.001

**Behavior protected:** 成功 handoff 后 description 末尾留下可追溯简要路径；重复点击同会话不重复写。  
**Primary code:** `appendWorkTaskAgentBriefPath`（新）+ `ipcBridge.workTask.updateTask`  
**Tests:** unit append / dedupe / 空 description  
**Eval / smoke:** 打开后回详情见 `[Agent 了解] … 会话 …`  
**Risk if broken:** 无法追溯；或说明被刷屏

### Contract: WANd.TASKS.AGENT_PICKER.001

**Behavior protected:** 可选 agent，默认主入口；选择键与 Guid 一致。  
**Primary code:** `ccbAgentCatalog.ts`, `resolveCcbAgentGuidSelectionKey`  
**Tests:** default id === `wande-orchestrator`；selection key 映射  
**Eval / smoke:** 切换 work-tasks-agent 后会话绑定该 agent  
**Risk if broken:** Layer A 身份错误 / 绑到错误后端 agent

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | — | Activate + before-dev | docs-only | — | task.py start | task.json | in_progress | Fast |
| 1 | P0 | Prompt + path util（纯逻辑） | OPEN_UNDERSTAND + BRIEF_PATH | — | TDD first | `workTaskOpenAgent.ts`（名可调整） | RED→GREEN unit | Fast |
| 2 | P0 | Detail CTA + agent select + handoff | OPEN_UNDERSTAND + AGENT_PICKER | ui · Layer A | implement after GREEN | `WorkTaskDetailPage.tsx`, i18n | CTA 无「执行」；新建+stage+navigate | UI |
| 3 | P0 | Write-back after success | BRIEF_PATH | ui | same | detail handler | updateTask append | UI |
| 4 | P1 | Spec sync | docs | cross-repo | trellis-update-spec | `aioncore-work-tasks.md` | UI map 一节 | Fast |
| 5 | — | Gate | all | ui | code-reviewer → vitest → manual | — | PASS + smoke | UI |

**Merge rule (D-lite):** aionui-src 实现与测试先合；claude-code-best 仅改 Trellis/spec，**禁止**两仓改同一 runtime 文件。串行：P1–P3 在 aionui → P4 spec。

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P1 prompt util | OPEN_UNDERSTAND.001 | 测试断言 prompt 含任务 id、含「介绍」、含禁止改状态；缺实现失败 | `cd D:\Projects\aionui-src && bunx vitest run tests/unit/.../workTaskOpenAgent.test.ts`（路径以落地为准） | 同命令 |
| P1 path util | BRIEF_PATH.001 | append/dedupe 用例失败 | 同上 | 同命令 |
| P2–P3 UI | OPEN + PICKER + BRIEF | 逻辑已由 unit 覆盖；UI 以 smoke 为主 | unit 全绿 + Layer B smoke-renderer-imports | unit 保持绿 |
| P4 spec | docs-only | N/A — docs | 人工 diff review | — |

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| OPEN_UNDERSTAND.001 | vitest prompt tests + UI：了解任务 → 新会话自动首条 | 命令输出 + 手动记录 | pending |
| BRIEF_PATH.001 | vitest append/dedupe + UI：回详情见路径块 | 同上 | pending |
| AGENT_PICKER.001 | catalog default + Layer A in code-reviewer verdict | review 摘要含 Layer A PASS | pending |

### Verification profile and gate

**Selected:** UI

1. **Contract Verification** — 上表三项  
2. **code-reviewer**（主审）— Layer A（picker）+ Layer B（`node scripts/review/smoke-renderer-imports.mjs`）  
3. `bunx vitest run`（触及的 unit）  
4. **Manual UI smoke**（必做）  
5. `trellis-update-spec` → `aioncore-work-tasks.md`  
6. `implement.jsonl` / `check.jsonl` + PRD AC `[x]`  
7. `git commit` — **仅当用户要求**  
8. `/trellis:finish-work`

### Manual steps (human)

- [ ] 未接受任务点「了解任务」→ 新对话，首条含标题/描述，agent **先介绍**  
- [ ] 确认 CTA / Toast **无「执行」** 字样  
- [ ] 默认主入口；切换另一 agent 后会话绑定正确  
- [ ] 无附件出现在首条  
- [ ] 回详情：`description` 末尾有 `[Agent 了解] … 会话 …`  
- [ ] 再点一次：新建**另一**会话；旧路径保留，新路径追加（不同 conversation_id）  
- [ ] （可选）断网/ACL 失败：会话仍在，Toast 提示写回失败

### Parallelization

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A | aionui-src UI + unit | 先合 |
| B | claude-code-best spec only | A 绿后串行 |

### Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| 用户要求改回「执行」语义 | Phase 0 / PRD | 更新 prd + 本 plan | **yes** |
| 写回要改成 agent MCP | P3 + PRD § Write-back | research note | **yes** |
| RED 无法写（纯 UI） | 扩 util 可测面 | TDD 行更新 | no if AC 不变 |
| Layer A FAIL | P2 picker | review 输出 | no |
| 同测两连败 | systematic-debugging | root-cause 笔记 | no if AC 不变 |

### Defer / out of scope

- 附件、`metadata.conversation_id` 结构化、resume、agent 自动改状态、列表批量了解、Guid `prefilledInput` 修复

---

## Design summary (for approver)

```
了解任务（默认主入口）
    → create conversation + stage「先介绍」prompt（无 files）
    → navigate /conversation/:id
    → UI append 简要路径 → description
```

**不等于执行。** 成功痕迹在任务说明里，不在「已完成」状态机。

---

## Approval gate

回复 **批准计划** / **approved** 后：将本文件 `Status` → `approved`，再可说 **执行 task**。  
在此之前 **不写应用代码**。
