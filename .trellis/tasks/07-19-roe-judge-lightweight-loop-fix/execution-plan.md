# Execution Plan — `07-19-roe-judge-lightweight-loop-fix`

| Field | Value |
|-------|--------|
| **Status** | draft |
| **Scenario** | C（bug 修复；含 G 轻量重构子项） |
| **Plan depth** | Standard |
| **Verification profile** | Standard |
| **Active phase** | P0 |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | spec: `.trellis/spec/integration/agent-hooks-overview.md`（hook 家族索引）+ `agents-unified-model.md` §Universal ROE（roe-judge 内幕、历史挂起修复）+ `contracts/agent-runtime-registry.yml`（WANd.ROUTING.REVIEWER.001） |
| superpowers:systematic-debugging | Read:（inline 完成） | 根因四阶段闭环：症状（UI 卡 get_inventory running）→ 证据（`subagent-gate-roe-judge.log` 13:19–13:29 约 60 连击 block，window_key start_line 每轮 +2、digest 恒 c7615e4df757、judge_block_count 恒 1）→ 复读代码（`parse_transcript_roe_judge.py` L138–194）→ 三 bug 定位（自锚回收 / window_key 掺行号短路 max_blocks / `\bcode\b` 误判写意图） |
| openspec-explore | Read: | `openspec list --json` 输出（无本主题 change）；探索结论 = 本 plan §背景 |
| baseline tests | Shell | `pytest tests/test_roe_judge_gate.py tests/test_roe_judge_realistic.py -q` → **10 passed**（改动前基线） |

## 背景（root cause，已实证）

live 会话 `a18e1fbe…` 中 quotation-agent 被 ROE judge 以 `write_no_l2` 每 ~10s block 一次，持续 10 分钟，UI 表现为 `get_inventory_by_code` 永远 running。财务专家（accurate-agent）同会话 `no_write_intent → pass` 一次通过。三个咬合 bug：

1. **自锚回收**：`[ROE-GATE …]` reject_prompt 被 `_is_real_user_message` 当作真实用户消息，其文案含「写/L2 写工具」→ `has_write_intent` 又 True → 下一轮把它选为新 anchor。
2. **window_key 掺 start_line**：每轮 transcript +2 行 → key 变 → `judge_block_count` 重置 1 → `max_blocks` escalate→pass 熔断永远不触发。
3. **`\bcode\b` 写意图过宽**：纯查询消息带编码词即判写意图。

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 止血 + 激活 | pending | live modes.json 降级记录 + task start |
| P1 三 bug 修复（TDD） | pending | RED→GREEN pytest 输出 |
| P2 轻量化收敛 | pending | 只拦一次 / 收窄意图 / fail-open 测试 |
| P3 部署 + 验证门禁 | pending | deploy 输出 + code-reviewer PASS + spec 更新 |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| WANd.ROUTING.REVIEWER.001（已存在） | Specialist Stop 时 roe-judge 拦截未落地的写交付 | `ccb-installer/config/skills/ccb-subagent-gate/scripts/lib/parse_transcript_roe_judge.py` + `validators/generic-roe-judge.sh` | `pytest ccb-installer/config/skills/ccb-subagent-gate/tests/ -q` | 拦截失效 → agent 假装填单 |
| WANd.GATE.ROE_TERMINATION.001（provisional） | ROE gate **必须有界**：同一用户请求最多 block N 次（默认 1），reject_prompt 不得被回收为新锚点；解析失败 fail-open | 同上（`window_key` / `extract_write_anchor_window` / `has_write_intent`） | 新增回归测试：自锚回收复现 fixture + 计数累加 + escalate 放行 | 无界循环 → 会话假死（本次事故） |

## Phase 0 — 止血 + 激活

| Step | Tool / skill | Output |
|------|--------------|--------|
| 激活任务 | `python ./.trellis/scripts/task.py start 07-19-roe-judge-lightweight-loop-fix` | in_progress |
| **live 止血** | 改 live `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\ccb-subagent-gate\config\modes.json`：`quotation-agent:roe-judge` `block`→`warn`（**仅 live，不动 repo seed**；P3 部署修复版后恢复 block） | 用户会话立即不再死锁 |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | P0 | A 自锚回收修复：anchor 遍历 + `_is_real_user_message` 过滤 `[ROE-GATE` 注入消息 | WANd.GATE.ROE_TERMINATION.001 | — | TDD（RED 先） | `parse_transcript_roe_judge.py` + 新 fixture `roe-self-anchor-loop.jsonl` | RED（现代码复现无限 block）→ GREEN | Standard |
| 1 | P0 | B window_key 去 start_line（`session:digest`），max_blocks 熔断可达 | WANd.GATE.ROE_TERMINATION.001 | — | TDD | 同上 + `test_roe_judge_gate.py` | 计数累加至 escalate→pass 的测试 | Standard |
| 1 | P1 | C `has_write_intent` 收窄：删 `\bcode\b` 单词触发；quotation 仅认「填/生成/写入/修改报价单」类动作 | WANd.ROUTING.REVIEWER.001 | — | TDD | 同上 | 纯查询消息（含编码）→ pass 测试 | Standard |
| 2 | P1 | D 轻量化收敛：max_blocks 默认降为 1（拦一次即放行+warn 日志）；reject_prompt 换固定短句；解析异常/超时 fail-open | 两个 contract | — | TDD + `superpowers:test-driven-development` 纪律 | `parse_transcript_roe_judge.py` + profiles json | 既有 10 测试保持 GREEN + 新增轻量行为测试 | Standard |
| 3 | P0 | E 部署 + live 验证 + 恢复 block | 两个 contract | packaging | `deploy-subagent-gate-skill.ps1` | live skills 目录 | 部署输出 + live modes.json 恢复 `block` + 新 Guid 会话「查库存」smoke 不再循环 | Standard |
| 3 | P1 | F spec 回写 | docs-only | — | trellis-update-spec | `agents-unified-model.md` §Universal ROE + `agent-runtime-registry.yml`（新 contract 提升） | spec diff | Fast |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| A 自锚过滤 | ROE_TERMINATION | 新 fixture 复现：注入 reject_prompt 行后再次 evaluate → 现代码返回 block+count=1（应 pass 或 count 累加）| `python -m pytest ccb-installer/config/skills/ccb-subagent-gate/tests/test_roe_judge_gate.py -q` | 同命令 |
| B key 稳定 | ROE_TERMINATION | 同 fixture 连评 3 轮 → 现代码 count 恒 1（应 1→2→escalate） | 同上 | 同上 |
| C 意图收窄 | REVIEWER.001 | 「把物料 8020020755 的库存查出来」+ 含 code 字样 → 现代码 write_intent=True（应 False） | 同上 | 同上 |
| D 轻量化 | 两者 | N/A + reason（新行为，无既有失败可复现；以基线 10 passed 为回归护栏） | `python -m pytest ccb-installer/config/skills/ccb-subagent-gate/tests/ -q` | 同上 |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| WANd.GATE.ROE_TERMINATION.001 | pytest 全套 + live 复现 smoke：新 Guid 会话委派报价专家「查 8020020755 库存」 | pytest 输出 + roe-judge.log 无连续 block（≤1 次） | pending |
| WANd.ROUTING.REVIEWER.001 | pytest（既有填单 fixtures 保持拦截）+ 可选：填单 eval case | 10 基线测试仍 GREEN | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-19-roe-judge-lightweight-loop-fix/execution-plan.md` | PASS 输出 | pending |

## Verification profile and gate

**Selected:** Standard

1. Contract Verification（上表）
2. code-reviewer agent（主审；Layer A per `.trellis/spec/code-review-layer-a.md`，Layer B N/A）
3. `python -m pytest ccb-installer/config/skills/ccb-subagent-gate/tests/ -q` 全绿
4. trellis-update-spec → `agents-unified-model.md` §Universal ROE + registry
5. implement.jsonl + check.jsonl + prd AC
6. git commit — 仅用户要求时
7. `/trellis:finish-work`

## Manual steps (human)

- [ ] 新 Guid 会话委派报价专家查库存 → 不再卡 running（或明确失败信息）
- [ ] 填报价单场景仍被正确拦截一次（gate 未被废掉）

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| RED fixture 无法复现自锚循环 | P1 重审根因 | 更新本 plan §背景 | yes（说明根因变了） |
| 修复后 live 仍循环 | systematic-debugging 重启 | 新 log 证据入 `research/` | no |
| 轻量化导致填单拦截失效（基线测试红） | P2 回滚该子项 | pytest 输出 | no |

## Defer / out of scope

- accurate/research 等其他 agent 的 roe-judge profile 收窄（同机制受益，单独小任务）
- outcome-relay / personal-memory Stop hook 审计
- quotation-agent 查询链质量（由 select API + eval 体系负责，见 `07-19-selection-api-and-evidence-harness`）
