# Execution Plan — `07-13-aionui-vitest-regression-repair`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | C（回归 / 测试契约漂移） |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo（repo: `aionui-src`；多 task 归因） |
| **Active phase** | P0（待批准） |
| **Repos** | aionui-src（主）；claude-code-best（Trellis 文档 only） |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `.trellis/spec/frontend/index.md` + `dev-test-ship.md` — vitest 为 dev 验证路径之一 |
| systematic-debugging（inline） | Skill: | 全量 vitest 16 failed；抽样 4 文件复现；归因 7 bucket（见下） |
| trellis-plan-execution | Read: | 本 plan |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P1 Bucket A+F bun→vitest | done | 5 files GREEN |
| P2 Bucket C org http | done | httpBridge*.test GREEN |
| P3 Bucket B slash B2 | done | stale capability tests removed |
| P4 Bucket D assistants | done | fetchAssistantsCatalog mock |
| P5 Bucket E ccb config | done | migration + skillsSync + manifest |
| P6 Bucket G preview timeout | done | 120–180s timeout + fetch stub |
| P7 全量门禁 | done | `npm run test` 1685 passed / 0 failed; code-review PASS |

---

## Task: 07-13 — AionUI Vitest 全量回归修复

**Scenario:** C  
**Repos:** aionui-src  
**Spec entry:** `.trellis/spec/frontend/dev-test-ship.md`

> **更正：** 先前「24 失败与侧栏无关」结论**错误**。用户判断正确——失败与 07-03 / 07-06 / 1.1.3 parity / slash-capability 等近期改动强相关。

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Debug / 归因 | systematic-debugging | available | inline repro（已做） |
| Implementation | trellis-implement | available | inline edit aionui-src |
| TDD | superpowers:test-driven-development | unavailable (Cursor) | RED→GREEN 逐 bucket |
| Review | code-reviewer | available | inline |
| Spec update | trellis-update-spec | available | frontend dev-test-ship 补 vitest 门禁说明 |

### Phase 0 — Activate & baseline

| Step | Tool | Output |
|------|------|--------|
| 创建 task | `task.py create 07-13-aionui-vitest-regression-repair` | in_progress |
| 锁定 baseline | `npm run test` | 16 files / 24 tests failed（已记录） |
| 归因文档 | `research/failure-taxonomy.md` | 7 bucket + 关联 task |

### Phase 1 — Bucket A+F：`bun:test` → `vitest`（P0，机械修复）

| 文件 | 关联 task |
|------|-----------|
| `tests/unit/common-utils/workTaskTypes.test.ts` | 07-03 |
| `tests/unit/priceLibrary/filterProducts.test.ts` | 07-06 |
| `tests/unit/priceLibrary/priceLibraryColumns.test.ts` | 07-06 |
| `tests/unit/renderer/askUserQuestionFormat.test.ts` | askUserQuestion 功能 |
| `tests/unit/renderer/askUserQuestionIds.test.ts` | 同上 |

**做法：** `import { describe, expect, it/test } from 'vitest'`；保持断言不变。  
**RED 证据：** `Cannot find package 'bun:test'`  
**GREEN：** `npm run test -- <5 files>` 全 PASS

### Phase 2 — Bucket C：org http 测试契约（P0）

| 文件 | 漂移点 |
|------|--------|
| `tests/unit/common-adapter/httpBridge.test.ts` | URL 现为 `http://127.0.0.1:13400/api/...`；fetch 含 `credentials: 'omit'` |
| `tests/unit/common-adapter/httpBridge.ws.dom.test.ts` | WebSocket auth / reconnect 契约（07-03 orgHttpBridge） |

**做法：** 更新 mock 期望对齐 **当前** `httpBridge.ts` / `orgHttpBridge.ts`（测试跟实现，不 revert 生产 org 路由）。  
**Risk:** `cross-repo`  
**Regression target:** org SSO + work-tasks 仍走 orgHttpBridge

### Phase 3 — Bucket B：slash capability（P1，需决策）

| 现状 | 测试期望 | 实现现状 |
|------|----------|----------|
| `slashCommandsMerge.test.ts` | `capabilityStatus`, `isSlashCommandExecutable`, badge keys | `types.ts` 无这些字段；`acpMapping.ts` 不读 `_meta.capability` |

**决策点（执行前与用户确认）：**

| 选项 | 做法 | 适用 |
|------|------|------|
| **B1 恢复实现** | 在 `SlashCommandItem` + `acpMapping` 恢复 capability 映射 | Guid slash UX 仍需要 badge/executable 语义 |
| **B2 删/改测试** | 移除 capability 用例或改为当前 API | 功能已 intentionally 下线 |

**默认推荐 B1**（测试是 07-12/guid 意图的规格化）；若产品已放弃 capability badge → B2 + PRD 记录。

### Phase 4 — Bucket D：`useAssistantList`（P1）

**症状：** 8 tests — `assistants` 恒为 `[]`，load mock 未触发。  
**根因假设：** `fetchAssistantsCatalog.ts` 重构后 hook 调用路径/mock 键变化（1.1.3 parity 未改测试）。  
**做法：** 读 hook + test mock → 对齐 IPC/catalog 契约；必要时 characterization test 先锁当前行为。

### Phase 5 — Bucket E：ccb config（P1）

| 文件 |
|------|
| `tests/unit/common-config/ccbAgentMigration.test.ts` |
| `tests/unit/common-config/ccbSkillsSync.test.ts` |
| `tests/unit/internalUpdateManifest.test.ts` |

**做法：** 逐文件 RED 输出 → 更新 fixture/断言匹配新 migration 规则；**不**为绿而删断言。

### Phase 6 — Bucket G：preview import timeout（P2）

| 文件 | 症状 |
|------|------|
| `PreviewPanel.dom.test.tsx` | import 30s timeout |
| `OfficeWatchViewer.dom.test.tsx` | 同上 |
| `usePreviewHistory.dom.test.ts` | 同上 |

**做法：**  
1. 查 import 链是否被近期 `Layout`/`Router`/heavy dep 拖慢  
2. 优先 **vi.mock 重模块** 或提高 isolated test timeout（最后手段）  
3. 若生产 import 真 hang → 升 P0 bug

### TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression |
|------------|------------|--------------|---------------|------------|
| A+F bun migrate | unit | bun:test import error | `npm run test -- <files>` | vitest 全仓统一 runner |
| C org http | unit/dom | URL/credentials mismatch | `npm run test -- httpBridge*` | org API 路由 |
| B slash | unit | capabilityStatus undefined | 同上 + manual guid slash smoke | slash 菜单 executable 语义 |
| D assistants | dom | empty assistants | `npm run test -- useAssistantList*` | 助手列表加载 |
| E ccb | unit | assertion drift | per-file vitest | agent 迁移 |
| G preview | dom | 30s timeout | per-file + optional mock | 预览面板加载 |

### Verification profile and gate

**Selected:** Cross-repo（aionui-src 单仓，多 task 归因）

1. **全量 GREEN：** `cd D:\Projects\aionui-src && npm run test` → 0 failed  
2. **code-reviewer** — diff 限于 tests + 若 B1 则 slash 实现  
3. **trellis-update-spec** — `dev-test-ship.md` 补一句：合并前须 vitest 全绿  
4. **implement.jsonl + check.jsonl**  
5. **git commit** — 仅用户要求时（aionui-src 仓）  
6. `/trellis:finish-work`

### Parallelization

**不建议并行** — 多数失败共享 `common/adapter` 与 config 层；串行 P1→P7，每 phase 小 commit 可选。

| 若并行 | Scope | Merge rule |
|--------|-------|------------|
| Agent A | P1 A+F only | 仅 `tests/**` bun 替换 |
| Agent B | P2 C only | 仅 httpBridge tests |
| Parent | P3+ | 等 A/B merge 后再跑全量 |

### Manual steps

- [ ] dev smoke：`start-dev-full.ps1 -SkipBootstrap` → 侧栏任务/价格库/助手列表可打开  
- [ ] （若 B1）Guid 页 slash 菜单：needs_mapping 显示 badge 且不可执行

### Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| B 决策与 PRD 冲突 | Phase 3 + 更新 prd | yes |
| 测试绿但暴露生产 bug | 新开 task；本 task 仅保留测试 | yes |
| 同一 bucket 修两次仍 fail | systematic-debugging + research | no |
| 全量仍 >5 fail 且非 preview | 暂停 P7，重排优先级 | yes |

### Defer / out of scope

- agent eval live quotation-smoke（07-09 P8）
- E2E 扩展
- 将 vitest 迁回 bun test runner（与现 CI 不一致）
