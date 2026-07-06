# Execution Plan — `07-06-memory-trigger-extraction-quality`

| Field | Value |
|-------|--------|
| **Status** | in_progress（approved 2026-07-06 用户「执行」） |
| **Scenario** | C（缺陷修复 + 局部重设计；根因已 file:line 实锤，见 research/） |
| **Repos** | claude-code-best（仅 ccb-installer python skill + tests；不动 aionui-src，status 契约向后兼容） |
| **Plan depth** | Standard |
| **Verification profile** | Standard + 强制 manual smoke（R10） |
| **Active phase** | R10 manual smoke open |
| **Target release** | 1.1.7 |

**PRD:** [`prd.md`](./prd.md) · **诊断:** [`research/trigger-extraction-diagnosis.md`](./research/trigger-extraction-diagnosis.md)

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Skill: | 本计划按 Step 1–3b 产出 |
| systematic-debugging（inline Phase 1–2） | Read: | 4 个脚本逐行精读，T1–T4 / E1–E5 全部 file:line 指认 → `research/trigger-extraction-diagnosis.md`；E1 profile 死代码可单测复现 |
| trellis-before-dev | Skill: | get_context --mode packages（single-repo，spec layers: backend/frontend/integration）；integration 层 agents-unified-model.md 本会话前段已精读 |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Python hook/worker 实现 | `Agent: trellis-implement` | available | — |
| TDD (pytest) | `python -m pytest ccb-installer/config/skills/ccb-personal-memory/tests/` | available（现 6 fixture） | — |
| 合规核验 | `Agent: trellis-check` | available | inline spec check |
| 部署 | `deploy-ccb-skills` / 复制到 `%LOCALAPPDATA%\CCB-Wanding\.claude\` | available | 手工复制 |
| Spec 沉淀 | `Skill: trellis-update-spec` | available | — |

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| `task.py start 07-06-memory-trigger-extraction-quality` | Bash | in_progress |
| Spec 上下文 | trellis-before-dev | 已完成（见上） |

## Phase 1–3 — Workstreams

| Phase | Priority | Workstream | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|------|------|-------|-----------------|---------|
| 1 | P0 | **WS-A 触发门槛 + 增量 + 冷却**（R1/R2）：hook 前置启发式预筛；`learning_state.py` 位点+冷却；无信号/无增量 → 静默 skip | `concurrency`（多 SubagentStop） | `Agent: trellis-implement` | `post-personal-memory-stop.py`, `lib/learning_state.py`(新), `lib/parse_transcript_personal_memory.py` | 无信号会话 0 API 调用 0 横幅；同会话重复 Stop 只提新增轮次 | Standard |
| 1 | P0 | **WS-B 提取质量**（R3/R4/R5/R6）：prompt v2（evidence 字段+负例）；worker evidence 落地校验 + difflib 近重拒收；业务 veto 收紧；profile 打通 | — | 同一 trellis-implement 派发 | `lib/thinking_client.py`, `personal-memory-worker.py`, `lib/parse_transcript_personal_memory.py` | 泛化废话/无证据条目拒收；「供应商习惯」误杀回归修复；profile 端到端可写 | Standard |
| 2 | P1 | **WS-C 可观测 + hygiene**（R7/R8）：status 增 `skippedReason`/`lastEntries`（向后兼容）；决策全量记因；job 文件删除+陈旧清理 | — | 同上（第二批派发） | `lib/learning_status.py`, `personal-memory-worker.py`, `post-personal-memory-stop.py` | 每次 Stop 在日志可答「学没学/为什么/学了什么」 | Fast |
| 3 | P1 | **WS-D spec 沉淀**：triggers/契约写入 integration spec | — | `Skill: trellis-update-spec` | `.trellis/spec/integration/agents-unified-model.md`（或 memory 专节） | 触发门槛/state 契约/校验矩阵成文 | Fast |

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| WS-A | unit (pytest) | 新 fixture：无信号 transcript → 现行为 status=learning+spawn（FAIL 期望=skip）；同会话二次 Stop → 现行为全量重提 | `python -m pytest ccb-installer/config/skills/ccb-personal-memory/tests/ -x` | 现有 6 fixture 全过；有信号路径仍入队 |
| WS-B | unit (pytest) | mock entries 无 evidence/泛化条目 → 现行为直通（FAIL 期望=拒收）；「我习惯先查供应商库存」→ 现行为丢弃（FAIL 期望=收录）；profile 候选 → 现行为 append 0 | 同上 | thinking mock / fallback 双路径 |
| WS-C | unit (pytest) | skip 场景 status 无 skippedReason（FAIL）；job 文件残留（FAIL） | 同上 | status 旧字段不变（AionUI 横幅兼容） |

## Verification gate（§Step 5 单链）

1. `Agent: trellis-check`（主审：AC R1–R9 对照诊断 T1–T4/E1–E4 逐条堵漏核验）
2. pytest 全绿 + **R10 manual smoke**（部署后真实会话：纯查询 skip / 显式偏好收录 / 同会话不重复）
3. `Skill: trellis-update-spec`（WS-D 即此步）
4. implement.jsonl / check.jsonl + prd AC 打钩
5. git commit（主会话驱动，Phase 3.4）
6. `/trellis:finish-work`

## Progress snapshot (2026-07-06)

- [x] Phase 0 activate（task.py start → in_progress）
- [x] Phase 1 WS-A + WS-B（trellis-implement 完成；RED 15 failed → GREEN 28 passed；裁定：位点乐观预写 + skip 不写 status）
- [x] Phase 2 WS-C（同批派发完成：skippedReason/lastEntries、决策日志、job finally 删除 + 7 天清理）
- [x] Verification gate step 1 trellis-check（PASS；修复 2 MEDIUM：claim_window 原子门槛、transcript 单次读；30/30 绿；越界检查干净——改动恰为 ccb-personal-memory 下 7 改 + 4 新）
- [x] Verification gate step 3 trellis-update-spec（agents-unified-model.md §Personal memory Stop hook 新增 2026-07-06 redesign 块：决策链/state 契约/校验矩阵/veto 分级）
- [ ] R10 manual smoke（human：部署后纯查询 skip / 显式偏好收录 / 同会话不重复）

## Manual steps (human)

- [ ] 部署新脚本到 `%LOCALAPPDATA%\CCB-Wanding\.claude\`（deploy-ccb-skills 或手工复制）
- [ ] 纯查询会话结束：无横幅，`personal-memory-stop.log` 记 `skip: no-signal`
- [ ] 说「我习惯先查供应商库存再报价」后结束：横幅一次；workflow.md 新增语义正确 bullet；同会话再结束不重复
- [ ] AionUI Memory 页 / 横幅行为与 1.1.7 现状兼容

## Recovery / re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| 门槛太严漏掉隐式偏好 | Phase 1 WS-A（扩标记表，或加「每 N 会话预算式深扫」） | smoke 记录 | no（AC 不变） |
| evidence 校验误杀正确条目 | Phase 1 WS-B（放宽模糊匹配阈值） | 新 fixture | no |
| minimax prompt v2 输出不稳（JSON/字段缺失） | WS-B prompt 迭代两轮；仍败 → 降级启发式为主 | worker 日志 | yes（范式变更） |
| 多 SubagentStop 并发位点竞争 | WS-A 文件锁复用 memory_store 锁 | 并发 fixture | no |

## Defer / out of scope

- **E5 workflow.md 合并整理/老化**（容量上限 + 定期 consolidation prompt）——单独 task。
- 用户级开关（settings 里关掉自动学习）——如 smoke 后仍嫌吵再加。
- business 自动沉淀 / Memory 页 UI 改版（各归原 task）。
