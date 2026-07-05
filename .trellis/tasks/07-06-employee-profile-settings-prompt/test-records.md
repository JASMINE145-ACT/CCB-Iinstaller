# Execution Test Records — `07-06-employee-profile-settings-prompt`

Durable evidence log for gates. Append a row (or section) after each phase; do not rely on chat memory.

---

## How to record

| Field | Meaning |
|-------|---------|
| **Phase** | P4 / P5 / P8 / P9 / Gate |
| **Kind** | `unit` \| `deploy` \| `manual-smoke` \| `code-review` |
| **Command / steps** | Exact command or UI steps |
| **Result** | PASS / FAIL / PENDING |
| **Evidence** | Count, log path, or short quote |
| **Date** | ISO date |

Also append one JSON line to `check.jsonl` per gate.

---

## Recorded results

### P4 — Unit (v1)

| Kind | Command | Result | Evidence | Date |
|------|---------|--------|----------|------|
| unit | aionui `employeeProfileShared.test.ts` | PASS | 6/6 (P8) / earlier 8/8 form suite | 2026-07-05 |
| unit | backend `employeeProfile.test.ts` via deploy build | PASS | included in 47/47 | 2026-07-05 |
| deploy | `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` | PASS | 47/47 | 2026-07-05 |

### P5 — Manual smoke (AC3)

| Kind | Steps | Result | Evidence | Date |
|------|-------|--------|----------|------|
| manual-smoke | 设置→个人信息→保存→新对话→「我是谁」 | PASS | `p5-dev-smoke-done.md` — 祐嘉诚 / IP / Ai agent 开发 | 2026-07-05 |

### P8 — Name tone (AC8)

| Kind | Command / steps | Result | Evidence | Date |
|------|-----------------|--------|----------|------|
| unit | `derivePreferredAddressName` + behavior lines | PASS | vitest 6/6 | 2026-07-05 |
| code-review | code-reviewer agent | PASS | agent fa7660c0 | 2026-07-05 |
| deploy | sync -Build -Deploy | PASS | 47/47; dist has `Preferred address` | 2026-07-05 |
| manual-smoke | 新对话普通任务应含「嘉诚」 | **PASS** | user confirmed 2026-07-05 | 2026-07-05 |

### P9 — Subagent injection (AC9)

| Kind | Command / steps | Result | Evidence | Date |
|------|-----------------|--------|----------|------|
| unit | idempotent merge + omitClaudeMd-only-currentDate | PASS | employeeProfile.test.ts **7/7** | 2026-07-05 |
| unit | full ACP suite incl. employeeProfile | PASS | **54/54** | 2026-07-05 |
| code-review | code-reviewer on runAgent + employeeProfile | PASS | agent 8bc319be | 2026-07-05 |
| deploy | sync copies `runAgent.ts`; -Build -Deploy | PASS | dist `chunk-k80fbpva.js` has `mergeEmployeeProfileIntoResolvedUserContext` | 2026-07-05 |
| manual-smoke | orchestrator 委派 quotation-agent；子路径知身份/称呼 | **PASS** | user confirmed 2026-07-05 | 2026-07-05 |

#### P9 manual smoke script (when executing)

1. 设置 → 个人信息已保存（嘉诚）
2. **新开**默认 WanD 对话（orchestrator）
3. 发任务强制委派，例如：「用报价专家查一下 XX 型号价格」（或已知会 Agent(`quotation-agent`) 的 prompt）
4. 在子 agent 产出阶段（或主 agent 转述前），确认模型侧已知用户称呼；可选：在子 agent transcript / thinking 中可见 profile 行为，或让主 agent 问「报价专家知不知道我是谁」
5. **期望：** 委派路径不丢身份；至少主会话汇总时仍用「嘉诚」，且子 agent 不因缺 profile 用错人称
6. 回归：直连 Guid 报价专家会话仍能「我是谁」

---

## Gate summary

| Gate | Primary | Status |
|------|---------|--------|
| v1 (P1–P5) | UI profile | PASS |
| P8 | UI + unit | **PASS** (user smoke 2026-07-05) |
| P9 | Standard + manual | **PASS** (user smoke 2026-07-05) |
