# AionUI Vitest 全量回归修复（24 failures）

## Goal

修复 `aionui-src` 全量 `npm run test` 当前 **16 文件 / 24 用例** 失败，使 vitest 可作为近期 task（07-03、07-06、1.1.3 parity、attention 等）合并前的 **GREEN 门禁**。

## 背景

2026-07-06 全量 vitest：`220 passed | 16 failed | 24 tests failed`。先前误判为「与侧栏改动无关」——**归因错误**。抽样复现已确认多类失败直接对应未提交/近期 task 改动。

## Scope

| In | Out |
|----|-----|
| 16 个失败 test file 的根因修复或测试契约对齐 | 新增 E2E 覆盖 |
| `bun:test` → `vitest` 迁移（5 文件） | agent eval harness（见 07-09） |
| orgHttpBridge / httpBridge 测试契约更新 | 重构生产代码（除非测试暴露真 bug） |
| slash capability 测试 vs 实现二选一收敛 | Preview 模块大改 |

## Acceptance criteria

- [ ] `cd aionui-src && npm run test` → **0 failed**（skipped 允许）
- [ ] 每个 bucket 有 `research/` 或 plan 中归因行 + 修复证据
- [ ] code-reviewer PASS
- [ ] 无「跳过/删除测试」除非 PRD 记录理由且 AC 仍成立

## Failure inventory（2026-07-06 baseline）

| Bucket | Files | Tests | Root cause (confirmed) |
|--------|-------|-------|------------------------|
| **A** bun runner | 5 | suite fail | `import from 'bun:test'` under vitest |
| **B** slash capability | 1 | 2 | Tests expect `capabilityStatus` / `isSlashCommandExecutable`; `types.ts` + `acpMapping.ts` 已不含该 API |
| **C** org http | 2 | 4+ | `httpBridge` 现用 `http://127.0.0.1:13400/...` + `credentials: 'omit'` |
| **D** assistants | 1 | 8 | `useAssistantList` 返回 `[]` — `fetchAssistantsCatalog` 契约变更 |
| **E** ccb config | 3 | 3+ | migration / skillsSync / internalUpdateManifest 行为漂移 |
| **F** askUserQuestion | 2 | suite fail | 同 Bucket A（bun:test） |
| **G** preview import | 3 | 5+ | 模块 import **30s timeout**（重依赖链） |

## Canonical files

- `aionui-src/tests/unit/**`（16 失败文件）
- `aionui-src/packages/desktop/src/common/adapter/httpBridge.ts` / `orgHttpBridge.ts`
- `aionui-src/packages/desktop/src/common/chat/slash/*`
- `aionui-src/packages/desktop/src/common/assistants/fetchAssistantsCatalog.ts`

## Related tasks

- `07-03-work-tasks-center-sync` — workTaskTypes, orgHttp
- `07-06-learn-by-data-price-library-enrich` — filterProducts, priceLibraryColumns
- `07-01-conversation-attention` / attention commit — 可能间接影响 import 图
- `07-12-guid-main-agent-white-screen` — slash / guid capabilities
