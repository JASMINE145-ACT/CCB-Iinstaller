# Journal - JASMINE145-ACT (Part 1)

> AI development session journal
> Started: 2026-06-11

---

## 2026-06-11 — Route B B-04c + 文档 + 自动化验证

### 代码（B-04c）
- `ccb-api-server/ws.js`：30s ping / 60s pong 超时（I-1）
- `ccb-runtime/index.js`、`McpTransport.js`、`http.js`：设计注释（I-2～I-4）
- smoke：dead import 清理（I-6）；streaming 测试 pong + cancel 诊断（I-7）
- **未改** `AgentLoop asAbortEvent`（I-5，B-03 语义）

### 文档
- 新增 `docs/Platform/Period/B-04c-code-review-triage.md`
- 新增 `docs/Platform/Period/README.md`（Route B 索引）
- 更新 B-04 v0.2、B-06b v0.2（人工 E2E §4）
- 可行性计划 v1.5

### 验证
```text
bun scripts/build-ccb-api-server.mjs          → OK
bun test-ccb-api-server-streaming.mjs         → PASS stream+cancel
sync-aionui-ccb-route-b.ps1                   → 3 targets OK
test-acp-agent-registry.mjs                   → PASS
test-turn-completed.mjs                       → has turn.completed: true
```

### 阻塞
- `PRD_ROUTE_B_COMPLETE`：待 B-06b.C 人工 AionUI「你好」E2E

---



## Session 1: AionUI CCB-Wanding ACP MCP 注册

**Date**: 2026-06-12
**Task**: AionUI CCB-Wanding ACP MCP 注册
**Branch**: `main`

### Summary

向 entry-WG7IeDEv.js 注入 $buildMcp()，连接 settings.json 中的 excel-mcp/quotation/accurate（41 工具），通过 tools:[...a,..._mcpTools] 注册为一等工具。关键发现：MCP 工具必须在 tools 数组，仅在 mcpClients 无效。已验证 mcp__quotation__match_quotation 直接调用返回 14 候选。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b9077170` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: 修复 exe 版 AionUI route-b 同步

**Date**: 2026-06-12
**Task**: 修复 exe 版 AionUI route-b 同步
**Branch**: `main`

### Summary

sync-aionui-ccb-route-b.ps1 缺少 AppData\Roaming\AionUi exe runtime 路径，补全第四个同步目标，4 个 slot 全部覆盖。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0ed0d2eb` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: 打包 CCB-Wanding 1.1.3 全量 NSIS 安装包

**Date**: 2026-06-29
**Task**: 打包 CCB-Wanding 1.1.3 全量 NSIS 安装包
**Branch**: `main`

### Summary

完成 1.1.3 安装包打包（847 MB）。修复 build-wanding.ps1 staging 校验哨兵：isInternalUpdateEnabled 被 Vite tree-shaken（仅 export 未 import），改为 parseInternalManifest（由 ccbUpdateBridge.ts 实际引用）。记录 NSIS 打包流程、skip 参数组合、以及沙箱后台进程被 kill 的注意事项到 build-deploy-verify.md。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e491e7dc` | (see git log) |
| `fc86dcaf` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Commit-gate hook: Claude Code / Cursor / Codex evidence-based git-commit block

**Date**: 2026-07-03
**Task**: Commit-gate hook: Claude Code / Cursor / Codex evidence-based git-commit block
**Branch**: `main`

### Summary

Built a code-level PreToolUse/beforeShellExecution hook (shared commit_gate.py + 3 thin per-platform adapters) that denies git commit when the active Trellis task lacks verification evidence (execution-plan.md / check.jsonl / task.json notes), replacing what was previously a text-only convention. Confirmed via source research that Codex's shell matcher is "Bash" and that its JSON parser rejects unknown fields (deny_unknown_fields), so the existing multi-format hybrid hook-output pattern is unsafe for deny decisions there — used a clean single-format payload + exit-code-2 fallback instead. Cursor and Codex wiring done by AI; Claude Code's settings.json PreToolUse/Bash registration was blocked by the auto-mode self-modification permission classifier for both the sub-agent and the main session, so the user applied that one edit manually. 25/25 tests passing across both test files.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d61099fb` | (see git log) |
| `4268120d` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
